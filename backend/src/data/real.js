// src/data/real.js
// Postgres-backed implementation of the same interface as mock.js.
// This is what routes call once the database team's migrations are set up and
// USE_MOCK_DB is turned off - see docs/API_Schema_Regimens.docx and ERD_Regimens.docx.
const pool = require("../db");

// ---- Auth ----
async function findUserByUsername(username) {
  const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
  return result.rows[0] || null;
}
async function findUserById(id) {
  const result = await pool.query(
    "SELECT id, name, username, role FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

// ---- Products ----
async function listProducts({ search, lowStock } = {}) {
  const conditions = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`name ILIKE $${params.length}`);
  }
  if (lowStock === "true" || lowStock === true) {
    conditions.push(`quantity < min_stock_level`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT id, name, sku, quantity, unit_price, min_stock_level, created_at, updated_at
     FROM products ${where} ORDER BY name ASC`,
    params
  );
  return result.rows;
}
async function getProduct(id) {
  const result = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
  return result.rows[0] || null;
}
async function createProduct({ name, sku, quantity, unit_price, min_stock_level }) {
  const result = await pool.query(
    `INSERT INTO products (name, sku, quantity, unit_price, min_stock_level)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, sku || null, quantity || 0, unit_price || 0, min_stock_level || 0]
  );
  return result.rows[0];
}
async function updateProduct(id, fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return getProduct(id);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const params = [...keys.map((k) => fields[k]), id];
  const result = await pool.query(
    `UPDATE products SET ${setClause}, updated_at = now() WHERE id = $${keys.length + 1} RETURNING *`,
    params
  );
  return result.rows[0] || null;
}
async function deleteProduct(id) {
  const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);
  return result.rows.length > 0;
}

// ---- Sales ----
async function listSales({ from, to } = {}) {
  const conditions = [];
  const params = [];
  if (from) {
    params.push(from);
    conditions.push(`s.created_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`s.created_at <= $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sales = await pool.query(
    `SELECT s.id, s.user_id, s.total_amount, s.sync_status, s.created_at
     FROM sales s ${where} ORDER BY s.created_at DESC`,
    params
  );
  const results = [];
  for (const sale of sales.rows) {
    const items = await pool.query(
      `SELECT product_id, quantity, unit_price, subtotal FROM sale_items WHERE sale_id = $1`,
      [sale.id]
    );
    results.push({ ...sale, items: items.rows });
  }
  return results;
}
async function getSale(id) {
  const saleResult = await pool.query("SELECT * FROM sales WHERE id = $1", [id]);
  if (saleResult.rows.length === 0) return null;
  const itemsResult = await pool.query(
    `SELECT product_id, quantity, unit_price, subtotal FROM sale_items WHERE sale_id = $1`,
    [id]
  );
  return { ...saleResult.rows[0], items: itemsResult.rows };
}
async function createSale({ user_id, items, client_created_at }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let totalAmount = 0;
    const lineItems = [];

    for (const { product_id, quantity } of items) {
      if (!product_id || !quantity || quantity <= 0) {
        throw Object.assign(new Error("Each item needs a product_id and a positive quantity"), { status: 422 });
      }
      const productResult = await client.query(
        "SELECT id, quantity, unit_price FROM products WHERE id = $1 FOR UPDATE",
        [product_id]
      );
      const product = productResult.rows[0];
      if (!product) throw Object.assign(new Error(`Product ${product_id} not found`), { status: 404 });
      if (product.quantity < quantity) {
        throw Object.assign(
          new Error(`Not enough stock for product ${product_id} (have ${product.quantity}, need ${quantity})`),
          { status: 409 }
        );
      }
      const subtotal = Number(product.unit_price) * quantity;
      totalAmount += subtotal;
      lineItems.push({ product_id, quantity, unit_price: product.unit_price, subtotal });
      await client.query("UPDATE products SET quantity = quantity - $1, updated_at = now() WHERE id = $2", [
        quantity,
        product_id,
      ]);
    }

    const saleResult = await client.query(
      `INSERT INTO sales (user_id, total_amount, sync_status, created_at)
       VALUES ($1, $2, $3, COALESCE($4, now())) RETURNING *`,
      [user_id, totalAmount, client_created_at ? "pending" : "synced", client_created_at || null]
    );
    const sale = saleResult.rows[0];

    for (const item of lineItems) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES ($1,$2,$3,$4,$5)`,
        [sale.id, item.product_id, item.quantity, item.unit_price, item.subtotal]
      );
    }

    await client.query("COMMIT");
    return { ...sale, items: lineItems };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  mode: "postgres",
  findUserByUsername,
  findUserById,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listSales,
  getSale,
  createSale,
};
