// routes/orders.js
import express from "express";
import pool from "../db.js";
import { validate } from "../middleware/validate.js";
import { createOrderSchema, updateOrderStatusSchema } from "../schemas/orderSchemas.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";


const router = express.Router();


/** Helper: verifica que el usuario sea el dueño de la orden o admin */
async function assertOwnerOrAdmin(client, orderId, user) {
  const { rows } = await client.query(
    "SELECT user_id FROM orders WHERE id = $1",
    [orderId]
  );
  if (!rows.length) return { exists: false, allowed: false };
  const isOwner = rows[0].user_id === user.id;
  const allowed = isOwner || !!user.is_admin;
  return { exists: true, allowed };
}

/**
 * POST /orders
 * Crea una orden (sin Stripe) desde items enviados: [{ product_id, quantity }]
 * - Valida stock
 * - Inserta order + order_items
 * - Descuenta stock
 * - Todo en transacción
 */
router.post("/", verifyToken, validate(createOrderSchema), async (req, res) => {
  const { items } = req.body; // [{ product_id, quantity }]
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Debe enviar al menos un producto" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Valida y calcula total
    let total = 0;
    for (const it of items) {
      const pid = Number(it.product_id);
      const qty = Number(it.quantity);
      if (!pid || !qty || qty <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Items inválidos" });
      }

      const { rows } = await client.query(
        "SELECT price, COALESCE(stock, 0) AS stock FROM products WHERE id=$1",
        [pid]
      );
      if (!rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Producto ${pid} no encontrado` });
      }
      const price = Number(rows[0].price);
      const stock = Number(rows[0].stock);
      if (qty > stock) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Stock insuficiente para producto ${pid}` });
      }
      total += price * qty;
    }

    // Crea cabecera
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, total, status, payment_status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, total, status, payment_status, created_at`,
      [req.user.id, total, "pending", "unpaid"]
    );
    const order = orderRows[0];

    // Inserta items y descuenta stock
    for (const it of items) {
      const pid = Number(it.product_id);
      const qty = Number(it.quantity);

      const { rows: pRows } = await client.query(
        "SELECT price FROM products WHERE id=$1",
        [pid]
      );
      const price = Number(pRows[0].price);

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, pid, qty, price]
      );

      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id = $2",
        [qty, pid]
      );
    }

    await client.query("COMMIT");
    return res.status(201).json({ message: "Pedido creado", order });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ POST /orders:", err);
    return res.status(500).json({ error: "Error al crear pedido" });
  } finally {
    client.release();
  }
});

/**
 * GET /orders
 * Historial del usuario autenticado (lista compacta)
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, total, status, payment_status, stripe_payment_intent_id, created_at
         FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ GET /orders:", err);
    res.status(500).json({ error: "Error al obtener pedidos" });
  }
});

/**
 * GET /orders/:id
 * Detalle de una orden (dueño o admin)
 */
router.get("/:id", verifyToken, async (req, res) => {
  const orderId = Number(req.params.id);
  if (Number.isNaN(orderId)) {
    return res.status(400).json({ error: "order id inválido" });
  }

  const client = await pool.connect();
  try {
    const { exists, allowed } = await assertOwnerOrAdmin(client, orderId, req.user);
    if (!exists) return res.status(404).json({ error: "Pedido no encontrado" });
    if (!allowed) return res.status(403).json({ error: "No tienes permisos para ver este pedido" });

    const { rows: headerRows } = await client.query(
      `SELECT id, user_id, total, status, payment_status, stripe_payment_intent_id, created_at
         FROM orders
        WHERE id = $1`,
      [orderId]
    );
    const order = headerRows[0];

    const { rows: items } = await client.query(
      `SELECT oi.product_id, p.name AS product_name, oi.quantity, oi.price,
              (oi.quantity * oi.price) AS subtotal
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = $1
        ORDER BY oi.id ASC`,
      [orderId]
    );

    res.json({ order, items });
  } catch (err) {
    console.error("❌ GET /orders/:id:", err);
    res.status(500).json({ error: "Error al obtener pedido" });
  } finally {
    client.release();
  }
});

/**
 * PUT /orders/:id
 * Cambiar estado.
 * - Dueño: solo puede cambiar a "cancelled" si está "pending"
 * - Admin: puede poner cualquier estado: pending|paid|shipped|cancelled
 */
router.put("/:id", verifyToken, validate(updateOrderStatusSchema), async (req, res) => {
  const orderId = Number(req.params.id);
  const { status } = req.body;
  const ALLOWED = ["pending", "paid", "shipped", "cancelled"];

  if (!status || !ALLOWED.includes(status)) {
    return res.status(400).json({ error: "Estado inválido" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { exists, allowed } = await assertOwnerOrAdmin(client, orderId, req.user);
    if (!exists) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    if (req.user.is_admin) {
      // Admin: libre
    } else {
      // Dueño: solo puede cancelar si está pending
      if (status !== "cancelled") {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "Solo admin puede cambiar a ese estado" });
      }
      const { rows } = await client.query(
        "SELECT status FROM orders WHERE id = $1",
        [orderId]
      );
      if (rows[0].status !== "pending") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Solo se puede cancelar una orden en estado pending" });
      }
    }

    const { rows: upd } = await client.query(
      "UPDATE orders SET status=$1 WHERE id=$2 RETURNING id, user_id, total, status, payment_status, created_at",
      [status, orderId]
    );

    await client.query("COMMIT");
    res.json(upd[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ PUT /orders/:id:", err);
    res.status(500).json({ error: "Error al actualizar pedido" });
  } finally {
    client.release();
  }
});

/**
 * DELETE /orders/:id
 * Eliminar pedido y devolver stock.
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

    // Si es dueño y no admin, solo si está pending
    if (!req.user.is_admin) {
      const { rows } = await client.query(
        "SELECT status FROM orders WHERE id = $1",
        [orderId]
      );
      if (rows[0].status !== "pending") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Solo puedes eliminar órdenes pendientes" });
      }
    }

    // Devuelve stock y elimina items
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
    await client.query("DELETE FROM order_items WHERE order_id = $1", [orderId]);

    // Elimina orden
    const { rows: del } = await client.query(
      "DELETE FROM orders WHERE id = $1 RETURNING *",
      [orderId]
    );

    await client.query("COMMIT");
    res.json({ message: "Pedido eliminado correctamente", order: del[0] });
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
