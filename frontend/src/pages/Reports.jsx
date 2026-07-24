import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileSpreadsheet, TriangleAlert } from "lucide-react";
import api from "../api/client";
import AppShell from "../components/AppShell";
import { useCategories } from "../context/CategoryContext";
import {
  buildAnalyticsReport,
  formatCedi,
} from "../utils/inventoryMetrics";

const STATUS_COLORS = {
  in: "#2f5d3a",
  low: "#b35a2d",
  out: "#8b2e2e",
};

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function downloadCsv(filename, headers, rows) {
  const lines = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export default function Reports() {
  const { categories } = useCategories();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exportNote, setExportNote] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get("/products")
      .then(({ data }) => {
        setProducts(Array.isArray(data) ? data : []);
        setError("");
      })
      .catch(() => {
        setProducts([]);
        setError("Couldn't load inventory data for reports.");
      })
      .finally(() => setLoading(false));
  }, []);

  const analytics = useMemo(
    () => buildAnalyticsReport(products, categories),
    [products, categories]
  );

  const filteredSummary = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return analytics.categorySummary;
    return analytics.categorySummary.filter((row) =>
      row.category.toLowerCase().includes(q)
    );
  }, [analytics.categorySummary, search]);

  const filteredUnitCosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return analytics.unitCostDistribution;
    return analytics.unitCostDistribution.filter((row) =>
      `${row.sku} ${row.name}`.toLowerCase().includes(q)
    );
  }, [analytics.unitCostDistribution, search]);

  const filteredHealth = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return analytics.stockHealth;
    return analytics.stockHealth.filter((row) =>
      row.category.toLowerCase().includes(q)
    );
  }, [analytics.stockHealth, search]);

  function notifyExport(label) {
    setExportNote(`${label} exported successfully.`);
    window.setTimeout(() => setExportNote(""), 2500);
  }

  function exportStockHealth() {
    downloadCsv(
      `regimens-stock-health-${stamp()}.csv`,
      ["category", "in_stock", "low_stock", "out_of_stock"],
      filteredHealth.map((row) => [row.category, row.in, row.low, row.out])
    );
    notifyExport("Stock health report");
  }

  function exportUnitCosts() {
    downloadCsv(
      `regimens-unit-costs-${stamp()}.csv`,
      ["sku", "item_name", "unit_cost"],
      filteredUnitCosts.map((row) => [
        row.sku,
        row.name,
        Number(row.unit_price).toFixed(2),
      ])
    );
    notifyExport("Unit cost report");
  }

  function exportCategorySummary() {
    downloadCsv(
      `regimens-category-summary-${stamp()}.csv`,
      [
        "category",
        "items",
        "total_units",
        "avg_unit_cost",
        "total_value",
        "percent_of_portfolio",
      ],
      filteredSummary.map((row) => [
        row.category,
        row.items,
        row.totalUnits,
        Number(row.avgUnitCost).toFixed(2),
        Number(row.totalValue).toFixed(2),
        Number(row.portfolioPct).toFixed(1),
      ])
    );
    notifyExport("Category summary report");
  }

  function exportAllReports() {
    exportStockHealth();
    exportUnitCosts();
    exportCategorySummary();
    notifyExport("All reports");
  }

  return (
    <AppShell
      breadcrumb="Reports / Analytics"
      searchValue={search}
      onSearch={setSearch}
      searchPlaceholder="Search items, SKU, category..."
      notificationCount={analytics.alertCount}
      orderBadge={analytics.alertCount}
    >
      {error && (
        <div className="alert alert--error" role="alert" style={{ marginBottom: 14 }}>
          <TriangleAlert size={18} strokeWidth={1.75} />
          <span>{error}</span>
        </div>
      )}

      {exportNote && (
        <div className="alert alert--success" role="status" style={{ marginBottom: 14 }}>
          <span>{exportNote}</span>
        </div>
      )}

      {loading && <p className="muted">Loading analytics...</p>}

      {!loading && (
        <>
          <section className="reports-export">
            <div className="reports-export__copy">
              <FileSpreadsheet size={18} strokeWidth={1.75} />
              <div>
                <h2 className="reports-card__title" style={{ marginBottom: 4 }}>
                  Export reports
                </h2>
                <p className="muted">
                  Download the current analytics views as CSV files. Search filters are applied to exports.
                </p>
              </div>
            </div>
            <div className="reports-export__actions">
              <button type="button" className="btn btn--ghost" onClick={exportStockHealth}>
                <Download size={16} strokeWidth={1.75} />
                Stock health CSV
              </button>
              <button type="button" className="btn btn--ghost" onClick={exportUnitCosts}>
                <Download size={16} strokeWidth={1.75} />
                Unit costs CSV
              </button>
              <button type="button" className="btn btn--ghost" onClick={exportCategorySummary}>
                <Download size={16} strokeWidth={1.75} />
                Category summary CSV
              </button>
              <button type="button" className="btn btn--primary btn--inline" onClick={exportAllReports}>
                <Download size={16} strokeWidth={1.75} />
                Export all
              </button>
            </div>
          </section>

          <section className="reports-grid">
            <article className="reports-card">
              <div className="reports-card__head">
                <h2 className="reports-card__title">Stock health by category</h2>
                <button type="button" className="icon-btn" aria-label="Export stock health" onClick={exportStockHealth}>
                  <Download size={16} strokeWidth={1.75} />
                </button>
              </div>
              <div className="reports-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredHealth} barCategoryGap={16}>
                    <CartesianGrid vertical={false} stroke="#e4ddd0" />
                    <XAxis
                      dataKey="category"
                      tick={{ fill: "#7a736c", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={filteredHealth.length > 6 ? -25 : 0}
                      textAnchor={filteredHealth.length > 6 ? "end" : "middle"}
                      height={60}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#7a736c", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="in" name="In stock" stackId="health" fill={STATUS_COLORS.in} />
                    <Bar dataKey="low" name="Low stock" stackId="health" fill={STATUS_COLORS.low} />
                    <Bar
                      dataKey="out"
                      name="Out of stock"
                      stackId="health"
                      fill={STATUS_COLORS.out}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="reports-card">
              <div className="reports-card__head">
                <h2 className="reports-card__title">Unit cost distribution</h2>
                <button type="button" className="icon-btn" aria-label="Export unit costs" onClick={exportUnitCosts}>
                  <Download size={16} strokeWidth={1.75} />
                </button>
              </div>
              <div className="reports-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={filteredUnitCosts}
                    layout="vertical"
                    margin={{ left: 8, right: 12, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid horizontal={false} stroke="#e4ddd0" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `₵${v}`}
                      tick={{ fill: "#7a736c", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="sku"
                      width={64}
                      tick={{ fill: "#7a736c", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => formatCedi(value)}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
                    />
                    <Bar
                      dataKey="unit_price"
                      name="Unit cost"
                      fill="#1d1612"
                      radius={[0, 4, 4, 0]}
                      barSize={14}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="reports-card reports-card--table">
            <div className="reports-card__head">
              <h2 className="reports-card__title">Inventory summary by category</h2>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={exportCategorySummary}
              >
                <Download size={16} strokeWidth={1.75} />
                Export CSV
              </button>
            </div>
            <div className="po-table-wrap">
              <table className="po-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Items</th>
                    <th>Total units</th>
                    <th>Avg. unit cost</th>
                    <th>Total value</th>
                    <th>% of portfolio</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummary.map((row) => (
                    <tr key={row.category}>
                      <td>
                        <span className="dash-item-name">{row.category}</span>
                      </td>
                      <td>{row.items}</td>
                      <td>{row.totalUnits}</td>
                      <td>{formatCedi(row.avgUnitCost)}</td>
                      <td>{formatCedi(row.totalValue)}</td>
                      <td>{row.portfolioPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {filteredSummary.length === 0 && (
                    <tr>
                      <td colSpan={6}>No inventory data to summarize yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}