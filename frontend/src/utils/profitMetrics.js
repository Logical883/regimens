import { getProductCost } from "./productCosts";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function periodKey(date, period) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "unknown";

  if (period === "daily") {
    return d.toISOString().slice(0, 10);
  }
  if (period === "weekly") {
    const day = startOfDay(d);
    const weekday = (day.getDay() + 6) % 7; // Monday-based
    day.setDate(day.getDate() - weekday);
    return `Week of ${day.toISOString().slice(0, 10)}`;
  }
  if (period === "yearly") {
    return String(d.getFullYear());
  }
  // monthly
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function buildProfitReport(sales = [], products = [], period = "monthly") {
  const productMap = new Map(products.map((p) => [Number(p.id), p]));
  const buckets = {};

  let revenue = 0;
  let cogs = 0;
  let lines = 0;
  let missingCostLines = 0;

  for (const sale of sales) {
    const items = Array.isArray(sale.items) ? sale.items : [];
    const createdAt = sale.created_at || sale.client_created_at;
    const key = periodKey(createdAt, period);

    if (!buckets[key]) {
      buckets[key] = { label: key, revenue: 0, cogs: 0, profit: 0, salesCount: 0 };
    }
    buckets[key].salesCount += 1;

    for (const item of items) {
      const qty = Number(item.quantity) || 0;
      const sell = Number(item.unit_price);
      const product = productMap.get(Number(item.product_id));
      const cost =
        item.unit_cost !== undefined && item.unit_cost !== null
          ? Number(item.unit_cost) || 0
          : getProductCost(product);

      if (!product || (!getProductCost(product) && (item.unit_cost === undefined || item.unit_cost === null))) {
        if (!(Number(item.unit_cost) > 0) && !(getProductCost(product) > 0)) {
          missingCostLines += 1;
        }
      }

      const lineRevenue = Number.isFinite(sell)
        ? sell * qty
        : Number(item.subtotal) || 0;
      const lineCogs = cost * qty;
      const lineProfit = lineRevenue - lineCogs;

      revenue += lineRevenue;
      cogs += lineCogs;
      lines += 1;

      buckets[key].revenue += lineRevenue;
      buckets[key].cogs += lineCogs;
      buckets[key].profit += lineProfit;
    }

    // Fallback if sale has total but no items (rare)
    if (items.length === 0 && sale.total_amount != null) {
      const r = Number(sale.total_amount) || 0;
      revenue += r;
      buckets[key].revenue += r;
      buckets[key].profit += r;
    }
  }

  const breakdown = Object.values(buckets).sort((a, b) =>
    String(a.label).localeCompare(String(b.label))
  );
  const grossProfit = revenue - cogs;
  const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  return {
    revenue,
    cogs,
    grossProfit,
    marginPercent,
    lines,
    missingCostLines,
    salesCount: sales.length,
    breakdown,
  };
}