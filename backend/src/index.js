// src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const salesRoutes = require("./routes/sales");
const reportRoutes = require("./routes/reports");
const backupRoutes = require("./routes/backup");
const syncRoutes = require("./routes/sync");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/sync", syncRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Regimens backend listening on http://localhost:${PORT}`);
});
