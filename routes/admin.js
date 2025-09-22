// routes/admin.js
console.log("ADMIN ROUTER CARGADO");


import express from "express";
import pool from "../db.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();


// ===== USUARIOS =====

// GET /admin/users
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1"), 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || "20"), 1), 100);
  const offset = (page - 1) * pageSize;

  const { rows } = await pool.query(
    `SELECT id, name, email, role, created_at
       FROM users
     ORDER BY id ASC
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );
  res.json({ page, pageSize, users: rows });
});

// GET /admin/users/:id  -> ver un usuario
router.get("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  const { rows } = await pool.query(
    "SELECT id, name, email, role, created_at FROM users WHERE id=$1",
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json(rows[0]);
});

// PUT /admin/users/:id  -> editar campos básicos (opcional si quieres editar, el rol ya lo manejas con PATCH)
router.put("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  // permite actualizar name/email; el rol mejor con PATCH /role como ya haces
  let { name, email } = req.body || {};
  name = (name ?? "").trim();
  email = (email ?? "").trim();

  if (!name && !email) {
    return res.status(400).json({ error: "Nada para actualizar" });
  }

  // construimos dinámicamente el UPDATE
  const sets = [];
  const vals = [];
  if (name) { sets.push(`name=$${sets.length+1}`); vals.push(name); }
  if (email) { sets.push(`email=$${sets.length+1}`); vals.push(email); }
  vals.push(id);

  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(", ")} WHERE id=$${vals.length} 
     RETURNING id, name, email, role, created_at`,
    vals
  );
  if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json(rows[0]);
});

// PATCH /admin/users/:id/role
router.patch("/users/:id/role", verifyToken, verifyAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { role } = req.body || {};
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "ID inválido" });
  if (!["user", "admin"].includes(role)) return res.status(400).json({ error: "Rol inválido" });

  const { rows } = await pool.query(
    "UPDATE users SET role=$1 WHERE id=$2 RETURNING id, name, email, role, created_at",
    [role, id]
  );
  if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json(rows[0]);
});

// DELETE /admin/users/:id
router.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  try {
    // Evita borrarte a ti mismo
    const me = req.user?.id;
    if (Number(me) === targetId) {
      return res.status(400).json({ error: "No puedes eliminar tu propio usuario." });
    }
    // Verifica existencia
    const u = await pool.query("SELECT id FROM users WHERE id=$1", [targetId]);
    if (!u.rows.length) return res.status(404).json({ error: "Usuario no encontrado" });

    // Si tiene pedidos, bloquea (409)
    const o = await pool.query("SELECT COUNT(*)::int AS c FROM orders WHERE user_id=$1", [targetId]);
    if ((o.rows[0]?.c ?? 0) > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: el usuario tiene ${o.rows[0].c} pedido(s) asociados.`,
      });
    }

    await pool.query("DELETE FROM users WHERE id=$1", [targetId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /admin/users/:id", err);
    res.status(500).json({ error: "No se pudo eliminar el usuario" });
  }
});




/* ---------- ORDERS (ejemplo que ya tienes) ---------- */
router.get("/orders", verifyToken, verifyAdmin, async (req, res) => {
  const { status, from, to } = req.query;
  const params = [];
  const where = [];

  if (status) { params.push(status); where.push(`o.status = $${params.length}`); }
  if (from)   { params.push(from);   where.push(`o.created_at >= $${params.length}`); }
  if (to)     { params.push(to);     where.push(`o.created_at <= $${params.length}`); }

  const sql =
  `SELECT o.*, u.email
     FROM orders o
     JOIN users u ON u.id = o.user_id
     ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY o.created_at DESC`;

  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

/* ---------- STATS (ejemplo que ya tienes) ---------- */
router.get("/stats", verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const [{ rows: u }, { rows: p }, { rows: o }, { rows: r }] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total_users FROM users"),
      pool.query("SELECT COUNT(*)::int AS total_products FROM products"),
      pool.query("SELECT COUNT(*)::int AS total_orders FROM orders"),
      pool.query("SELECT COALESCE(SUM(total)::numeric::float8, 0) AS revenue_paid FROM orders WHERE status = 'paid'"),
    ]);
    res.json({ ...u[0], ...p[0], ...o[0], ...r[0] });
  } catch (err) {
    console.error("GET /admin/stats", err);
    res.status(500).json({ error: "No se pudieron obtener estadísticas" });
  }
});

/* ========== CATEGORIES (ADMIN)  ========== */

// GET /admin/categories  -> lista
router.get("/categories", verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, description FROM categories ORDER BY id ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /admin/categories", err);
    res.status(500).json({ error: "No se pudo cargar categorías" });
  }
});

// POST /admin/categories  (crear categoría)
router.post("/categories", verifyToken, verifyAdmin, async (req, res) => {
  try {
    let { name, description } = req.body || {};
    name = (name || "").trim();
    if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });
    description =
      description === undefined || description === null
        ? null
        : String(description).trim() || null;

    const { rows } = await pool.query(
      `INSERT INTO categories (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description`,
      [name, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /admin/categories", err);
    res.status(500).json({ error: "No se pudo crear la categoría" });
  }
});

// PUT /admin/categories/:id  -> editar
router.put("/categories/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }
    let { name, description } = req.body || {};
    name = (name || "").trim();
    if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });
    description =
      description === undefined || description === null
        ? null
        : String(description).trim() || null;

    const { rows } = await pool.query(
      `UPDATE categories
         SET name=$1, description=$2
       WHERE id=$3
       RETURNING id, name, description`,
      [name, description, id]
    );
    if (!rows.length) return res.status(404).json({ error: "Categoría no encontrada" });
    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /admin/categories/:id", err);
    res.status(500).json({ error: "No se pudo guardar la categoría" });
  }
});

// DELETE /admin/categories/:id?reassignTo=<id>  -> eliminar (con reasignación opcional)
router.delete("/categories/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const reassignTo = req.query.reassignTo ? parseInt(req.query.reassignTo, 10) : null;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  if (reassignTo !== null) {
    if (!Number.isInteger(reassignTo) || reassignTo <= 0) {
      return res.status(400).json({ error: "reassignTo inválido" });
    }
    if (reassignTo === id) {
      return res.status(400).json({ error: "reassignTo no puede ser igual al ID a eliminar" });
    }
  }

  try {
    await pool.query("BEGIN");

    const cat = await pool.query("SELECT id FROM categories WHERE id=$1", [id]);
    if (!cat.rows.length) {
      await pool.query("ROLLBACK");
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS count FROM products WHERE category_id=$1",
      [id]
    );
    const count = rows[0]?.count ?? 0;

    if (count > 0 && reassignTo === null) {
      await pool.query("ROLLBACK");
      return res.status(409).json({
        error: `No se puede eliminar: hay ${count} producto(s) usando esta categoría`,
        needReassign: true,
        count,
      });
    }

    if (count > 0 && reassignTo !== null) {
      const dst = await pool.query("SELECT id FROM categories WHERE id=$1", [reassignTo]);
      if (!dst.rows.length) {
        await pool.query("ROLLBACK");
        return res.status(400).json({ error: "La categoría destino no existe" });
      }
      await pool.query(
        "UPDATE products SET category_id=$1 WHERE category_id=$2",
        [reassignTo, id]
      );
    }

    await pool.query("DELETE FROM categories WHERE id=$1", [id]);
    await pool.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("DELETE /admin/categories/:id", err);
    res.status(500).json({ error: "No se pudo eliminar la categoría" });
  }
});

export default router;
