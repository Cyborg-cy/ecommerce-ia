// routes/products.js
import express from "express";
import pool from "../db.js";
import { validate } from "../middleware/validate.js";
import { createProductSchema, updateProductSchema } from "../schemas/productSchemas.js";
import { verifyToken, verifyAdmin } from "../middleware/auth.js";

const router = express.Router();
/* =========================================================
   GET /products  (público) con filtros y paginación opcional
   Ejemplos:
   /products?q=mouse&category=1&min=10&max=100&sort=price_desc&page=1&pageSize=20
   sort: price_asc | price_desc | newest (por defecto p.id ASC)
   ========================================================= */
router.get("/", async (req, res) => {
  try {
    // 1) Leer query params
    const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "10", 10), 1), 50);
    const offset = (page - 1) * limit;

    const q = (req.query.q ?? "").trim();
    const categoryId = req.query.category_id ? parseInt(req.query.category_id, 10) : null;
    const minPrice = req.query.min_price ? Number(req.query.min_price) : null;
    const maxPrice = req.query.max_price ? Number(req.query.max_price) : null;
    const sort = (req.query.sort ?? "new").toLowerCase();

    // 2) Construir filtros dinámicos
    const where = [];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      where.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }

    if (categoryId) {
      params.push(categoryId);
      where.push(`p.category_id = $${params.length}`);
    }

    if (minPrice != null) {
      params.push(minPrice);
      where.push(`p.price >= $${params.length}`);
    }

    if (maxPrice != null) {
      params.push(maxPrice);
      where.push(`p.price <= $${params.length}`);
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // 3) Orden
    let orderSQL = "p.id ASC";
    if (sort === "new") orderSQL = "p.created_at DESC";
    else if (sort === "price_asc") orderSQL = "p.price ASC";
    else if (sort === "price_desc") orderSQL = "p.price DESC";
    else if (sort === "name_asc") orderSQL = "p.name ASC";
    else if (sort === "name_desc") orderSQL = "p.name DESC";

    // 4) Query total para meta
    const countSQL = `SELECT COUNT(*)::int AS total FROM products p ${whereSQL}`;
    const { rows: countRows } = await pool.query(countSQL, params);
    const total = countRows[0]?.total ?? 0;

    // 5) Query paginada
    params.push(limit);
    params.push(offset);
    const listSQL = `
      SELECT p.id, p.name, p.description, p.price, p.stock, p.created_at,
             c.id AS category_id, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereSQL}
      ORDER BY ${orderSQL}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const { rows } = await pool.query(listSQL, params);

    res.json({
      items: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        sort,
        filters: { q, category_id: categoryId, min_price: minPrice, max_price: maxPrice }
      }
    });
  } catch (err) {
    console.error("❌ GET /products:", err);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

/* ==============================
   GET /products/:id  (público)
   ============================== */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT p.id,
              p.name,
              p.description,
              p.price::numeric::float8 AS price,
              p.stock,
              p.created_at,
              c.id AS category_id,
              c.name AS category_name
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = $1`,
      [id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ GET /products/:id:", err);
    res.status(500).json({ error: "Error al obtener producto" });
  }
});

/* ============================================
   POST /products  (protegido: token + admin)
   ============================================ */
router.post("/", verifyToken, verifyAdmin, validate(createProductSchema), async (req, res) => {
  try {
    let { name, description, price, stock, category_id } = req.body;

    if (!name || price === undefined || stock === undefined || !category_id) {
      return res.status(400).json({
        error: "Faltan datos: name, price, stock, category_id",
      });
    }

    price = Number(price);
    stock = parseInt(stock, 10);
    category_id = parseInt(category_id, 10);

    if (Number.isNaN(price) || Number.isNaN(stock) || Number.isNaN(category_id)) {
      return res.status(400).json({
        error: "Tipos inválidos: price, stock y category_id deben ser numéricos",
      });
    }
    if (price <= 0) {
      return res.status(400).json({ error: "price debe ser > 0" });
    }
    if (stock < 0) {
      return res.status(400).json({ error: "stock no puede ser negativo" });
    }

    const cat = await pool.query("SELECT id FROM categories WHERE id=$1", [category_id]);
    if (!cat.rows.length) {
      return res.status(400).json({ error: `La categoría ${category_id} no existe` });
    }

    const result = await pool.query(
      `INSERT INTO products (name, description, price, stock, category_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, price::numeric::float8 AS price, stock, created_at, category_id`,
      [name, description || null, price, stock, category_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ POST /products:", err);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

router.put("/:id", verifyToken, verifyAdmin, validate(updateProductSchema), async (req, res) => {
  const { id } = req.params;
  let { name, description, price, stock, category_id } = req.body;

  try {
    if (price !== undefined) {
      price = Number(price);
      if (Number.isNaN(price) || price <= 0) {
        return res.status(400).json({ error: "price inválido (debe ser > 0)" });
      }
    }
    if (stock !== undefined) {
      stock = parseInt(stock, 10);
      if (Number.isNaN(stock) || stock < 0) {
        return res.status(400).json({ error: "stock inválido (no puede ser negativo)" });
      }
    }
    if (category_id !== undefined) {
      category_id = parseInt(category_id, 10);
      if (Number.isNaN(category_id)) {
        return res.status(400).json({ error: "category_id inválido" });
      }
      const cat = await pool.query("SELECT id FROM categories WHERE id=$1", [category_id]);
      if (!cat.rows.length) {
        return res.status(400).json({ error: `La categoría ${category_id} no existe` });
      }
    }

    const result = await pool.query(
      `UPDATE products
          SET name        = COALESCE($1, name),
              description = COALESCE($2, description),
              price       = COALESCE($3, price),
              stock       = COALESCE($4, stock),
              category_id = COALESCE($5, category_id)
        WHERE id = $6
      RETURNING id, name, description, price::numeric::float8 AS price, stock, created_at, category_id`,
      [name ?? null, description ?? null, price ?? null, stock ?? null, category_id ?? null, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ PUT /products/:id:", err);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});
/* =================================================
   DELETE /products/:id  (protegido: token + admin)
   ================================================= */
router.delete("/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Elimina referencias en order_items si existen
    await pool.query("DELETE FROM order_items WHERE product_id = $1", [id]);

    const result = await pool.query(
      "DELETE FROM products WHERE id = $1 RETURNING id, name, description, price::numeric::float8 AS price, stock, created_at, category_id",
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({ message: "✅ Producto eliminado", product: result.rows[0] });
  } catch (err) {
    console.error("❌ DELETE /products/:id:", err);
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

export default router;
