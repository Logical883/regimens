import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, TriangleAlert, Wallet } from "lucide-react";
import api from "../api/client";
import AppShell from "../components/AppShell";
import { formatCedi } from "../utils/inventoryMetrics";
import { buildProfitReport } from "../utils/profitMetrics";
import { getProductCost } from "../utils/productCosts";

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function downloadCsv(filename, headers, rows) {
  const lines = [headers.join(","), ...rows.map((r) => r.map(escapeCsv).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const emptyReport = {
  revenue: 0,
  cogs: 0,
  grossProfit: 0,
  marginPercent: 0,
  lines: 0,
  missingCostLines: 0,
  salesCount: 0,
  breakdown: [],
};

export default function Profit() {
  const [report, setReport] = useState(emptyReport);
  const [products, setProducts] = useState([]);
  const [period, setPeriod] = useState("monthly");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("api");

  useEffect(() => {
    let active = true;
    setLoading(true);

    async function load() {
      try {
        const [profitRes, productsRes] = await Promise.all([
          api.get("/reports/profit", { params: { period } }),
          api.get("/products"),
        ]);
        if (!active) return;
        setReport(profitRes.data || emptyReport);
        setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
        setSource("api");
        setError("");
      } catch {
        try {
          const [salesRes, productsRes] = await Promise.all([
            api.get("/sales"),
            api.get("/products"),
          ]);
          if (!active) return;
          const list = Array.isArray(productsRes.data) ? productsRes.data : [];
          const withCost = list.map((p) => ({ ...p, cost_price: getProductCost(p) }));
          setProducts(withCost);
          setReport(
            buildProfitReport(
              Array.isArray(salesRes.data) ? salesRes.data : [],
              withCost,
              period
            )
          );
          setSource("client");
          setError("");
        } catch {
          if (!active) return;
          setReport(emptyReport);
          setProducts([]);
          setError(
            "Couldn't load profit yet. Set cost prices in Inventory; profit appears when sales data is available."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [period]);

  const filteredBreakdown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = Array.isArray(report.breakdown) ? report.breakdown : [];
    if (!q) return rows;
    return rows.filter((row) => String(row.label).toLowerCase().includes(q));
  }, [report.breakdown, search]);

  const costsSet = products.filter((p) => Number(getProductCost(p)) > 0).length;

  function exportProfit() {
    downloadCsv(
      `regimens-profit-${period}.csv`,
      ["period", "revenue", "cogs", "gross_profit", "sales_count"],
      filteredBreakdown.map((row) => [
        row.label,
        Number(row.revenue).toFixed(2),
        Number(row.cogs).toFixed(2),
        Number(row.profit).toFixed(2),
        row.salesCount,
      ])
    );
  }

  return (
    <AppShell
      breadcrumb="Profit / Analytics"
      searchValue={search}
      onSearch={setSearch}
      searchPlaceholder="Search period label..."
    >
      {error && (
        <div className="alert alert--warning" role="status" style={{ marginBottom: 14 }}>
          <TriangleAlert size={18} strokeWidth={1.75} />
          <span>{error}</span>
        </div>
      )}

      <section className="inv-toolbar">
        <div>
          <h2 className="dash-card__title" style={{ marginBottom: 4 }}>
            Gross profit tracker
          </h2>
          <p className="muted">
            {source === "api" ? "Live from API" : "Client fallback"} · {costsSet}/
            {products.length} products have cost price · {report.salesCount} sales
          </p>
        </div>
        <div className="inv-actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={exportProfit}
            disabled={!filteredBreakdown.length}
          >
            <Download size={16} strokeWidth={1.75} />
            Export CSV
          </button>
        </div>
      </section>

      <section className="inv-filters" style={{ marginBottom: 14 }}>
        {[
          { id: "daily", label: "Daily" },
          { id: "weekly", label: "Weekly" },
          { id: "monthly", label: "Monthly" },
          { id: "yearly", label: "Yearly" },
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            className={`inv-chip ${period === p.id ? "is-active" : ""}`}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </section>

      {report.missingCostLines > 0 && (
        <div className="alert alert--warning" role="status" style={{ marginBottom: 14 }}>
          <TriangleAlert size={18} strokeWidth={1.75} />
          <span>
            {report.missingCostLines} sold line(s) have no cost price. Set{" "}
            <strong>Cost price</strong> in Inventory for accurate profit.
          </span>
        </div>
      )}

      <section className="inv-stats">
        <article className="inv-stat">
          <p className="inv-stat__label">Revenue</p>
          <p className="inv-stat__value">{formatCedi(report.revenue)}</p>
        </article>
        <article className="inv-stat">
          <p className="inv-stat__label">COGS</p>
          <p className="inv-stat__value">{formatCedi(report.cogs)}</p>
        </article>
        <article className="inv-stat">
          <p className="inv-stat__label">Gross profit</p>
          <p className={`inv-stat__value ${report.grossProfit >= 0 ? "is-green" : "is-red"}`}>
            {formatCedi(report.grossProfit)}
          </p>
        </article>
        <article className="inv-stat">
          <p className="inv-stat__label">Margin</p>
          <p className="inv-stat__value">{Number(report.marginPercent || 0).toFixed(1)}%</p>
        </article>
      </section>

      {loading && <p className="muted">Loading profit data...</p>}

      {!loading && (
        <>
          <section className="reports-card" style={{ marginBottom: 14 }}>
            <h2 className="reports-card__title">Profit by {period.replace("ly", "")}</h2>
            <div className="reports-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredBreakdown}>
                  <CartesianGrid vertical={false} stroke="#e4ddd0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#7a736c", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `₵${v}`}
                    tick={{ fill: "#7a736c", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip formatter={(value) => formatCedi(value)} />
                  <Bar dataKey="profit" name="Gross profit" fill="#1d1612" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {!filteredBreakdown.length && (
              <p className="muted" style={{ marginTop: 8 }}>
                No sales in this view yet. Profit will show once sales exist in the database.
              </p>
            )}
          </section>

          <section className="po-panel">
            <header className="po-panel__head">
              <h2 className="po-panel__title">Breakdown</h2>
              <Wallet size={18} strokeWidth={1.75} />
            </header>
            <div className="po-table-wrap">
              <table className="po-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Sales</th>
                    <th>Revenue</th>
                    <th>COGS</th>
                    <th>Gross profit</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBreakdown.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>{row.salesCount}</td>
                      <td>{formatCedi(row.revenue)}</td>
                      <td>{formatCedi(row.cogs)}</td>
                      <td>{formatCedi(row.profit)}</td>
                    </tr>
                  ))}
                  {!filteredBreakdown.length && (
                    <tr>
                      <td colSpan={5}>No profit rows to show.</td>
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
