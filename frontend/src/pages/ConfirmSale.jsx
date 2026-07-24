import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Trash2, TriangleAlert } from "lucide-react";
import { useSale } from "../context/SaleContext";
import { recordSale } from "../offline/sync";

export default function ConfirmSale() {
  const { cart, removeFromCart, total, clearCart, setLastResult } = useSale();
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
      setError(err.response?.data?.message || "Couldn't record the sale. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.length === 0) {
    return (
      <div className="screen">
        <p>Your cart is empty.</p>
        <Link className="btn btn--ghost" to="/sale/new">Back to new sale</Link>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="topbar">
        <div className="topbar__meta">
          <h1>Confirm sale</h1>
          <p className="muted">Review items before recording</p>
        </div>
        <Link className="btn btn--ghost" to="/sale/new">
          <ArrowLeft size={16} strokeWidth={1.75} />
          Back
        </Link>
      </header>

      <ul className="product-list">
        {cart.map((line) => (
          <li key={line.product.id} className="product-list__item">
            <div>
              <strong>{line.product.name}</strong>
              <p className="muted">
                {line.quantity} × GHS {Number(line.product.unit_price).toFixed(2)}
              </p>
            </div>
            <button className="btn btn--danger" type="button" onClick={() => removeFromCart(line.product.id)}>
              <Trash2 size={16} strokeWidth={1.75} />
              Remove
            </button>
          </li>
        ))}
      </ul>

      <p className="total">Total: GHS {total.toFixed(2)}</p>

      {error && (
        <div className="alert alert--error" role="alert">
          <TriangleAlert size={18} strokeWidth={1.75} />
          <span>{error}</span>
        </div>
      )}

      <button className="btn btn--primary" type="button" onClick={handleConfirm} disabled={submitting}>
        <Check size={16} strokeWidth={1.75} />
        {submitting ? "Recording..." : "Confirm sale"}
      </button>
    </div>
  );
}