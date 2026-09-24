// routes/payments.js
import express from "express";
import Stripe from "stripe";
import pool from "../db.js";
import { verifyToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createIntentSchema } from "../schemas/orderSchemas.js";

const router = express.Router();

const rawKey = process.env.STRIPE_SECRET_KEY || "";

let stripe;
try {
  stripe = new Stripe(rawKey, { apiVersion: "2024-06-20" });
} catch (e) {
  console.error("❌ Stripe init error:", e?.message || e);
}

/**
 * POST /payments/create-intent
 * - Toma el carrito, lo convierte en una orden pending/unpaid con sus
 *   items (foto fija, ya no se puede alterar por cambios posteriores en
 *   el carrito) y crea el PaymentIntent para exactamente esa orden.
 * - El carrito NO se vacía aquí: si el usuario abandona el pago, conserva
 *   su carrito. Lo vacía el webhook de Stripe cuando el pago se confirma.
 *   Lo que se cobra es la foto fija guardada en la orden, no el carrito.
 * - Body: { shipping: { name, phone?, address_line, city, zip }, save_to_profile? }
 *   La dirección se copia a la orden: si el usuario cambia su perfil después,
 *   el pedido conserva la dirección a la que se envió.
 */
router.post("/create-intent", verifyToken, validate(createIntentSchema), async (req, res) => {
  const { shipping, save_to_profile } = req.body;
  const phone = shipping.phone || null;

  if (!stripe) {
    return res.status(500).json({ error: "Stripe no inicializado" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Intentos de pago anteriores sin terminar: se cancelan en Stripe y se
    // borra su orden, para que reintentar no acumule pedidos pendientes.
    // No se toca el stock: solo se descuenta cuando el webhook confirma el pago.
    const { rows: stale } = await client.query(
      `SELECT id, stripe_payment_intent_id FROM orders
       WHERE user_id=$1 AND status='pending' AND payment_status='unpaid'
       FOR UPDATE`,
      [req.user.id]
    );
    for (const o of stale) {
      if (o.stripe_payment_intent_id) {
        const old = await stripe.paymentIntents.retrieve(o.stripe_payment_intent_id);
        // Ya pagado (o en proceso) pero el webhook aún no llega: no se borra.
        if (old.status === "succeeded" || old.status === "processing") continue;
        if (old.status !== "canceled") await stripe.paymentIntents.cancel(old.id);
      }
      await client.query("DELETE FROM order_items WHERE order_id=$1", [o.id]);
      await client.query("DELETE FROM orders WHERE id=$1", [o.id]);
    }

    const cart = await client.query("SELECT id FROM carts WHERE user_id=$1", [req.user.id]);
    if (!cart.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "El carrito está vacío" });
    }
    const cartId = cart.rows[0].id;

    const { rows } = await client.query(
      `SELECT ci.product_id, ci.quantity, ci.price_at_add AS price
       FROM cart_items ci
       WHERE ci.cart_id = $1
       ORDER BY ci.id ASC`,
      [cartId]
    );
    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "El carrito está vacío" });
    }

    let amountCents = 0;
    let total = 0;
    for (const r of rows) {
      const priceNum = Number(r.price);
      const qtyNum = Number(r.quantity);
      if (Number.isNaN(priceNum) || Number.isNaN(qtyNum)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Datos de carrito inválidos" });
      }
      amountCents += Math.round(priceNum * 100) * qtyNum;
      total += priceNum * qtyNum;
    }

    const currency = (process.env.CURRENCY || "usd").toLowerCase();
    if (amountCents <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Total de carrito inválido" });
    }
    if (currency === "usd" && amountCents < 50) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "El total es muy bajo para procesar el pago" });
    }

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, total, status, payment_status,
                           shipping_name, shipping_phone, shipping_address, shipping_city, shipping_zip)
       VALUES ($1, $2, 'pending', 'unpaid', $3, $4, $5, $6, $7)
       RETURNING id`,
      [req.user.id, total, shipping.name, phone, shipping.address_line, shipping.city, shipping.zip]
    );

    if (save_to_profile) {
      await client.query(
        "UPDATE users SET phone=$1, address_line=$2, city=$3, zip=$4 WHERE id=$5",
        [phone, shipping.address_line, shipping.city, shipping.zip, req.user.id]
      );
    }
    const orderId = orderRows[0].id;

    for (const r of rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, r.product_id, r.quantity, r.price]
      );
    }
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      metadata: { user_id: String(req.user.id), order_id: String(orderId) },
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    });

    await client.query(
      "UPDATE orders SET stripe_payment_intent_id=$1 WHERE id=$2",
      [intent.id, orderId]
    );

    await client.query("COMMIT");

    res.json({
      clientSecret: intent.client_secret,
      amount: amountCents,
      currency,
      payment_intent_id: intent.id,
      order_id: orderId,
    });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ POST /payments/create-intent:", e?.message || e);
    res.status(500).json({ error: "No se pudo crear el pago", detail: e?.message || String(e) });
  } finally {
    client.release();
  }
});

export default router;
