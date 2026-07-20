// src/data/mock.js
// Standalone mode: an in-memory stand-in for Postgres so anyone can run the backend
// and build against it with zero database setup. Data resets every time the server
// restarts - that's expected, this is for building/demoing UI flows, not real storage.
// Same shapes as docs/ERD_Regimens.docx so switching to real.js later is a drop-in swap.
const bcrypt = require("bcryptjs");

const state = {
  users: [],
  products: [],
  sales: [],
  saleItems: [],
  backups: [],
  nextIds: { users: 1, products: 1, sales: 1, saleItems: 1, backups: 1 },
};

function seed() {
  const passwordHash = bcrypt.hashSync("owner1234", 10);
  state.users.push({
    id: state.nextIds.users++,
    name: "John Kofi Mensah",
    username: "owner",
    password_hash: passwordHash,
    role: "owner",
    created_at: new Date().toISOString(),
  });

  const products = [
    ["A4 Exercise Book", "SKU-001", 50, 5.0, 10],
    ["Blue Ballpoint Pen (Pack of 10)", "SKU-002", 30, 12.5, 5],
    ["Mathematical Set", "SKU-003", 4, 15.0, 5],
    ["A4 Printing Paper (Ream)", "SKU-004", 20, 45.0, 5],
    ["Stapler", "SKU-005", 8, 20.0, 3],
  ];
  for (const [name, sku, quantity, unit_price, min_stock_level] of products) {
    state.products.push({
      id: state.nextIds.products++,
      name,
      sku,
      quantity,
      unit_price,
      min_stock_level,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}
seed();

// ---- Auth ----
async function findUserByUsername(username) {
  return state.users.find((u) => u.username === username) || null;
}
async function findUserById(id) {
  return state.users.find((u) => u.id === Number(id)) || null;
}

// ---- Products ----
async function listProducts({ search, lowStock } = {}) {
  let rows = [...state.products];
  if (search) {
    const term = search.toLowerCase();
    rows = rows.filter((p) => p.name.toLowerCase().includes(term));
  }
  if (lowStock === "true" || lowStock === true) {
    rows = rows.filter((p) => p.quantity < p.min_stock_level);
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
async function getProduct(id) {
  return state.products.find((p) => p.id === Number(id)) || null;
}
async function createProduct({ name, sku, quantity, unit_price, min_stock_level }) {
  if (sku && state.products.some((p) => p.sku === sku)) {
    const err = new Error("SKU already in use");
    err.code = "23505";
    throw err;
  }
  const product = {
    id: state.nextIds.products++,
    name,
    sku: sku || null,
    quantity: quantity || 0,
    unit_price: unit_price || 0,
    min_stock_level: min_stock_level || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.products.push(product);
  return product;
}
async function updateProduct(id, fields) {
  const product = state.products.find((p) => p.id === Number(id));
  if (!product) return null;
  Object.assign(product, fields, { updated_at: new Date().toISOString() });
  return product;
}
async function deleteProduct(id) {
  const index = state.products.findIndex((p) => p.id === Number(id));
  if (index === -1) return false;
  state.products.splice(index, 1);
  return true;
}

// ---- Sales ----
async function listSales({ from, to } = {}) {
  let rows = [...state.sales];
  if (from) rows = rows.filter((s) => s.created_at >= from);
  if (to) rows = rows.filter((s) => s.created_at <= to);
  return rows
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((sale) => ({
      ...sale,
      items: state.saleItems.filter((i) => i.sale_id === sale.id),
    }));
}
async function getSale(id) {
  const sale = state.sales.find((s) => s.id === Number(id));
  if (!sale) return null;
  return { ...sale, items: state.saleItems.filter((i) => i.sale_id === sale.id) };
}
async function createSale({ user_id, items, client_created_at }) {
  let totalAmount = 0;
  const lineItems = [];

  // Validate + compute before mutating anything, so a bad item fails the whole sale.
  for (const { product_id, quantity } of items) {
    if (!product_id || !quantity || quantity <= 0) {
      throw Object.assign(new Error("Each item needs a product_id and a positive quantity"), { status: 422 });
    }
    const product = state.products.find((p) => p.id === Number(product_id));
    if (!product) throw Object.assign(new Error(`Product ${product_id} not found`), { status: 404 });
    if (product.quantity < quantity) {
      throw Object.assign(
        new Error(`Not enough stock for product ${product_id} (have ${product.quantity}, need ${quantity})`),
        { status: 409 }
      );
    }
    const subtotal = Number(product.unit_price) * quantity;
    totalAmount += subtotal;
    lineItems.push({ product_id: product.id, quantity, unit_price: product.unit_price, subtotal });
  }

  for (const item of lineItems) {
    const product = state.products.find((p) => p.id === item.product_id);
    product.quantity -= item.quantity;
    product.updated_at = new Date().toISOString();
  }

  const sale = {
    id: state.nextIds.sales++,
    user_id,
    total_amount: totalAmount,
    sync_status: client_created_at ? "pending" : "synced",
    created_at: client_created_at || new Date().toISOString(),
  };
  state.sales.push(sale);

  for (const item of lineItems) {
    state.saleItems.push({ id: state.nextIds.saleItems++, sale_id: sale.id, ...item });
  }

  return { ...sale, items: lineItems };
}

module.exports = {
  mode: "mock",
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
