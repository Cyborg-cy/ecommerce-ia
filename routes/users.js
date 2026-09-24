import express from "express";
import pool from "../db.js";
import bcrypt from "bcrypt";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, updateMeSchema } from "../schemas/userSchemas.js"

// Columnas del perfil que ve/edita el propio usuario (nunca password ni role).
const PROFILE_COLUMNS = "id, name, email, role, phone, address_line, city, zip, created_at";

const router = express.Router();

// =====================
// POST /users/register
// Registrar un nuevo usuario
// =====================
router.post("/register", validate(registerSchema), async (req, res) => {
    // El registro público SIEMPRE crea usuarios con role "user".
    // Un admin se promueve después vía PATCH /admin/users/:id/role.
    const { name, email, password } = req.body;
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
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'user') RETURNING id, name, email, role, created_at",
            [name, email, hashedPassword]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al registrar usuario" });
    }
});

// El login vive en POST /auth/login (routes/auth.js), que además emite
// refresh token. Antes existía POST /users/login duplicado y desincronizado
// (sin refresh, expiración hardcodeada) — se eliminó.

// =====================
// GET /users/me
// Perfil del usuario autenticado
// (va antes de las rutas /:id para que "me" no se tome como un id)
// =====================
router.get("/me", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ${PROFILE_COLUMNS} FROM users WHERE id = $1`,
            [req.user.id]
        );
        if (!result.rows.length) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("❌ GET /users/me:", err);
        res.status(500).json({ error: "Error al obtener el perfil" });
    }
});

// =====================
// PUT /users/me
// Editar nombre, teléfono y dirección del propio usuario (parcial)
// =====================
router.put("/me", verifyToken, validate(updateMeSchema), async (req, res) => {
    // Tras validate, req.body solo trae claves del schema (stripUnknown),
    // así que es seguro usarlas como nombres de columna.
    const fields = Object.entries(req.body).map(([key, value]) => [
        key,
        value === "" ? null : value, // "" borra el dato
    ]);

    const sets = fields.map(([key], i) => `${key} = $${i + 1}`);
    const params = fields.map(([, value]) => value);
    params.push(req.user.id);

    try {
        const result = await pool.query(
            `UPDATE users SET ${sets.join(", ")} WHERE id = $${params.length}
             RETURNING ${PROFILE_COLUMNS}`,
            params
        );
        if (!result.rows.length) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("❌ PUT /users/me:", err);
        res.status(500).json({ error: "Error al actualizar el perfil" });
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
        if (parseInt(id) !== req.user.id && req.user.role !== "admin") {
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
