// routes/admin.js
console.log("ADMIN ROUTER CARGADO");


import express from "express";
import pool from "../db.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";
import { transitionOrderStatus, OrderTransitionError } from "../services/orderStatus.js";

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

  // Evita que un admin se quite su propio rol por error y se quede sin
  // forma de volver a entrar al panel.
  if (Number(req.user?.id) === id && role !== "admin") {
    return res.status(400).json({ error: "No puedes quitarte tu propio rol de admin." });
  }

  const { rows } = await pool.query(
    "UPDATE users SET role=$1 WHERE id=$2 RETURNING id, name, email, role, created_at",
    [role, id]
  );
  if (!rows.length) return res.status(404).json({ error: "Usuario no encontrado" });

  // El access token vigente sigue teniendo el rol viejo hasta que expira
  // (hasta JWT_EXPIRES). Revocar sus refresh tokens evita que, además,
  // pueda renovar la sesión indefinidamente con el rol que ya no tiene.
  await pool.query(
    "UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL",
    [id]
  );

  res.json(rows[0]);
});

// DELETE /admin/users/:id?force=true
// force=true borra también las órdenes/order_items/carrito del usuario —
// pensado para limpiar datos de prueba. No reembolsa en Stripe ninguna
// orden pagada que se lleve por delante: si el usuario tiene compras
// reales, mejor no forzar esto.
router.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  const force = req.query.force === "true";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Evita borrarte a ti mismo, incluso con force
    const me = req.user?.id;
    if (Number(me) === targetId) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "No puedes eliminar tu propio usuario." });
    }
    // Verifica existencia
    const u = await client.query("SELECT id FROM users WHERE id=$1", [targetId]);
    if (!u.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const o = await client.query("SELECT id FROM orders WHERE user_id=$1", [targetId]);
    const orderIds = o.rows.map((r) => r.id);

    if (orderIds.length > 0 && !force) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `No se puede eliminar: el usuario tiene ${orderIds.length} pedido(s) asociados. Si es un dato de prueba, reintenta con ?force=true.`,
        canForce: true,
        count: orderIds.length,
      });
    }

    if (orderIds.length > 0) {
      await client.query("DELETE FROM order_items WHERE order_id = ANY($1::int[])", [orderIds]);
      await client.query("DELETE FROM orders WHERE id = ANY($1::int[])", [orderIds]);
    }
    await client.query(
      "DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id=$1)",
      [targetId]
    );
    await client.query("DELETE FROM carts WHERE user_id=$1", [targetId]);
    await client.query("DELETE FROM refresh_tokens WHERE user_id=$1", [targetId]);
    await client.query("DELETE FROM users WHERE id=$1", [targetId]);

    await client.query("COMMIT");
    res.json({ ok: true, forced: orderIds.length > 0, deletedOrders: orderIds.length });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("DELETE /admin/users/:id", err);
    res.status(500).json({ error: "No se pudo eliminar el usuario" });
  } finally {
    client.release();
  }
});




/* ---------- PRODUCTS ---------- */
// GET /admin/products -> todos los productos (el público /products pagina de 10 en 10)
router.get("/products", verifyToken, verifyAdmin, async (_req, res) => {
  // Nota: 500 es un límite de seguridad, no paginación real (igual que /admin/orders).
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.description, p.price::numeric::float8 AS price, p.stock,
            p.image_url, p.created_at, p.category_id, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.id ASC
      LIMIT 500`
  );
  res.json({ items: rows });
});

/* ---------- ORDERS (ejemplo que ya tienes) ---------- */
// GET /admin/orders?status=paid&from=2025-09-01&to=2025-09-30
router.get("/orders", verifyToken, verifyAdmin, async (req, res) => {
  const { status, from, to } = req.query;
  const params = [];
  const where = [];

  if (status) { params.push(status); where.push(`o.status = $${params.length}`); }
  if (from)   { params.push(from);   where.push(`o.created_at >= $${params.length}`); }
  if (to)     { params.push(to);     where.push(`o.created_at <= $${params.length}`); }

  const sql = `
    SELECT
      o.id,
      o.user_id,
      o.status,
      o.payment_status,
      o.total::numeric::float8 AS total,
      o.created_at,
      u.email
    FROM orders o
    JOIN users u ON u.id = o.user_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY o.created_at DESC
    LIMIT 500
  `;
  // Nota: 500 es un límite de seguridad, no paginación real — con más
  // volumen de pedidos esto necesita page/pageSize como ya tiene
  // GET /admin/users.
  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

// GET /admin/orders/:id -> detalle + items
router.get("/orders/:id", verifyToken, verifyAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    const { rows: oh } = await pool.query(
      `SELECT
         o.id, o.user_id, o.status, o.payment_status,
         o.total::numeric::float8 AS total,
         o.created_at, o.updated_at,
         u.email,
         o.shipping_name, o.shipping_phone, o.shipping_address, o.shipping_city, o.shipping_zip
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.id=$1`,
      [id]
    );
    if (!oh.length) return res.status(404).json({ error: "Pedido no encontrado" });

    const { rows: items } = await pool.query(
      `SELECT
         oi.id,
         oi.product_id,
         p.name,
         p.image_url,
         oi.quantity,
         oi.price::numeric::float8 AS unit_price,
         (oi.quantity * oi.price)::numeric::float8 AS line_total
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id=$1
       ORDER BY oi.id ASC`,
      [id]
    );

    res.json({ order: oh[0], items });
  } catch (err) {
    console.error("GET /admin/orders/:id", err);
    res.status(500).json({ error: "No se pudo cargar el pedido" });
  }
});

// PUT /admin/orders/:id/status  { status }
// La máquina de transiciones y el reembolso real (si corresponde) viven
// en services/orderStatus.js — mismo servicio que usa PUT /orders/:id,
// para que no existan dos rutas con reglas distintas.
router.put("/orders/:id/status", verifyToken, verifyAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body || {};
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "ID inválido" });

  try {
    const updated = await transitionOrderStatus({ orderId: id, newStatus: status, actorIsAdmin: true });
    res.json(updated);
  } catch (err) {
    if (err instanceof OrderTransitionError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("PUT /admin/orders/:id/status", err);
    res.status(500).json({ error: "No se pudo actualizar el estado" });
  }
});

/* ---------- STATS (ejemplo que ya tienes) ---------- */
// GET /admin/stats
router.get("/stats", verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const [{ rows: u }, { rows: p }, { rows: o }, { rows: r }, { rows: obyst }] =
      await Promise.all([
        pool.query("SELECT COUNT(*)::int AS total_users FROM users"),
        pool.query("SELECT COUNT(*)::int AS total_products FROM products"),
        pool.query("SELECT COUNT(*)::int AS total_orders FROM orders"),
        // payment_status, no status: un pedido "shipped" ya no tiene
        // status='paid' pero el dinero sigue cobrado, así que debe seguir
        // contando como ingreso. payment_status='refunded' sí se excluye.
        pool.query("SELECT COALESCE(SUM(total)::numeric::float8, 0) AS revenue_paid FROM orders WHERE payment_status='paid'"),
        pool.query(`
          SELECT status, COUNT(*)::int AS count
          FROM orders
          GROUP BY status
        `),
      ]);

    res.json({
      total_users: u[0]?.total_users ?? 0,
      total_products: p[0]?.total_products ?? 0,
      total_orders: o[0]?.total_orders ?? 0,
      revenue_paid: r[0]?.revenue_paid ?? 0,
      orders_by_status: obyst ?? [],
    });
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

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cat = await client.query("SELECT id FROM categories WHERE id=$1", [id]);
    if (!cat.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    const { rows } = await client.query(
      "SELECT COUNT(*)::int AS count FROM products WHERE category_id=$1",
      [id]
    );
    const count = rows[0]?.count ?? 0;

    if (count > 0 && reassignTo === null) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `No se puede eliminar: hay ${count} producto(s) usando esta categoría`,
        needReassign: true,
        count,
      });
    }

    if (count > 0 && reassignTo !== null) {
      const dst = await client.query("SELECT id FROM categories WHERE id=$1", [reassignTo]);
      if (!dst.rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "La categoría destino no existe" });
      }
      await client.query(
        "UPDATE products SET category_id=$1 WHERE category_id=$2",
        [reassignTo, id]
      );
    }

    await client.query("DELETE FROM categories WHERE id=$1", [id]);
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("DELETE /admin/categories/:id", err);
    res.status(500).json({ error: "No se pudo eliminar la categoría" });
  } finally {
    client.release();
  }
});

export default router;
