// src/routes/sales.js
// Reference: docs/API_Schema_Regimens.docx (Sales), User Story 4
const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/sales?from=&to=
router.get("/", async (req, res) => {
  const { from, to } = req.query;
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

  try {
    const sales = await pool.query(
      `SELECT s.id, s.user_id, s.total_amount, s.sync_status, s.created_at
       FROM sales s ${where} ORDER BY s.created_at DESC`,
      params
    );

    // Attach line items for each sale
    const results = [];
    for (const sale of sales.rows) {
      const items = await pool.query(
        `SELECT product_id, quantity, unit_price, subtotal FROM sale_items WHERE sale_id = $1`,
        [sale.id]
      );
      results.push({ ...sale, items: items.rows });
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong fetching sales" });
  }
});

// GET /api/sales/:id
router.get("/:id", async (req, res) => {
  try {
    const saleResult = await pool.query("SELECT * FROM sales WHERE id = $1", [req.params.id]);
    if (saleResult.rows.length === 0) return res.status(404).json({ message: "Sale not found" });

    const itemsResult = await pool.query(
      `SELECT product_id, quantity, unit_price, subtotal FROM sale_items WHERE sale_id = $1`,
      [req.params.id]
    );

    res.json({ ...saleResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// POST /api/sales
// body: { items: [{ product_id, quantity }], client_created_at? }
router.post("/", async (req, res) => {
  const { items, client_created_at } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(422).json({ message: "items must be a non-empty array" });
  }

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
      if (!product) {
        throw Object.assign(new Error(`Product ${product_id} not found`), { status: 404 });
      }
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
      [req.user.id, totalAmount, client_created_at ? "pending" : "synced", client_created_at || null]
    );
    const sale = saleResult.rows[0];

    for (const item of lineItems) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [sale.id, item.product_id, item.quantity, item.unit_price, item.subtotal]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ ...sale, items: lineItems });
  } catch (err) {
    await client.query("ROLLBACK");
    const status = err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ message: err.message || "Something went wrong recording the sale" });
  } finally {
    client.release();
  }
});

module.exports = router;
