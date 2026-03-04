// src/modules/settings/StoreSettingsPage.jsx
import React, { useEffect, useState } from "react";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import "./storysettingpage.css";

function StoreSettingsPage() {
  const { settings, loading, updateSettings } = useStoreSettings();

  const [form, setForm] = useState({
    store_name: "SaaS Tienda",
    primary_color: "#38bdf8",
    accent_color: "#22c55e",
    background_color: "#0f172a",
    logo_url: "",
    ticket_footer:
      "Gracias por su compra. No se aceptan cambios pasados los 30 días.",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, logo_url: String(reader.result || "") }));
      setMessage("Logo cargado. Guarda los cambios para aplicarlo.");
    };
    reader.onerror = () => {
      setMessage("No se pudo leer la imagen del logo.");
    };
    reader.readAsDataURL(file);
  };

  // Volcar settings del contexto al formulario
  useEffect(() => {
    if (!settings) return;
    setForm({
      store_name: settings.storeName || "SaaS Tienda",
      primary_color: settings.primaryColor || "#38bdf8",
      accent_color: settings.accentColor || "#22c55e",
      background_color: settings.backgroundColor || "#0f172a",
      logo_url: settings.logoUrl || "",
      ticket_footer:
        settings.ticketFooter ||
        "Gracias por su compra. No se aceptan cambios pasados los 30 días.",
    });
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setMessage("");

    if (name === "primary_color") {
      document.documentElement.style.setProperty("--primary", value);
    }
    if (name === "accent_color") {
      document.documentElement.style.setProperty("--accent", value);
    }
    if (name === "background_color") {
      document.documentElement.style.setProperty("--bg-body", value);
      document.documentElement.style.setProperty("--bg-main", value);
      document.documentElement.style.background = value;
      document.body.style.background = value;
      document.body.style.backgroundImage = "none";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await updateSettings({
        store_name: form.store_name,

        primary_color: form.primary_color,
        accent_color: form.accent_color,
        background_color: form.background_color,
        logo_url: form.logo_url,
        ticket_footer: form.ticket_footer,
      });

      setMessage("✅ Cambios guardados y aplicados.");
    } catch (err) {
      console.error("❌ Error al guardar configuración", err);
      setMessage("❌ Error al guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="store-settings-loading">Cargando configuración…</div>
    );
  }

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "900px",
        margin: "0 auto",
        color: "#e5e7eb",
      }}
    >
      <h1
        style={{
          fontSize: "1.8rem",
          fontWeight: "600",
          marginBottom: "1.5rem",
        }}
      >
        Configuración de tienda
      </h1>

      <form
        onSubmit={handleSubmit}
        className="store-settings-form"
        style={{
          display: "grid",
          gap: "1.5rem",

        }}
      >
        {/* Datos comerciales */}
        <section>
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: "500",
              marginBottom: "0.75rem",
            }}
          >
            Datos comerciales
          </h2>

          <div
            className="grid-2"
            style={{

              gridTemplateColumns: "1.5fr 1.5fr",

            }}
          >
            <Field
              label="Nombre de la tienda"
              name="store_name"
              value={form.store_name}
              onChange={handleChange}
              style={{ gridColumn: "1 / -1" }}
            />
          </div>
        </section>

        {/* Estilo & branding */}
        <section>
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: "500",
              marginBottom: "0.75rem",
            }}
          >
            Estilo & branding
          </h2>

          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <ColorField
              label="Color primario"
              name="primary_color"
              value={form.primary_color}
              onChange={handleChange}
            />
            <ColorField
              label="Color secundario"
              name="accent_color"
              value={form.accent_color}
              onChange={handleChange}
            />
            <ColorField
              label="Color de fondo"
              name="background_color"
              value={form.background_color}
              onChange={handleChange}
            />
            <Field
              label="Logo (URL)"
              name="logo_url"
              value={form.logo_url}
              onChange={handleChange}
              style={{ flex: 1, minWidth: 240 }}
            />
            <div style={{ minWidth: 220 }}>
              <label
                style={{
                  fontSize: "0.8rem",
                  color: "#9ca3af",
                  display: "block",
                  marginBottom: "0.25rem",
                }}
              >
                O subir archivo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFile}
                style={{
                  width: "100%",
                  backgroundColor: "#020817",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(148,163,253,0.18)",
                  padding: "0.45rem 0.6rem",
                  color: "#e5e7eb",
                  fontSize: "0.85rem",
                }}
              />
            </div>
          </div>

          {form.logo_url && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(148,163,253,0.22)",
                background: "linear-gradient(135deg, rgba(56,189,248,0.08), rgba(34,197,94,0.06))",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <img
                src={form.logo_url}
                alt="Preview logo"
                style={{
                  width: 72,
                  height: 72,
                  objectFit: "contain",
                  borderRadius: 10,
                  padding: 4,
                  background: "rgba(2,8,23,0.65)",
                  boxShadow: "0 10px 25px rgba(2,8,23,0.65)",
                }}
              />
              <div style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>Vista previa del logo</span>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, logo_url: "" }))}
                  style={{
                    width: "fit-content",
                    padding: "5px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(239,68,68,0.45)",
                    background: "rgba(239,68,68,0.08)",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Quitar logo
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Ticket */}
        <section>
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: "500",
              marginBottom: "0.75rem",
            }}
          >
            Ticket
          </h2>

          <label
            style={{
              fontSize: "0.8rem",
              color: "#9ca3af",
              display: "block",
              marginBottom: "0.35rem",
            }}
          >
            Texto al pie del ticket
          </label>
          <textarea
            name="ticket_footer"
            value={form.ticket_footer}
            onChange={handleChange}
            rows={3}
            style={{
              width: "100%",
              backgroundColor: "#020817",
              borderRadius: "0.75rem",
              border: "1px solid rgba(148,163,253,0.18)",
              padding: "0.65rem 0.85rem",
              color: "#e5e7eb",
              fontSize: "0.95rem",
              resize: "vertical",
              outline: "none",
            }}
          />
        </section>

        {/* Botón + mensaje */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          {message && (
            <span
              style={{
                fontSize: "0.9rem",
                color: message.startsWith("✅") ? "#22c55e" : "#f97316",
              }}
            >
              {message}
            </span>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "0.55rem 1.35rem",
              borderRadius: "999px",
              border: "none",
              cursor: saving ? "wait" : "pointer",
              fontSize: "0.95rem",
              fontWeight: "600",
              background:
                "linear-gradient(90deg, var(--primary), var(--accent))",
              color: "#020817",
              boxShadow: "0 10px 25px rgba(15,23,42,0.9)",
            }}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* --------- UI helpers --------- */

const Field = ({ label, name, value, onChange, style }) => (
  <div style={style}>
    <label
      style={{
        fontSize: "0.8rem",
        color: "#9ca3af",
        display: "block",
        marginBottom: "0.25rem",
      }}
    >
      {label}
    </label>
    <input
      name={name}
      value={value}
      onChange={onChange}
      style={{
        width: "100%",
        backgroundColor: "#020817",
        borderRadius: "0.75rem",
        border: "1px solid rgba(148,163,253,0.18)",
        padding: "0.5rem 0.8rem",
        color: "#e5e7eb",
        fontSize: "0.95rem",
        outline: "none",
      }}
    />
  </div>
);

const ColorField = ({ label, name, value, onChange }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
    <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{label}</span>
    <input
      type="color"
      name={name}
      value={value}
      onChange={onChange}
      style={{
        width: "46px",
        height: "32px",
        padding: "0",
        borderRadius: "0.75rem",
        border: "1px solid rgba(148,163,253,0.4)",
        background: "transparent",
        cursor: "pointer",
      }}
    />
  </div>
);

export default StoreSettingsPage;
