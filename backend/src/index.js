// src/index.js
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const morgan = require("morgan");
const { assertSecureEnv, applySecurity, sanitizeError } = require("./middleware/security");

assertSecureEnv();

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const salesRoutes = require("./routes/sales");
const reportRoutes = require("./routes/reports");
const backupRoutes = require("./routes/backup");
const syncRoutes = require("./routes/sync");

const app = express();
const isProd = process.env.NODE_ENV === "production";

// Needed behind Render / Railway / Nginx so rate limits see real client IPs
app.set("trust proxy", 1);

const { loginLimiter } = applySecurity(app);

app.use(express.json({ limit: "256kb" }));
app.use(morgan(isProd ? "combined" : "dev"));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mode: process.env.USE_MOCK_DB === "true" ? "mock" : "postgres",
  });
});

app.use("/api/auth/login", loginLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/sync", syncRoutes);

// Prefer backend/public (copied during deploy build); fall back to frontend/dist.
const publicPath = path.join(__dirname, "..", "public");
const distPath = path.join(__dirname, "..", "..", "frontend", "dist");
const staticRoot = fs.existsSync(path.join(publicPath, "index.html"))
  ? publicPath
  : fs.existsSync(path.join(distPath, "index.html"))
    ? distPath
    : null;

if (staticRoot) {
  app.use(express.static(staticRoot, { index: false, maxAge: isProd ? "1h" : 0 }));
  // Avoid Express wildcard "*" (breaks on newer path-to-regexp)
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(staticRoot, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  sanitizeError(err, res);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Regimens backend listening on http://0.0.0.0:${PORT}`);
  if (staticRoot) console.log(`Serving frontend from ${staticRoot}`);
});
