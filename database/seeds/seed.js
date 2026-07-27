// database/seed.js
// Inserts a demo owner account, categories, and sample products for local development.
// Usage: node seed.js

require("dotenv").config();
require("dotenv").config({ path: require("path").join(__dirname, "..", "backend", ".env") });
const path = require("path");
const bcrypt = require("bcryptjs");
const { Client } = require("pg");

function needsSsl(connectionString = "") {
  if (process.env.DATABASE_SSL === "true") return true;
  if (process.env.DATABASE_SSL === "false") return false;
  return /render\.com|railway\.app|amazonaws\.com|neon\.tech|supabase\.co/i.test(
    connectionString
  );
}

const CATEGORIES = [
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

// name, sku, quantity, unit_price, min_stock_level, category, cost_price
const PRODUCTS = [
  ["A4 Exercise Book", "SKU-001", 50, 5.0, 10, "Notebooks", 2.5],
  ["Blue Ballpoint Pen (Pack of 10)", "SKU-002", 30, 12.5, 5, "Pens", 6.0],
  ["Mathematical Set", "SKU-003", 4, 15.0, 5, "Sets", 8.0],
  ["A4 Printing Paper (Ream)", "SKU-004", 20, 45.0, 5, "Paper", 28.0],
  ["Stapler", "SKU-005", 8, 20.0, 3, "Fasteners", 11.0],
];

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = new Client({
    connectionString,
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  const passwordHash = await bcrypt.hash("owner1234", 10);

  const existing = await client.query("SELECT id FROM users WHERE username = $1", ["owner"]);
  if (existing.rows.length === 0) {
    await client.query(
      `INSERT INTO users (name, username, password_hash, role) VALUES ($1, $2, $3, $4)`,
      ["John Kofi Mensah", "owner", passwordHash, "owner"]
    );
    console.log("Created demo user: username=owner password=owner1234");
  } else {
    console.log("Demo user already exists, skipping.");
  }

  for (const [name, description, keywords] of CATEGORIES) {
    const exists = await client.query("SELECT id FROM categories WHERE name = $1", [name]);
    if (exists.rows.length === 0) {
      await client.query(
        `INSERT INTO categories (name, description, keywords) VALUES ($1, $2, $3)`,
        [name, description, keywords]
      );
    }
  }
  console.log(`Seeded ${CATEGORIES.length} categories (skipping any that already exist).`);

  for (const [name, sku, quantity, unit_price, min_stock_level, category, cost_price] of PRODUCTS) {
    const exists = await client.query("SELECT id FROM products WHERE sku = $1", [sku]);
    if (exists.rows.length === 0) {
      await client.query(
        `INSERT INTO products (name, sku, quantity, unit_price, min_stock_level, category, cost_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [name, sku, quantity, unit_price, min_stock_level, category, cost_price]
      );
    } else {
      await client.query(
        `UPDATE products
         SET category = COALESCE(category, $2),
             cost_price = CASE WHEN cost_price = 0 THEN $3 ELSE cost_price END,
             updated_at = now()
         WHERE sku = $1`,
        [sku, category, cost_price]
      );
    }
  }
  console.log(`Seeded ${PRODUCTS.length} sample products (skipping any that already exist).`);

  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
