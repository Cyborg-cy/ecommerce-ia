// routes/stripeWebhook.js
import express from "express";
import Stripe from "stripe";
import pool from "../db.js";

const router = express.Router();

// ⚠️ ESTE router se monta en index.js como:
// app.use("/payments/webhook", stripeWebhookRouter);
// Por eso aquí la ruta es "/"
router.post(
  "/",
  // MUY IMPORTANTE: el webhook necesita el raw body, SIN bodyParser.json
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });

      const sig = req.headers["stripe-signature"];
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err) {
        console.error("❌ Firma inválida del webhook:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Log de evento
      console.log("Evento recibido:", event.type);

      // --- HANDLER ---
      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object;

        // metadata.user_id lo pusimos al crear el intent
        const userId = Number(pi.metadata?.user_id);
        if (!userId) {
          console.warn("⚠️ payment_intent.succeeded SIN user_id en metadata");
          return res.status(200).send("ok");
        }

        // Cálculo del total (puedes confiar en pi.amount, que viene en centavos)
        const total = Number(pi.amount) / 100;

        // Creamos la orden + items y limpiamos carrito en transacción
        const client = await pool.connect();
        try {
          await client.query("BEGIN");

          // Obtener carrito e items
          const cart = await client.query(
            "SELECT id FROM carts WHERE user_id=$1",
            [userId]
          );
          if (!cart.rows.length) {
            console.warn("⚠️ Usuario sin carrito al pagar:", userId);
            await client.query("COMMIT");
            return res.status(200).send("ok");
          }
          const cartId = cart.rows[0].id;

          const items = await client.query(
            `SELECT ci.product_id, ci.quantity, ci.price_at_add AS price
             FROM cart_items ci
             WHERE ci.cart_id = $1
             ORDER BY ci.id ASC`,
            [cartId]
          );

          // Crear orden
          const orderRes = await client.query(
            `INSERT INTO orders (user_id, total, status, payment_status, stripe_payment_intent_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, user_id, total, status, payment_status, created_at`,
            [userId, total, "paid", "paid", pi.id]
          );

          // Insertar items y descontar stock
          for (const it of items.rows) {
            await client.query(
              `INSERT INTO order_items (order_id, product_id, quantity, price)
               VALUES ($1, $2, $3, $4)`,
              [orderRes.rows[0].id, it.product_id, it.quantity, it.price]
            );
            await client.query(
              `UPDATE products SET stock = stock - $1 WHERE id = $2`,
              [it.quantity, it.product_id]
            );
          }

          // Limpiar carrito
          await client.query("DELETE FROM cart_items WHERE cart_id=$1", [cartId]);

          await client.query("COMMIT");
          console.log(
            `✅ Orden creada por webhook: ${orderRes.rows[0].id} intent: ${pi.id}`
          );
        } catch (e) {
          await client.query("ROLLBACK");
          console.error("❌ Error webhook creando orden:", e);
        } finally {
          client.release();
        }
      }

      // Responder OK SIEMPRE que procesemos el evento
      res.status(200).send("ok");
    } catch (e) {
      console.error("❌ Webhook handler error:", e);
      res.status(500).send("error");
    }
  }
);

export default router;
