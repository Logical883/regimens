// src/pages/Dashboard.jsx
// Reference: docs/UIUX_Design_Guide_Week2.docx (Screen 2), User Stories 6, 7
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import LowStockBanner from "../components/LowStockBanner";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api
      .get("/products")
      .then(({ data }) => setProducts(data))
      .catch(() => setLoadError("Couldn't load products \u2014 showing cached data if available."));

    api
      .get("/products", { params: { lowStock: true } })
      .then(({ data }) => setLowStock(data))
      .catch(() => {});
  }, []);

  return (
    <div className="screen">
      <header className="topbar">
        <div>
          <h1>Regimens</h1>
          <p className="muted">Welcome, {user?.name}</p>
        </div>
        <button onClick={logout}>Log Out</button>
      </header>

      <LowStockBanner products={lowStock} />
      {loadError && <p className="error">{loadError}</p>}

      <div className="actions">
        <Link className="button button--primary" to="/sale/new">
          New Sale
        </Link>
      </div>

      <h2>Inventory</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={p.quantity < p.min_stock_level ? "row--low-stock" : ""}>
              <td>{p.name}</td>
              <td>{p.quantity}</td>
              <td>GH₵{Number(p.unit_price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
