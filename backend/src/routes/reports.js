// src/routes/reports.js
const express = require("express");
const data = require("../data");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function periodBucket(date, period) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  if (period === "weekly") {
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const weekday = (day.getDay() + 6) % 7;
    day.setDate(day.getDate() - weekday);
    return day.toISOString();
  }
  if (period === "monthly") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01T00:00:00.000Z`;
  }
  if (period === "yearly") {
    return `${d.getFullYear()}-01-01T00:00:00.000Z`;
  }
  return d.toISOString().slice(0, 10) + "T00:00:00.000Z";
}

// GET /api/reports/sales?period=daily|weekly|monthly|yearly&from=&to=
router.get("/sales", async (req, res) => {
  const period = ["daily", "weekly", "monthly", "yearly"].includes(req.query.period)
    ? req.query.period
    : "daily";
  const { from, to } = req.query;

  try {
    const sales = await data.listSales({ from, to });
    const buckets = {};
    let totalRevenue = 0;

    for (const sale of sales) {
      const key = periodBucket(sale.created_at, period);
      if (!key) continue;
      if (!buckets[key]) buckets[key] = { date: key, count: 0, revenue: 0 };
      const amount = Number(sale.total_amount) || 0;
      buckets[key].count += 1;
      buckets[key].revenue += amount;
      totalRevenue += amount;
    }

    res.json({
      totalSales: sales.length,
      totalRevenue,
      breakdown: Object.values(buckets).sort((a, b) => String(a.date).localeCompare(String(b.date))),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong generating the report" });
  }
});

// GET /api/reports/profit?period=daily|weekly|monthly|yearly&from=&to=
router.get("/profit", async (req, res) => {
  const period = req.query.period || "monthly";
  const allowed = new Set(["daily", "weekly", "monthly", "yearly"]);
  if (!allowed.has(period)) {
    return res.status(422).json({
      message: "period must be one of daily, weekly, monthly, yearly",
    });
  }

  try {
    const report = await data.getProfitReport({
      period,
      from: req.query.from,
      to: req.query.to,
    });
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong generating the profit report" });
  }
});

module.exports = router;
