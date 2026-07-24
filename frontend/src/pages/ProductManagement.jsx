import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import api from "../api/client";
import AppShell from "../components/AppShell";
import { useCategories } from "../context/CategoryContext";
import {
  getProductCost,
  setProductCost,
  removeProductCost,
} from "../utils/productCosts";
import {
  buildInventoryMetrics,
  categorizeProduct,
  formatCedi,
  productStatus,
} from "../utils/inventoryMetrics";

const PAGE_SIZE = 8;
const emptyForm = {
  name: "",
  sku: "",
  category: "",
  quantity: 0,
  unit_price: 0,
  cost_price: 0,
  min_stock_level: 5,
};

function exportCsv(rows, categoryList) {
  const header = [
    "name",
    "sku",
    "category",
    "stock",
    "unit",
    "sell_price",
    "cost_price",
    "total_value",
  ];
  const lines = rows.map((p) => {
    const qty = Number(p.quantity) || 0;
    const sell = Number(p.unit_price) || 0;
    const cost = getProductCost(p);
    return [
      `"${(p.name || "").replaceAll('"', '""')}"`,
      p.sku || "",
      p.category || categorizeProduct(p, categoryList),
      qty,
      "pcs",
      sell.toFixed(2),
      cost.toFixed(2),
      (qty * sell).toFixed(2),
    ].join(",");
  });
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "regimens-inventory.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProductManagement() {
  const { categories } = useCategories();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const { data } = await api.get("/products");
      setProducts(data);
      setError("");
    } catch {
      setError("Couldn't load products.");
      setProducts([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const enriched = useMemo(
    () =>
      products.map((p) => ({
        ...p,
        category: categorizeProduct(p, categories),
        status: productStatus(p),
        cost_price: getProductCost(p),
        totalValue: (Number(p.quantity) || 0) * (Number(p.unit_price) || 0),
      })),
    [products, categories]
  );

  const categoryOptions = useMemo(() => {
    const fromDefs = categories.map((c) => c.name);
    const fromProducts = enriched.map((p) => p.category);
    return [...new Set([...fromDefs, ...fromProducts])].sort();
  }, [categories, enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((p) => {
      if (stockFilter === "in" && p.status !== "in") return false;
      if (stockFilter === "low" && p.status !== "low") return false;
      if (stockFilter === "out" && p.status !== "out") return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (!q) return true;
      return `${p.name} ${p.sku || ""} ${p.category}`.toLowerCase().includes(q);
    });
  }, [enriched, search, stockFilter, categoryFilter]);

  const metrics = useMemo(() => {
    const all = buildInventoryMetrics(products, categories);
    return {
      totalSkus: products.length,
      inStock: products.filter((p) => productStatus(p) === "in").length,
      lowStock: all.lowCount,
      outStock: all.outCount,
      alerts: all.lowCount + all.outCount,
    };
  }, [products, categories]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search, stockFilter, categoryFilter]);

  function toggleAll(checked) {
    setSelected(checked ? pageRows.map((p) => p.id) : []);
  }

  function toggleOne(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      category: categories[0]?.name || "",
    });
    setShowForm(true);
  }

  function openEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name || "",
      sku: p.sku || "",
      category: p.category || categorizeProduct(p, categories),
      quantity: p.quantity ?? 0,
      unit_price: p.unit_price ?? 0,
      cost_price: getProductCost(p),
      min_stock_level: p.min_stock_level ?? 5,
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (!form.category.trim()) {
      setError("Category is required.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      category: form.category.trim(),
      quantity: Number(form.quantity) || 0,
      unit_price: Number(form.unit_price) || 0,
      min_stock_level: Number(form.min_stock_level) || 0,
    };
    try {
      let savedId = editingId;
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        const { data } = await api.post("/products", payload);
        savedId = data.id;
      }
      setProductCost(savedId, form.cost_price);
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      removeProductCost(id);
      setSelected((prev) => prev.filter((x) => x !== id));
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't delete product.");
    }
  }

  return (
    <AppShell
      breadcrumb="Inventory / All Items"
      searchValue={search}
      onSearch={setSearch}
      notificationCount={metrics.alerts}
      orderBadge={metrics.alerts}
    >
      {error && (
        <div className="alert alert--error" role="alert" style={{ marginBottom: 14 }}>
          <TriangleAlert size={18} strokeWidth={1.75} />
          <span>{error}</span>
        </div>
      )}

      <section className="inv-stats">
        <article className="inv-stat">
          <p className="inv-stat__label">Total SKUs</p>
          <p className="inv-stat__value">{metrics.totalSkus}</p>
        </article>
        <article className="inv-stat">
          <p className="inv-stat__label">In stock</p>
          <p className="inv-stat__value is-green">{metrics.inStock}</p>
        </article>
        <article className="inv-stat">
          <p className="inv-stat__label">Low stock</p>
          <p className="inv-stat__value is-orange">{metrics.lowStock}</p>
        </article>
        <article className="inv-stat">
          <p className="inv-stat__label">Out of stock</p>
          <p className="inv-stat__value is-red">{metrics.outStock}</p>
        </article>
      </section>

      <section className="inv-toolbar">
        <div className="inv-filters">
          <Filter size={16} strokeWidth={1.75} />
          {[
            { id: "all", label: "All" },
            { id: "in", label: "In Stock" },
            { id: "low", label: "Low Stock" },
            { id: "out", label: "Out of Stock" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              className={`inv-chip ${stockFilter === f.id ? "is-active" : ""}`}
              onClick={() => setStockFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
          <select
            className="inv-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="inv-actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => exportCsv(filtered, categories)}
          >
            <Download size={16} strokeWidth={1.75} />
            Export CSV
          </button>
          <button
            type="button"
            className="btn btn--primary btn--inline"
            onClick={openCreate}
          >
            <Plus size={16} strokeWidth={1.75} />
            Add item
          </button>
        </div>
      </section>

      <section className="inv-table-card">
        <div className="inv-table-wrap">
          <table className="inv-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      pageRows.length > 0 &&
                      pageRows.every((p) => selected.includes(p.id))
                    }
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="Select all on page"
                  />
                </th>
                <th>Item name</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Unit</th>
                <th>Sell price</th>
                <th>Cost price</th>
                <th>Total value</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={() => toggleOne(p.id)}
                      aria-label={`Select ${p.name}`}
                    />
                  </td>
                  <td>
                    <span className="dash-item-name">{p.name}</span>
                    <span className="dash-item-sku">{p.sku || "—"}</span>
                  </td>
                  <td>{p.category}</td>
                  <td>
                    <span className={p.status === "in" ? "" : "is-stock-warn"}>
                      {p.quantity}
                    </span>
                  </td>
                  <td>pcs</td>
                  <td>{formatCedi(p.unit_price)}</td>
                  <td>{formatCedi(p.cost_price)}</td>
                  <td>{formatCedi(p.totalValue)}</td>
                  <td>
                    <div className="btn-row">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Edit"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil size={16} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Delete"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={9}>No items match this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="inv-footer">
          <p className="inv-footer__count">
            Showing {from}–{to} of {filtered.length} items
          </p>
          <div className="inv-pagination">
            <button
              type="button"
              className="inv-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`inv-page-btn ${n === currentPage ? "is-active" : ""}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className="inv-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </section>

      {showForm && (
        <div className="inv-modal" role="dialog" aria-modal="true">
          <button
            className="inv-modal__backdrop"
            type="button"
            aria-label="Close"
            onClick={() => setShowForm(false)}
          />
          <form className="inv-modal__panel" onSubmit={handleSubmit}>
            <div className="inv-modal__head">
              <h2>{editingId ? "Edit item" : "Add item"}</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowForm(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="form-grid">
              <div className="field field--full">
                <label className="label" htmlFor="name">
                  Name
                </label>
                <div className="input">
                  <input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="sku">
                  SKU
                </label>
                <div className="input">
                  <input
                    id="sku"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="category">
                  Category
                </label>
                <div className="input">
                  <select
                    id="category"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    required
                    style={{
                      width: "100%",
                      border: 0,
                      outline: 0,
                      background: "transparent",
                      font: "inherit",
                      color: "inherit",
                    }}
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="quantity">
                  Stock
                </label>
                <div className="input">
                  <input
                    id="quantity"
                    type="number"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="unit_price">
                  Sell price (GHS)
                </label>
                <div className="input">
                  <input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.unit_price}
                    onChange={(e) =>
                      setForm({ ...form, unit_price: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="cost_price">
                  Cost price (GHS)
                </label>
                <div className="input">
                  <input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost_price}
                    onChange={(e) =>
                      setForm({ ...form, cost_price: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="min_stock_level">
                  Min stock
                </label>
                <div className="input">
                  <input
                    id="min_stock_level"
                    type="number"
                    value={form.min_stock_level}
                    onChange={(e) =>
                      setForm({ ...form, min_stock_level: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button
                type="submit"
                className="btn btn--primary btn--inline"
                disabled={saving}
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}