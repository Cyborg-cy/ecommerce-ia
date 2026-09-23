// routes/payments.js
import express from "express";
import Stripe from "stripe";
import pool from "../db.js";
import { verifyToken } from "../middleware/auth.js";

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
 * - Suma carrito y crea PaymentIntent real
 */
router.post("/create-intent", verifyToken, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe no inicializado" });
    }

    const { rows } = await pool.query(
      `SELECT ci.quantity, ci.price_at_add AS price
       FROM carts c
       JOIN cart_items ci ON ci.cart_id = c.id
       WHERE c.user_id = $1`,
      [req.user.id]
    );
    if (!rows.length) {
      console.warn("🧺 Carrito vacío user:", req.user.id);
      return res.status(400).json({ error: "El carrito está vacío" });
    }

    let amount = 0;
    for (const r of rows) {
      const priceNum = Number(r.price);
      const qtyNum = Number(r.quantity);
      if (Number.isNaN(priceNum) || Number.isNaN(qtyNum)) {
        console.error("❌ price/quantity inválidos:", r);
        return res.status(400).json({ error: "Datos de carrito inválidos" });
      }
      amount += Math.round(priceNum * 100) * qtyNum;
    }

    const currency = (process.env.CURRENCY || "usd").toLowerCase();
    if (amount <= 0) {
      console.error("❌ Monto total <= 0:", amount);
      return res.status(400).json({ error: "Total de carrito inválido" });
    }
    if (currency === "usd" && amount < 50) {
      console.warn("⚠️ Monto menor a 50 cents:", amount);
      return res.status(400).json({ error: "El total es muy bajo para procesar el pago" });
    }

    console.log("💳 Creando PaymentIntent:", { user_id: req.user.id, amount, currency });
    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { user_id: String(req.user.id) },
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },

    });

    console.log("✅ PaymentIntent:", intent.id);
    res.json({
      clientSecret: intent.client_secret,
      amount,
      currency,
      payment_intent_id: intent.id,
    });
  } catch (e) {
    console.error("❌ POST /payments/create-intent:", e?.message || e);
    res.status(500).json({ error: "No se pudo crear el pago", detail: e?.message || String(e) });
  }
});

export default router;
