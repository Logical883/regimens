// src/routes/sync.js
// Offline queue replay. Uses the data layer so mock + Postgres both work,
// stamps unit_cost on sale lines, and whitelists product fields (no SQL injection).
const express = require("express");
const data = require("../data");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const MAX_SALES = 100;
const MAX_PRODUCTS = 100;
const PRODUCT_FIELDS = new Set([
  "name",
  "sku",
  "quantity",
  "unit_price",
  "min_stock_level",
  "category",
  "cost_price",
]);

function clampInt(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

// POST /api/sync
router.post("/", async (req, res) => {
  const sales = Array.isArray(req.body?.sales) ? req.body.sales.slice(0, MAX_SALES) : [];
  const products = Array.isArray(req.body?.products)
    ? req.body.products.slice(0, MAX_PRODUCTS)
    : [];
  const synced = [];
  const conflicts = [];

  for (const queuedSale of sales) {
    try {
      const rawItems = Array.isArray(queuedSale.items) ? queuedSale.items : [];
      if (rawItems.length === 0) {
        throw Object.assign(new Error("Sale has no items"), { status: 422 });
      }
      const items = rawItems.map((item) => {
        const quantity = clampInt(item.quantity, 1, 100000);
        const product_id = clampInt(item.product_id, 1, Number.MAX_SAFE_INTEGER);
        if (!product_id || !quantity) {
          throw Object.assign(new Error("Invalid sale item"), { status: 422 });
        }
        return { product_id, quantity };
      });

      const sale = await data.createSale({
        user_id: req.user.id,
        items,
        client_created_at: queuedSale.client_created_at || null,
      });
      synced.push({
        type: "sale",
        client_created_at: queuedSale.client_created_at,
        id: sale.id,
      });
    } catch (err) {
      conflicts.push({
        type: "sale",
        client_created_at: queuedSale.client_created_at,
        reason: err.message || "Sale sync failed",
      });
    }
  }

  for (const queuedProduct of products) {
    const id = queuedProduct.id;
    try {
      if (!id) {
        conflicts.push({ type: "product", id, reason: "Missing product id" });
        continue;
      }

      const current = await data.getProduct(id);
      if (!current) {
        conflicts.push({ type: "product", id, reason: "Product no longer exists" });
        continue;
      }

      const serverUpdatedAt = new Date(current.updated_at || 0).getTime();
      const clientUpdatedAt = new Date(queuedProduct.client_updated_at || 0).getTime();
      if (clientUpdatedAt < serverUpdatedAt) {
        conflicts.push({
          type: "product",
          id,
          reason: "Server has a newer update; offline edit discarded",
        });
        continue;
      }

      const updates = {};
      for (const key of PRODUCT_FIELDS) {
        if (queuedProduct[key] !== undefined) updates[key] = queuedProduct[key];
      }
      if (Object.keys(updates).length === 0) continue;

      const updated = await data.updateProduct(id, updates);
      if (!updated) {
        conflicts.push({ type: "product", id, reason: "Update failed" });
        continue;
      }
      synced.push({ type: "product", id });
    } catch (err) {
      conflicts.push({ type: "product", id, reason: err.message || "Product sync failed" });
    }
  }

  res.json({ synced, conflicts });
});

module.exports = router;
