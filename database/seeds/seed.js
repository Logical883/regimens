// database/seed.js
// Inserts a demo owner account and a handful of sample products for local development.
// Usage: node seed.js

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { Client } = require("pg");

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const passwordHash = await bcrypt.hash("owner1234", 10);

  const existing = await client.query("SELECT id FROM users WHERE username = $1", ["owner"]);
  let ownerId;
  if (existing.rows.length === 0) {
    const res = await client.query(
      `INSERT INTO users (name, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      ["John Kofi Mensah", "owner", passwordHash, "owner"]
    );
    ownerId = res.rows[0].id;
    console.log("Created demo user: username=owner password=owner1234");
  } else {
    ownerId = existing.rows[0].id;
    console.log("Demo user already exists, skipping.");
  }

  const products = [
    ["A4 Exercise Book", "SKU-001", 50, 5.0, 10],
    ["Blue Ballpoint Pen (Pack of 10)", "SKU-002", 30, 12.5, 5],
    ["Mathematical Set", "SKU-003", 4, 15.0, 5],
    ["A4 Printing Paper (Ream)", "SKU-004", 20, 45.0, 5],
    ["Stapler", "SKU-005", 8, 20.0, 3],
  ];

  for (const [name, sku, quantity, unit_price, min_stock_level] of products) {
    const exists = await client.query("SELECT id FROM products WHERE sku = $1", [sku]);
    if (exists.rows.length === 0) {
      await client.query(
        `INSERT INTO products (name, sku, quantity, unit_price, min_stock_level) VALUES ($1, $2, $3, $4, $5)`,
        [name, sku, quantity, unit_price, min_stock_level]
      );
    }
  }
  console.log(`Seeded ${products.length} sample products (skipping any that already exist).`);

  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
