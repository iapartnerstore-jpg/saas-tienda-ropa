import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const PROMOTION_TYPES = [
  { value: "combo", label: "Combo" },
  { value: "liquidacion", label: "Liquidacion" },
];

const emptyForm = {
  name: "",
  type: "combo",
  discount_percent: "",
  start_date: "",
  end_date: "",
  notes: "",
  items: [{ product_id: "", qty: 1, price_override: "" }],
};

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const productsMap = useMemo(() => {
    const map = new Map();
    for (const p of products) map.set(String(p.id), p.name);
    return map;
  }, [products]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [promoRes, productRes] = await Promise.all([
        axios.get(`${API_URL}/promotions`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/products`, { headers: getAuthHeaders() }),
      ]);
      setPromotions(promoRes.data || []);
      setProducts(productRes.data || []);
    } catch (err) {
      console.error("GET /promotions", err);
      setMsg("No se pudieron cargar las promociones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { product_id: "", qty: 1, price_override: "" }],
    }));
  };

  const updateItem = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const createPromotion = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMsg("");

      const payload = {
        name: form.name,
        type: form.type,
        discount_percent: form.discount_percent === "" ? null : Number(form.discount_percent),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes,
        items: form.items
          .filter((item) => item.product_id)
          .map((item) => ({
            product_id: Number(item.product_id),
            qty: Number(item.qty) || 1,
            price_override: item.price_override === "" ? null : Number(item.price_override),
          })),
      };

      const { data } = await axios.post(`${API_URL}/promotions`, payload, { headers: getAuthHeaders() });
      setPromotions((prev) => [data, ...prev]);
      setForm(emptyForm);
      setMsg("Promocion creada");
    } catch (err) {
      console.error("POST /promotions", err?.response?.data || err);
      setMsg(err?.response?.data?.message || "No se pudo crear la promocion");
    } finally {
      setSaving(false);
    }
  };

  const togglePromotion = async (id) => {
    try {
      const { data } = await axios.patch(`${API_URL}/promotions/${id}/toggle`, null, { headers: getAuthHeaders() });
      setPromotions((prev) => prev.map((item) => (item.id === id ? data : item)));
    } catch (err) {
      console.error("PATCH /promotions/:id/toggle", err?.response?.data || err);
      setMsg("No se pudo cambiar estado de la promocion");
    }
  };

  const deletePromotion = async (id) => {
    if (!confirm("Eliminar promocion?")) return;
    try {
      await axios.delete(`${API_URL}/promotions/${id}`, { headers: getAuthHeaders() });
      setPromotions((prev) => prev.filter((item) => item.id !== id));
      setMsg("Promocion eliminada");
    } catch (err) {
      console.error("DELETE /promotions", err?.response?.data || err);
      setMsg("No se pudo eliminar la promocion");
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>Promociones y liquidacion</h2>

      {msg && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "rgba(59,130,246,0.12)",
            color: "#93c5fd",
            fontSize: 13,
          }}
        >
          {msg}
        </div>
      )}

      <div className="dash-card" style={{ maxWidth: 1100 }}>
        <div className="title" style={{ marginBottom: 10 }}>Crear promocion</div>
        <form onSubmit={createPromotion} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 10 }}>
            <Input
              label="Nombre"
              value={form.name}
              onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
              required
            />
            <Select
              label="Tipo"
              value={form.type}
              options={PROMOTION_TYPES}
              onChange={(value) => setForm((prev) => ({ ...prev, type: value }))}
            />
            <Input
              label="Descuento %"
              type="number"
              value={form.discount_percent}
              onChange={(value) => setForm((prev) => ({ ...prev, discount_percent: value }))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input
              label="Desde"
              type="date"
              value={form.start_date}
              onChange={(value) => setForm((prev) => ({ ...prev, start_date: value }))}
            />
            <Input
              label="Hasta"
              type="date"
              value={form.end_date}
              onChange={(value) => setForm((prev) => ({ ...prev, end_date: value }))}
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, color: "var(--text-soft)" }}>Productos de la promocion</div>

            {form.items.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "2fr 0.6fr 1fr auto",
                  alignItems: "end",
                }}
              >
                <Select
                  label="Producto"
                  value={item.product_id}
                  options={products.map((p) => ({ value: String(p.id), label: p.name }))}
                  onChange={(value) => updateItem(index, { product_id: value })}
                  placeholder="Seleccionar producto"
                />
                <Input
                  label="Cant."
                  type="number"
                  value={item.qty}
                  onChange={(value) => updateItem(index, { qty: value })}
                />
                <Input
                  label={form.type === "liquidacion" ? "Precio liquidacion" : "Precio opcional"}
                  type="number"
                  value={item.price_override}
                  onChange={(value) => updateItem(index, { price_override: value })}
                />
                <button type="button" onClick={() => removeItem(index)}>
                  Quitar
                </button>
              </div>
            ))}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={addItem} style={{ fontSize: 12 }}>
                + Agregar producto
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, color: "var(--text-soft)", fontSize: 12 }}>
              Notas
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              style={fieldStyle}
            />
          </div>

          <div>
            <button type="submit" className="save" disabled={saving}>
              {saving ? "Guardando..." : "Crear promoción"}
            </button>
          </div>
        </form>
      </div>

      <div className="dash-card sales-list" style={{ maxWidth: 1300 }}>
        <div className="title">Promociones activas e historicas</div>
        {loading ? (
          <div style={{ padding: 12, color: "var(--text-soft)" }}>Cargando...</div>
        ) : promotions.length === 0 ? (
          <div style={{ padding: 12, color: "var(--text-soft)" }}>No hay promociones cargadas.</div>
        ) : (
          <div className="table">
            <div className="thead" style={{ gridTemplateColumns: "0.5fr 1.6fr 0.8fr 0.7fr 2fr 1fr" }}>
              <div>ID</div>
              <div>Nombre</div>
              <div>Tipo</div>
              <div>Estado</div>
              <div>Productos</div>
              <div>Acciones</div>
            </div>

            <div className="tbody" style={{ maxHeight: 420, overflowY: "auto" }}>
              {promotions.map((promotion) => (
                <div
                  key={promotion.id}
                  className="row"
                  style={{ gridTemplateColumns: "0.5fr 1.6fr 0.8fr 0.7fr 2fr 1fr" }}
                >
                  <div>#{promotion.id}</div>
                  <div>
                    <strong>{promotion.name}</strong>
                    <div style={{ fontSize: 11, color: "var(--text-soft)" }}>
                      {promotion.discount_percent ? `${promotion.discount_percent}%` : "Sin descuento global"}
                    </div>
                  </div>
                  <div>{promotion.type}</div>
                  <div>{promotion.active ? "Activa" : "Inactiva"}</div>
                  <div style={{ fontSize: 11, color: "var(--text-soft)" }}>
                    {(promotion.items || []).map((item) => (
                      <div key={item.id || `${item.product_id}-${item.qty}`}>
                        {(item.product_name || productsMap.get(String(item.product_id)) || "Producto") +
                          ` x${item.qty}` +
                          (item.price_override != null ? ` ($${item.price_override})` : "")}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" onClick={() => togglePromotion(promotion.id)}>
                      {promotion.active ? "Desactivar" : "Activar"}
                    </button>
                    <button type="button" onClick={() => deletePromotion(promotion.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const fieldStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #d6cfc7",
  background: "#f5f0eb",
  color: "#1e1b4b",
  fontSize: 13,
};

const Input = ({ label, value, onChange, type = "text", required = false }) => (
  <div>
    <label style={{ display: "block", marginBottom: 4, color: "var(--text-soft)", fontSize: 12 }}>
      {label}
    </label>
    <input
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={fieldStyle}
    />
  </div>
);

const Select = ({ label, value, options, onChange, placeholder }) => (
  <div>
    <label style={{ display: "block", marginBottom: 4, color: "var(--text-soft)", fontSize: 12 }}>
      {label}
    </label>
    <select value={value} onChange={(e) => onChange(e.target.value)} style={fieldStyle}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);
