import React, { useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useStoreSettings } from "../../context/StoreSettingsContext.jsx";
import { getAuthUser, toggleRole, useRole } from "../../utils/auth.js";



export default function Layout({ children }) {
  const { settings, loading } = useStoreSettings();
  const location = useLocation();
  const user = getAuthUser();
  const { admin, realAdmin } = useRole();
  const isOverriding = realAdmin && !admin; // Admin real viendo como empleado

  const handleToggleRole = useCallback(() => {
    toggleRole();
  }, []);

  const storeName = settings?.storeName || "Tienda Alex";
  const logoUrl = settings?.logo_url || "";
  const userInitial = (user?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="logo"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                objectFit: "contain",
                padding: 2,
                background: "rgba(2,8,23,0.55)",
                border: "1px solid rgba(148,163,253,0.18)",
                boxShadow: "0 8px 18px rgba(2,8,23,0.65)"
              }}
            />
          ) : (
            <span className="icon">S</span>
          )}
          <span style={{ color: "#a855f7" }}>{storeName}</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " active" : "")
            }
          >
            <span className="icon">🏠</span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/pos"
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " active" : "")
            }
          >
            <span className="icon">🧾</span>
            <span>Punto de venta</span>
          </NavLink>

          <NavLink
            to="/productos"
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " active" : "")
            }
          >
            <span className="icon">📦</span>
            <span>Productos</span>
          </NavLink>

          <NavLink
            to="/clientes"
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " active" : "")
            }
          >
            <span className="icon">👥</span>
            <span>Clientes</span>
          </NavLink>

          <NavLink
            to="/proveedores"
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " active" : "")
            }
          >
            <span className="icon">🏭</span>
            <span>Proveedores</span>
          </NavLink>

          <NavLink
            to="/promociones"
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " active" : "")
            }
          >
            <span className="icon">🔥</span>
            <span>Promociones</span>
          </NavLink>

          {admin && (
            <NavLink
              to="/reportes"
              className={({ isActive }) =>
                "sidebar-link" + (isActive ? " active" : "")
              }
            >
              <span className="icon">📊</span>
              <span>Reportes</span>
            </NavLink>
          )}


        </nav>
      </aside>

      {/* TOPBAR */}
      <header className="topbar">
        <div className="topbar-title">
          <span className="label">
            {loading ? "Cargando tienda..." : "TIENDA ACTIVA"}
          </span>
          <span className="main">
            {storeName}
          </span>
        </div>

        <div className="topbar-right">
          <div className="topbar-pill">
            {new Date().toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            })}
          </div>
          <div className="topbar-pill">
            Ruta: {location.pathname.replace("/", "") || "dashboard"}
          </div>
          {realAdmin ? (
            <button
              className={`role-switch${isOverriding ? " role-switch--employee" : ""}`}
              onClick={handleToggleRole}
              title="Cambiar vista de rol"
            >
              <span className="role-switch-icon">{admin ? "👑" : "👤"}</span>
              <span className="role-switch-label">
                {admin ? "Admin" : "Empleado"}
              </span>
              <span className="role-switch-arrow">⇄</span>
            </button>
          ) : (
            <div className="topbar-pill">Rol: Empleado</div>
          )}
          <div className="avatar">{userInitial}</div>
        </div>
      </header>

      {/* MAIN */}
      <main className="app-main">{children}</main>
    </div>
  );
}
