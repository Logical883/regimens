import { useEffect, useMemo, useState } from "react";
import { Printer, ShoppingCart, TriangleAlert, X } from "lucide-react";
import api from "../api/client";
import AppShell from "../components/AppShell";
import { useCategories } from "../context/CategoryContext";
import {
  categorizeProduct,
  formatCedi,
  productStatus,
} from "../utils/inventoryMetrics";

const PO_STORAGE_KEY = "regimens_purchase_orders";

function suggestedQtyFor(product) {
  const qty = Number(product.quantity) || 0;
  const min = Math.max(Number(product.min_stock_level) || 5, 1);
  const target = min * 2;
  return Math.max(target - qty, 0);
}

function buildSuggestion(product, categories) {
  const quantity = Number(product.quantity) || 0;
  const unit = Number(product.unit_price) || 0;
  const suggestedQty = suggestedQtyFor(product);
  return {
    id: product.id,
    name: product.name || "",
    sku: product.sku || "",
    category: categorizeProduct(product, categories),
    currentStock: quantity,
    suggestedQty,
    unitPrice: unit,
    estCost: suggestedQty * unit,
    status: productStatus(product),
  };
}

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  currentStock: 0,
  suggestedQty: 0,
  estCost: 0,
  unitPrice: 0,
  productId: null,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function money(value) {
  const n = Number(value) || 0;
  return `GHS ${n.toFixed(2)}`;
}

function printMarketList(rows) {
  if (!rows.length) {
    window.alert("Select at least one item to print.");
    return;
  }

  const when = new Date().toLocaleString();
  const total = rows.reduce((sum, row) => sum + (Number(row.estCost) || 0), 0);

  const bodyRows = rows
    .map(
      (row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.sku || "-")}</td>
        <td>${escapeHtml(row.category)}</td>
        <td>${row.currentStock}</td>
        <td><strong>${row.suggestedQty}</strong></td>
        <td>${money(row.estCost)}</td>
        <td class="check">[ ]</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Regimens Market List</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #1d1612;
      padding: 24px;
      margin: 0;
    }
    .header { margin-bottom: 18px; }
    h1 { margin: 0 0 6px; font-size: 22px; font-family: Georgia, serif; }
    .meta { margin: 0; color: #666; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td {
      border: 1px solid #ccc;
      padding: 8px 10px;
      text-align: left;
      font-size: 13px;
      vertical-align: top;
    }
    th {
      background: #f4f1ea;
      font-size: 11px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #555;
    }
    td.check { text-align: center; width: 54px; }
    tfoot td {
      font-weight: 700;
      background: #faf7f1;
    }
    .note {
      margin-top: 18px;
      font-size: 12px;
      color: #666;
    }
    @media print {
      body { padding: 0; }
      button { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Regimens Stationery — Market shopping list</h1>
    <p class="meta">Printed: ${escapeHtml(when)} · ${rows.length} item(s)</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th>SKU</th>
        <th>Category</th>
        <th>In stock</th>
        <th>Buy qty</th>
        <th>Est. cost</th>
        <th>Got</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="6">Total estimated cost</td>
        <td colspan="2">${money(total)}</td>
      </tr>
    </tfoot>
  </table>
  <p class="note">Tick the Got column as you buy each item at the market.</p>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Print market list");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = frameWindow?.document;
  if (!frameWindow || !frameDoc) {
    document.body.removeChild(iframe);
    window.alert("Couldn't open the print view. Try again.");
    return;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 500);
  };

  const triggerPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } catch {
      window.alert("Print dialog could not be opened.");
    } finally {
      cleanup();
    }
  };

  // Give the iframe a moment to render before printing.
  setTimeout(triggerPrint, 250);
}

export default function Orders() {
  const { categories } = useCategories();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [checkedIds, setCheckedIds] = useState([]);

  useEffect(() => {
    api
      .get("/products")
      .then(({ data }) => {
        setProducts(Array.isArray(data) ? data : []);
        setError("");
      })
      .catch(() => {
        setProducts([]);
        setError("Couldn't load products for purchase suggestions.");
      });
  }, []);

  const suggestions = useMemo(() => {
    return products
      .map((p) => buildSuggestion(p, categories))
      .filter((row) => row.status === "low" || row.status === "out" || row.suggestedQty > 0)
      .filter((row) => row.suggestedQty > 0)
      .sort((a, b) => a.currentStock - b.currentStock || a.name.localeCompare(b.name));
  }, [products, categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((row) =>
      `${row.name} ${row.sku} ${row.category}`.toLowerCase().includes(q)
    );
  }, [suggestions, search]);

  useEffect(() => {
    setCheckedIds(filtered.map((row) => row.id));
  }, [filtered]);

  const selectedRows = useMemo(
    () => filtered.filter((row) => checkedIds.includes(row.id)),
    [filtered, checkedIds]
  );

  const totalEstimatedCost = useMemo(
    () => filtered.reduce((sum, row) => sum + row.estCost, 0),
    [filtered]
  );

  const selectedTotal = useMemo(
    () => selectedRows.reduce((sum, row) => sum + row.estCost, 0),
    [selectedRows]
  );

  const alertCount = filtered.length;

  function toggleAll(checked) {
    setCheckedIds(checked ? filtered.map((row) => row.id) : []);
  }

  function toggleOne(id) {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function openCreateBlank() {
    setForm(emptyForm);
    setFormError("");
    setFormSuccess("");
    setShowForm(true);
  }

  function openCreateFromRow(row) {
    setSelectedId(row.id);
    setForm({
      name: row.name,
      sku: row.sku,
      category: row.category,
      currentStock: row.currentStock,
      suggestedQty: row.suggestedQty,
      estCost: row.estCost,
      unitPrice: row.unitPrice,
      productId: row.id,
    });
    setFormError("");
    setFormSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm(emptyForm);
    setFormError("");
    setFormSuccess("");
  }

  function updateSuggestedQty(value) {
    const suggestedQty = Math.max(Number(value) || 0, 0);
    const unitPrice = Number(form.unitPrice) || 0;
    setForm((prev) => ({
      ...prev,
      suggestedQty,
      estCost: suggestedQty * unitPrice,
    }));
  }

  function handleFieldChange(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "unitPrice") {
        const unitPrice = Math.max(Number(value) || 0, 0);
        next.unitPrice = unitPrice;
        next.estCost = (Number(next.suggestedQty) || 0) * unitPrice;
      }
      return next;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!form.name.trim()) {
      setFormError("Item name is required.");
      return;
    }
    if (Number(form.suggestedQty) <= 0) {
      setFormError("Suggested quantity must be greater than 0.");
      return;
    }

    setSaving(true);
    try {
      const existing = JSON.parse(localStorage.getItem(PO_STORAGE_KEY) || "[]");
      const order = {
        id: `po-${Date.now()}`,
        created_at: new Date().toISOString(),
        status: "draft",
        item: {
          productId: form.productId,
          name: form.name.trim(),
          sku: form.sku.trim(),
          category: form.category.trim(),
          currentStock: Number(form.currentStock) || 0,
          suggestedQty: Number(form.suggestedQty) || 0,
          estCost: Number(form.estCost) || 0,
        },
        totalEstimatedCost: Number(form.estCost) || 0,
      };
      localStorage.setItem(PO_STORAGE_KEY, JSON.stringify([order, ...existing]));
      setFormSuccess("Purchase order created.");
      setTimeout(() => closeForm(), 700);
    } catch {
      setFormError("Couldn't save the purchase order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      breadcrumb="Orders / Purchase Orders"
      searchValue={search}
      onSearch={setSearch}
      searchPlaceholder="Search items, SKU, category..."
      notificationCount={alertCount}
      orderBadge={alertCount}
    >
      {error && (
        <div className="alert alert--error" role="alert" style={{ marginBottom: 14 }}>
          <TriangleAlert size={18} strokeWidth={1.75} />
          <span>{error}</span>
        </div>
      )}

      <section className="po-panel">
        <header className="po-panel__head">
          <div>
            <h2 className="po-panel__title">Suggested purchase orders</h2>
            <p className="muted" style={{ marginTop: 4 }}>
              {selectedRows.length} selected · {formatCedi(selectedTotal)}
            </p>
          </div>
          <div className="inv-actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => printMarketList(selectedRows)}
              disabled={selectedRows.length === 0}
            >
              <Printer size={16} strokeWidth={1.75} />
              Print list
            </button>
            <button type="button" className="btn btn--primary btn--inline" onClick={openCreateBlank}>
              <ShoppingCart size={16} strokeWidth={1.75} />
              Create order
            </button>
          </div>
        </header>

        <div className="po-table-wrap">
          <table className="po-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedRows.length === filtered.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="Select all items"
                  />
                </th>
                <th>Item</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Current stock</th>
                <th>Suggested qty</th>
                <th>Est. cost</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className={selectedId === row.id ? "is-selected" : ""}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checkedIds.includes(row.id)}
                      onChange={() => toggleOne(row.id)}
                      aria-label={`Select ${row.name}`}
                    />
                  </td>
                  <td onClick={() => openCreateFromRow(row)} style={{ cursor: "pointer" }}>
                    <span className="dash-item-name">{row.name}</span>
                  </td>
                  <td>{row.sku || "—"}</td>
                  <td>{row.category}</td>
                  <td>
                    <span className={row.currentStock <= 0 || row.status === "low" ? "is-stock-warn" : ""}>
                      {row.currentStock}
                    </span>
                  </td>
                  <td>{row.suggestedQty}</td>
                  <td>{formatCedi(row.estCost)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>No reorder suggestions right now. Stock levels look healthy.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} className="po-total-label">
                  Total estimated cost (all shown)
                </td>
                <td className="po-total-value">{formatCedi(totalEstimatedCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="inv-modal" role="dialog" aria-modal="true" aria-labelledby="create-order-title">
          <button className="inv-modal__backdrop" type="button" aria-label="Close" onClick={closeForm} />
          <form className="inv-modal__panel" onSubmit={handleSubmit}>
            <div className="inv-modal__head">
              <h2 id="create-order-title">Create order</h2>
              <button type="button" className="icon-btn" onClick={closeForm} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="alert alert--error" role="alert">
                <TriangleAlert size={18} strokeWidth={1.75} />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="alert alert--success" role="status">
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="form-grid">
              <div className="field field--full">
                <label className="label" htmlFor="po-item">Item</label>
                <div className="input">
                  <input
                    id="po-item"
                    value={form.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    placeholder="Item name"
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="po-sku">SKU</label>
                <div className="input">
                  <input
                    id="po-sku"
                    value={form.sku}
                    onChange={(e) => handleFieldChange("sku", e.target.value)}
                    placeholder="e.g. PN-014"
                  />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="po-category">Category</label>
                <div className="input">
                  <input
                    id="po-category"
                    value={form.category}
                    onChange={(e) => handleFieldChange("category", e.target.value)}
                    placeholder="e.g. Pens"
                    list="po-category-options"
                  />
                  <datalist id="po-category-options">
                    {categories.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="po-stock">Current stock</label>
                <div className="input">
                  <input
                    id="po-stock"
                    type="number"
                    min="0"
                    value={form.currentStock}
                    onChange={(e) => handleFieldChange("currentStock", e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="po-qty">Suggested qty</label>
                <div className="input">
                  <input
                    id="po-qty"
                    type="number"
                    min="1"
                    value={form.suggestedQty}
                    onChange={(e) => updateSuggestedQty(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field field--full">
                <label className="label" htmlFor="po-cost">Est. cost</label>
                <div className="input">
                  <input
                    id="po-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={Number(form.estCost).toFixed(2)}
                    onChange={(e) => handleFieldChange("estCost", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="btn-row" style={{ marginTop: 12 }}>
              <button type="submit" className="btn btn--primary btn--inline" disabled={saving}>
                <ShoppingCart size={16} strokeWidth={1.75} />
                {saving ? "Saving..." : "Create order"}
              </button>
              <button type="button" className="btn btn--ghost" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}