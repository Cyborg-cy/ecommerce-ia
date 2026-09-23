// routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../db.js";
import bcrypt from "bcrypt";
import { validate } from "../middleware/validate.js";
import { loginSchema } from "../schemas/userSchemas.js";

const router = express.Router();

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "1h" }
  );
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueRefreshToken(userId) {
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "7", 10);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  // refresh token opaco (no JWT), generado con el CSPRNG del sistema.
  // Solo se guarda su hash en la DB: si la base se filtra, los tokens
  // guardados no sirven para nada por sí solos.
  const token = crypto.randomBytes(48).toString("base64url");
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
    [userId, hashToken(token), expiresAt]
  );
  return token;
}

/* POST /auth/login -> { accessToken, refreshToken } */
router.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Faltan datos" });

  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Usuario o contraseña incorrectos" });

    const ok = await bcrypt.compare(password, user.password || "");
    if (!ok) return res.status(401).json({ error: "Usuario o contraseña incorrectos" });

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);

    res.json({ accessToken, refreshToken });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

/* POST /auth/refresh -> body: { refreshToken } */
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Falta refreshToken" });

  try {
    const { rows } = await pool.query(
      "SELECT rt.*, u.id AS user_id, u.name, u.email, u.role FROM refresh_tokens rt JOIN users u ON u.id=rt.user_id WHERE rt.token=$1",
      [hashToken(refreshToken)]
    );
    const row = rows[0];
    if (!row) return res.status(401).json({ error: "Refresh token inválido" });
    if (row.revoked_at) return res.status(401).json({ error: "Refresh token revocado" });
    if (new Date(row.expires_at) < new Date())
      return res.status(401).json({ error: "Refresh token expirado" });

    const accessToken = jwt.sign(
      { id: row.user_id, name: row.name, email: row.email, role: row.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "1h" }
    );
    res.json({ accessToken });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo refrescar el token" });
  }
});

/* POST /auth/logout -> body: { refreshToken } */
router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.json({ ok: true }); // idempotente

  try {
    await pool.query(
      "UPDATE refresh_tokens SET revoked_at=NOW() WHERE token=$1 AND revoked_at IS NULL",
      [hashToken(refreshToken)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.json({ ok: true });
  }
});

export default router;
