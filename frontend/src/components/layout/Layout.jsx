import React, { useCallback, useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useStoreSettings } from "../../context/StoreSettingsContext.jsx";
import { getAuthUser, getUserName, hasPermission, useRole } from "../../utils/auth.js";
import ProfileModal from "../../modules/users/ProfileModal.jsx";

export default function Layout({ children }) {
  const { settings, loading } = useStoreSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const user = getAuthUser();
  const { admin } = useRole();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar menu al cambiar de ruta
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Cerrar dropdown al click afuera
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    window.location.href = "/";
  }, []);

  const storeName = settings?.storeName || "Tienda Alex";
  const logoUrl = settings?.logo_url || "";
  const userName = getUserName();
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      {/* OVERLAY mobile */}
      {menuOpen && (
        <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar${menuOpen ? " open" : ""}`}>
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
          <span className="sidebar-store-name" style={{ color: "#a855f7" }}>{storeName}</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
            <span className="icon">🏠</span><span>Dashboard</span>
          </NavLink>
          {(admin || hasPermission("pos")) && (
            <NavLink to="/pos" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
              <span className="icon">🧾</span><span>Punto de venta</span>
            </NavLink>
          )}
          {(admin || hasPermission("productos")) && (
            <NavLink to="/productos" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
              <span className="icon">📦</span><span>Productos</span>
            </NavLink>
          )}
          {(admin || hasPermission("clientes")) && (
            <NavLink to="/clientes" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
              <span className="icon">👥</span><span>Clientes</span>
            </NavLink>
          )}
          {(admin || hasPermission("proveedores")) && (
            <NavLink to="/proveedores" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
              <span className="icon">🏭</span><span>Proveedores</span>
            </NavLink>
          )}
          {(admin || hasPermission("promociones")) && (
            <NavLink to="/promociones" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
              <span className="icon">🔥</span><span>Promociones</span>
            </NavLink>
          )}
          {(admin || hasPermission("reportes")) && (
            <NavLink to="/reportes" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
              <span className="icon">📊</span><span>Reportes</span>
            </NavLink>
          )}
          {(admin || hasPermission("arqueo")) && (
            <NavLink to="/arqueo" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
              <span className="icon">💰</span><span>Arqueo</span>
            </NavLink>
          )}
          {admin && (
            <NavLink to="/usuarios" className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
              <span className="icon">👤</span><span>Usuarios</span>
            </NavLink>
          )}
        </nav>
      </aside>

      {/* TOPBAR */}
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span></span><span></span><span></span>
          </button>
          <div className="topbar-title">
            <span className="label">
              {loading ? "Cargando tienda..." : "TIENDA ACTIVA"}
            </span>
            <span className="main">{storeName}</span>
          </div>
        </div>

        <div className="topbar-right">
          <div className="topbar-pill hide-mobile">
            {new Date().toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            })}
          </div>

          {/* Dropdown de usuario */}
          <div className="user-dropdown-wrapper" ref={dropdownRef}>
            <button
              className="user-pill"
              onClick={() => setDropdownOpen((o) => !o)}
            >
              <div className="avatar">{userInitial}</div>
              <span className="user-pill-name hide-mobile">{userName}</span>
              <span className={`role-badge role-badge--${user?.role === "admin" ? "admin" : "employee"}`}>
                {admin ? "Admin" : "Empleado"}
              </span>
            </button>

            {dropdownOpen && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <strong>{userName}</strong>
                  <span>{user?.email}</span>
                </div>
                <div className="user-dropdown-divider" />
                <button
                  className="user-dropdown-item"
                  onClick={() => { setShowProfile(true); setDropdownOpen(false); }}
                >
                  👤 Mi Perfil
                </button>
                {admin && (
                  <button
                    className="user-dropdown-item"
                    onClick={() => { navigate("/usuarios"); setDropdownOpen(false); }}
                  >
                    👥 Gestionar Usuarios
                  </button>
                )}
                <div className="user-dropdown-divider" />
                <button
                  className="user-dropdown-item user-dropdown-item--danger"
                  onClick={handleLogout}
                >
                  🚪 Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="app-main">{children}</main>

      {/* Modal de perfil */}
      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
