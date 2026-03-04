import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const StoreSettingsContext = createContext();

export function useStoreSettings() {
  const context = useContext(StoreSettingsContext);
  if (!context) {
    throw new Error("useStoreSettings debe usarse dentro de StoreSettingsProvider");
  }
  return context;
}

export function StoreSettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL;

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    const tenant = localStorage.getItem("tenant") || "modashop";
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Tenant": tenant,
    };
  };

  const normalizeSettings = (data) => ({
    storeName: data?.storeName || data?.store_name || "Tienda Alex",
    primaryColor: data?.primaryColor || data?.primary_color || "#38bdf8",
    accentColor: data?.accentColor || data?.accent_color || "#22c55e",
    backgroundColor: data?.backgroundColor || data?.background_color || "#0f172a",
    logoUrl: data?.logoUrl || data?.logo_url || "",
    ticketFooter:
      data?.ticketFooter ||
      data?.ticket_footer ||
      "Gracias por su compra. No se aceptan cambios pasados los 30 días.",
  });

  const fetchSettings = async () => {
    // Si no hay tenant en localStorage (ej. página de login), usar defaults sin hacer fetch
    const tenant = localStorage.getItem("tenant");
    if (!tenant) {
      const defaults = normalizeSettings(null);
      setSettings(defaults);
      applyColors(defaults);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data } = await axios.get(`${API_URL}/store/settings`, {
        headers: getAuthHeaders(),
      });

      const normalized = normalizeSettings(data);
      setSettings(normalized);
      applyColors(normalized);
      localStorage.setItem("storeSettings", JSON.stringify(normalized));
    } catch (err) {
      console.error("Error cargando configuración de tienda:", err);
      // Valores por defecto si falla
      let defaults = normalizeSettings(null);
      const cached = localStorage.getItem("storeSettings");
      if (cached) {
        try {
          defaults = normalizeSettings(JSON.parse(cached));
        } catch (_parseErr) {
          defaults = normalizeSettings(null);
        }
      }
      setSettings(defaults);
      applyColors(defaults);
    } finally {
      setLoading(false);
    }
  };

  const applyColors = (data) => {
    if (!data) return;
    const background = data.backgroundColor || "#0f172a";
    
    // Aplicar colores CSS en :root
    document.documentElement.style.setProperty("--primary", data.primaryColor || "#38bdf8");
    document.documentElement.style.setProperty("--accent", data.accentColor || "#22c55e");
    document.documentElement.style.setProperty("--bg-body", background);
    document.documentElement.style.setProperty("--bg-main", background);

    // Refuerzo visual para evitar que vuelva al gradiente base
    document.documentElement.style.background = background;
    document.body.style.background = background;
    document.body.style.backgroundImage = "none";
    
    // Actualizar título de la página
    if (data.storeName) {
      document.title = data.storeName;
    }
  };

  const refresh = async () => {
    await fetchSettings();
  };

  const updateSettings = async (payload) => {
    const { data } = await axios.put(`${API_URL}/store/settings`, payload, {
      headers: getAuthHeaders(),
    });

    const normalized = normalizeSettings(data);
    setSettings(normalized);
    applyColors(normalized);
    localStorage.setItem("storeSettings", JSON.stringify(normalized));
    return normalized;
  };

  useEffect(() => {
    const cached = localStorage.getItem("storeSettings");
    if (cached) {
      try {
        const parsed = normalizeSettings(JSON.parse(cached));
        setSettings(parsed);
        applyColors(parsed);
      } catch (_err) {
        // ignore invalid cache
      }
    }

    fetchSettings();

  }, []);

  

  return (
    <StoreSettingsContext.Provider
      value={{
        settings,
        loading,
        refresh,
        updateSettings,
      }}
    >
      {children}
    </StoreSettingsContext.Provider>
  );
}
