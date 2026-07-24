import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Box,
  ChartColumn,
  Clock3,
  DatabaseBackup,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingCart,
  Tag,
  TriangleAlert,
  X,
} from "lucide-react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { pendingSalesCount } from "../offline/sync";
import { initials, productStatus } from "../utils/inventoryMetrics";
import "../styles/shell.css";
import { Wallet } from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Inventory", icon: Package },
  { to: "/categories", label: "Categories", icon: Tag },
  { to: "/orders", label: "Orders", icon: ShoppingCart, badgeKey: "orders" },
  { to: "/reports", label: "Reports", icon: ChartColumn },
  { to: "/profit", label: "Profit", icon: Wallet },
  { to: "/backup", label: "Backup", icon: DatabaseBackup, ownerOnly: true },
];

export default function AppShell({
  children,
  breadcrumb = "Dashboard / Overview",
  searchPlaceholder = "Search items, SKU, category...",
  onSearch,
  searchValue = "",
  notificationCount,
  orderBadge = 0,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadAlerts() {
      try {
        const [{ data }, pending] = await Promise.all([
          api.get("/products"),
          pendingSalesCount(),
        ]);
        if (!active) return;
        setProducts(Array.isArray(data) ? data : []);
        setPendingCount(pending || 0);
      } catch {
        if (!active) return;
        try {
          const pending = await pendingSalesCount();
          setPendingCount(pending || 0);
        } catch {
          setPendingCount(0);
        }
      }
    }

    loadAlerts();
    const timer = setInterval(loadAlerts, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const alerts = useMemo(() => {
    const list = [];

    for (const product of products) {
      const status = productStatus(product);
      if (status === "out") {
        list.push({
          id: `out-${product.id}`,
          type: "out",
          title: "Out of stock",
          detail: `${product.name}${product.sku ? ` (${product.sku})` : ""} has 0 units left.`,
          href: "/products",
        });
      } else if (status === "low") {
        list.push({
          id: `low-${product.id}`,
          type: "low",
          title: "Low stock",
          detail: `${product.name} has ${product.quantity} left (min ${product.min_stock_level}).`,
          href: "/orders",
        });
      }
    }

    if (pendingCount > 0) {
      list.unshift({
        id: "pending-sync",
        type: "pending",
        title: "Pending sync",
        detail: `${pendingCount} sale${pendingCount === 1 ? "" : "s"} waiting to sync.`,
        href: "/orders",
      });
    }

    return list;
  }, [products, pendingCount]);

  const badgeCount =
    typeof notificationCount === "number" && notificationCount > 0
      ? notificationCount
      : alerts.length;

  const displayOrderBadge = orderBadge > 0 ? orderBadge : pendingCount;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function openAlert(alert) {
    setNotifyOpen(false);
    navigate(alert.href);
  }

  return (
    <div className="shell">
      {open && (
        <button
          className="shell__backdrop"
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={`shell__sidebar ${open ? "is-open" : ""}`}>
        <div className="shell__brand">
          <div className="shell__logo" aria-hidden="true">
            <Box size={18} strokeWidth={1.75} />
          </div>
          <div>
            <strong className="shell__brand-name">Regimens</strong>
            <span className="shell__brand-sub">Stationery</span>
          </div>
          <button className="shell__close" type="button" onClick={() => setOpen(false)} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="shell__menu-label">Main menu</p>
        <nav className="shell__nav">
          {NAV.filter((item) => !item.ownerOnly || user?.role === "owner").map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `shell__link ${isActive ? "is-active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} strokeWidth={1.75} />
                <span>{item.label}</span>
                {item.badgeKey === "orders" && displayOrderBadge > 0 && (
                  <span className="shell__badge">{displayOrderBadge}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="shell__user">
          <div className="shell__avatar">{initials(user?.name)}</div>
          <div className="shell__user-meta">
            <strong>{user?.name || "User"}</strong>
            <span>{user?.role === "owner" ? "Owner" : "Assistant"}</span>
          </div>
          <button className="icon-btn" type="button" aria-label="Log out" onClick={handleLogout}>
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      <div className="shell__main">
        <header className="shell__header">
          <button className="shell__menu-btn" type="button" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu size={20} strokeWidth={1.75} />
          </button>
          <h1 className="shell__breadcrumb">{breadcrumb}</h1>

          <label className="shell__search">
            <Search size={18} strokeWidth={1.75} />
            <input
              value={searchValue}
              onChange={(e) => onSearch?.(e.target.value)}
              placeholder={searchPlaceholder}
            />
          </label>

          <button
            className="shell__notify"
            type="button"
            aria-label="Open notifications"
            aria-expanded={notifyOpen}
            onClick={() => setNotifyOpen(true)}
          >
            <Bell size={20} strokeWidth={1.75} />
            {badgeCount > 0 && (
              <span className="shell__badge shell__badge--float">{badgeCount}</span>
            )}
          </button>
        </header>

        <div className="shell__content">{children}</div>
      </div>

      {notifyOpen && (
        <button
          className="notify-backdrop"
          type="button"
          aria-label="Close notifications"
          onClick={() => setNotifyOpen(false)}
        />
      )}

      <aside className={`notify-drawer ${notifyOpen ? "is-open" : ""}`} aria-hidden={!notifyOpen}>
        <header className="notify-drawer__head">
          <div>
            <h2>Notifications</h2>
            <p className="muted">
              {alerts.length === 0
                ? "You're all caught up"
                : `${alerts.length} alert${alerts.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close notifications"
            onClick={() => setNotifyOpen(false)}
          >
            <X size={18} />
          </button>
        </header>

        <div className="notify-drawer__body">
          {alerts.length === 0 && (
            <div className="notify-empty">
              <Bell size={22} strokeWidth={1.75} />
              <p>No stock or sync alerts right now.</p>
            </div>
          )}

          {alerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              className={`notify-item notify-item--${alert.type}`}
              onClick={() => openAlert(alert)}
            >
              <span className="notify-item__icon" aria-hidden="true">
                {alert.type === "pending" ? (
                  <Clock3 size={16} strokeWidth={1.75} />
                ) : (
                  <TriangleAlert size={16} strokeWidth={1.75} />
                )}
              </span>
              <span className="notify-item__copy">
                <strong>{alert.title}</strong>
                <span>{alert.detail}</span>
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}