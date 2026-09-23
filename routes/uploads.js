// routes/uploads.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

// Carpeta de destino (misma que sirves con express.static)
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Configuración de Multer: guarda con nombre único
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "file", ext).replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${base}${ext.toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    // acepta solo imágenes
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten imágenes"));
    }
    cb(null, true);
  },
});

// Health check útil para depurar
router.get("/__health", (_req, res) => {
  res.json({ ok: true, dir: UPLOADS_DIR });
});

// ⚠️ IMPORTANTE: el nombre del campo es 'file' (así lo mandas en el front)
router.post("/image", verifyToken, verifyAdmin, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se recibió archivo" });
  }

  // arma URL absoluta para el cliente
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  const url = `${proto}://${host}/uploads/${req.file.filename}`;

  return res.status(201).json({ url, filename: req.file.filename });
});

export default router;
