import express from "express";
import pool from "../db.js";

const router = express.Router();

// GET /categories -> lista todas las categorías
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM categories");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener categorías" });
    }
});

// POST /categories -> agregar nueva categoría
router.post("/", async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: "Falta el nombre de la categoría" });
    }
    try {
        const result = await pool.query(
            "INSERT INTO categories (name) VALUES ($1) RETURNING *",
            [name]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al crear categoría" });
    }
});

export default router;
