// src/data/real.js
// Postgres-backed implementation of the same interface as mock.js.
// This is what routes call once the database team's migrations are set up and
// USE_MOCK_DB is turned off - see docs/API_Schema_Regimens.docx and ERD_Regimens.docx.
const pool = require("../db");

const PRODUCT_COLUMNS =
  "id, name, sku, quantity, unit_price, min_stock_level, category, cost_price, created_at, updated_at";
const SALE_ITEM_COLUMNS = "id, product_id, quantity, unit_price, unit_cost, subtotal";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function periodKey(date, period) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "unknown";

  if (period === "daily") {
    return d.toISOString().slice(0, 10);
  }
  if (period === "weekly") {
    const day = startOfDay(d);
    const weekday = (day.getDay() + 6) % 7;
    day.setDate(day.getDate() - weekday);
    return `Week of ${day.toISOString().slice(0, 10)}`;
  }
  if (period === "yearly") {
    return String(d.getFullYear());
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildProfitFromSales(sales, period) {
  const buckets = {};
  let revenue = 0;
  let cogs = 0;
  let lines = 0;
  let missingCostLines = 0;

  for (const sale of sales) {
    const items = Array.isArray(sale.items) ? sale.items : [];
    const createdAt = sale.created_at || sale.client_created_at;
    const key = periodKey(createdAt, period);

    if (!buckets[key]) {
      buckets[key] = { label: key, revenue: 0, cogs: 0, profit: 0, salesCount: 0 };
    }
    buckets[key].salesCount += 1;

    for (const item of items) {
      const qty = Number(item.quantity) || 0;
      const sell = Number(item.unit_price);
      const cost = Number(item.unit_cost) || 0;

      if (!(cost > 0)) missingCostLines += 1;

      const lineRevenue = Number.isFinite(sell) ? sell * qty : Number(item.subtotal) || 0;
      const lineCogs = cost * qty;
      const lineProfit = lineRevenue - lineCogs;

      revenue += lineRevenue;
      cogs += lineCogs;
      lines += 1;

      buckets[key].revenue += lineRevenue;
      buckets[key].cogs += lineCogs;
      buckets[key].profit += lineProfit;
    }

    if (items.length === 0 && sale.total_amount != null) {
      const r = Number(sale.total_amount) || 0;
      revenue += r;
      buckets[key].revenue += r;
      buckets[key].profit += r;
    }
  }

  const breakdown = Object.values(buckets).sort((a, b) =>
    String(a.label).localeCompare(String(b.label))
  );
  const grossProfit = revenue - cogs;
  const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  return {
    revenue,
    cogs,
    grossProfit,
    marginPercent,
    lines,
    missingCostLines,
    salesCount: sales.length,
    breakdown,
  };
}

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

async function updateUserProfile(id, { name, username }) {
  const result = await pool.query(
    `UPDATE users
     SET name = COALESCE($2, name),
         username = COALESCE($3, username)
     WHERE id = $1
     RETURNING id, name, username, role`,
    [id, name ?? null, username ?? null]
  );
  return result.rows[0] || null;
}

async function changeUserPassword(id, passwordHash) {
  const result = await pool.query(
    "UPDATE users SET password_hash = $2 WHERE id = $1 RETURNING id",
    [id, passwordHash]
  );
  return result.rows.length > 0;
}

async function listStaffUsers() {
  const result = await pool.query(
    `SELECT id, name, username, role, created_at
     FROM users ORDER BY role DESC, name ASC`
  );
  return result.rows;
}

async function createStaffUser({ name, username, password_hash, role }) {
  const result = await pool.query(
    `INSERT INTO users (name, username, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, username, role`,
    [name, username, password_hash, role]
  );
  return result.rows[0];
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
    `SELECT ${PRODUCT_COLUMNS} FROM products ${where} ORDER BY name ASC`,
    params
  );
  return result.rows;
}
async function getProduct(id) {
  const result = await pool.query(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = $1`, [id]);
  return result.rows[0] || null;
}
async function createProduct({
  name,
  sku,
  quantity,
  unit_price,
  min_stock_level,
  category,
  cost_price,
}) {
  const result = await pool.query(
    `INSERT INTO products (name, sku, quantity, unit_price, min_stock_level, category, cost_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${PRODUCT_COLUMNS}`,
    [
      name,
      sku || null,
      quantity || 0,
      unit_price || 0,
      min_stock_level || 0,
      category || null,
      cost_price != null ? Number(cost_price) || 0 : 0,
    ]
  );
  return result.rows[0];
}
async function updateProduct(id, fields) {
  const allowed = new Set([
    "name",
    "sku",
    "quantity",
    "unit_price",
    "min_stock_level",
    "category",
    "cost_price",
  ]);
  const updates = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!allowed.has(key)) continue;
    updates[key] = key === "cost_price" ? Number(value) || 0 : value;
  }
  const keys = Object.keys(updates);
  if (keys.length === 0) return getProduct(id);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const params = [...keys.map((k) => updates[k]), id];
  const result = await pool.query(
    `UPDATE products SET ${setClause}, updated_at = now() WHERE id = $${keys.length + 1}
     RETURNING ${PRODUCT_COLUMNS}`,
    params
  );
  return result.rows[0] || null;
}
async function deleteProduct(id) {
  const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);
  return result.rows.length > 0;
}

// ---- Categories ----
async function listCategories() {
  const result = await pool.query(
    `SELECT id, name, description, keywords, created_at, updated_at
     FROM categories ORDER BY name ASC`
  );
  return result.rows;
}
async function getCategory(id) {
  const result = await pool.query(
    `SELECT id, name, description, keywords, created_at, updated_at
     FROM categories WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}
async function createCategory({ name, description = "", keywords = "" }) {
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    throw Object.assign(new Error("name is required"), { status: 422 });
  }
  const result = await pool.query(
    `INSERT INTO categories (name, description, keywords)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, keywords, created_at, updated_at`,
    [trimmed, String(description || "").trim(), String(keywords || "").trim()]
  );
  return result.rows[0];
}
async function updateCategory(id, fields) {
  const allowed = new Set(["name", "description", "keywords"]);
  const updates = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!allowed.has(key)) continue;
    updates[key] = key === "name" ? String(value).trim() : String(value || "").trim();
  }
  if (updates.name !== undefined && !updates.name) {
    throw Object.assign(new Error("name is required"), { status: 422 });
  }
  const keys = Object.keys(updates);
  if (keys.length === 0) return getCategory(id);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const params = [...keys.map((k) => updates[k]), id];
  const result = await pool.query(
    `UPDATE categories SET ${setClause}, updated_at = now() WHERE id = $${keys.length + 1}
     RETURNING id, name, description, keywords, created_at, updated_at`,
    params
  );
  return result.rows[0] || null;
}
async function deleteCategory(id) {
  const result = await pool.query("DELETE FROM categories WHERE id = $1 RETURNING id", [id]);
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
      `SELECT ${SALE_ITEM_COLUMNS} FROM sale_items WHERE sale_id = $1`,
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
    `SELECT ${SALE_ITEM_COLUMNS} FROM sale_items WHERE sale_id = $1`,
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
        throw Object.assign(new Error("Each item needs a product_id and a positive quantity"), {
          status: 422,
        });
      }
      const productResult = await client.query(
        "SELECT id, quantity, unit_price, cost_price FROM products WHERE id = $1 FOR UPDATE",
        [product_id]
      );
      const product = productResult.rows[0];
      if (!product) throw Object.assign(new Error(`Product ${product_id} not found`), { status: 404 });
      if (product.quantity < quantity) {
        throw Object.assign(
          new Error(
            `Not enough stock for product ${product_id} (have ${product.quantity}, need ${quantity})`
          ),
          { status: 409 }
        );
      }
      const unit_price = Number(product.unit_price) || 0;
      const unit_cost = Number(product.cost_price) || 0;
      const subtotal = unit_price * quantity;
      totalAmount += subtotal;
      lineItems.push({ product_id, quantity, unit_price, unit_cost, subtotal });
      await client.query(
        "UPDATE products SET quantity = quantity - $1, updated_at = now() WHERE id = $2",
        [quantity, product_id]
      );
    }

    const saleResult = await client.query(
      `INSERT INTO sales (user_id, total_amount, sync_status, created_at)
       VALUES ($1, $2, $3, COALESCE($4, now())) RETURNING *`,
      [user_id, totalAmount, client_created_at ? "pending" : "synced", client_created_at || null]
    );
    const sale = saleResult.rows[0];

    for (const item of lineItems) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, unit_cost, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [sale.id, item.product_id, item.quantity, item.unit_price, item.unit_cost, item.subtotal]
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

async function getProfitReport({ period = "monthly", from, to } = {}) {
  const allowed = new Set(["daily", "weekly", "monthly", "yearly"]);
  const resolved = allowed.has(period) ? period : "monthly";
  const sales = await listSales({ from, to });
  return buildProfitFromSales(sales, resolved);
}

async function listUsersForBackup() {
  const result = await pool.query(
    "SELECT id, name, username, password_hash, role, created_at FROM users ORDER BY id"
  );
  return result.rows;
}

async function createBackupRecord({ created_by, file_path, status }) {
  const result = await pool.query(
    `INSERT INTO backups (created_by, file_path, status)
     VALUES ($1, $2, $3) RETURNING *`,
    [created_by, file_path, status || "completed"]
  );
  return result.rows[0];
}

async function listBackupRecords() {
  const result = await pool.query("SELECT * FROM backups ORDER BY created_at DESC");
  return result.rows;
}

async function getBackupRecord(id) {
  const result = await pool.query("SELECT * FROM backups WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function restoreFromSnapshot(snapshot) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "TRUNCATE sale_items, sales, products, categories, backups, users RESTART IDENTITY CASCADE"
    );

    for (const user of snapshot.users || []) {
      await client.query(
        `INSERT INTO users (id, name, username, password_hash, role, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [user.id, user.name, user.username, user.password_hash, user.role, user.created_at]
      );
    }

    for (const category of snapshot.categories || []) {
      await client.query(
        `INSERT INTO categories (id, name, description, keywords, created_at, updated_at)
         VALUES ($1,$2,$3,$4,COALESCE($5, now()), COALESCE($6, now()))`,
        [
          category.id,
          category.name,
          category.description || "",
          category.keywords || "",
          category.created_at,
          category.updated_at,
        ]
      );
    }

    for (const product of snapshot.products || []) {
      await client.query(
        `INSERT INTO products
          (id, name, sku, quantity, unit_price, min_stock_level, category, cost_price, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          product.id,
          product.name,
          product.sku,
          product.quantity,
          product.unit_price,
          product.min_stock_level,
          product.category || null,
          product.cost_price != null ? product.cost_price : 0,
          product.created_at,
          product.updated_at,
        ]
      );
    }

    for (const sale of snapshot.sales || []) {
      await client.query(
        `INSERT INTO sales (id, user_id, total_amount, sync_status, created_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [sale.id, sale.user_id, sale.total_amount, sale.sync_status, sale.created_at]
      );
    }

    for (const item of snapshot.sale_items || []) {
      if (item.id != null) {
        await client.query(
          `INSERT INTO sale_items
            (id, sale_id, product_id, quantity, unit_price, unit_cost, subtotal)
           VALUES ($1,$2,$3,$4,$5,COALESCE($6,0),$7)`,
          [
            item.id,
            item.sale_id,
            item.product_id,
            item.quantity,
            item.unit_price,
            item.unit_cost,
            item.subtotal,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO sale_items
            (sale_id, product_id, quantity, unit_price, unit_cost, subtotal)
           VALUES ($1,$2,$3,$4,COALESCE($5,0),$6)`,
          [
            item.sale_id,
            item.product_id,
            item.quantity,
            item.unit_price,
            item.unit_cost,
            item.subtotal,
          ]
        );
      }
    }

    await client.query(
      `SELECT setval(pg_get_serial_sequence('users','id'), COALESCE((SELECT MAX(id) FROM users), 1))`
    );
    await client.query(
      `SELECT setval(pg_get_serial_sequence('products','id'), COALESCE((SELECT MAX(id) FROM products), 1))`
    );
    await client.query(
      `SELECT setval(pg_get_serial_sequence('categories','id'), COALESCE((SELECT MAX(id) FROM categories), 1))`
    );
    await client.query(
      `SELECT setval(pg_get_serial_sequence('sales','id'), COALESCE((SELECT MAX(id) FROM sales), 1))`
    );
    await client.query(
      `SELECT setval(pg_get_serial_sequence('sale_items','id'), COALESCE((SELECT MAX(id) FROM sale_items), 1))`
    );

    await client.query("COMMIT");
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
  updateUserProfile,
  changeUserPassword,
  listStaffUsers,
  createStaffUser,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  listSales,
  getSale,
  createSale,
  getProfitReport,
  listUsersForBackup,
  createBackupRecord,
  listBackupRecords,
  getBackupRecord,
  restoreFromSnapshot,
};
