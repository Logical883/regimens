import { Link, Navigate } from "react-router-dom";
import { CircleCheck, Clock3 } from "lucide-react";
import { useSale } from "../context/SaleContext";

export default function SaleSuccess() {
  const { lastResult } = useSale();

  if (!lastResult) return <Navigate to="/" replace />;

  return (
    <div className="screen screen--centered">
      <div className="auth-shell panel" style={{ textAlign: "center" }}>
        {lastResult.pending ? (
          <>
            <Clock3 size={28} strokeWidth={1.75} />
            <h1 style={{ marginTop: 12 }}>Sale saved offline</h1>
            <p className="muted" style={{ marginTop: 8 }}>
              No connection right now — this sale is queued and will sync automatically once you are back online.
            </p>
            <span className="badge badge--pending" style={{ marginTop: 12 }}>
              Pending sync
            </span>
          </>
        ) : (
          <>
            <CircleCheck size={28} strokeWidth={1.75} />
            <h1 style={{ marginTop: 12 }}>Sale recorded</h1>
            <p className="muted" style={{ marginTop: 8 }}>Stock has been updated.</p>
            <span className="badge badge--success" style={{ marginTop: 12 }}>
              Synced
            </span>
          </>
        )}

        <ul className="product-list" style={{ marginTop: 20, textAlign: "left" }}>
          {lastResult.cartSnapshot?.map((line) => (
            <li key={line.product.id} className="product-list__item">
              <span>{line.product.name}</span>
              <span>×{line.quantity}</span>
            </li>
          ))}
        </ul>

        <p className="total">Total: GHS {Number(lastResult.total || 0).toFixed(2)}</p>

        <Link className="btn btn--primary" to="/">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}