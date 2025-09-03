// index.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";
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

// CORS (ajusta origins cuando tengas frontend)
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
// ⚠️ Verificación mínima de variables críticas
const requiredEnv = ["JWT_SECRET", "STRIPE_SECRET_KEY"];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn("⚠️ Faltan variables .env:", missing.join(", "));
}
/**
 * Stripe Webhook debe ir ANTES de express.json()
 * (Dentro de stripeWebhookRouter usas express.raw({type:'application/json'}))
 */
app.use("/payments/webhook", stripeWebhookRouter);

// Seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));


// Logs
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Body parser
app.use(bodyParser.json());                 // ← bodyParser extra
app.use(express.json({ limit: "1mb" }));

// Rate limit global
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Rutas

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

app.get("/", (req, res) => {
  res.json({ message: "🚀 API E-commerce funcionando correctamente" });
});
// 404
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error("❌ Unhandled:", err);
  res.status(err.status || 500).json({ error: err.message || "Error inesperado" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
