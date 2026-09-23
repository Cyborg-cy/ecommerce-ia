// routes/categories.js
// Rutas públicas de solo lectura. La edición/borrado de categorías vive en
// routes/admin.js bajo /admin/categories (es lo único que usa el frontend).
import express from "express";
import pool from "../db.js";

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

export default router; // 👈 export por defecto
