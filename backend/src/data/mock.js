// src/data/mock.js
const bcrypt = require("bcryptjs");
const {
  activeLayers,
  applyQuantityDelta,
  consumeFifo,
  ensureCoverage,
} = require("./stockLayers");

const state = {
  users: [],
  products: [],
  sales: [],
  saleItems: [],
  categories: [],
  backups: [],
  layers: [],
  nextIds: {
    users: 1,
    products: 1,
    sales: 1,
    saleItems: 1,
    categories: 1,
    backups: 1,
    layers: 1,
  },
};

const DEFAULT_CATEGORIES = [
  ["Notebooks", "Exercise books, notepads, and notebooks", "notebook,exercise book,note,notepad"],
  ["Pens", "Ballpoint, gel, and fountain pens", "pen,biro,ballpoint"],
  ["Markers", "Markers and highlighters", "marker,highlighter"],
  ["Files", "Folders, files, and filing supplies", "folder,file,manila"],
  ["Paper", "Printing and writing paper", "paper,ream"],
  ["Fasteners", "Staplers, clips, and fasteners", "stapler,staple,clip,pin,rubber band"],
  ["Correction", "Correction fluid, tape, and erasers", "correction,tippex,eraser"],
  ["Cutting", "Scissors, cutters, and blades", "scissors,cutter,blade"],
  ["Cards", "Index cards and greeting cards", "card,postcard"],
  ["Sets", "Geometry and stationery sets", "set,kit"],
];

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

  for (const [name, description, keywords] of DEFAULT_CATEGORIES) {
    state.categories.push({
      id: state.nextIds.categories++,
      name,
      description,
      keywords,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // name, sku, quantity, unit_price, min_stock_level, category, cost_price
  const products = [
    ["A4 Exercise Book", "SKU-001", 50, 5.0, 10, "Notebooks", 2.5],
    ["Blue Ballpoint Pen (Pack of 10)", "SKU-002", 30, 12.5, 5, "Pens", 6.0],
    ["Mathematical Set", "SKU-003", 4, 15.0, 5, "Sets", 8.0],
    ["A4 Printing Paper (Ream)", "SKU-004", 20, 45.0, 5, "Paper", 28.0],
    ["Stapler", "SKU-005", 8, 20.0, 3, "Fasteners", 11.0],
  ];

  for (const [name, sku, quantity, unit_price, min_stock_level, category, cost_price] of products) {
    const created_at = new Date().toISOString();
    const product = {
      id: state.nextIds.products++,
      name,
      sku,
      quantity,
      unit_price,
      min_stock_level,
      category,
      cost_price,
      created_at,
      updated_at: created_at,
    };
    state.products.push(product);
    if (quantity > 0) {
      state.layers.push({
        id: state.nextIds.layers++,
        product_id: product.id,
        unit_cost: cost_price,
        unit_price,
        quantity_remaining: quantity,
        created_at,
      });
    }
  }
}

function productLayers(productId) {
  return state.layers.filter((layer) => layer.product_id === Number(productId));
}

function setProductLayers(productId, nextLayers) {
  state.layers = state.layers
    .filter((layer) => layer.product_id !== Number(productId))
    .concat(nextLayers);
}

function withLayers(product) {
  if (!product) return null;
  return { ...product, stock_layers: activeLayers(productLayers(product.id)) };
}

seed();

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
    const weekday = (day.getDay() + 6) % 7; // Monday-based
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

async function findUserByUsername(username) {
  return state.users.find((u) => u.username === username) || null;
}

async function findUserById(id) {
  const user = state.users.find((u) => u.id === Number(id));
  if (!user) return null;
  return { id: user.id, name: user.name, username: user.username, role: user.role };
}

async function updateUserProfile(id, { name, username }) {
  const user = state.users.find((u) => u.id === Number(id));
  if (!user) return null;
  if (username && username !== user.username) {
    const taken = state.users.some(
      (u) => u.id !== Number(id) && u.username.toLowerCase() === username.toLowerCase()
    );
    if (taken) {
      const err = new Error("Username already in use");
      err.code = "23505";
      throw err;
    }
    user.username = username;
  }
  if (name !== undefined) user.name = name;
  return { id: user.id, name: user.name, username: user.username, role: user.role };
}

async function changeUserPassword(id, passwordHash) {
  const user = state.users.find((u) => u.id === Number(id));
  if (!user) return false;
  user.password_hash = passwordHash;
  return true;
}

async function listStaffUsers() {
  return state.users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    created_at: u.created_at,
  }));
}

async function createStaffUser({ name, username, password_hash, role }) {
  if (state.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    const err = new Error("Username already in use");
    err.code = "23505";
    throw err;
  }
  const user = {
    id: state.nextIds.users++,
    name,
    username,
    password_hash,
    role,
    created_at: new Date().toISOString(),
  };
  state.users.push(user);
  return { id: user.id, name: user.name, username: user.username, role: user.role };
}

async function listProducts({ search, lowStock } = {}) {
  let rows = [...state.products];
  if (search) {
    const term = search.toLowerCase();
    rows = rows.filter((p) => p.name.toLowerCase().includes(term));
  }
  if (lowStock === "true" || lowStock === true) {
    rows = rows.filter((p) => p.quantity < p.min_stock_level);
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name)).map(withLayers);
}

async function getProduct(id) {
  return withLayers(state.products.find((p) => p.id === Number(id)) || null);
}

async function createProduct({ name, sku, quantity, unit_price, min_stock_level, category, cost_price }) {
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
    category: category || null,
    cost_price: cost_price != null ? Number(cost_price) || 0 : 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.products.push(product);
  if ((product.quantity || 0) > 0) {
    state.layers.push({
      id: state.nextIds.layers++,
      product_id: product.id,
      unit_cost: product.cost_price,
      unit_price: product.unit_price,
      quantity_remaining: product.quantity,
      created_at: product.created_at,
    });
  }
  return withLayers(product);
}

async function updateProduct(id, fields) {
  const product = state.products.find((p) => p.id === Number(id));
  if (!product) return null;
  const oldQty = Number(product.quantity) || 0;
  const next = { ...fields };
  if (next.cost_price !== undefined) next.cost_price = Number(next.cost_price) || 0;
  if (next.unit_price !== undefined) next.unit_price = Number(next.unit_price) || 0;
  if (next.quantity !== undefined) next.quantity = Number(next.quantity) || 0;
  Object.assign(product, next, { updated_at: new Date().toISOString() });

  if (next.quantity !== undefined) {
    const delta = (Number(product.quantity) || 0) - oldQty;
    const updated = applyQuantityDelta(productLayers(product.id), {
      product_id: product.id,
      delta,
      unit_cost: product.cost_price,
      unit_price: product.unit_price,
      id: state.nextIds.layers++,
      created_at: new Date().toISOString(),
      fallbackCost: product.cost_price,
    });
    setProductLayers(product.id, updated);
  }
  return withLayers(product);
}

async function deleteProduct(id) {
  const index = state.products.findIndex((p) => p.id === Number(id));
  if (index === -1) return false;
  state.products.splice(index, 1);
  state.layers = state.layers.filter((layer) => layer.product_id !== Number(id));
  return true;
}

async function listStockLayers() {
  return [...state.layers];
}

async function listCategories() {
  return [...state.categories].sort((a, b) => a.name.localeCompare(b.name));
}

async function getCategory(id) {
  return state.categories.find((c) => c.id === Number(id)) || null;
}

async function createCategory({ name, description = "", keywords = "" }) {
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    throw Object.assign(new Error("name is required"), { status: 422 });
  }
  if (state.categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
    const err = new Error("Category name already in use");
    err.code = "23505";
    throw err;
  }
  const category = {
    id: state.nextIds.categories++,
    name: trimmed,
    description: String(description || "").trim(),
    keywords: String(keywords || "").trim(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  state.categories.push(category);
  return category;
}

async function updateCategory(id, fields) {
  const category = state.categories.find((c) => c.id === Number(id));
  if (!category) return null;
  if (fields.name !== undefined) {
    const trimmed = String(fields.name).trim();
    if (!trimmed) {
      throw Object.assign(new Error("name is required"), { status: 422 });
    }
    if (
      state.categories.some(
        (c) => c.id !== Number(id) && c.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      const err = new Error("Category name already in use");
      err.code = "23505";
      throw err;
    }
    fields = { ...fields, name: trimmed };
  }
  Object.assign(category, fields, { updated_at: new Date().toISOString() });
  return category;
}

async function deleteCategory(id) {
  const index = state.categories.findIndex((c) => c.id === Number(id));
  if (index === -1) return false;
  state.categories.splice(index, 1);
  return true;
}

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

  for (const { product_id, quantity } of items) {
    if (!product_id || !quantity || quantity <= 0) {
      throw Object.assign(new Error("Each item needs a product_id and a positive quantity"), {
        status: 422,
      });
    }
    const product = state.products.find((p) => p.id === Number(product_id));
    if (!product) {
      throw Object.assign(new Error(`Product ${product_id} not found`), { status: 404 });
    }
    if (product.quantity < quantity) {
      throw Object.assign(
        new Error(
          `Not enough stock for product ${product_id} (have ${product.quantity}, need ${quantity})`
        ),
        { status: 409 }
      );
    }
    const unit_price = Number(product.unit_price) || 0;
    const covered = ensureCoverage(productLayers(product.id), {
      product_id: product.id,
      quantity: product.quantity,
      unit_cost: product.cost_price,
      unit_price,
      id: state.nextIds.layers++,
      created_at: new Date().toISOString(),
    });
    const consumed = consumeFifo(covered, quantity, product.cost_price);
    setProductLayers(product.id, consumed.layers);
    const unit_cost = consumed.weightedUnitCost;
    const subtotal = unit_price * quantity;
    totalAmount += subtotal;
    lineItems.push({
      product_id: product.id,
      quantity,
      unit_price,
      unit_cost,
      subtotal,
    });
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

async function getProfitReport({ period = "monthly", from, to } = {}) {
  const allowed = new Set(["daily", "weekly", "monthly", "yearly"]);
  const resolved = allowed.has(period) ? period : "monthly";
  const sales = await listSales({ from, to });
  return buildProfitFromSales(sales, resolved);
}

async function listUsersForBackup() {
  return state.users.map((u) => ({ ...u }));
}

async function createBackupRecord({ created_by, file_path, status, snapshot }) {
  const record = {
    id: state.nextIds.backups++,
    created_by,
    file_path,
    status: status || "completed",
    created_at: new Date().toISOString(),
    snapshot: snapshot || null,
  };
  state.backups.unshift(record);
  const { snapshot: _snap, ...publicRecord } = record;
  return publicRecord;
}

async function listBackupRecords() {
  return state.backups.map(({ snapshot, ...row }) => row);
}

async function getBackupRecord(id) {
  return state.backups.find((b) => b.id === Number(id)) || null;
}

async function restoreFromSnapshot(snapshot) {
  state.users = [];
  state.products = [];
  state.categories = [];
  state.sales = [];
  state.saleItems = [];
  state.backups = [];
  state.layers = [];
  state.nextIds = {
    users: 1,
    products: 1,
    sales: 1,
    saleItems: 1,
    categories: 1,
    backups: 1,
    layers: 1,
  };

  for (const user of snapshot.users || []) {
    state.users.push({ ...user });
    state.nextIds.users = Math.max(state.nextIds.users, Number(user.id) + 1);
  }
  for (const category of snapshot.categories || []) {
    state.categories.push({ ...category });
    state.nextIds.categories = Math.max(state.nextIds.categories, Number(category.id) + 1);
  }
  for (const product of snapshot.products || []) {
    const { stock_layers, ...row } = product;
    state.products.push(row);
    state.nextIds.products = Math.max(state.nextIds.products, Number(product.id) + 1);
    if (Array.isArray(stock_layers) && !snapshot.stock_layers) {
      for (const layer of stock_layers) {
        state.layers.push({ ...layer, product_id: Number(product.id) });
        if (layer.id) state.nextIds.layers = Math.max(state.nextIds.layers, Number(layer.id) + 1);
      }
    }
  }
  for (const layer of snapshot.stock_layers || []) {
    state.layers.push({ ...layer });
    if (layer.id) state.nextIds.layers = Math.max(state.nextIds.layers, Number(layer.id) + 1);
  }
  if ((snapshot.stock_layers || []).length === 0 && state.layers.length === 0) {
    for (const product of state.products) {
      if ((product.quantity || 0) > 0) {
        state.layers.push({
          id: state.nextIds.layers++,
          product_id: product.id,
          unit_cost: product.cost_price,
          unit_price: product.unit_price,
          quantity_remaining: product.quantity,
          created_at: product.created_at || new Date().toISOString(),
        });
      }
    }
  }
  for (const sale of snapshot.sales || []) {
    state.sales.push({ ...sale });
    state.nextIds.sales = Math.max(state.nextIds.sales, Number(sale.id) + 1);
  }
  for (const item of snapshot.sale_items || []) {
    state.saleItems.push({ ...item });
    if (item.id) state.nextIds.saleItems = Math.max(state.nextIds.saleItems, Number(item.id) + 1);
  }
}

module.exports = {
  mode: "mock",
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
  listStockLayers,
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
