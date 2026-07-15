// src/routes/sync.js
// Reference: docs/Architecture_Decision_Records.docx (ADR-005), docs/API_Schema_Regimens.docx (Sync)
// The frontend queues writes made while offline, then POSTs them here in one batch once
// connectivity returns. Conflicts (same product edited elsewhere in the meantime) are
// resolved last-write-wins using each product's updated_at timestamp.
const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// POST /api/sync
// body: { sales: [{ items, client_created_at }], products: [{ id, ...fields, client_updated_at }] }
router.post("/", async (req, res) => {
  const { sales = [], products = [] } = req.body || {};
  const synced = [];
  const conflicts = [];

  const client = await pool.connect();
  try {
    // Replay queued sales - each one goes through the same stock-decrement logic as POST /sales.
    for (const queuedSale of sales) {
      try {
        await client.query("BEGIN");
        let totalAmount = 0;
        const lineItems = [];

        for (const { product_id, quantity } of queuedSale.items || []) {
          const productResult = await client.query(
            "SELECT id, quantity, unit_price FROM products WHERE id = $1 FOR UPDATE",
            [product_id]
          );
          const product = productResult.rows[0];
          if (!product || product.quantity < quantity) {
            throw new Error(`Cannot replay sale: insufficient stock for product ${product_id}`);
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
           VALUES ($1, $2, 'synced', COALESCE($3, now())) RETURNING *`,
          [req.user.id, totalAmount, queuedSale.client_created_at || null]
        );

        for (const item of lineItems) {
          await client.query(
            `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES ($1,$2,$3,$4,$5)`,
            [saleResult.rows[0].id, item.product_id, item.quantity, item.unit_price, item.subtotal]
          );
        }

        await client.query("COMMIT");
        synced.push({ type: "sale", client_created_at: queuedSale.client_created_at, id: saleResult.rows[0].id });
      } catch (err) {
        await client.query("ROLLBACK");
        conflicts.push({ type: "sale", client_created_at: queuedSale.client_created_at, reason: err.message });
      }
    }

    // Apply queued product edits with last-write-wins on updated_at.
    for (const queuedProduct of products) {
      const { id, client_updated_at, ...fields } = queuedProduct;
      try {
        const current = await client.query("SELECT updated_at FROM products WHERE id = $1", [id]);
        if (current.rows.length === 0) {
          conflicts.push({ type: "product", id, reason: "Product no longer exists" });
          continue;
        }

        const serverUpdatedAt = new Date(current.rows[0].updated_at).getTime();
        const clientUpdatedAt = new Date(client_updated_at || 0).getTime();

        if (clientUpdatedAt < serverUpdatedAt) {
          // Server has a newer write — the offline edit loses, per last-write-wins (ADR-005).
          conflicts.push({ type: "product", id, reason: "Server has a newer update; offline edit discarded" });
          continue;
        }

        const keys = Object.keys(fields);
        if (keys.length === 0) continue;
        const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
        await client.query(
          `UPDATE products SET ${setClause}, updated_at = now() WHERE id = $${keys.length + 1}`,
          [...keys.map((k) => fields[k]), id]
        );
        synced.push({ type: "product", id });
      } catch (err) {
        conflicts.push({ type: "product", id, reason: err.message });
      }
    }

    res.json({ synced, conflicts });
  } finally {
    client.release();
  }
});

module.exports = router;
