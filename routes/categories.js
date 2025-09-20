// routes/categories.js
import express from "express";
import pool from "../db.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET /categories
router.get("/", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT id, name, description, created_at FROM categories ORDER BY id ASC"
  );
  res.json(rows);
});

// GET /categories/:id
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "ID inválido" });
  const { rows } = await pool.query(
    "SELECT id, name, description, created_at FROM categories WHERE id=$1",
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: "Categoría no encontrada" });
  res.json(rows[0]);
});

// PUT /categories/:id  (editar)
router.put("/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "ID inválido" });

  let { name, description } = req.body || {};
  name = (name || "").trim();
  if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });
  description = description == null ? null : String(description).trim() || null;

  const { rows } = await pool.query(
    `UPDATE categories SET name=$1, description=$2 WHERE id=$3
     RETURNING id, name, description, created_at`,
    [name, description, id]
  );
  if (!rows.length) return res.status(404).json({ error: "Categoría no encontrada" });
  res.json(rows[0]);
});

// DELETE /categories/:id  (con posible reassignTo)
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const reassignTo = req.query.reassignTo ? parseInt(req.query.reassignTo, 10) : null;

  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "ID inválido" });
  if (reassignTo != null) {
    if (!Number.isInteger(reassignTo) || reassignTo <= 0) return res.status(400).json({ error: "reassignTo inválido" });
    if (reassignTo === id) return res.status(400).json({ error: "reassignTo no puede ser igual al ID a eliminar" });
  }

  try {
    await pool.query("BEGIN");

    const exists = await pool.query("SELECT 1 FROM categories WHERE id=$1", [id]);
    if (!exists.rows.length) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    const cnt = await pool.query("SELECT COUNT(*)::int AS c FROM products WHERE category_id=$1", [id]);
    const count = cnt.rows[0]?.c ?? 0;

    if (count > 0 && reassignTo == null) {
      await pool.query("ROLLBACK");
      return res.status(409).json({
        error: `No se puede eliminar: ${count} producto(s) la usan`,
        needReassign: true,
        count,
      });
    }

    if (count > 0 && reassignTo != null) {
      const dst = await pool.query("SELECT 1 FROM categories WHERE id=$1", [reassignTo]);
      if (!dst.rows.length) {
        await pool.query("ROLLBACK");
        return res.status(400).json({ error: "La categoría destino no existe" });
      }
      await pool.query("UPDATE products SET category_id=$1 WHERE category_id=$2", [reassignTo, id]);
    }

    await pool.query("DELETE FROM categories WHERE id=$1", [id]);
    await pool.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("DELETE /categories/:id", err);
    res.status(500).json({ error: "No se pudo eliminar la categoría" });
  }
});

export default router; // 👈 export por defecto
