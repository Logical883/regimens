import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Minus, Plus, Trash2, TriangleAlert } from "lucide-react";
import AppShell from "../components/AppShell";
import { useSale } from "../context/SaleContext";
import { formatCedi } from "../utils/inventoryMetrics";
import { recordSale } from "../offline/sync";

export default function ConfirmSale() {
  const { cart, removeFromCart, setQuantity, total, clearCart, setLastResult } = useSale();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleConfirm() {
    setError("");
    setSubmitting(true);
    try {
      const items = cart.map((line) => ({
        product_id: line.product.id,
        quantity: line.quantity,
      }));
      const result = await recordSale(items);
      setLastResult({ ...result, cartSnapshot: cart, total });
      clearCart();
      navigate("/sale/success");
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Couldn't record the sale. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.length === 0) {
    return (
      <AppShell breadcrumb="Sales / Confirm">
        <section className="po-panel sale-panel sale-panel--body" style={{ maxWidth: 520 }}>
          <h2 className="dash-card__title">Your cart is empty</h2>
          <p className="muted" style={{ margin: "8px 0 16px" }}>
            Add products before confirming a sale.
          </p>
          <Link className="btn btn--primary btn--inline" to="/sale/new">
            Back to new sale
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumb="Sales / Confirm">
      <section className="inv-toolbar">
        <div>
          <h2 className="dash-card__title" style={{ marginBottom: 4 }}>
            Confirm sale
          </h2>
          <p className="muted">Review quantities and total before recording</p>
        </div>
        <Link className="btn btn--ghost" to="/sale/new">
          <ArrowLeft size={16} strokeWidth={1.75} />
          Back
        </Link>
      </section>

      {error && (
        <div className="alert alert--error" role="alert" style={{ marginBottom: 14 }}>
          <TriangleAlert size={18} strokeWidth={1.75} />
          <span>{error}</span>
        </div>
      )}

      <section className="po-panel sale-panel">
        <header className="po-panel__head">
          <h2 className="po-panel__title">Line items</h2>
          <span className="muted">
            {cart.length} item{cart.length === 1 ? "" : "s"}
          </span>
        </header>

        <ul className="sale-product-list">
          {cart.map((line) => (
            <li key={line.product.id} className="sale-product-list__item">
              <div>
                <strong>{line.product.name}</strong>
                <p className="muted">
                  {formatCedi(line.product.unit_price)} each · max {line.product.quantity} in stock
                </p>
              </div>
              <div className="sale-qty">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity(line.product.id, line.quantity - 1)}
                >
                  <Minus size={16} />
                </button>
                <span className="sale-qty__value">{line.quantity}</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Increase quantity"
                  disabled={line.quantity >= Number(line.product.quantity)}
                  onClick={() => setQuantity(line.product.id, line.quantity + 1)}
                >
                  <Plus size={16} />
                </button>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => removeFromCart(line.product.id)}
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="sale-confirm-footer">
          <div>
            <p className="muted" style={{ marginBottom: 4 }}>
              Total
            </p>
            <strong style={{ fontSize: "1.25rem" }}>{formatCedi(total)}</strong>
          </div>
          <button
            className="btn btn--primary btn--inline"
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
          >
            <Check size={16} strokeWidth={1.75} />
            {submitting ? "Recording..." : "Confirm sale"}
          </button>
        </div>
      </section>
    </AppShell>
  );
}
