// src/routes/sales.js
// Reference: docs/API_Schema_Regimens.docx (Sales), User Story 4
const express = require("express");
const data = require("../data");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/sales?from=&to=
router.get("/", async (req, res) => {
  try {
    const sales = await data.listSales(req.query);
    res.json(sales);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong fetching sales" });
  }
});

// GET /api/sales/:id
router.get("/:id", async (req, res) => {
  try {
    const sale = await data.getSale(req.params.id);
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    res.json(sale);
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

  try {
    const sale = await data.createSale({ user_id: req.user.id, items, client_created_at });
    res.status(201).json(sale);
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ message: err.message || "Something went wrong recording the sale" });
  }
});

module.exports = router;
