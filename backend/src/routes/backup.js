// src/routes/backup.js
// Owner-only JSON snapshots. Works in CONNECTED (Postgres + disk) and STANDALONE (mock memory).
const express = require("express");
const fs = require("fs");
const path = require("path");
const data = require("../data");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);
router.use(requireRole("owner"));

const BACKUP_DIR = path.join(__dirname, "..", "..", "..", "database", "backups");
const BACKUP_ROOT = path.resolve(BACKUP_DIR);

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function resolveSafeBackupPath(relativePath) {
  const resolved = path.resolve(path.join(__dirname, "..", "..", ".."), relativePath);
  if (!resolved.startsWith(BACKUP_ROOT + path.sep) && resolved !== BACKUP_ROOT) {
    const err = new Error("Invalid backup path");
    err.status = 400;
    throw err;
  }
  return resolved;
}

async function buildSnapshot() {
  const [users, products, categories, sales] = await Promise.all([
    data.listUsersForBackup ? data.listUsersForBackup() : [],
    data.listProducts({}),
    data.listCategories(),
    data.listSales({}),
  ]);

  const sale_items = [];
  for (const sale of sales) {
    for (const item of sale.items || []) {
      sale_items.push({ ...item, sale_id: sale.id });
    }
  }

  return {
    version: 2,
    created_at: new Date().toISOString(),
    users,
    products,
    categories,
    sales: sales.map(({ items, ...sale }) => sale),
    sale_items,
  };
}

router.post("/", async (req, res) => {
  try {
    const snapshot = await buildSnapshot();

    if (data.mode === "mock") {
      const record = await data.createBackupRecord({
        created_by: req.user.id,
        file_path: `memory://backup-${Date.now()}`,
        status: "completed",
        snapshot,
      });
      return res.status(201).json(record);
    }

    ensureBackupDir();
    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const filePath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), { mode: 0o600 });

    const relative = path.relative(path.join(__dirname, "..", "..", ".."), filePath);
    const record = await data.createBackupRecord({
      created_by: req.user.id,
      file_path: relative,
      status: "completed",
    });
    res.status(201).json(record);
  } catch (err) {
    console.error(err);
    try {
      await data.createBackupRecord({
        created_by: req.user.id,
        file_path: "n/a",
        status: "failed",
      });
    } catch (_) {}
    res.status(500).json({ message: "Backup failed" });
  }
});

router.get("/", async (req, res) => {
  try {
    const rows = await data.listBackupRecords();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong listing backups" });
  }
});

router.post("/:id/restore", async (req, res) => {
  try {
    const backup = await data.getBackupRecord(req.params.id);
    if (!backup) return res.status(404).json({ message: "Backup not found" });
    if (backup.status !== "completed") {
      return res.status(422).json({ message: "Only completed backups can be restored" });
    }

    let snapshot = backup.snapshot || null;
    if (!snapshot) {
      const filePath = resolveSafeBackupPath(backup.file_path);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Backup file missing on disk" });
      }
      snapshot = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    await data.restoreFromSnapshot(snapshot);
    res.json({ message: "Restore complete", status: "completed" });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ message: err.message || "Restore failed" });
  }
});

module.exports = router;
