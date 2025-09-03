// middleware/auth.js
import jwt from "jsonwebtoken";
import pool from "../db.js";

export function verifyToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Token requerido" });
  }
  const token = parts[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, name, email, role }
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function verifyAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Acceso denegado: se requiere admin" });
  }
  next();
}
