import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Pencil,
  Plus,
  Tag,
  Trash2,
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
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
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

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(card) {
    if (card.id === "cat-other") return;
    setEditingId(card.id);
    setForm({
      name: card.name || "",
      description: card.description || "",
      keywords: card.keywords || "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleDelete(card) {
    if (card.id === "cat-other") return;
    if (!window.confirm(`Delete category "${card.name}"? Products stay in inventory.`)) return;
    try {
      await deleteCategory(card.id);
    } catch (err) {
      setError(err.message || "Couldn't delete category.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, form);
      } else {
        await addCategory(form);
      }
      setForm(emptyForm);
      setEditingId(null);
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
          <button type="button" className="btn btn--primary btn--inline" onClick={openCreate}>
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
              <div className="btn-row">
                {card.id !== "cat-other" && (
                  <>
                    <button type="button" className="icon-btn" aria-label="Edit" onClick={() => openEdit(card)}>
                      <Pencil size={16} strokeWidth={1.75} />
                    </button>
                    <button type="button" className="icon-btn" aria-label="Delete" onClick={() => handleDelete(card)}>
                      <Trash2 size={16} strokeWidth={1.75} />
                    </button>
                  </>
                )}
                <span className="cat-card__icon" aria-hidden="true">
                  <Tag size={16} strokeWidth={1.75} />
                </span>
              </div>
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
              {card.itemCount === 0 && <li className="muted">No products in this category yet.</li>}
              {card.moreCount > 0 && <li className="muted">+{card.moreCount} more...</li>}
            </ul>
          </article>
        ))}
      </section>

      {showForm && (
        <div className="inv-modal" role="dialog" aria-modal="true">
          <button className="inv-modal__backdrop" type="button" aria-label="Close" onClick={() => setShowForm(false)} />
          <form className="inv-modal__panel" onSubmit={handleSubmit}>
            <div className="inv-modal__head">
              <h2>{editingId ? "Edit category" : "Add category"}</h2>
              <button type="button" className="icon-btn" onClick={() => setShowForm(false)} aria-label="Close">
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
              <label className="label" htmlFor="category-name">Category name</label>
              <div className="input">
                <input
                  id="category-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="category-description">Description</label>
              <div className="input">
                <input
                  id="category-description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="category-keywords">Match keywords</label>
              <div className="input">
                <input
                  id="category-keywords"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  placeholder="Comma-separated"
                />
              </div>
            </div>

            <div className="btn-row" style={{ marginTop: 12 }}>
              <button type="submit" className="btn btn--primary btn--inline" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update category" : "Create category"}
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