// src/pages/ConfirmSale.jsx
// Reference: docs/UIUX_Design_Guide_Week2.docx (Screen 4), User Story 4
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
      const items = cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity }));
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
        <Link to="/sale/new">Back to New Sale</Link>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="topbar">
        <h1>Confirm Sale</h1>
        <Link to="/sale/new">Back</Link>
      </header>

      <ul className="product-list">
        {cart.map((line) => (
          <li key={line.product.id} className="product-list__item">
            <div>
              <strong>{line.product.name}</strong>
              <p className="muted">
                {line.quantity} &times; GH₵{Number(line.product.unit_price).toFixed(2)}
              </p>
            </div>
            <button onClick={() => removeFromCart(line.product.id)}>Remove</button>
          </li>
        ))}
      </ul>

      <p className="total">Total: GH₵{total.toFixed(2)}</p>

      {error && <p className="error">{error}</p>}

      <button className="button--primary" onClick={handleConfirm} disabled={submitting}>
        {submitting ? "Recording..." : "Confirm Sale"}
      </button>
    </div>
  );
}
