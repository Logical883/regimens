import { useEffect, useMemo, useState } from "react";
import {
  Box,
  ChartNoAxesColumn,
  Tag,
  TriangleAlert,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api/client";
import AppShell from "../components/AppShell";
import { useCategories } from "../context/CategoryContext";
import {
  buildInventoryMetrics,
  formatCedi,
} from "../utils/inventoryMetrics";

const PIE_COLORS = [
  "#1d1612",
  "#b35a2d",
  "#9a9488",
  "#6f7a3d",
  "#8b5e3c",
  "#7d8a96",
  "#c4b8a5",
  "#3f5d4a",
  "#a33b32",
];

export default function Dashboard() {
  const { categories } = useCategories();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api
      .get("/products")
      .then(({ data }) => {
        setProducts(data);
        setLoadError("");
      })
      .catch(() => setLoadError("Couldn't load products."));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      `${p.name} ${p.sku || ""}`.toLowerCase().includes(q)
    );
  }, [products, search]);

  const metrics = useMemo(
    () => buildInventoryMetrics(filtered, categories),
    [filtered, categories]
  );
  const notificationCount = metrics.lowCount + metrics.outCount;

  return (
    <AppShell
      breadcrumb="Dashboard / Overview"
      searchValue={search}
      onSearch={setSearch}
      notificationCount={notificationCount}
      orderBadge={notificationCount}
    >
      {loadError && (
        <div className="alert alert--error" role="alert" style={{ marginBottom: 14 }}>
          <TriangleAlert size={18} strokeWidth={1.75} />
          <span>{loadError}</span>
        </div>
      )}

      <section className="dash-stats">
        <article className="dash-stat">
          <div>
            <p className="dash-stat__label">Total items</p>
            <p className="dash-stat__value">{metrics.totalItems}</p>
            <p className="dash-stat__sub">{metrics.totalUnits} units in stock</p>
          </div>
          <div className="dash-stat__icon">
            <Box size={18} strokeWidth={1.75} />
          </div>
        </article>

        <article className="dash-stat">
          <div>
            <p className="dash-stat__label">Stock value</p>
            <p className="dash-stat__value">{formatCedi(metrics.stockValue)}</p>
            <p className="dash-stat__sub">across all categories</p>
          </div>
          <div className="dash-stat__icon">
            <ChartNoAxesColumn size={18} strokeWidth={1.75} />
          </div>
        </article>

        <article className="dash-stat dash-stat--alert">
          <div>
            <p className="dash-stat__label">Low stock</p>
            <p className="dash-stat__value is-accent">{metrics.lowCount + metrics.outCount}</p>
            <p className="dash-stat__sub">{metrics.outCount} out of stock</p>
          </div>
          <div className="dash-stat__icon">
            <TriangleAlert size={18} strokeWidth={1.75} />
          </div>
        </article>

        <article className="dash-stat">
          <div>
            <p className="dash-stat__label">Categories</p>
            <p className="dash-stat__value">{metrics.categoryCount}</p>
            <p className="dash-stat__sub">active product groups</p>
          </div>
          <div className="dash-stat__icon">
            <Tag size={18} strokeWidth={1.75} />
          </div>
        </article>
      </section>

      <section className="dash-grid">
        <article className="dash-card">
          <h2 className="dash-card__title">Stock value by category</h2>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={metrics.byCategory} barSize={28}>
                <XAxis dataKey="category" tick={{ fill: "#7a736c", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => `₵${v}`}
                  tick={{ fill: "#7a736c", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip formatter={(value) => formatCedi(value)} />
                <Bar dataKey="value" fill="#1d1612" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="dash-card">
          <h2 className="dash-card__title">Value distribution</h2>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={metrics.byCategory}
                  dataKey="value"
                  nameKey="category"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {metrics.byCategory.map((entry, index) => (
                    <Cell key={entry.category} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCedi(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            {metrics.byCategory.map((entry, index) => (
              <span key={entry.category}>
                <i style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                {entry.category}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="dash-bottom">
        <article className="dash-card">
          <h2 className="dash-card__title">Top items by value</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Unit cost</th>
                  <th>Total value</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topByValue.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="dash-item-name">{p.name}</span>
                      <span className="dash-item-sku">{p.sku || "—"}</span>
                    </td>
                    <td>{p.category}</td>
                    <td>{p.quantity}</td>
                    <td>{formatCedi(p.unit_price)}</td>
                    <td>{formatCedi(p.totalValue)}</td>
                  </tr>
                ))}
                {metrics.topByValue.length === 0 && (
                  <tr>
                    <td colSpan={5}>No products yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="dash-card">
          <h2 className="dash-card__title">Reorder alerts</h2>
          <ul className="alert-list">
            {metrics.reorderAlerts.map((p) => (
              <li key={p.id} className="alert-item">
                <div>
                  <strong>{p.name}</strong>
                  <p className="dash-stat__sub">
                    {p.quantity}/{p.min_stock_level} {p.sku ? `· ${p.sku}` : ""}
                  </p>
                </div>
                <span className={`pill ${p.status === "out" ? "pill--out" : "pill--low"}`}>
                  <TriangleAlert size={12} strokeWidth={2} />
                  {p.status === "out" ? "Out of stock" : "Low stock"}
                </span>
              </li>
            ))}
            {metrics.reorderAlerts.length === 0 && (
              <li className="dash-stat__sub">All stock levels look healthy.</li>
            )}
          </ul>
        </article>
      </section>
    </AppShell>
  );
}