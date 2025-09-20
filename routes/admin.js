// routes/admin.js
import express from "express";
import pool from "../db.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

/* ---------- USERS (ejemplo que ya tienes) ---------- */
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1"), 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || "20"), 1), 100);
  const offset = (page - 1) * pageSize;

  const { rows } = await pool.query(
    `SELECT id, name, email, role, created_at
     FROM users
     ORDER BY id ASC
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );
  res.json({ page, pageSize, users: rows });
});

router.patch("/users/:id/role", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!["user", "admin"].includes(role)) {
    return res.status(400).json({ error: "Rol inválido" });
  }
  const { rows } = await pool.query(
    "UPDATE users SET role=$1 WHERE id=$2 RETURNING id, name, email, role, created_at",
    [role, id]
  );
  if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json(rows[0]);
});

/* ---------- ORDERS (ejemplo que ya tienes) ---------- */
router.get("/orders", verifyToken, verifyAdmin, async (req, res) => {
  const { status, from, to } = req.query;
  const params = [];
  const where = [];

  if (status) { params.push(status); where.push(`o.status = $${params.length}`); }
  if (from)   { params.push(from);   where.push(`o.created_at >= $${params.length}`); }
  if (to)     { params.push(to);     where.push(`o.created_at <= $${params.length}`); }

  const sql =
  `SELECT o.*, u.email
     FROM orders o
     JOIN users u ON u.id = o.user_id
     ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY o.created_at DESC`;

  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

/* ---------- STATS (ejemplo que ya tienes) ---------- */
router.get("/stats", verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const [{ rows: u }, { rows: p }, { rows: o }, { rows: r }] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total_users FROM users"),
      pool.query("SELECT COUNT(*)::int AS total_products FROM products"),
      pool.query("SELECT COUNT(*)::int AS total_orders FROM orders"),
      pool.query("SELECT COALESCE(SUM(total)::numeric::float8, 0) AS revenue_paid FROM orders WHERE status = 'paid'"),
    ]);
    res.json({ ...u[0], ...p[0], ...o[0], ...r[0] });
  } catch (err) {
    console.error("GET /admin/stats", err);
    res.status(500).json({ error: "No se pudieron obtener estadísticas" });
  }
});

/* ========== CATEGORIES (ADMIN) — ESTAS SON LAS QUE ROMPÍAN ========== */

// GET /admin/categories
router.get("/categories", verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, description FROM categories ORDER BY id ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /admin/categories", err);
    res.status(500).json({ error: "No se pudo cargar categorías" });
  }
});

// PUT /admin/categories/:id
router.put("/categories/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }
    let { name, description } = req.body || {};
    name = (name || "").trim();
    if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });
    description =
      description === undefined || description === null
        ? null
        : String(description).trim() || null;

    const { rows } = await pool.query(
      `UPDATE categories
         SET name=$1, description=$2
       WHERE id=$3
       RETURNING id, name, description`,
      [name, description, id]
    );
    if (!rows.length) return res.status(404).json({ error: "Categoría no encontrada" });
    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /admin/categories/:id", err);
    res.status(500).json({ error: "No se pudo guardar la categoría" });
  }
});

// DELETE /admin/categories/:id?reassignTo=<id>
router.delete("/categories/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const reassignTo = req.query.reassignTo ? parseInt(req.query.reassignTo, 10) : null;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  if (reassignTo !== null) {
    if (!Number.isInteger(reassignTo) || reassignTo <= 0) {
      return res.status(400).json({ error: "reassignTo inválido" });
    }
    if (reassignTo === id) {
      return res.status(400).json({ error: "reassignTo no puede ser igual al ID a eliminar" });
    }
  }

  try {
    await pool.query("BEGIN");

    const cat = await pool.query("SELECT id FROM categories WHERE id=$1", [id]);
    if (!cat.rows.length) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS count FROM products WHERE category_id=$1",
      [id]
    );
    const count = rows[0]?.count ?? 0;

    if (count > 0 && reassignTo === null) {
      await pool.query("ROLLBACK");
      return res.status(409).json({
        error: `No se puede eliminar: hay ${count} producto(s) usando esta categoría`,
        needReassign: true,
        count,
      });
    }

    if (count > 0 && reassignTo !== null) {
      const dst = await pool.query("SELECT id FROM categories WHERE id=$1", [reassignTo]);
      if (!dst.rows.length) {
        await pool.query("ROLLBACK");
        return res.status(400).json({ error: "La categoría destino no existe" });
      }
      await pool.query(
        "UPDATE products SET category_id=$1 WHERE category_id=$2",
        [reassignTo, id]
      );
    }

    await pool.query("DELETE FROM categories WHERE id=$1", [id]);
    await pool.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("DELETE /admin/categories/:id", err);
    res.status(500).json({ error: "No se pudo eliminar la categoría" });
  }
});

export default router;
