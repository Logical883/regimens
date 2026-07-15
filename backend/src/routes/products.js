// src/routes/products.js
// Reference: docs/API_Schema_Regimens.docx (Products), User Stories 1, 2, 3, 5, 6, 7
const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/products?search=&lowStock=true
router.get("/", async (req, res) => {
  const { search, lowStock } = req.query;
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`name ILIKE $${params.length}`);
  }
  if (lowStock === "true") {
    conditions.push(`quantity < min_stock_level`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `SELECT id, name, sku, quantity, unit_price, min_stock_level, created_at, updated_at
       FROM products ${where} ORDER BY name ASC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong fetching products" });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Product not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// POST /api/products
router.post("/", async (req, res) => {
  const { name, sku, quantity, unit_price, min_stock_level } = req.body || {};
  if (!name) {
    return res.status(422).json({ message: "name is required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (name, sku, quantity, unit_price, min_stock_level)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, sku || null, quantity || 0, unit_price || 0, min_stock_level || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === "23505") return res.status(409).json({ message: "SKU already in use" });
    res.status(500).json({ message: "Something went wrong creating the product" });
  }
});

// PUT /api/products/:id
router.put("/:id", async (req, res) => {
  const fields = ["name", "sku", "quantity", "unit_price", "min_stock_level"];
  const updates = [];
  const params = [];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      params.push(req.body[field]);
      updates.push(`${field} = $${params.length}`);
    }
  }

  if (updates.length === 0) {
    return res.status(422).json({ message: "No updatable fields provided" });
  }

  params.push(req.params.id);
  try {
    const result = await pool.query(
      `UPDATE products SET ${updates.join(", ")}, updated_at = now()
       WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Product not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong updating the product" });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong deleting the product" });
  }
});

module.exports = router;
