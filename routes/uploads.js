// routes/uploads.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

const CLOUDINARY_ENABLED =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (CLOUDINARY_ENABLED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Carpeta local de respaldo (solo se usa si Cloudinary no está configurado,
// útil para desarrollo local sin depender de una cuenta externa. En Render
// el disco no es persistente, así que en producción SIEMPRE debe usarse
// Cloudinary).
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
if (!CLOUDINARY_ENABLED && !fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = CLOUDINARY_ENABLED
  ? multer.memoryStorage()
  : multer.diskStorage({
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
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se permiten imágenes"));
    }
    cb(null, true);
  },
});

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "ecommerce-ia", resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// Health check útil para depurar
router.get("/__health", (_req, res) => {
  res.json({
    ok: true,
    storage: CLOUDINARY_ENABLED ? "cloudinary" : "disco local (no persistente)",
    dir: CLOUDINARY_ENABLED ? null : UPLOADS_DIR,
  });
});

// ⚠️ IMPORTANTE: el nombre del campo es 'file' (así lo mandas en el front)
router.post("/image", verifyToken, verifyAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se recibió archivo" });
  }

  try {
    if (CLOUDINARY_ENABLED) {
      const result = await uploadToCloudinary(req.file.buffer);
      return res.status(201).json({ url: result.secure_url, filename: result.public_id });
    }

    // Fallback local (solo dev)
    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    const url = `${proto}://${host}/uploads/${req.file.filename}`;
    return res.status(201).json({ url, filename: req.file.filename });
  } catch (err) {
    console.error("❌ POST /uploads/image:", err);
    return res.status(500).json({ error: "No se pudo subir la imagen" });
  }
});

export default router;
