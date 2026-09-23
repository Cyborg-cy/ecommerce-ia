// services/orderStatus.js
//
// Único lugar del código que puede cambiar el estado de una orden.
// Antes existían dos rutas (PUT /orders/:id y PUT /admin/orders/:id/status)
// con lógica distinta — la de admin reembolsaba en Stripe y reponía stock
// al cancelar un pedido pagado, pero la otra no. Un admin podía usar la
// ruta "vieja" para saltarse el reembolso por completo. Ahora ambas rutas
// llaman a esta misma función, así que no hay forma de evitar la
// máquina de transiciones ni el reembolso real.

import Stripe from "stripe";
import pool from "../db.js";

let stripe;
try {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });
} catch (e) {
  console.error("❌ Stripe init error (orderStatus service):", e?.message || e);
}

// Transiciones válidas. "paid" solo se alcanza desde el webhook de Stripe
// (routes/stripeWebhook.js), nunca manualmente — por eso no aparece como
// destino aquí. Cancelled/refunded son estados finales.
const ALLOWED_TRANSITIONS = {
  pending: ["cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["cancelled"],
  cancelled: [],
};

export class OrderTransitionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "OrderTransitionError";
    this.status = status;
  }
}

/**
 * @param {number} orderId
 * @param {string} newStatus - pending | paid | shipped | cancelled
 * @param {boolean} actorIsAdmin - si quien pide el cambio es admin
 */
export async function transitionOrderStatus({ orderId, newStatus, actorIsAdmin }) {
  if (!["pending", "paid", "shipped", "cancelled"].includes(newStatus)) {
    throw new OrderTransitionError("Estado inválido");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: current } = await client.query(
      "SELECT status, payment_status, stripe_payment_intent_id FROM orders WHERE id=$1 FOR UPDATE",
      [orderId]
    );
    if (!current.length) {
      await client.query("ROLLBACK");
      throw new OrderTransitionError("Pedido no encontrado", 404);
    }
    const order = current[0];

    if (order.status === newStatus) {
      await client.query("ROLLBACK");
      return {
        id: orderId,
        status: order.status,
        payment_status: order.payment_status,
      };
    }

    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
      await client.query("ROLLBACK");
      throw new OrderTransitionError(
        `No se puede pasar de "${order.status}" a "${newStatus}"`
      );
    }

    const cancellingPaidOrder = newStatus === "cancelled" && order.payment_status === "paid";

    // Marcar como enviado, o cancelar un pedido ya pagado (lo que dispara
    // un reembolso real), son acciones que solo puede hacer un admin.
    if ((newStatus === "shipped" || cancellingPaidOrder) && !actorIsAdmin) {
      await client.query("ROLLBACK");
      throw new OrderTransitionError("Solo un admin puede hacer este cambio", 403);
    }

    let newPaymentStatus = order.payment_status;

    if (cancellingPaidOrder) {
      if (!order.stripe_payment_intent_id) {
        await client.query("ROLLBACK");
        throw new OrderTransitionError(
          "La orden está pagada pero no tiene un payment_intent para reembolsar.",
          400
        );
      }
      if (!stripe) {
        await client.query("ROLLBACK");
        throw new OrderTransitionError("Stripe no inicializado", 500);
      }
      try {
        // idempotencyKey: si esta llamada se reintenta (p.ej. porque el
        // paso de PostgreSQL de abajo falla y el cliente reintenta todo
        // el request), Stripe devuelve el mismo reembolso en vez de
        // crear uno nuevo.
        await stripe.refunds.create(
          { payment_intent: order.stripe_payment_intent_id },
          { idempotencyKey: `refund-order-${orderId}` }
        );
      } catch (stripeErr) {
        await client.query("ROLLBACK");
        console.error(
          `❌ Error reembolsando orden ${orderId} (intent ${order.stripe_payment_intent_id}):`,
          stripeErr?.message || stripeErr
        );
        throw new OrderTransitionError("No se pudo procesar el reembolso en Stripe", 502);
      }

      const { rows: items } = await client.query(
        "SELECT product_id, quantity FROM order_items WHERE order_id=$1",
        [orderId]
      );
      for (const it of items) {
        await client.query(
          "UPDATE products SET stock = stock + $1 WHERE id = $2",
          [it.quantity, it.product_id]
        );
      }
      newPaymentStatus = "refunded";
    }

    const { rows } = await client.query(
      `UPDATE orders SET status=$1, payment_status=$2 WHERE id=$3
       RETURNING id, user_id, status, payment_status, total::numeric::float8 AS total, created_at`,
      [newStatus, newPaymentStatus, orderId]
    );

    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
