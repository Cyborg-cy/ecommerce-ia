
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

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
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
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

// 3) Body parser principal
app.use(express.json({ limit: "1mb" }));

// 4) Verificación mínima de variables críticas
const requiredEnv = ["JWT_SECRET", "STRIPE_SECRET_KEY"];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn("⚠️ Faltan variables .env:", missing.join(", "));
}

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
