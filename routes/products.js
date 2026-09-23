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
  SELECT
    p.id,
    p.name,
    p.description,
    p.price::numeric::float8 AS price,
    p.stock,
    p.image_url,
    p.created_at,
    c.id   AS category_id,
    c.name AS category_name
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
   GET /products/search  (público)
   Debe registrarse antes de /:id para no ser interceptada por él
   ============================== */
router.get("/search", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1"), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || "12"), 1), 60);

    const q = (req.query.q || "").toString().trim();
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
    const categoryId = req.query.category_id ? parseInt(req.query.category_id, 10) : null;
    const sort = (req.query.sort || "new").toString(); // new | price_asc | price_desc | name

    const where = [];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      where.push(`p.name ILIKE $${params.length}`);
    }
    if (Number.isFinite(minPrice)) {
      params.push(minPrice);
      where.push(`p.price >= $${params.length}`);
    }
    if (Number.isFinite(maxPrice)) {
      params.push(maxPrice);
      where.push(`p.price <= $${params.length}`);
    }
    if (Number.isInteger(categoryId)) {
      params.push(categoryId);
      where.push(`p.category_id = $${params.length}`);
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    let orderBy = "p.created_at DESC";
    if (sort === "price_asc") orderBy = "p.price ASC";
    else if (sort === "price_desc") orderBy = "p.price DESC";
    else if (sort === "name") orderBy = "p.name ASC";

    // total
    const { rows: totalRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM products p ${whereSQL}`,
      params
    );
    const total = totalRows[0]?.total || 0;
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const offset = (page - 1) * pageSize;

    // items
    const { rows: items } = await pool.query(
      `
      SELECT
        p.id, p.name, p.description,
        p.price::numeric::float8 AS price,
        p.stock, p.category_id, p.created_at
      FROM products p
      ${whereSQL}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, pageSize, offset]
    );

    res.json({
      items,
      meta: { page, pageSize, total, totalPages },
    });
  } catch (err) {
    console.error("GET /products/search", err);
    res.status(500).json({ error: "No se pudo listar productos" });
  }
});

/* ==============================
   GET /products/:id  (público)
   ============================== */
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }
  try {
    const { rows } = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.description,
        p.price::numeric::float8 AS price,
        p.stock,
        p.category_id,
        p.image_url
      FROM products p
      WHERE p.id=$1
    `, [id]);
    if (!rows.length) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /products/:id", err);
    res.status(500).json({ error: "Error al obtener producto" });
  }
});

// Recomendaciones basadas en el producto actual
router.get("/recommendations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit || "8", 10), 1), 20);

    // producto base
    const { rows: baseRows } = await pool.query(
      "SELECT id, category_id, price::numeric::float8 AS price FROM products WHERE id=$1",
      [id]
    );
    if (!baseRows.length) return res.status(404).json({ error: "Producto no encontrado" });

    const base = baseRows[0];
    const basePrice = Number(base.price) || 0;
    const hasCategory = base.category_id != null;
    const minPrice = basePrice * 0.8;
    const maxPrice = basePrice * 1.2;

    const out = [];

    // 1) Misma categoría + precio ±20%
    if (hasCategory) {
      const { rows } = await pool.query(
        `SELECT id, name, description, price::numeric::float8 AS price, stock, category_id
         FROM products
         WHERE id <> $1
           AND category_id = $2
           AND price BETWEEN $3 AND $4
         ORDER BY ABS(price - $5) ASC, id DESC
         LIMIT $6`,
        [id, base.category_id, minPrice, maxPrice, basePrice, limit]
      );
      out.push(...rows);
    }

    // 2) Si faltan, misma categoría (cualquier precio)
    if (out.length < limit && hasCategory) {
      const { rows } = await pool.query(
        `SELECT id, name, description, price::numeric::float8 AS price, stock, category_id
         FROM products
         WHERE id <> $1
           AND category_id = $2
           AND id NOT IN (${out.map((r) => r.id).concat([id]).map((_,i)=>`$${i+3}`).join(",") || "$3"})
         ORDER BY ABS(price - $${out.length ? out.length + 3 : 3}) ASC, id DESC
         LIMIT $${out.length ? out.length + 4 : 4}`,
        // params dinámicos:
        (function() {
          const params = [id, base.category_id];
          const usedIds = out.map((r) => r.id).concat([id]);
          params.push(...usedIds);
          params.push(basePrice);
          params.push(limit - out.length);
          return params;
        })()
      );
      out.push(...rows);
    }

    // 3) Si aún faltan, global por cercanía de precio
    if (out.length < limit) {
      const { rows } = await pool.query(
        `SELECT id, name, description, price::numeric::float8 AS price, stock, category_id
         FROM products
         WHERE id <> $1
           AND id <> ALL($2::int[])
         ORDER BY ABS(price - $3) ASC, id DESC
         LIMIT $4`,
        [id, out.map((r) => r.id), basePrice, limit - out.length]
      );
      out.push(...rows);
    }

    // dedup por si acaso
    const unique = [];
    const seen = new Set();
    for (const r of out) {
      if (!seen.has(r.id)) { seen.add(r.id); unique.push(r); }
      if (unique.length === limit) break;
    }

    res.json(unique);
  } catch (err) {
    console.error("GET /recommendations/:id", err);
    res.status(500).json({ error: "No se pudieron obtener recomendaciones" });
  }
});


/* ============================================
   POST /products  (protegido: token + admin)
   ============================================ */
router.post(
  "/",
  verifyToken, verifyAdmin,
  validate(createProductSchema),
  async (req, res) => {
    try {
      let { name, description, price, stock, category_id, image_url } = req.body;

      price = Number(price);
      stock = parseInt(stock, 10);
      category_id = category_id ? parseInt(category_id, 10) : null;

      if (category_id) {
        const cat = await pool.query("SELECT id FROM categories WHERE id=$1", [category_id]);
        if (!cat.rows.length) {
          return res.status(400).json({ error: `La categoría ${category_id} no existe` });
        }
      }

      // normaliza image_url
      image_url = image_url === undefined ? null : (String(image_url).trim() || null);

      const result = await pool.query(
        `INSERT INTO products (name, description, price, stock, category_id, image_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, description, price::numeric::float8 AS price, stock, category_id, image_url, created_at`,
        [name, description || null, price, stock, category_id, image_url]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("❌ POST /products:", err);
      res.status(500).json({ error: "Error al crear producto" });
    }
  }
);


// (1) UPDATE /products/:id  (protegido: token + admin)
router.put("/:id", verifyToken, verifyAdmin, validate(updateProductSchema), async (req, res) => {
  const { id } = req.params;
  let { name, description, price, stock, category_id, image_url } = req.body;

  try {
    // Normalizaciones/validaciones suaves
    if (price !== undefined) {
      price = Number(price);
      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ error: "price inválido (debe ser > 0)" });
      }
    }

    if (stock !== undefined) {
      stock = parseInt(stock, 10);
      if (!Number.isInteger(stock) || stock < 0) {
        return res.status(400).json({ error: "stock inválido (no puede ser negativo)" });
      }
    }

    // Permite limpiar la categoría: "", null -> null
    if (category_id !== undefined) {
      if (category_id === "" || category_id === null) {
        category_id = null;
      } else {
        category_id = parseInt(category_id, 10);
        if (!Number.isInteger(category_id) || category_id <= 0) {
          return res.status(400).json({ error: "category_id inválido" });
        }
        // Verifica existencia
        const cat = await pool.query("SELECT id FROM categories WHERE id=$1", [category_id]);
        if (!cat.rows.length) {
          return res.status(400).json({ error: `La categoría ${category_id} no existe` });
        }
      }
    }

    // image_url opcional (puede limpiarse)
    if (image_url !== undefined) {
      image_url = image_url === null ? null : String(image_url).trim() || null;
    }

    // Solo actualiza los campos que vinieron en el body, para poder
    // limpiar a NULL description/category_id/image_url cuando se pide.
    const sets = [];
    const vals = [];
    const setIfPresent = (col, value) => {
      sets.push(`${col} = $${sets.length + 1}`);
      vals.push(value);
    };
    if (name !== undefined) setIfPresent("name", name);
    if (description !== undefined) setIfPresent("description", description);
    if (price !== undefined) setIfPresent("price", price);
    if (stock !== undefined) setIfPresent("stock", stock);
    if (category_id !== undefined) setIfPresent("category_id", category_id);
    if (image_url !== undefined) setIfPresent("image_url", image_url);

    if (!sets.length) {
      return res.status(400).json({ error: "No enviaste ningún campo para actualizar" });
    }

    vals.push(id);
    const result = await pool.query(
      `UPDATE products
          SET ${sets.join(", ")}
        WHERE id = $${vals.length}
      RETURNING
        id,
        name,
        description,
        price::numeric::float8 AS price,
        stock,
        category_id,
        image_url,
        created_at`,
      vals
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
    // No permitir borrar productos que ya aparecen en pedidos pasados
    // (borrar sus order_items destruiría el historial de esos pedidos)
    const used = await pool.query(
      "SELECT COUNT(*)::int AS c FROM order_items WHERE product_id = $1",
      [id]
    );
    if ((used.rows[0]?.c ?? 0) > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: el producto aparece en ${used.rows[0].c} línea(s) de pedidos existentes.`,
      });
    }

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
