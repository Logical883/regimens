import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import api from "../api/client";

export default function Reports() {
  const [period, setPeriod] = useState("daily");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get("/reports/sales", { params: { period } })
      .then(({ data }) => setReport(data))
      .catch(() => {
        setReport(null);
        setError("Reports need a connected database. UI is ready — numbers appear once Postgres is up.");
      })
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="screen">
      <header className="topbar">
        <div className="topbar__meta">
          <h1>Sales reports</h1>
          <p className="muted">Daily, weekly, and monthly totals</p>
        </div>
        <Link className="btn btn--ghost" to="/">
          <ArrowLeft size={16} strokeWidth={1.75} />
          Back
        </Link>
      </header>

      <div className="btn-row" style={{ marginBottom: 16 }}>
        {["daily", "weekly", "monthly"].map((p) => (
          <button
            key={p}
            type="button"
            className={`btn ${period === p ? "btn--primary btn--inline" : "btn--ghost"}`}
            onClick={() => setPeriod(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Loading...</p>}
      {error && (
        <div className="alert alert--warning" role="status">
          <TriangleAlert size={18} strokeWidth={1.75} />
          <span>{error}</span>
        </div>
      )}

      {report && (
        <>
          <div className="stats">
            <div className="stat">
              <p className="muted">Total sales</p>
              <strong>{report.totalSales}</strong>
            </div>
            <div className="stat">
              <p className="muted">Total revenue</p>
              <strong>GHS {Number(report.totalRevenue).toFixed(2)}</strong>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Sales</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(report.breakdown || []).map((row, i) => (
                  <tr key={i}>
                    <td>{row.date ? new Date(row.date).toLocaleDateString() : "—"}</td>
                    <td>{row.count}</td>
                    <td>GHS {Number(row.revenue).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(report.breakdown || []).length === 0 && (
            <p className="muted" style={{ marginTop: 12 }}>No sales in this period.</p>
          )}
        </>
      )}
    </div>
  );
}