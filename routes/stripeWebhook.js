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

        // order_id lo pusimos en la metadata al crear el intent, cuando la
        // orden (con sus items, foto fija del carrito de ese momento) ya
        // había sido creada como pending/unpaid. Aquí solo la confirmamos.
        const orderId = Number(pi.metadata?.order_id);
        if (!orderId) {
          console.warn("⚠️ payment_intent.succeeded SIN order_id en metadata:", pi.id);
          return res.status(200).send("ok");
        }

        const client = await pool.connect();
        try {
          await client.query("BEGIN");

          const { rows: orderRows } = await client.query(
            "SELECT id, user_id, payment_status FROM orders WHERE id=$1 FOR UPDATE",
            [orderId]
          );
          if (!orderRows.length) {
            console.warn(`⚠️ Orden ${orderId} no encontrada para intent ${pi.id}`);
            await client.query("COMMIT");
            return res.status(200).send("ok");
          }

          // Idempotencia: si Stripe reintenta el evento, no volver a
          // descontar stock ni reprocesar una orden ya confirmada.
          if (orderRows[0].payment_status === "paid") {
            console.log(`↩️ Orden ${orderId} ya estaba paga, se ignora el reintento`);
            await client.query("COMMIT");
            return res.status(200).send("ok");
          }

          const { rows: items } = await client.query(
            "SELECT product_id, quantity FROM order_items WHERE order_id=$1",
            [orderId]
          );

          // Bloqueamos la fila del producto (FOR UPDATE) para que dos pagos
          // concurrentes del mismo producto no lean el mismo stock a la vez.
          for (const it of items) {
            const { rows: locked } = await client.query(
              `SELECT stock FROM products WHERE id = $1 FOR UPDATE`,
              [it.product_id]
            );
            const currentStock = Number(locked[0]?.stock ?? 0);
            if (currentStock < it.quantity) {
              // El pago ya se cobró en Stripe y no se puede deshacer aquí;
              // dejamos el stock en 0 y avisamos para que se resuelva a mano.
              console.warn(
                `⚠️ Sobreventa: producto ${it.product_id} tenía ${currentStock} y se vendieron ${it.quantity} (orden ${orderId})`
              );
            }
            await client.query(
              `UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2`,
              [it.quantity, it.product_id]
            );
          }

          await client.query(
            "UPDATE orders SET status='paid', payment_status='paid', stripe_payment_intent_id=$1 WHERE id=$2",
            [pi.id, orderId]
          );

          // El carrito se vacía hasta aquí (no al crear el intent) para que,
          // si el usuario abandona el pago, no pierda lo que tenía.
          await client.query(
            `DELETE FROM cart_items
             WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1)`,
            [orderRows[0].user_id]
          );

          await client.query("COMMIT");
          console.log(`✅ Orden ${orderId} confirmada por webhook, intent: ${pi.id}`);
        } catch (e) {
          await client.query("ROLLBACK");
          console.error("❌ Error webhook confirmando orden:", e);
          return res.status(500).send("error confirmando la orden, reintentar");
        } finally {
          client.release();
        }
      }

      res.status(200).send("ok");
    } catch (e) {
      console.error("❌ Webhook handler error:", e);
      res.status(500).send("error");
    }
  }
);

export default router;
