import { useState, useEffect } from "react";

export const getAuthUser = () => {
  try {
    const raw = localStorage.getItem("authUser");
    return raw ? JSON.parse(raw) : null;
  } catch (_err) {
    return null;
  }
};

export const isLoggedIn = () => Boolean(localStorage.getItem("token"));

export const isAdmin = () => getAuthUser()?.role === "admin";

export const getUserName = () =>
  getAuthUser()?.name || getAuthUser()?.email || "Usuario";

export const getUserPermissions = () => getAuthUser()?.permissions || null;

export const hasPermission = (module) => {
  if (isAdmin()) return true;
  const perms = getUserPermissions();
  return perms ? Boolean(perms[module]) : false;
};

/**
 * Hook React para escuchar cambios de rol o de sesión.
 * Se actualiza cuando se dispara el evento 'authChanged'.
 */
export const useRole = () => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener("authChanged", handler);
    return () => window.removeEventListener("authChanged", handler);
  }, []);

  return {
    admin: isAdmin(),
    activeRole: getAuthUser()?.role || "employee",
  };
};
