// routes/orders.js
import express from "express";
import pool from "../db.js";
import { validate } from "../middleware/validate.js";
import { updateOrderStatusSchema } from "../schemas/orderSchemas.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";
import { transitionOrderStatus, OrderTransitionError } from "../services/orderStatus.js";


const router = express.Router();


/** Helper: verifica que el usuario sea el dueño de la orden o admin */
async function assertOwnerOrAdmin(client, orderId, user) {
  const { rows } = await client.query(
    "SELECT user_id FROM orders WHERE id = $1",
    [orderId]
  );
  if (!rows.length) return { exists: false, allowed: false };
  const isOwner = rows[0].user_id === user.id;
  const allowed = isOwner || user.role === "admin";
  return { exists: true, allowed };
}

// El checkout real pasa por /payments/create-intent (Stripe) + el webhook
// en routes/stripeWebhook.js, que es quien crea la orden tras confirmar el pago.
// Existió aquí una ruta POST / que creaba pedidos y descontaba stock sin pasar
// por Stripe — se eliminó por ser un bypass de pago.

/**
 * GET /orders
 * Historial del usuario autenticado (lista compacta)
 */
router.get("/", verifyToken, async (req, res) => {
  const { status, from, to } = req.query;
  const uid = req.user.id;

  const params = [uid];
  const where = ["o.user_id = $1"];

  if (status) {
    params.push(status);
    where.push(`o.status = $${params.length}`);
  }
  if (from) {
    params.push(from);
    where.push(`o.created_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    where.push(`o.created_at <= $${params.length}`);
  }

  const sql = `
    SELECT
      o.id,
      o.user_id,
      o.status,
      o.total::numeric::float8 AS total,
      o.created_at,
      o.updated_at
    FROM orders o
    WHERE ${where.join(" AND ")}
    ORDER BY o.created_at DESC
  `;
  try {
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /orders", err);
    res.status(500).json({ error: "No se pudieron obtener tus pedidos" });
  }
});

/**
 * GET /orders/:id
 * Detalle de una orden (dueño o admin)
 */
router.get("/:id", verifyToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  try {
    const { rows: oh } = await pool.query(
      `SELECT id, user_id, status,
              total::numeric::float8 AS total,
              created_at, updated_at,
              shipping_name, shipping_phone, shipping_address, shipping_city, shipping_zip
       FROM orders
       WHERE id=$1`,
      [id]
    );
    if (!oh.length) return res.status(404).json({ error: "Pedido no encontrado" });
    const order = oh[0];
    if (order.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "No autorizado" });
    }

    const { rows: items } = await pool.query(
      `SELECT
         oi.id, oi.product_id, p.name, p.image_url,
         oi.quantity, oi.price::numeric::float8 AS unit_price,
         (oi.quantity * oi.price)::numeric::float8 AS line_total
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id=$1
       ORDER BY oi.id ASC`,
      [id]
    );

    res.json({ order, items });
  } catch (err) {
    console.error("GET /orders/:id", err);
    res.status(500).json({ error: "No se pudo cargar el pedido" });
  }
});


/**
 * PUT /orders/:id
 * Cambiar estado. La máquina de transiciones y el reembolso real (si
 * corresponde) viven en services/orderStatus.js — es el mismo servicio
 * que usa /admin/orders/:id/status, así que no hay dos caminos con
 * reglas distintas.
 * - Dueño: solo puede cancelar su propia orden mientras esté "pending"
 * - Admin: cualquier transición válida (ver services/orderStatus.js)
 */
router.put("/:id", verifyToken, validate(updateOrderStatusSchema), async (req, res) => {
  const orderId = Number(req.params.id);
  const { status } = req.body;

  try {
    const { exists, allowed } = await assertOwnerOrAdmin(pool, orderId, req.user);
    if (!exists) return res.status(404).json({ error: "Pedido no encontrado" });
    if (!allowed) return res.status(403).json({ error: "No tienes permisos sobre este pedido" });

    const isAdmin = req.user.role === "admin";
    if (!isAdmin && status !== "cancelled") {
      return res.status(403).json({ error: "Solo admin puede cambiar a ese estado" });
    }

    const updated = await transitionOrderStatus({ orderId, newStatus: status, actorIsAdmin: isAdmin });
    res.json(updated);
  } catch (err) {
    if (err instanceof OrderTransitionError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("❌ PUT /orders/:id:", err);
    res.status(500).json({ error: "Error al actualizar pedido" });
  }
});

/**
 * DELETE /orders/:id
 * Eliminar pedido (devuelve stock solo si estaba pagado).
 * - Dueño: solo si está "pending"
 * - Admin: siempre
 */
router.delete("/:id", verifyToken, async (req, res) => {
  const orderId = Number(req.params.id);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { exists, allowed } = await assertOwnerOrAdmin(client, orderId, req.user);
    if (!exists) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    if (!allowed) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "No tienes permisos para eliminar este pedido" });
    }

    // Un admin puede forzar el borrado de una orden pagada con
    // ?force=true — pensado para limpiar datos de prueba, NO para
    // "cancelar" un pedido real: esto no reembolsa en Stripe. Si hay
    // que devolverle el dinero a un cliente de verdad, se usa el
    // cambio de estado a "cancelled" (services/orderStatus.js), que sí
    // reembolsa. Un dueño normal nunca puede forzar esto.
    const isAdmin = req.user.role === "admin";
    const force = req.query.force === "true" && isAdmin;

    const { rows: payRows } = await client.query(
      "SELECT payment_status FROM orders WHERE id = $1",
      [orderId]
    );
    const wasPaid = payRows[0].payment_status === "paid";
    if (wasPaid && !force) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "No se puede eliminar una orden ya pagada. Cambia su estado a cancelada (reembolsa de verdad) o, si es un dato de prueba, reintenta con ?force=true.",
        canForce: isAdmin,
      });
    }

    // Si es dueño y no admin, solo si está pending
    if (!isAdmin) {
      const { rows } = await client.query(
        "SELECT status FROM orders WHERE id = $1",
        [orderId]
      );
      if (rows[0].status !== "pending") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Solo puedes eliminar órdenes pendientes" });
      }
    }

    // Devuelve stock solo si estaba pagada: el stock se descuenta en el
    // webhook al confirmar el pago, así que una orden sin pagar nunca lo restó.
    if (wasPaid) {
      const { rows: items } = await client.query(
        "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
        [orderId]
      );
      for (const it of items) {
        await client.query(
          "UPDATE products SET stock = stock + $1 WHERE id = $2",
          [it.quantity, it.product_id]
        );
      }
    }
    await client.query("DELETE FROM order_items WHERE order_id = $1", [orderId]);

    // Elimina orden
    const { rows: del } = await client.query(
      "DELETE FROM orders WHERE id = $1 RETURNING *",
      [orderId]
    );

    await client.query("COMMIT");
    res.json({
      message: wasPaid
        ? "Pedido eliminado (estaba pagado, NO se reembolsó en Stripe)"
        : "Pedido eliminado correctamente",
      order: del[0],
      forced: wasPaid,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ DELETE /orders/:id:", err);
    res.status(500).json({ error: "Error al eliminar pedido" });
  } finally {
    client.release();
  }
});

/**
 * GET /orders/all  (solo admin)
 * Listado global
 */
router.get("/all/admin", verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.user_id, u.name AS user_name, o.total,
              o.status, o.payment_status, o.stripe_payment_intent_id, o.created_at
         FROM orders o
         JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error("❌ GET /orders/all/admin:", e);
    res.status(500).json({ error: "No se pudo listar las órdenes" });
  }
});

export default router;
