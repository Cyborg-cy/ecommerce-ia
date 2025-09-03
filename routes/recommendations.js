// routes/recommendations.js
import express from "express";
import pool from "../db.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/* -------------------------------------------
   GET /recommendations/by-user  (token)
   Lógica:
   - Top categorías del usuario según sus pedidos
   - Si no tiene pedidos: usa categorías de su carrito
   - Devuelve productos disponibles (stock>0), ordenados por popularidad simple
-------------------------------------------- */
router.get("/by-user", verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // Top categorías por historial de compras
    const catFromOrders = await pool.query(
      `SELECT p.category_id, COUNT(*) as cnt
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
        WHERE o.user_id = $1
        GROUP BY p.category_id
        ORDER BY cnt DESC
        LIMIT 3`,
      [userId]
    );

    let categoryIds = catFromOrders.rows.map(r => r.category_id);

    // Si no hay historial, intenta con el carrito
    if (!categoryIds.length) {
      const catFromCart = await pool.query(
        `SELECT DISTINCT p.category_id
           FROM carts c
           JOIN cart_items ci ON ci.cart_id = c.id
           JOIN products p ON p.id = ci.product_id
          WHERE c.user_id = $1
          LIMIT 3`,
        [userId]
      );
      categoryIds = catFromCart.rows.map(r => r.category_id);
    }

    // Si sigue vacío, recomendar los más vendidos globales
    if (!categoryIds.length) {
      const topGlobal = await pool.query(
        `SELECT p.id, p.name, p.description, p.price::numeric::float8 AS price, p.stock,
                p.category_id, c.name AS category_name
           FROM products p
           LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.stock > 0
          ORDER BY p.created_at DESC
          LIMIT 10`
      );
      return res.json({ basedOn: "global_newest", items: topGlobal.rows });
    }

    // Recolectar productos por esas categorías, ordenados por “popularidad” simple:
    // ventas totales + fecha reciente
    const recs = await pool.query(
      `SELECT p.id, p.name, p.description, p.price::numeric::float8 AS price, p.stock,
              p.category_id, c.name AS category_name,
              COALESCE(SUM(oi.quantity), 0) AS sold_qty
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN order_items oi ON oi.product_id = p.id
        WHERE p.stock > 0 AND p.category_id = ANY($1::int[])
        GROUP BY p.id, c.id
        ORDER BY sold_qty DESC, p.created_at DESC
        LIMIT 12`,
      [categoryIds]
    );

    res.json({
      basedOn: "user_categories",
      categories: categoryIds,
      items: recs.rows
    });
  } catch (err) {
    console.error("❌ /recommendations/by-user:", err);
    res.status(500).json({ error: "Error generando recomendaciones por usuario" });
  }
});

/* -------------------------------------------
   GET /recommendations/by-product/:id  (público)
   Lógica:
   - Toma la categoría del producto base y sugiere otros de la misma categoría
-------------------------------------------- */
router.get("/by-product/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const base = await pool.query(
      `SELECT id, category_id FROM products WHERE id=$1`,
      [id]
    );
    if (!base.rows.length) {
      return res.status(404).json({ error: "Producto base no encontrado" });
    }
    const catId = base.rows[0].category_id;

    const recs = await pool.query(
      `SELECT p.id, p.name, p.description, p.price::numeric::float8 AS price, p.stock,
              p.category_id, c.name AS category_name
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.stock > 0 AND p.category_id=$1 AND p.id <> $2
        ORDER BY p.created_at DESC
        LIMIT 8`,
      [catId, id]
    );

    res.json({ basedOn: "same_category", category_id: catId, items: recs.rows });
  } catch (err) {
    console.error("❌ /recommendations/by-product/:id:", err);
    res.status(500).json({ error: "Error generando recomendaciones por producto" });
  }
});

export default router;
