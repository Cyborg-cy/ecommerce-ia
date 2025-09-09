// routes/cart.js
import express from "express";
import pool from "../db.js";
import { validate } from "../middleware/validate.js";
import { addToCartSchema, updateCartItemSchema } from "../schemas/cartSchemas.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();


/** Crea/obtiene el carrito del usuario y devuelve su id */
async function ensureCart(userId) {
  const found = await pool.query("SELECT id FROM carts WHERE user_id = $1", [userId]);
  if (found.rows.length) return found.rows[0].id;

  const created = await pool.query(
    "INSERT INTO carts (user_id) VALUES ($1) RETURNING id",
    [userId]
  );
  return created.rows[0].id;
}

/** GET /cart -> detalle del carrito */
router.get("/", verifyToken, async (req, res) => {
  try {
    const cartId = await ensureCart(req.user.id);

    const result = await pool.query(
      `SELECT ci.product_id, p.name, p.description, ci.quantity, ci.price_at_add AS price,
              (ci.quantity * ci.price_at_add)::float8 AS subtotal  
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = $1
       ORDER BY ci.id ASC`,
      [cartId]
    );

    const total = result.rows.reduce((acc, r) => acc + Number(r.subtotal), 0);
    res.json({ cart_id: cartId, items: result.rows, total });
  } catch (err) {
    console.error("❌ GET /cart:", err);
    res.status(500).json({ error: "Error al obtener el carrito" });
  }
});

/** POST /cart/add -> { product_id, quantity } */
router.post("/add", verifyToken, validate(addToCartSchema), async (req, res) => {
  const { product_id, quantity } = req.body;
  if (!product_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: "product_id y quantity > 0 son requeridos" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cartId = await ensureCart(req.user.id);

    // Producto
    const prod = await client.query(
      "SELECT id, price, stock FROM products WHERE id=$1",
      [product_id]
    );
    if (!prod.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    const price = Number(prod.rows[0].price);
    const stock = Number(prod.rows[0].stock ?? 0); // NULL => 0

    // Ítem existente
    const existing = await client.query(
      "SELECT id, quantity FROM cart_items WHERE cart_id=$1 AND product_id=$2",
      [cartId, product_id]
    );

    const newQty = existing.rows.length
      ? existing.rows[0].quantity + quantity
      : quantity;

    if (newQty > stock) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Stock insuficiente para la cantidad solicitada" });
    }

    if (existing.rows.length) {
      await client.query(
        "UPDATE cart_items SET quantity=$1 WHERE id=$2",
        [newQty, existing.rows[0].id]
      );
    } else {
      await client.query(
        "INSERT INTO cart_items (cart_id, product_id, quantity, price_at_add) VALUES ($1, $2, $3, $4)",
        [cartId, product_id, quantity, price]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Producto agregado al carrito" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ POST /cart/add:", err);
    res.status(500).json({ error: "Error al agregar al carrito" });
  } finally {
    client.release();
  }
});

/** PUT /cart/item/:productId -> { quantity } */
router.put("/item/:productId", verifyToken, validate(updateCartItemSchema), async (req, res) => {
  const productId = Number(req.params.productId);
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: "quantity > 0 es requerido" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cartId = await ensureCart(req.user.id);

    const prod = await client.query(
      "SELECT stock FROM products WHERE id=$1",
      [productId]
    );
    if (!prod.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    const stock = Number(prod.rows[0].stock ?? 0);
    if (quantity > stock) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Stock insuficiente" });
    }

    const upd = await client.query(
      "UPDATE cart_items SET quantity=$1 WHERE cart_id=$2 AND product_id=$3 RETURNING id",
      [quantity, cartId, productId]
    );
    if (!upd.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "El producto no está en el carrito" });
    }

    await client.query("COMMIT");
    res.json({ message: "Cantidad actualizada" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ PUT /cart/item/:productId:", err);
    res.status(500).json({ error: "Error al actualizar cantidad" });
  } finally {
    client.release();
  }
});

/** DELETE /cart/item/:productId */
router.delete("/item/:productId", verifyToken, async (req, res) => {
  const productId = Number(req.params.productId);
  try {
    const cartId = await ensureCart(req.user.id);
    const del = await pool.query(
      "DELETE FROM cart_items WHERE cart_id=$1 AND product_id=$2 RETURNING id",
      [cartId, productId]
    );
    if (!del.rows.length) {
      return res.status(404).json({ error: "El producto no estaba en el carrito" });
    }
    res.json({ message: "Ítem eliminado del carrito" });
  } catch (err) {
    console.error("❌ DELETE /cart/item/:productId:", err);
    res.status(500).json({ error: "Error al eliminar ítem" });
  }
});

/** POST /cart/checkout */
router.post("/checkout", verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cartId = await ensureCart(req.user.id);

    const items = await client.query(
      `SELECT ci.product_id, ci.quantity, ci.price_at_add AS price
       FROM cart_items ci
       WHERE ci.cart_id = $1
       ORDER BY ci.id ASC`,
      [cartId]
    );

    if (!items.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "El carrito está vacío" });
    }

    // Validar stock y calcular total
    let total = 0;
    for (const it of items.rows) {
      const p = await client.query(
        "SELECT stock FROM products WHERE id=$1",
        [it.product_id]
      );
      if (!p.rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Producto ${it.product_id} no existe` });
      }
      const stock = Number(p.rows[0].stock ?? 0);
      if (it.quantity > stock) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Stock insuficiente para producto ${it.product_id}` });
      }
      total += Number(it.price) * it.quantity;
    }

    // Crear orden
    const order = await client.query(
      "INSERT INTO orders (user_id, total, status) VALUES ($1, $2, $3) RETURNING id, user_id, total, status, created_at",
      [req.user.id, total, "pending"]
    );

    // Insertar items + descontar stock
    for (const it of items.rows) {
      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
        [order.rows[0].id, it.product_id, it.quantity, it.price]
      );
      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id=$2",
        [it.quantity, it.product_id]
      );
    }

    // Limpiar carrito
    await client.query("DELETE FROM cart_items WHERE cart_id=$1", [cartId]);

    await client.query("COMMIT");
    res.status(201).json({ message: "Orden creada", order: order.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ POST /cart/checkout:", err);
    res.status(500).json({ error: "Error en checkout" });
  } finally {
    client.release();
  }
});

export default router;
