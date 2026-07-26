// src/routes/categories.js
const express = require("express");
const data = require("../data");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const categories = await data.listCategories();
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong fetching categories" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const category = await data.getCategory(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.post("/", async (req, res) => {
  const { name, description, keywords } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(422).json({ message: "name is required" });
  }

  try {
    const category = await data.createCategory({ name, description, keywords });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Category name already in use" });
    }
    const status = err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ message: err.message || "Something went wrong creating the category" });
  }
});

router.put("/:id", async (req, res) => {
  const fields = ["name", "description", "keywords"];
  const updates = {};
  for (const field of fields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(422).json({ message: "No updatable fields provided" });
  }

  try {
    const category = await data.updateCategory(req.params.id, updates);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Category name already in use" });
    }
    const status = err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ message: err.message || "Something went wrong updating the category" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await data.deleteCategory(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong deleting the category" });
  }
});

module.exports = router;
