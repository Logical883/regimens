import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search } from "lucide-react";
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
        <div className="topbar__meta">
          <h1>New sale</h1>
          <p className="muted">Search and add items to the cart</p>
        </div>
        <Link className="btn btn--ghost" to="/">
          <ArrowLeft size={16} strokeWidth={1.75} />
          Cancel
        </Link>
      </header>

      <div className="field">
        <label className="label" htmlFor="search">Search</label>
        <div className="input">
          <Search size={18} strokeWidth={1.75} />
          <input
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
          />
        </div>
      </div>

      <ul className="product-list">
        {products.map((p) => (
          <li key={p.id} className="product-list__item">
            <div>
              <strong>{p.name}</strong>
              <p className="muted">
                GHS {Number(p.unit_price).toFixed(2)} · {p.quantity} in stock
              </p>
            </div>
            <button
              className="btn btn--ghost"
              type="button"
              disabled={p.quantity === 0}
              onClick={() => addToCart(p, 1)}
            >
              <Plus size={16} strokeWidth={1.75} />
              Add
            </button>
          </li>
        ))}
        {products.length === 0 && <p className="muted">No products found.</p>}
      </ul>

      <footer className="cart-summary">
        <div className="cart-summary__inner">
          <span>
            {cart.length} item{cart.length === 1 ? "" : "s"} · GHS {total.toFixed(2)}
          </span>
          <button
            className="btn btn--primary btn--inline"
            type="button"
            disabled={cart.length === 0}
            onClick={() => navigate("/sale/confirm")}
          >
            Review sale
          </button>
        </div>
      </footer>
    </div>
  );
}