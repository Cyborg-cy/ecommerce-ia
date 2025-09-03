import express from "express";
import pool from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../schemas/userSchemas.js";

const router = express.Router();

// =====================
// POST /users/register
// Registrar un nuevo usuario
// =====================
router.post("/register", validate(registerSchema), async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: "Faltan datos" });
    }

    try {
        const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: "El email ya está registrado" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
            [name, email, hashedPassword, role || "user"]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al registrar usuario" });
    }
});

// =====================
// POST /users/login
// Iniciar sesión
// =====================
router.post("/login", validate(loginSchema), async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Faltan datos" });
    }

    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (!user || !user.password) {
            return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al iniciar sesión" });
    }
});

// =====================
// GET /users
// Listar usuarios (solo admins)
// =====================
router.get("/", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT id, name, email, created_at FROM users");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener usuarios" });
    }
});

// =====================
// PUT /users/:id
// Actualizar usuario (el mismo o admin)
// =====================
router.put("/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { name, email, password } = req.body;

    try {
        if (parseInt(id) !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ error: "No autorizado" });
        }

        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        const result = await pool.query(
            `UPDATE users 
             SET name = COALESCE($1, name), 
                 email = COALESCE($2, email), 
                 password = COALESCE($3, password) 
             WHERE id = $4 
             RETURNING id, name, email, created_at`,
            [name, email, hashedPassword, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar usuario" });
    }
});

// =====================
// DELETE /users/:id
// Eliminar usuario (solo admins)
// =====================
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json({ message: "Usuario eliminado" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al eliminar usuario" });
    }
});

export default router;
