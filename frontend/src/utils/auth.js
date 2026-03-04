export const getAuthUser = () => {
  try {
    const raw = localStorage.getItem("authUser");
    return raw ? JSON.parse(raw) : null;
  } catch (_err) {
    return null;
  }
};

export const isLoggedIn = () => Boolean(localStorage.getItem("token"));

const ADMIN_ROLES = ["admin", "administrador", "owner", "gerente", "superadmin"];

/** Devuelve true si el usuario real (de la DB) es admin */
export const isRealAdmin = () => {
  const user = getAuthUser();
  const role = String(user?.role || "").toLowerCase();
  return ADMIN_ROLES.includes(role);
};

/** Devuelve true si el rol activo (puede estar sobreescrito) es admin */
export const isAdmin = () => {
  const override = localStorage.getItem("roleOverride");
  if (override) return ADMIN_ROLES.includes(override.toLowerCase());
  return isRealAdmin();
};

/** Devuelve el rol activo actual */
export const getActiveRole = () => {
  const override = localStorage.getItem("roleOverride");
  if (override) return override;
  const user = getAuthUser();
  return user?.role || "employee";
};

/** Cambia el rol activo. Solo un admin real puede hacerlo. */
export const toggleRole = () => {
  if (!isRealAdmin()) return false;
  const current = getActiveRole().toLowerCase();
  if (ADMIN_ROLES.includes(current)) {
    localStorage.setItem("roleOverride", "employee");
  } else {
    localStorage.removeItem("roleOverride");
  }
  window.dispatchEvent(new Event("roleChanged"));
  return true;
};

/** Limpia el override (vuelve al rol real) */
export const clearRoleOverride = () => {
  localStorage.removeItem("roleOverride");
};

/**
 * Hook React para escuchar cambios de rol.
 * Retorna { admin, realAdmin, activeRole } y se actualiza al cambiar.
 * Importar: import { useRole } from '../../utils/auth'
 */
import { useState, useEffect } from "react";

export const useRole = () => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener("roleChanged", handler);
    return () => window.removeEventListener("roleChanged", handler);
  }, []);

  return {
    admin: isAdmin(),
    realAdmin: isRealAdmin(),
    activeRole: getActiveRole(),
  };
};
