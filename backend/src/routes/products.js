// src/routes/products.js
const express = require("express");
const data = require("../data");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const products = await data.listProducts(req.query);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong fetching products" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await data.getProduct(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.post("/", async (req, res) => {
  const { name, sku, quantity, unit_price, min_stock_level, category } = req.body || {};
  if (!name) {
    return res.status(422).json({ message: "name is required" });
  }

  try {
    const product = await data.createProduct({
      name,
      sku,
      quantity,
      unit_price,
      min_stock_level,
      category,
    });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "SKU already in use" });
    console.error(err);
    res.status(500).json({ message: "Something went wrong creating the product" });
  }
});

router.put("/:id", async (req, res) => {
  const fields = ["name", "sku", "quantity", "unit_price", "min_stock_level", "category"];
  const updates = {};
  for (const field of fields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(422).json({ message: "No updatable fields provided" });
  }

  try {
    const product = await data.updateProduct(req.params.id, updates);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong updating the product" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await data.deleteProduct(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong deleting the product" });
  }
});

module.exports = router;