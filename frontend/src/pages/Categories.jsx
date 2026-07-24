import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CircleHelp,
  Plus,
  Tag,
  TriangleAlert,
  X,
} from "lucide-react";
import api from "../api/client";
import AppShell from "../components/AppShell";
import { useCategories } from "../context/CategoryContext";
import {
  buildCategoryCards,
  buildInventoryMetrics,
  formatCedi,
} from "../utils/inventoryMetrics";

const emptyForm = {
  name: "",
  description: "",
  keywords: "",
};

export default function Categories() {
  const { categories, addCategory } = useCategories();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/products")
      .then(({ data }) => {
        setProducts(data);
        setError("");
      })
      .catch(() => setError("Couldn't load products for category grouping."));
  }, []);

  const metrics = useMemo(
    () => buildInventoryMetrics(products, categories),
    [products, categories]
  );

  const cards = useMemo(() => {
    const all = buildCategoryCards(products, categories);
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((card) => {
      const inName = card.name.toLowerCase().includes(q);
      const inDesc = (card.description || "").toLowerCase().includes(q);
      const inItems = card.items.some((item) =>
        `${item.name} ${item.sku || ""}`.toLowerCase().includes(q)
      );
      return inName || inDesc || inItems;
    });
  }, [products, categories, search]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      addCategory(form);
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || "Couldn't save category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      breadcrumb="Categories / Product Groups"
      searchValue={search}
      onSearch={setSearch}
      searchPlaceholder="Search categories or items..."
      notificationCount={metrics.lowCount + metrics.outCount}
      orderBadge={metrics.lowCount + metrics.outCount}
    >
      {error && (
        <div className="alert alert--error" role="alert" style={{ marginBottom: 14 }}>
          <TriangleAlert size={18} strokeWidth={1.75} />
          <span>{error}</span>
        </div>
      )}

      <section className="inv-toolbar">
        <div>
          <h2 className="dash-card__title" style={{ marginBottom: 4 }}>
            Product groups
          </h2>
          <p className="muted">
            {categories.length} categories · {products.length} inventory items
          </p>
        </div>
        <div className="inv-actions">
          <button
            type="button"
            className="btn btn--primary btn--inline"
            onClick={() => {
              setForm(emptyForm);
              setFormError("");
              setShowForm(true);
            }}
          >
            <Plus size={16} strokeWidth={1.75} />
            Add category
          </button>
        </div>
      </section>

      <section className="cat-grid">
        {cards.map((card) => (
          <article key={card.id} className="cat-card">
            <header className="cat-card__head">
              <h3>{card.name}</h3>
              <span className="cat-card__icon" aria-hidden="true">
                <Tag size={16} strokeWidth={1.75} />
              </span>
            </header>

            <p className="cat-card__count">{card.itemCount} items</p>
            <p className="cat-card__value">Total value: {formatCedi(card.totalValue)}</p>

            {card.reorderCount > 0 && (
              <p className="cat-card__alert">
                <TriangleAlert size={14} strokeWidth={1.75} />
                {card.reorderCount} item{card.reorderCount === 1 ? "" : "s"} need reorder
              </p>
            )}

            {card.description && <p className="cat-card__desc">{card.description}</p>}

            <ul className="cat-item-list">
              {card.preview.map((item) => (
                <li key={item.id}>
                  <span>{item.name}</span>
                  <span className={`pill pill--${item.status === "in" ? "in" : item.status}`}>
                    {item.status === "in" ? (
                      <Check size={12} strokeWidth={2} />
                    ) : (
                      <TriangleAlert size={12} strokeWidth={2} />
                    )}
                    {item.status === "in"
                      ? "In stock"
                      : item.status === "low"
                        ? "Low stock"
                        : "Out of stock"}
                  </span>
                </li>
              ))}
              {card.itemCount === 0 && (
                <li className="muted">No products in this category yet.</li>
              )}
              {card.moreCount > 0 && (
                <li className="muted">+{card.moreCount} more...</li>
              )}
            </ul>
          </article>
        ))}
      </section>

      {cards.length === 0 && (
        <p className="muted" style={{ marginTop: 12 }}>
          No categories match your search.
        </p>
      )}

      <button className="help-fab" type="button" aria-label="Help">
        <CircleHelp size={20} strokeWidth={1.75} />
      </button>

      {showForm && (
        <div className="inv-modal" role="dialog" aria-modal="true" aria-labelledby="add-category-title">
          <button
            className="inv-modal__backdrop"
            type="button"
            aria-label="Close"
            onClick={() => setShowForm(false)}
          />
          <form className="inv-modal__panel" onSubmit={handleSubmit}>
            <div className="inv-modal__head">
              <h2 id="add-category-title">Add category</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowForm(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="alert alert--error" role="alert">
                <TriangleAlert size={18} strokeWidth={1.75} />
                <span>{formError}</span>
              </div>
            )}

            <div className="field">
              <label className="label" htmlFor="category-name">
                Category name
              </label>
              <div className="input">
                <input
                  id="category-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Markers"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="category-description">
                Description
              </label>
              <div className="input">
                <input
                  id="category-description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description of this product group"
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="category-keywords">
                Match keywords
              </label>
              <div className="input">
                <input
                  id="category-keywords"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  placeholder="Comma-separated, e.g. marker, highlighter"
                />
              </div>
              <p className="muted" style={{ marginTop: 8, fontSize: "0.82rem" }}>
                Products whose name or SKU contains any keyword are grouped into this category.
              </p>
            </div>

            <div className="btn-row" style={{ marginTop: 12 }}>
              <button type="submit" className="btn btn--primary btn--inline" disabled={saving}>
                {saving ? "Saving..." : "Create category"}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}