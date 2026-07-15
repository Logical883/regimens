// src/pages/NewSale.jsx
// Reference: docs/UIUX_Design_Guide_Week2.docx (Screen 3), User Stories 4, 5
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";
import { useSale } from "../context/SaleContext";

export default function NewSale() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const { cart, addToCart, total } = useSale();
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => {
      api
        .get("/products", { params: search ? { search } : {} })
        .then(({ data }) => setProducts(data))
        .catch(() => setProducts([]));
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="screen">
      <header className="topbar">
        <h1>New Sale</h1>
        <Link to="/">Cancel</Link>
      </header>

      <input
        className="search"
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ul className="product-list">
        {products.map((p) => (
          <li key={p.id} className="product-list__item">
            <div>
              <strong>{p.name}</strong>
              <p className="muted">
                GH₵{Number(p.unit_price).toFixed(2)} &middot; {p.quantity} in stock
              </p>
            </div>
            <button
              disabled={p.quantity === 0}
              onClick={() => addToCart(p, 1)}
            >
              Add
            </button>
          </li>
        ))}
        {products.length === 0 && <p className="muted">No products found.</p>}
      </ul>

      <footer className="cart-summary">
        <span>{cart.length} item{cart.length === 1 ? "" : "s"} &middot; GH₵{total.toFixed(2)}</span>
        <button
          className="button--primary"
          disabled={cart.length === 0}
          onClick={() => navigate("/sale/confirm")}
        >
          Review Sale
        </button>
      </footer>
    </div>
  );
}
