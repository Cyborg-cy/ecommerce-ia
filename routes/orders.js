import express from "express";
import pool from "../db.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// DELETE /orders/:id -> eliminar pedido y devolver stock
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Obtener los items del pedido para devolver stock
        const itemsResult = await client.query(
            "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
            [id]
        );

        if (itemsResult.rows.length > 0) {
            for (const item of itemsResult.rows) {
                await client.query(
                    "UPDATE products SET stock = stock + $1 WHERE id = $2",
                    [item.quantity, item.product_id]
                );
            }

            // Eliminar items del pedido
            await client.query("DELETE FROM order_items WHERE order_id = $1", [id]);
        }

        // Eliminar pedido
        const orderResult = await client.query(
            "DELETE FROM orders WHERE id = $1 RETURNING *",
            [id]
        );

        if (orderResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Pedido no encontrado" });
        }

        await client.query("COMMIT");
        res.json({ message: "Pedido eliminado correctamente", order: orderResult.rows[0] });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Error al eliminar pedido" });
    } finally {
        client.release();
    }
});

// PUT /orders/:id -> actualizar estado de pedido
router.put("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ error: "Falta el estado" });

  try {
    // Actualiza el pedido solo si pertenece al usuario
    const result = await pool.query(
      "UPDATE orders SET status=$1 WHERE id=$2 AND user_id=$3 RETURNING *",
      [status, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado o no tienes permisos" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar pedido" });
  }
});

// POST /orders -> crear un pedido
router.post("/", verifyToken, async (req, res) => {
    const { items } = req.body; // items: [{ product_id, quantity }]
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Debe enviar al menos un producto" });
    }

    try {
        // Calcular total del pedido
        let total = 0;
        for (const item of items) {
            const productRes = await pool.query("SELECT price, stock FROM products WHERE id=$1", [item.product_id]);
            const product = productRes.rows[0];
            if (!product) return res.status(400).json({ error: `Producto ${item.product_id} no encontrado` });
            if (product.stock < item.quantity) return res.status(400).json({ error: `Stock insuficiente para producto ${item.product_id}` });
            total += Number(product.price) * item.quantity;
        }

        // Crear pedido
        const orderRes = await pool.query(
            "INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING *",
            [req.user.id, total]
        );
        const order = orderRes.rows[0];

        // Insertar items del pedido y actualizar stock
        for (const item of items) {
            const productRes = await pool.query("SELECT price FROM products WHERE id=$1", [item.product_id]);
            const price = productRes.rows[0].price;

            await pool.query(
                "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
                [order.id, item.product_id, item.quantity, price]
            );

            await pool.query(
                "UPDATE products SET stock = stock - $1 WHERE id = $2",
                [item.quantity, item.product_id]
            );
        }

        res.status(201).json({ message: "Pedido creado", order_id: order.id, total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al crear pedido" });
    }
});

// GET /orders -> listar pedidos del usuario autenticado
router.get("/", verifyToken, async (req, res) => {
    try {
        const ordersRes = await pool.query(
            "SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC",
            [req.user.id]
        );
        const orders = ordersRes.rows;

        // Traer items de cada pedido
        for (let order of orders) {
            const itemsRes = await pool.query(
                "SELECT oi.id, p.name, oi.quantity, oi.price FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id=$1",
                [order.id]
            );
            order.items = itemsRes.rows;
        }

        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener pedidos" });
    }
});

// GET /orders/:id -> obtener pedido por ID
router.get("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM orders WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener pedido" });
  }
});

export default router;
