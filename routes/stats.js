// routes/stats.js
import express from "express";
import pool from "../db.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

/* GET /stats/sales?from=YYYY-MM-DD&to=YYYY-MM-DD */
router.get("/sales", verifyToken, verifyAdmin, async (req, res) => {
  const { from, to } = req.query;
  const params = [];
  const where = [];

  if (from) { params.push(from); where.push(`o.created_at >= $${params.length}`); }
  if (to)   { params.push(to);   where.push(`o.created_at <= $${params.length}`); }

  const sql =
  `SELECT
     COUNT(*)::int AS orders_count,
     COALESCE(SUM(o.total), 0)::numeric(12,2) AS total_revenue
   FROM orders o
   ${where.length ? "WHERE " + where.join(" AND ") : ""}`;

  const { rows } = await pool.query(sql, params);
  res.json(rows[0]);
});

/* GET /stats/top-products?limit=5&from=...&to=... */
router.get("/top-products", verifyToken, verifyAdmin, async (req, res) => {
  const { limit = 5, from, to } = req.query;
  const params = [];
  const where = [];

  if (from) { params.push(from); where.push(`o.created_at >= $${params.length}`); }
  if (to)   { params.push(to);   where.push(`o.created_at <= $${params.length}`); }

  const sql =
  `SELECT p.id, p.name,
          SUM(oi.quantity)::int AS total_units,
          SUM(oi.quantity * oi.price)::numeric(12,2) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     ${where.length ? "WHERE " + where.join(" AND ") : ""}
     GROUP BY p.id, p.name
     ORDER BY total_units DESC
     LIMIT ${Number(limit)}`;

  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

export default router;
