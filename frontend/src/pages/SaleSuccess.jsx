import { Link, Navigate } from "react-router-dom";
import { CircleCheck, Clock3 } from "lucide-react";
import AppShell from "../components/AppShell";
import { useSale } from "../context/SaleContext";
import { formatCedi } from "../utils/inventoryMetrics";

export default function SaleSuccess() {
  const { lastResult } = useSale();

  if (!lastResult) return <Navigate to="/" replace />;

  return (
    <AppShell breadcrumb="Sales / Complete">
      <section className="po-panel sale-success-card">
        <div className="sale-success-card__icon" aria-hidden="true">
          {lastResult.pending ? (
            <Clock3 size={28} strokeWidth={1.75} />
          ) : (
            <CircleCheck size={28} strokeWidth={1.75} />
          )}
        </div>

        {lastResult.pending ? (
          <>
            <h1 className="dash-card__title">Sale saved offline</h1>
            <p className="muted" style={{ marginTop: 8 }}>
              No connection right now — this sale is queued and will sync automatically once you
              are back online.
            </p>
            <span className="badge badge--pending" style={{ marginTop: 12 }}>
              Pending sync
            </span>
          </>
        ) : (
          <>
            <h1 className="dash-card__title">Sale recorded</h1>
            <p className="muted" style={{ marginTop: 8 }}>
              Stock has been updated. Cost was stamped on each line for profit tracking.
            </p>
            <span className="badge badge--success" style={{ marginTop: 12 }}>
              Synced
            </span>
          </>
        )}

        <ul className="sale-cart-list" style={{ marginTop: 20, width: "100%" }}>
          {lastResult.cartSnapshot?.map((line) => (
            <li key={line.product.id}>
              <span>{line.product.name}</span>
              <span>×{line.quantity}</span>
            </li>
          ))}
        </ul>

        <p className="total" style={{ marginTop: 16 }}>
          Total: {formatCedi(lastResult.total || 0)}
        </p>

        <div className="btn-row" style={{ marginTop: 18, justifyContent: "center" }}>
          <Link className="btn btn--primary btn--inline" to="/sale/new">
            New sale
          </Link>
          <Link className="btn btn--ghost" to="/">
            Dashboard
          </Link>
          <Link className="btn btn--ghost" to="/profit">
            View profit
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
