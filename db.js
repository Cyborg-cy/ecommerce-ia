// db.js
import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";
dotenv.config();

let pool;

// Prioriza DATABASE_URL (producción). Si no, usa variables separadas (local/Docker).
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // necesario en Render/gestores
  });
} else {
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 5432,
  });
}

// Evita pool.connect() permanente; deja que el pool gestione conexiones.
// Si quieres testear al arrancar:
pool
  .query("SELECT 1")
  .then(() => console.log("✅ PostgreSQL listo"))
  .catch((err) => console.error("❌ Error de conexión PostgreSQL:", err));

export default pool;
