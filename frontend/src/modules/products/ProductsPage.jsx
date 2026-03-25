import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./ProductsPage.css";
 
const API_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const PRODUCT_CATEGORIES = [
  { value: "varon", label: "Varon" },
  { value: "mujer", label: "Mujer" },
  { value: "ninos", label: "Ninos" },
  { value: "bebes", label: "Bebes" },
  { value: "colegio", label: "Ropa Colegio" },
  { value: "blanqueria", label: "Blanqueria" },
];

const PRODUCT_DEPARTMENTS = [
  { value: "ropa", label: "Ropa" },
  { value: "calzado", label: "Calzado" },
];

const FILTER_CATEGORIES = [{ value: "all", label: "Todas" }, ...PRODUCT_CATEGORIES];
const FILTER_DEPARTMENTS = [{ value: "all", label: "Ropa + Calzado" }, ...PRODUCT_DEPARTMENTS];

const normalizeCategory = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "hombre") return "varon";
  if (raw === "niño" || raw === "nino" || raw === "niños") return "ninos";
  if (raw === "bebé" || raw === "bebe") return "bebes";
  return raw;
};

const normalizeDepartment = (value) => String(value || "").trim().toLowerCase();

const getCategoryLabel = (value) => {
  const normalized = normalizeCategory(value);
  return PRODUCT_CATEGORIES.find((item) => item.value === normalized)?.label || value || "-";
};

const getDepartmentLabel = (value) => {
  const normalized = normalizeDepartment(value);
  return PRODUCT_DEPARTMENTS.find((item) => item.value === normalized)?.label || value || "-";
};

const ensureCategoryValue = (value) => {
  const normalized = normalizeCategory(value);
  return PRODUCT_CATEGORIES.some((item) => item.value === normalized) ? normalized : "varon";
};

const ensureDepartmentValue = (value) => {
  const normalized = normalizeDepartment(value);
  return PRODUCT_DEPARTMENTS.some((item) => item.value === normalized) ? normalized : "ropa";
};

const emptyForm = {
  name: "",
  category: "varon",
  department: "ropa",
  size: "",
  color: "",
  model: "",
  season: "",
  brand: "",
  description: "",
  cost: "",
  price: "",
  stock: "",
  barcode: "",
};

const ProductsPage = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeError, setBarcodeError] = useState("");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/products`, { headers: getAuthHeaders() });
      setItems(data || []);
    } catch (e) {
      console.error("GET /products error", e);
      setMsg("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(); 
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((it) => {
      const categoryOk = categoryFilter === "all" || normalizeCategory(it.category) === categoryFilter;
      const departmentOk = departmentFilter === "all" || normalizeDepartment(it.department) === departmentFilter;
      const searchOk = !q || [it.name, it.brand, it.model, it.description, it.color, it.size]
        .some((field) => String(field || "").toLowerCase().includes(q));
      return categoryOk && departmentOk && searchOk;
    });
  }, [items, categoryFilter, departmentFilter, searchQuery]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setMsg("");
    if (name === "barcode") setBarcodeError("");
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setBarcodeError("");
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product.id);
    setForm({
      name: product.name || "",
      category: ensureCategoryValue(product.category),
      department: ensureDepartmentValue(product.department),
      size: product.size || "",
      color: product.color || "",
      model: product.model || "",
      season: product.season || "",
      brand: product.brand || "",
      description: product.description || "",
      cost: product.cost || "",
      price: product.price || "",
      stock: product.stock || "",
      barcode: product.barcode || "",
    });
    setBarcodeError("");
    setModalOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setBarcodeError("");

    // Validar barcode duplicado client-side
    if (form.barcode.trim()) {
      const dup = items.find(
        (p) => p.barcode && p.barcode === form.barcode.trim() && p.id !== editing
      );
      if (dup) {
        setBarcodeError(`Código ya usado en: "${dup.name}"`);
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        name: form.name,
        category: ensureCategoryValue(form.category),
        department: ensureDepartmentValue(form.department),
        size: form.size,
        color: form.color,
        model: form.model,
        season: form.season,
        brand: form.brand,
        description: form.description,
        cost: Number(form.cost) || 0,
        price: Number(form.price),
        stock: Number(form.stock) || 0,
        barcode: form.barcode.trim() || null,
      };

      if (editing) {
        const { data } = await axios.put(`${API_URL}/products/${editing}`, payload, { headers: getAuthHeaders() });
        setItems((prev) => prev.map((p) => (p.id === editing ? data : p)));
        setMsg("Producto actualizado");
      } else {
        const { data } = await axios.post(`${API_URL}/products`, payload, { headers: getAuthHeaders() });
        setItems((prev) => [data, ...prev]);
        setMsg("Producto agregado");
      }

      setModalOpen(false);
      setForm(emptyForm); 
    } catch (e) {
      console.error("POST/PUT /products error", e?.response?.data || e);
      const errMsg = e?.response?.data?.message || "Error al guardar producto";
      if (e?.response?.status === 409) {
        setBarcodeError(errMsg);
      } else {
        setMsg(errMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Eliminar este producto?")) return;
    try {
      await axios.delete(`${API_URL}/products/${id}`, { headers: getAuthHeaders() });
      setItems((prev) => prev.filter((it) => it.id !== id));
      setMsg("Producto eliminado");
    } catch (e) {
      console.error("DELETE /products error", e?.response?.data || e);
      setMsg("No se pudo eliminar");
    }
  };

  const calcMargin = (cost, price) => {
    if (!cost || !price) return 0;
    return (((price - cost) / price) * 100).toFixed(1);
  };

  return (
    <div className="products-page" style={{ display: "grid", gap: 16 }}>
      <div className="pos-right" style={{ order: -1 }}>
        <div className="pos-search">
          <h2 style={{ margin: 0, fontSize: 18 }}>Productos</h2>
          <button onClick={openNew} style={{ padding: "8px 16px" }}>
            + Nuevo producto
          </button>
        </div>

        {/* Buscador */}
        <div style={{ position: "relative", marginTop: 10, maxWidth: 340 }}>
          <span style={{
            position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
            fontSize: 15, color: "var(--text-soft)", pointerEvents: "none"
          }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre, marca, modelo, color..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              borderRadius: 10,
              border: "1px solid var(--border-main)",
              background: "var(--bg-surface)",
              fontSize: 13,
              color: "var(--text-main)",
              fontFamily: "var(--font-main)",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 14, color: "var(--text-soft)", padding: "2px 4px",
              }}
            >✕</button>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {FILTER_CATEGORIES.map((cat) => {
            const active = categoryFilter === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategoryFilter(cat.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: active ? "1px solid #22c55e" : "1px solid var(--border-subtle)",
                  background: active ? "rgba(34, 197, 94, 0.16)" : "transparent",
                  color: active ? "#22c55e" : "var(--text-soft)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
          {FILTER_DEPARTMENTS.map((dep) => {
            const active = departmentFilter === dep.value;
            return (
              <button
                key={dep.value}
                type="button"
                onClick={() => setDepartmentFilter(dep.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: active ? "1px solid #38bdf8" : "1px solid var(--border-subtle)",
                  background: active ? "rgba(56, 189, 248, 0.16)" : "transparent",
                  color: active ? "#38bdf8" : "var(--text-soft)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {dep.label}
              </button>
            );
          })}
        </div>
      </div>

      {msg && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            background: "rgba(59, 130, 246, 0.12)",
            color: "#93c5fd",
            fontSize: 13,
          }}
        >
          {msg}
        </div>
      )}

      <div className="dash-card sales-list">
        <div className="title" style={{ marginBottom: 8 }}>
          Listado de productos
        </div>

        {loading ? (
          <div style={{ padding: 12, color: "var(--text-soft)" }}>Cargando...</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: 12, color: "var(--text-soft)" }}>
            {items.length === 0
              ? 'No hay productos. Crea el primero con "+ Nuevo producto"'
              : "No hay productos con este filtro"}
          </div>
        ) : (
          <>
          {/* ═══ DESKTOP: Tabla completa (oculta en celular) ═══ */}
          <div className="products-table-wrapper desktop-only-table">
            <table className="products-table" style={{
              borderCollapse: "collapse",
              fontSize: 13,
              width: 964,
              minWidth: 964,
              tableLayout: "fixed",
            }}>
              <colgroup>
                <col style={{ width: 52 }} />
                <col style={{ width: 180 }} />
                <col style={{ width: 110 }} />
                <col className="col-tipo" style={{ width: 90 }} />
                <col className="col-attr" style={{ width: 150 }} />
                <col className="col-stock" style={{ width: 72 }} />
                <col style={{ width: 96 }} />
                <col className="col-margen" style={{ width: 84 }} />
                <col className="col-acciones" style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr style={{
                  background: "#ede5da",
                  color: "var(--text-soft)",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "left", position: "sticky", top: 0, background: "#ede5da", zIndex: 1 }}>ID</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "left", position: "sticky", top: 0, background: "#ede5da", zIndex: 1 }}>Nombre</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "left", position: "sticky", top: 0, background: "#ede5da", zIndex: 1 }}>Segmento</th>
                  <th className="col-tipo" style={{ padding: "8px 10px", fontWeight: 600, textAlign: "left", position: "sticky", top: 0, background: "#ede5da", zIndex: 1 }}>Tipo</th>
                  <th className="col-attr" style={{ padding: "8px 10px", fontWeight: 600, textAlign: "left", position: "sticky", top: 0, background: "#ede5da", zIndex: 1 }}>Atributos</th>
                  <th className="col-stock" style={{ padding: "8px 10px", fontWeight: 600, textAlign: "left", position: "sticky", top: 0, background: "#ede5da", zIndex: 1 }}>Stock</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "left", position: "sticky", top: 0, background: "#ede5da", zIndex: 1 }}>Precio</th>
                  <th className="col-margen" style={{ padding: "8px 10px", fontWeight: 600, textAlign: "left", position: "sticky", top: 0, background: "#ede5da", zIndex: 1 }}>Margen</th>
                  <th className="col-acciones" style={{ padding: "8px 10px", fontWeight: 600, textAlign: "left", position: "sticky", top: 0, background: "#ede5da", zIndex: 1 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((it, idx) => (
                  <tr
                    key={it.id}
                    style={{
                      background: idx % 2 === 0 ? "#fafafa" : "#f5f0eb",
                      borderBottom: "1px solid #e8ddd4",
                    }}
                  >
                    <td style={{ padding: "8px 10px" }}>#{it.id}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <strong>{it.name}</strong>
                      {it.description && (
                        <div style={{ fontSize: 11, color: "var(--text-soft)" }}>{it.description}</div>
                      )}
                    </td>
                    <td style={{ padding: "8px 10px", color: "var(--primary)" }}>
                      {getCategoryLabel(it.category)}
                    </td>
                    <td className="col-tipo" style={{ padding: "8px 10px" }}>
                      {getDepartmentLabel(it.department)}
                    </td>
                    <td className="col-attr" style={{ padding: "8px 10px", fontSize: 11, color: "var(--text-soft)" }}>
                      {(it.brand || "-") + " / " + (it.model || "-")}
                      <br />
                      {(it.size || "-") + " / " + (it.color || "-") + " / " + (it.season || "-")}
                    </td>
                    <td className="col-stock" style={{ padding: "8px 10px" }}>{it.stock}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700 }}>
                      ${Number(it.price).toLocaleString()}
                    </td>
                    <td className="col-margen" style={{ padding: "8px 10px", color: "#16a34a", fontWeight: 600 }}>
                      {calcMargin(it.cost, it.price)}%
                    </td>
                    <td className="col-acciones" style={{ padding: "8px 10px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => openEdit(it)}
                          style={{ padding: "5px 10px", fontSize: 12, borderRadius: 8, border: "1px solid rgba(59,130,246,0.35)", background: "rgba(59,130,246,0.08)", color: "#3b82f6", cursor: "pointer" }}
                          type="button"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onDelete(it.id)}
                          style={{ padding: "5px 10px", fontSize: 12, borderRadius: 8, border: "1px solid rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.07)", color: "var(--danger)", cursor: "pointer" }}
                          type="button"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ═══ MOBILE: Tarjetas de producto (oculto en desktop) ═══ */}
          <div className="mobile-only-cards">
            {filteredItems.map((it) => (
              <div className="product-card-mobile" key={it.id}>
                <div className="pcm-header">
                  <div className="pcm-name">{it.name} <span className="pcm-id">#{it.id}</span></div>
                  <div className="pcm-price">${Number(it.price).toLocaleString()}</div>
                </div>
                <div className="pcm-details">
                  <div className="pcm-row">
                    <span>Segmento: <strong className="pcm-seg">{getCategoryLabel(it.category)}</strong></span>
                    <span>Tipo: <strong>{getDepartmentLabel(it.department)}</strong></span>
                  </div>
                  <div className="pcm-row">
                    <span>Talla: {it.size || "-"} / {it.color || "-"} / {it.season || "-"}</span>
                    <span>Stock: <strong>{it.stock}</strong></span>
                  </div>
                  {it.brand && <div className="pcm-row"><span>Marca: {it.brand}</span></div>}
                </div>
                <div className="pcm-footer">
                  <span className="pcm-margin">{calcMargin(it.cost, it.price)}%</span>
                  <div className="pcm-actions">
                    <button className="pcm-btn-edit" onClick={() => openEdit(it)} type="button">✏ Editar</button>
                    <button className="pcm-btn-delete" onClick={() => onDelete(it.id)} type="button">🗑 Eliminar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {modalOpen && ( 
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 760 }}>
            <h3>{editing ? "Editar producto" : "Nuevo producto"}</h3>

            <form className="modal-form" onSubmit={onSubmit}>
              <Field label="Nombre *" name="name" value={form.name} onChange={onChange} required />

              <div>
                <Field label="Código de barras (opcional)" name="barcode" value={form.barcode} onChange={onChange} />
                {barcodeError && (
                  <p style={{ color: "var(--danger)", fontSize: 12, margin: "4px 0 0", padding: "4px 8px", background: "#fef2f2", borderRadius: 6 }}>
                    ⚠ {barcodeError}
                  </p>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field
                  label="Segmento *"
                  name="category"
                  value={form.category}
                  onChange={onChange}
                  type="select"
                  options={PRODUCT_CATEGORIES}
                  required
                />
                <Field
                  label="Tipo *"
                  name="department"
                  value={form.department}
                  onChange={onChange}
                  type="select"
                  options={PRODUCT_DEPARTMENTS}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Talle" name="size" value={form.size} onChange={onChange} />
                <Field label="Color" name="color" value={form.color} onChange={onChange} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Modelo" name="model" value={form.model} onChange={onChange} />
                <Field label="Temporada" name="season" value={form.season} onChange={onChange} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Marca" name="brand" value={form.brand} onChange={onChange} />
                <Field label="Stock" name="stock" type="number" value={form.stock} onChange={onChange} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field
                  label="Precio compra"
                  name="cost"
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={onChange}
                />
                <Field
                  label="Precio venta *"
                  name="price"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={onChange}
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "var(--text-soft)",
                    marginBottom: 4,
                  }}
                >
                  Descripcion (opcional)
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #d6cfc7",
                    background: "#f5f0eb",
                    color: "#1e1b4b",
                    fontSize: 13,
                    resize: "vertical",
                  }}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: 16 }}>
                <button type="submit" className="save" disabled={saving}>
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Agregar"}
                </button>
                <button type="button" className="cancel" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const fieldStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #d6cfc7",
  background: "#f5f0eb",
  color: "#1e1b4b",
  fontSize: 13,
};

const Field = ({ label, name, value, onChange, type = "text", step, required, options = [] }) => (
  <div>
    <label
      style={{
        display: "block",
        fontSize: 12,
        color: "var(--text-soft)",
        marginBottom: 4,
      }}
    >
      {label}
    </label>

    {type === "select" ? (
      <select name={name} value={value} onChange={onChange} required={required} style={fieldStyle}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ) : (
      <input
        name={name}
        type={type}
        step={step}
        value={value}
        onChange={onChange}
        required={required}
        style={fieldStyle}
      />
    )}
  </div>
);

export default ProductsPage;
