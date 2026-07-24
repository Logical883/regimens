import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Box,
  ChartColumn,
  DatabaseBackup,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingCart,
  Tag,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { initials } from "../utils/inventoryMetrics";
import "../styles/shell.css";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Inventory", icon: Package },
  { to: "/categories", label: "Categories", icon: Tag },
  { to: "/sale/new", label: "Orders", icon: ShoppingCart, badgeKey: "orders" },
  { to: "/reports", label: "Reports", icon: ChartColumn },
  { to: "/backup", label: "Backup", icon: DatabaseBackup, ownerOnly: true },
];

export default function AppShell({
  children,
  breadcrumb = "Dashboard / Overview",
  searchPlaceholder = "Search items, SKU, category...",
  onSearch,
  searchValue = "",
  notificationCount = 0,
  orderBadge = 0,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
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
                {item.badgeKey === "orders" && orderBadge > 0 && (
                  <span className="shell__badge">{orderBadge}</span>
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

          <button className="shell__notify" type="button" aria-label="Notifications">
            <Bell size={20} strokeWidth={1.75} />
            {notificationCount > 0 && (
              <span className="shell__badge shell__badge--float">{notificationCount}</span>
            )}
          </button>
        </header>

        <div className="shell__content">{children}</div>
      </div>
    </div>
  );
}