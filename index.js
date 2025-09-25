
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import uploadsRouter from "./routes/uploads.js";

// Routers
import usersRouter from "./routes/users.js";
import categoriesRouter from "./routes/categories.js";
import productsRouter from "./routes/products.js";
import ordersRouter from "./routes/orders.js";
import cartRouter from "./routes/cart.js";
import paymentsRouter from "./routes/payments.js";
import stripeWebhookRouter from "./routes/stripeWebhook.js";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import statsRouter from "./routes/stats.js";
import recommendationsRouter from "./routes/recommendations.js";

const app = express();

/**
 * 1) Stripe Webhook debe ir ANTES de json() para usar `express.raw`
 *    (dentro de stripeWebhookRouter se configura con express.raw())
 */
app.use("/payments/webhook", stripeWebhookRouter);

// 2) Seguridad / logs / CORS
import url from "url";

// Permitir exactos en CORS_ORIGINS y previews *.vercel.app
const allowOrigin = (origin) => {
  if (!origin) return true; // permite curl/SSR sin Origin
  try {
    const u = new url.URL(origin);
    const hostname = u.hostname;

    const whitelist = (process.env.CORS_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // match exacto por origin completo (incluye protocolo y host)
    if (whitelist.includes(origin)) return true;

    // previews de vercel (cualquier subdominio)
    if (hostname.endsWith(".vercel.app")) return true;

    return false;
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, cb) =>
      allowOrigin(origin) ? cb(null, true) : cb(new Error("CORS: Origin no permitido")),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// 3) Body parser principal (acepta json con tipos comunes y urlencoded)
app.use(
  express.json({
    limit: "1mb",
    type: ["application/json", "application/*+json", "text/plain"],
  })
);
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// 4) Verificación mínima de variables críticas
const requiredEnv = ["JWT_SECRET", "STRIPE_SECRET_KEY"];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn("⚠️ Faltan variables .env:", missing.join(", "));
}

// (A) Router de uploads
app.use("/uploads", uploadsRouter);

// (B) Estático para ver/servir las imágenes subidas
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "7d" }));


// 5) Rutas
app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/categories", categoriesRouter);
app.use("/products", productsRouter);
app.use("/orders", ordersRouter);
app.use("/cart", cartRouter);
app.use("/payments", paymentsRouter);
app.use("/admin", adminRouter);
app.use("/stats", statsRouter);
app.use("/recommendations", recommendationsRouter);



app.get("/", (_req, res) => {
  res.json({ message: "🚀 API E-commerce funcionando correctamente" });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Manejador de errores global
app.use((err, _req, res, _next) => {
  console.error("❌ Unhandled:", err);
  res
    .status(err.status || 500)
    .json({ error: err.message || "Error inesperado" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
