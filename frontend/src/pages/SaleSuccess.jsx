// src/pages/SaleSuccess.jsx
// Reference: docs/UIUX_Design_Guide_Week2.docx (Screen 5), User Stories 4, 7
// Reference: docs/Architecture_Decision_Records.docx (ADR-005) - shows a pending-sync
// state when the sale was recorded offline, per Team Collaboration Guide task 4.6.
import { Link, Navigate } from "react-router-dom";
import { useSale } from "../context/SaleContext";

export default function SaleSuccess() {
  const { lastResult } = useSale();

  if (!lastResult) return <Navigate to="/" replace />;

  return (
    <div className="screen screen--centered">
      <div className="card card--success">
        {lastResult.pending ? (
          <>
            <h1>Sale Saved Offline</h1>
            <p className="muted">
              No connection right now &mdash; this sale is queued and will sync automatically
              once you're back online.
            </p>
            <span className="badge badge--pending">Pending sync</span>
          </>
        ) : (
          <>
            <h1>Sale Recorded</h1>
            <p className="muted">Stock has been updated.</p>
            <span className="badge badge--success">Synced</span>
          </>
        )}

        <ul className="product-list">
          {lastResult.cartSnapshot?.map((line) => (
            <li key={line.product.id} className="product-list__item">
              <span>{line.product.name}</span>
              <span>&times;{line.quantity}</span>
            </li>
          ))}
        </ul>

        <p className="total">Total: GH₵{Number(lastResult.total || 0).toFixed(2)}</p>

        <Link className="button button--primary" to="/">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
