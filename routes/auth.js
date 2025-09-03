// routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import bcrypt from "bcrypt";

const router = express.Router();

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "1h" }
  );
}

async function issueRefreshToken(userId) {
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "7", 10);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  // refresh token opaco (no JWT) sencillo
  const token = cryptoRandom(64);
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
    [userId, token, expiresAt]
  );
  return token;
}

function cryptoRandom(len) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/* POST /auth/login (igual que tu /users/login, pero devuelve refresh) */
router.post("/login", async (req, res) => {
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
      [refreshToken]
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
      [refreshToken]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.json({ ok: true });
  }
});

export default router;
