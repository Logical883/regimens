// src/index.js
require("dotenv").config();
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

const { loginLimiter } = applySecurity(app);

app.use(express.json({ limit: "256kb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth/login", loginLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/sync", syncRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  sanitizeError(err, res);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Regimens backend listening on http://localhost:${PORT}`);
});
