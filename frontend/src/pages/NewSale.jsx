import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ShoppingBag, TriangleAlert } from "lucide-react";
import api from "../api/client";
import AppShell from "../components/AppShell";
import { useSale } from "../context/SaleContext";
import { formatCedi } from "../utils/inventoryMetrics";

export default function NewSale() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const { cart, addToCart, total } = useSale();
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => {
      api
        .get("/products", { params: search ? { search } : {} })
        .then(({ data }) => {
          setProducts(Array.isArray(data) ? data : []);
          setError("");
        })
        .catch(() => {
          setProducts([]);
          setError("Couldn't load products.");
        });
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const cartQtyById = useMemo(() => {
    const map = new Map();
    for (const line of cart) map.set(line.product.id, line.quantity);
    return map;
  }, [cart]);

  return (
    <AppShell
      breadcrumb="Sales / New sale"
      searchValue={search}
      onSearch={setSearch}
      searchPlaceholder="Search products by name or SKU..."
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
            New sale
          </h2>
          <p className="muted">Search inventory and add items to the cart</p>
        </div>
      </section>

      <section className="sale-layout">
        <div className="po-panel">
          <header className="po-panel__head">
            <h2 className="po-panel__title">Products</h2>
            <span className="muted">{products.length} shown</span>
          </header>
          <ul className="sale-product-list">
            {products.map((p) => {
              const inCart = cartQtyById.get(p.id) || 0;
              const out = Number(p.quantity) <= 0;
              return (
                <li key={p.id} className="sale-product-list__item">
                  <div>
                    <strong>{p.name}</strong>
                    <p className="muted">
                      {formatCedi(p.unit_price)} · {p.quantity} in stock
                      {p.sku ? ` · ${p.sku}` : ""}
                      {inCart ? ` · ${inCart} in cart` : ""}
                    </p>
                  </div>
                  <button
                    className="btn btn--ghost"
                    type="button"
                    disabled={out}
                    onClick={() => addToCart(p, 1)}
                  >
                    <Plus size={16} strokeWidth={1.75} />
                    {out ? "Out" : "Add"}
                  </button>
                </li>
              );
            })}
            {products.length === 0 && (
              <li className="muted" style={{ padding: "16px 22px" }}>
                No products found.
              </li>
            )}
          </ul>
        </div>

        <aside className="sale-cart-card">
          <header className="po-panel__head">
            <h2 className="po-panel__title">Cart</h2>
            <ShoppingBag size={18} strokeWidth={1.75} />
          </header>
          {cart.length === 0 ? (
            <p className="muted" style={{ padding: "12px 0" }}>
              Cart is empty. Add products to continue.
            </p>
          ) : (
            <ul className="sale-cart-list">
              {cart.map((line) => (
                <li key={line.product.id}>
                  <span>{line.product.name}</span>
                  <span>
                    ×{line.quantity} ·{" "}
                    {formatCedi(Number(line.product.unit_price) * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="sale-cart-footer">
            <div>
              <p className="muted" style={{ marginBottom: 4 }}>
                {cart.length} line{cart.length === 1 ? "" : "s"}
              </p>
              <strong>{formatCedi(total)}</strong>
            </div>
            <button
              className="btn btn--primary btn--inline"
              type="button"
              disabled={cart.length === 0}
              onClick={() => navigate("/sale/confirm")}
            >
              Review sale
            </button>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
