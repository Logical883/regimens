import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  DatabaseBackup,
  Filter,
  RotateCcw,
  TriangleAlert,
  X,
} from "lucide-react";
import api from "../api/client";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { useCategories } from "../context/CategoryContext";

const LOCAL_KEY = "regimens_local_backups";

function readLocalBackups() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalBackups(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

function formatWhen(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const emptyForm = {
  label: "",
  note: "",
};

export default function Backup() {
  const { user } = useAuth();
  const { categories } = useCategories();

  const [backups, setBackups] = useState([]);
  const [source, setSource] = useState("api");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [showRestore, setShowRestore] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/backup");
      setBackups(Array.isArray(data) ? data : []);
      setSource("api");
      setError("");
    } catch {
      const local = readLocalBackups();
      setBackups(local);
      setSource("local");
      setError(
        "Server backup is unavailable (database may be offline). Using local browser backups for now."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === "owner") load();
  }, [user]);

  const normalized = useMemo(
    () =>
      backups.map((b) => ({
        id: b.id,
        label: b.label || b.file_path || `Backup ${b.id}`,
        note: b.note || "",
        status: b.status || "completed",
        created_at: b.created_at,
        source: b.source || source,
        snapshot: b.snapshot || null,
        file_path: b.file_path || "",
      })),
    [backups, source]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return normalized.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!q) return true;
      return `${b.label} ${b.note} ${b.status}`.toLowerCase().includes(q);
    });
  }, [normalized, search, statusFilter]);

  const metrics = useMemo(() => {
    const completed = normalized.filter((b) => b.status === "completed").length;
    const failed = normalized.filter((b) => b.status === "failed").length;
    const latest = normalized[0]?.created_at || null;
    return { total: normalized.length, completed, failed, latest };
  }, [normalized]);

  function openCreate() {
    setForm(emptyForm);
    setFormError("");
    setMessage("");
    setShowCreate(true);
  }

  function closeCreate() {
    setShowCreate(false);
    setForm(emptyForm);
    setFormError("");
  }

  async function createLocalBackup(label, note) {
    const { data: products } = await api.get("/products");
    const entry = {
      id: `local-${Date.now()}`,
      label: label || `Local backup ${new Date().toLocaleString()}`,
      note,
      status: "completed",
      created_at: new Date().toISOString(),
      source: "local",
      snapshot: {
        products: Array.isArray(products) ? products : [],
        categories,
      },
    };
    const next = [entry, ...readLocalBackups()];
    writeLocalBackups(next);
    setBackups(next);
    setSource("local");
    return entry;
  }

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    setMessage("");
    const label = form.label.trim();
    const note = form.note.trim();

    try {
      if (source === "api") {
        try {
          await api.post("/backup");
          setMessage("Backup created on the server.");
          closeCreate();
          await load();
          return;
        } catch {
          // fall through to local
        }
      }
      await createLocalBackup(label, note);
      setMessage("Local backup created in this browser.");
      closeCreate();
    } catch (err) {
      setFormError(err.response?.data?.message || "Couldn't create backup.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (!showRestore) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      if (source === "api" && !String(showRestore.id).startsWith("local-")) {
        await api.post(`/backup/${showRestore.id}/restore`);
        setMessage("Restore complete on the server.");
      } else if (showRestore.snapshot) {
        setMessage(
          "Local product snapshot noted. Categories are managed via the Categories API — restore products with the server backup API when available."
        );
      } else {
        setError("This backup has no restoreable snapshot.");
      }
      setShowRestore(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Restore failed.");
    } finally {
      setBusy(false);
    }
  }

  if (user?.role !== "owner") {
    return <Navigate to="/" replace />;
  }

  return (
    <AppShell
      breadcrumb="Backup / Restore"
      searchValue={search}
      onSearch={setSearch}
      searchPlaceholder="Search backups by label or status..."
      notificationCount={metrics.failed}
      orderBadge={metrics.failed}
    >
      {error && (
        <div className="alert alert--warning" role="status" style={{ marginBottom: 14 }}>
          <TriangleAlert size={18} strokeWidth={1.75} />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="alert alert--success" role="status" style={{ marginBottom: 14 }}>
          <span>{message}</span>
        </div>
      )}

      <section className="inv-stats">
        <article className="inv-stat">
          <p className="inv-stat__label">Total backups</p>
          <p className="inv-stat__value">{metrics.total}</p>
        </article>
        <article className="inv-stat">
          <p className="inv-stat__label">Completed</p>
          <p className="inv-stat__value is-green">{metrics.completed}</p>
        </article>
        <article className="inv-stat">
          <p className="inv-stat__label">Failed</p>
          <p className="inv-stat__value is-red">{metrics.failed}</p>
        </article>
        <article className="inv-stat">
          <p className="inv-stat__label">Last backup</p>
          <p className="inv-stat__value" style={{ fontSize: "1.05rem" }}>
            {metrics.latest ? formatWhen(metrics.latest) : "—"}
          </p>
        </article>
      </section>

      <section className="inv-toolbar">
        <div className="inv-filters">
          <Filter size={16} strokeWidth={1.75} />
          {[
            { id: "all", label: "All" },
            { id: "completed", label: "Completed" },
            { id: "failed", label: "Failed" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              className={`inv-chip ${statusFilter === f.id ? "is-active" : ""}`}
              onClick={() => setStatusFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="inv-actions">
          <button type="button" className="btn btn--primary btn--inline" onClick={openCreate}>
            <DatabaseBackup size={16} strokeWidth={1.75} />
            Create backup
          </button>
        </div>
      </section>

      <section className="po-panel">
        <header className="po-panel__head">
          <h2 className="po-panel__title">Backup history</h2>
          <span className="muted">{source === "api" ? "Server mode" : "Local mode"}</span>
        </header>

        <div className="po-table-wrap">
          <table className="po-table">
            <thead>
              <tr>
                <th>Backup</th>
                <th>Created</th>
                <th>Status</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5}>Loading backups...</td>
                </tr>
              )}
              {!loading &&
                filtered.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span className="dash-item-name">{b.label}</span>
                      {b.note && <span className="dash-item-sku">{b.note}</span>}
                    </td>
                    <td>{formatWhen(b.created_at)}</td>
                    <td>
                      <span className={`pill ${b.status === "completed" ? "pill--in" : "pill--out"}`}>
                        {b.status}
                      </span>
                    </td>
                    <td>{b.source === "local" ? "Browser" : "Server"}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        disabled={busy || b.status !== "completed"}
                        onClick={() => setShowRestore(b)}
                      >
                        <RotateCcw size={14} strokeWidth={1.75} />
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>No backups yet. Create one to protect your data.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showCreate && (
        <div className="inv-modal" role="dialog" aria-modal="true" aria-labelledby="create-backup-title">
          <button className="inv-modal__backdrop" type="button" aria-label="Close" onClick={closeCreate} />
          <form className="inv-modal__panel" onSubmit={handleCreate}>
            <div className="inv-modal__head">
              <h2 id="create-backup-title">Create backup</h2>
              <button type="button" className="icon-btn" onClick={closeCreate} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="alert alert--error" role="alert">
                <TriangleAlert size={18} strokeWidth={1.75} />
                <span>{formError}</span>
              </div>
            )}

            <div className="field">
              <label className="label" htmlFor="backup-label">Label</label>
              <div className="input">
                <input
                  id="backup-label"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. End of week snapshot"
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="backup-note">Note</label>
              <div className="input">
                <input
                  id="backup-note"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Optional note about this backup"
                />
              </div>
            </div>

            <p className="muted" style={{ fontSize: "0.85rem" }}>
              Owner-only. If the server database is offline, a local browser backup is created instead.
            </p>

            <div className="btn-row" style={{ marginTop: 12 }}>
              <button type="submit" className="btn btn--primary btn--inline" disabled={busy}>
                <DatabaseBackup size={16} strokeWidth={1.75} />
                {busy ? "Creating..." : "Create backup"}
              </button>
              <button type="button" className="btn btn--ghost" onClick={closeCreate}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showRestore && (
        <div className="inv-modal" role="dialog" aria-modal="true" aria-labelledby="restore-backup-title">
          <button
            className="inv-modal__backdrop"
            type="button"
            aria-label="Close"
            onClick={() => setShowRestore(null)}
          />
          <div className="inv-modal__panel">
            <div className="inv-modal__head">
              <h2 id="restore-backup-title">Restore backup</h2>
              <button type="button" className="icon-btn" onClick={() => setShowRestore(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="alert alert--warning" role="status">
              <TriangleAlert size={18} strokeWidth={1.75} />
              <span>
                Restore <strong>{showRestore.label}</strong>? This can replace current data.
              </span>
            </div>

            <div className="btn-row" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn btn--primary btn--inline"
                disabled={busy}
                onClick={handleRestore}
              >
                <RotateCcw size={16} strokeWidth={1.75} />
                {busy ? "Restoring..." : "Confirm restore"}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setShowRestore(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}