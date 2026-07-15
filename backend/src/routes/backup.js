// src/routes/backup.js
// Reference: docs/API_Schema_Regimens.docx (Backup), User Story 10
// Implementation note: for the scaffold, a "backup" is a JSON export of the core tables
// written to backend/../database/backups/. This avoids depending on the pg_dump binary
// being on everyone's PATH. Swap for pg_dump/pg_restore later if the team wants a true
// binary dump.
const express = require("express");
const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const BACKUP_DIR = path.join(__dirname, "..", "..", "..", "database", "backups");

router.post("/", requireRole("owner"), async (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const tables = ["users", "products", "sales", "sale_items"];
    const snapshot = {};
    for (const table of tables) {
      const result = await pool.query(`SELECT * FROM ${table}`);
      snapshot[table] = result.rows;
    }

    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const filePath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));

    const record = await pool.query(
      `INSERT INTO backups (created_by, file_path, status) VALUES ($1, $2, 'completed') RETURNING *`,
      [req.user.id, path.relative(path.join(__dirname, "..", "..", ".."), filePath)]
    );

    res.status(201).json(record.rows[0]);
  } catch (err) {
    console.error(err);
    try {
      await pool.query(
        `INSERT INTO backups (created_by, file_path, status) VALUES ($1, $2, 'failed')`,
        [req.user.id, "n/a"]
      );
    } catch (_) {}
    res.status(500).json({ message: "Backup failed" });
  }
});

router.get("/", requireRole("owner"), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM backups ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong listing backups" });
  }
});

router.post("/:id/restore", requireRole("owner"), async (req, res) => {
  const client = await pool.connect();
  try {
    const backupResult = await client.query("SELECT * FROM backups WHERE id = $1", [req.params.id]);
    const backup = backupResult.rows[0];
    if (!backup) return res.status(404).json({ message: "Backup not found" });

    const filePath = path.join(__dirname, "..", "..", "..", backup.file_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Backup file missing on disk" });
    }

    const snapshot = JSON.parse(fs.readFileSync(filePath, "utf8"));

    await client.query("BEGIN");
    await client.query("TRUNCATE sale_items, sales, products, users RESTART IDENTITY CASCADE");

    for (const user of snapshot.users || []) {
      await client.query(
        `INSERT INTO users (id, name, username, password_hash, role, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
        [user.id, user.name, user.username, user.password_hash, user.role, user.created_at]
      );
    }
    for (const product of snapshot.products || []) {
      await client.query(
        `INSERT INTO products (id, name, sku, quantity, unit_price, min_stock_level, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [product.id, product.name, product.sku, product.quantity, product.unit_price, product.min_stock_level, product.created_at, product.updated_at]
      );
    }
    for (const sale of snapshot.sales || []) {
      await client.query(
        `INSERT INTO sales (id, user_id, total_amount, sync_status, created_at) VALUES ($1,$2,$3,$4,$5)`,
        [sale.id, sale.user_id, sale.total_amount, sale.sync_status, sale.created_at]
      );
    }
    for (const item of snapshot.sale_items || []) {
      await client.query(
        `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, subtotal) VALUES ($1,$2,$3,$4,$5,$6)`,
        [item.id, item.sale_id, item.product_id, item.quantity, item.unit_price, item.subtotal]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Restore complete", status: "completed" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Restore failed" });
  } finally {
    client.release();
  }
});

module.exports = router;
