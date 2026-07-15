// src/routes/reports.js
// Reference: docs/API_Schema_Regimens.docx (Reports), User Story 8
const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const TRUNC_BY_PERIOD = {
  daily: "day",
  weekly: "week",
  monthly: "month",
};

// GET /api/reports/sales?period=daily|weekly|monthly&from=&to=
router.get("/sales", async (req, res) => {
  const period = TRUNC_BY_PERIOD[req.query.period] || "day";
  const { from, to } = req.query;

  const conditions = [];
  const params = [];
  if (from) {
    params.push(from);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`created_at <= $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const totals = await pool.query(
      `SELECT COUNT(*)::int AS total_sales, COALESCE(SUM(total_amount), 0) AS total_revenue
       FROM sales ${where}`,
      params
    );

    const breakdown = await pool.query(
      `SELECT date_trunc('${period}', created_at) AS date,
              COUNT(*)::int AS count,
              COALESCE(SUM(total_amount), 0) AS revenue
       FROM sales ${where}
       GROUP BY date ORDER BY date ASC`,
      params
    );

    res.json({
      totalSales: totals.rows[0].total_sales,
      totalRevenue: Number(totals.rows[0].total_revenue),
      breakdown: breakdown.rows.map((r) => ({ ...r, revenue: Number(r.revenue) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong generating the report" });
  }
});

module.exports = router;
