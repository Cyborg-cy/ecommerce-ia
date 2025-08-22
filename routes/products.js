import express from "express";
import pool from "../db.js";
const router = express.Router();
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

// Obtener todos los productos
router.get("/", async (req, res) => {
  const result = await db.query("SELECT * FROM products");
  res.json(result.rows);
});

// Crear producto (solo admin)
router.post("/", verifyToken, verifyAdmin, async (req, res) => {
  const { name, price, stock, category_id } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO products (name, price, stock, category_id) VALUES ($1,$2,$3,$4) RETURNING *",
      [name, price, stock, category_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear producto" });
  }
});

// GET /products -> lista todos los productos
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM products");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener productos" });
    }
});

// GET /products/:id -> obtener producto por ID
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("SELECT * FROM products WHERE id=$1", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener producto" });
    }
});

// POST /products -> agregar nuevo producto (protegido)
router.post("/", verifyToken, async (req, res) => {
    const { name, description, price, stock, category_id } = req.body;
    if (!name || !price || !stock || !category_id) {
        return res.status(400).json({ error: "Faltan datos del producto" });
    }
    try {
        const result = await pool.query(
            "INSERT INTO products (name, description, price, stock, category_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [name, description, price, stock, category_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al crear producto" });
    }
});

// PUT /products/:id -> actualizar producto (protegido)
router.put("/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock, category_id } = req.body;
    try {
        const result = await pool.query(
            "UPDATE products SET name=$1, description=$2, price=$3, stock=$4, category_id=$5 WHERE id=$6 RETURNING *",
            [name, description, price, stock, category_id, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar producto" });
    }
});

// DELETE /products/:id -> eliminar producto (protegido)
router.delete("/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "DELETE FROM products WHERE id=$1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }
        res.json({ message: "Producto eliminado", product: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al eliminar producto" });
    }
});

export default router;
