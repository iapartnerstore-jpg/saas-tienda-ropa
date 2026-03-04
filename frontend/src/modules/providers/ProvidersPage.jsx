import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const PROVIDERS_BASES = ["/providers", "/store/providers", "/api/providers", "/api/store/providers"];

// ─── helpers ────────────────────────────────────────────────────────────────

const emptyProviderForm = {
  name: "",
  contact_name: "",
  phone: "",
  email: "",
  notes: "",
};

const emptyTripForm = {
  provider_id: "",
  destination: "",
  trip_date: "",
  return_date: "",
  total_spent: "",
  notes: "",
};

const normalizeProvider = (item, index = 0) => ({
  id: Number(item?.id) || index + 1,
  name: String(item?.name || ""),
  contact_name: String(item?.contact_name || ""),
  phone: String(item?.phone || ""),
  email: String(item?.email || ""),
  notes: String(item?.notes || ""),
});

const normalizeTrip = (item, index = 0) => ({
  id: Number(item?.id) || index + 1,
  provider_id: item?.provider_id ? Number(item.provider_id) : null,
  provider_name: String(item?.provider_name || ""),
  destination: String(item?.destination || ""),
  trip_date: String(item?.trip_date || "").slice(0, 10),
  return_date: item?.return_date ? String(item.return_date).slice(0, 10) : "",
  total_spent: Number(item?.total_spent || 0),
  notes: String(item?.notes || ""),
});

const ensureProviderArray = (value) => {
  if (Array.isArray(value)) return value.map((item, i) => normalizeProvider(item, i));
  if (Array.isArray(value?.items)) return value.items.map((item, i) => normalizeProvider(item, i));
  return [];
};

const ensureTripArray = (value) => {
  if (Array.isArray(value)) return value.map((item, i) => normalizeTrip(item, i));
  return [];
};

const fmtDate = (str) => {
  if (!str) return "-";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const fmtMoney = (n) =>
  Number(n).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ─── componente ─────────────────────────────────────────────────────────────

export default function ProvidersPage() {
  // providers
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyProviderForm);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [localMode, setLocalMode] = useState(false);

  // trips
  const [trips, setTrips] = useState([]);
  const [tripForm, setTripForm] = useState(emptyTripForm);
  const [editingTrip, setEditingTrip] = useState(null);
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [savingTrip, setSavingTrip] = useState(false);

  // tabs
  const [tab, setTab] = useState("providers"); // "providers" | "trips"

  // ── auth headers ──────────────────────────────────────────────────────────
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    const tenant = localStorage.getItem("tenant") || "modashop";
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Tenant": tenant,
    };
  };

  // ── providers requests ────────────────────────────────────────────────────
  const getLocalKey = () => `providers_local_${localStorage.getItem("tenant") || "default"}`;
  const readLocalProviders = () => {
    try { return ensureProviderArray(JSON.parse(localStorage.getItem(getLocalKey()) || "[]")); }
    catch { return []; }
  };
  const writeLocalProviders = (next) =>
    localStorage.setItem(getLocalKey(), JSON.stringify(ensureProviderArray(next)));

  const requestProviders = async (method, suffix = "", payload) => {
    const headers = getAuthHeaders();
    let lastError = null;
    for (const base of PROVIDERS_BASES) {
      try {
        const url = `${API_URL}${base}${suffix}`;
        if (method === "get")    return await axios.get(url, { headers });
        if (method === "post")   return await axios.post(url, payload, { headers });
        if (method === "put")    return await axios.put(url, payload, { headers });
        if (method === "delete") return await axios.delete(url, { headers });
      } catch (err) {
        lastError = err;
        if (err?.response?.status !== 404) break;
      }
    }
    throw lastError;
  };

  const loadProviders = async () => {
    try {
      setLoading(true);
      const { data } = await requestProviders("get");
      setItems(ensureProviderArray(data));
      setLocalMode(false);
    } catch (err) {
      console.error("GET /providers", err);
      if (err?.response?.status === 404) {
        setItems(readLocalProviders());
        setLocalMode(true);
        setMsg("Proveedores en modo local");
      } else {
        setMsg("Error al cargar proveedores");
      }
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => { setEditing(null); setForm(emptyProviderForm); setModalOpen(true); };
  const openEdit = (p) => {
    setEditing(p.id);
    setForm({ name: p.name, contact_name: p.contact_name, phone: p.phone, email: p.email, notes: p.notes });
    setModalOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      if (localMode) {
        if (editing) {
          const updated = ensureProviderArray(items).map((i) => i.id === editing ? { ...i, ...form } : i);
          setItems(updated); writeLocalProviders(updated);
          setMsg("Proveedor actualizado (modo local)");
        } else {
          const cur = ensureProviderArray(items);
          const nextId = cur.length ? Math.max(...cur.map((i) => Number(i.id) || 0)) + 1 : 1;
          const updated = [{ id: nextId, ...form }, ...cur];
          setItems(updated); writeLocalProviders(updated);
          setMsg("Proveedor agregado (modo local)");
        }
        setModalOpen(false); setForm(emptyProviderForm); return;
      }
      if (editing) {
        const { data } = await requestProviders("put", `/${editing}`, form);
        setItems((prev) => ensureProviderArray(prev).map((i) => i.id === editing ? normalizeProvider(data) : i));
        setMsg("Proveedor actualizado");
      } else {
        const { data } = await requestProviders("post", "", form);
        setItems((prev) => [normalizeProvider(data), ...ensureProviderArray(prev)]);
        setMsg("Proveedor agregado");
      }
      setModalOpen(false); setForm(emptyProviderForm);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Error al guardar proveedor");
    } finally { setSaving(false); }
  };

  const removeProvider = async (id) => {
    if (!confirm("¿Eliminar proveedor?")) return;
    try {
      if (localMode) {
        const updated = ensureProviderArray(items).filter((i) => i.id !== id);
        setItems(updated); writeLocalProviders(updated);
        setMsg("Proveedor eliminado (modo local)"); return;
      }
      await requestProviders("delete", `/${id}`);
      setItems((prev) => ensureProviderArray(prev).filter((i) => i.id !== id));
      setMsg("Proveedor eliminado");
    } catch { setMsg("No se pudo eliminar"); }
  };

  // ── trips requests ────────────────────────────────────────────────────────
  const loadTrips = async () => {
    try {
      setTripsLoading(true);
      const { data } = await axios.get(`${API_URL}/providers/trips`, { headers: getAuthHeaders() });
      setTrips(ensureTripArray(data));
    } catch (err) {
      console.error("GET /providers/trips", err);
    } finally { setTripsLoading(false); }
  };

  const openNewTrip = () => { setEditingTrip(null); setTripForm(emptyTripForm); setTripModalOpen(true); };
  const openEditTrip = (t) => {
    setEditingTrip(t.id);
    setTripForm({
      provider_id: t.provider_id ? String(t.provider_id) : "",
      destination: t.destination,
      trip_date: t.trip_date,
      return_date: t.return_date || "",
      total_spent: t.total_spent ? String(t.total_spent) : "",
      notes: t.notes,
    });
    setTripModalOpen(true);
  };

  const onTripSubmit = async (e) => {
    e.preventDefault();
    setSavingTrip(true); setMsg("");
    try {
      const payload = {
        provider_id: tripForm.provider_id ? Number(tripForm.provider_id) : null,
        destination: tripForm.destination,
        trip_date: tripForm.trip_date,
        return_date: tripForm.return_date || null,
        total_spent: tripForm.total_spent ? Number(tripForm.total_spent) : 0,
        notes: tripForm.notes,
      };
      if (editingTrip) {
        const { data } = await axios.put(`${API_URL}/providers/trips/${editingTrip}`, payload, { headers: getAuthHeaders() });
        setTrips((prev) => prev.map((t) => t.id === editingTrip ? normalizeTrip(data) : t));
        setMsg("Viaje actualizado");
      } else {
        const { data } = await axios.post(`${API_URL}/providers/trips`, payload, { headers: getAuthHeaders() });
        setTrips((prev) => [normalizeTrip(data), ...prev]);
        setMsg("Viaje registrado");
      }
      setTripModalOpen(false); setTripForm(emptyTripForm);
    } catch (err) {
      setMsg(err?.response?.data?.message || "Error al guardar viaje");
    } finally { setSavingTrip(false); }
  };

  const removeTrip = async (id) => {
    if (!confirm("¿Eliminar este viaje?")) return;
    try {
      await axios.delete(`${API_URL}/providers/trips/${id}`, { headers: getAuthHeaders() });
      setTrips((prev) => prev.filter((t) => t.id !== id));
      setMsg("Viaje eliminado");
    } catch { setMsg("No se pudo eliminar el viaje"); }
  };

  // totales de viajes
  const totalTripsCost = trips.reduce((acc, t) => acc + Number(t.total_spent || 0), 0);

  useEffect(() => { loadProviders(); loadTrips(); }, []);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "grid", gap: 16 }}>

      {/* header con tabs */}
      <div className="pos-search" style={{ alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Proveedores</h2>
          <div className="trips-tabs">
            <button
              className={`trips-tab${tab === "providers" ? " active" : ""}`}
              onClick={() => setTab("providers")}
            >
              Proveedores
            </button>
            <button
              className={`trips-tab${tab === "trips" ? " active" : ""}`}
              onClick={() => setTab("trips")}
            >
              Viajes
            </button>
          </div>
        </div>
        {tab === "providers" ? (
          <button className="primary" onClick={openNew}>+ Nuevo proveedor</button>
        ) : (
          <button className="primary" onClick={openNewTrip}>+ Registrar viaje</button>
        )}
      </div>

      {msg && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(59,130,246,0.12)", color: "#93c5fd", fontSize: 13 }}>
          {msg}
        </div>
      )}

      {/* ── TAB: PROVEEDORES ── */}
      {tab === "providers" && (
        <div className="dash-card sales-list" style={{ maxWidth: 1200 }}>
          <div className="title">Listado de proveedores</div>
          {loading ? (
            <div style={{ padding: 12, color: "var(--text-soft)" }}>Cargando...</div>
          ) : ensureProviderArray(items).length === 0 ? (
            <div style={{ padding: 12, color: "var(--text-soft)" }}>No hay proveedores cargados.</div>
          ) : (
            <div className="table">
              <div className="thead" style={{ gridTemplateColumns: "0.5fr 1.6fr 1fr 1fr 1.2fr 1fr" }}>
                <div>ID</div><div>Proveedor</div><div>Contacto</div>
                <div>Teléfono</div><div>Email</div><div>Acciones</div>
              </div>
              <div className="tbody" style={{ maxHeight: 430, overflowY: "auto" }}>
                {ensureProviderArray(items).map((item) => (
                  <div key={item.id} className="row" style={{ gridTemplateColumns: "0.5fr 1.6fr 1fr 1fr 1.2fr 1fr" }}>
                    <div>#{item.id}</div>
                    <div>
                      <strong>{item.name}</strong>
                      {item.notes && <div style={{ fontSize: 11, color: "var(--text-soft)" }}>{item.notes}</div>}
                    </div>
                    <div>{item.contact_name || "-"}</div>
                    <div>{item.phone || "-"}</div>
                    <div>{item.email || "-"}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" onClick={() => openEdit(item)}>Editar</button>
                      <button type="button" className="danger" onClick={() => removeProvider(item.id)}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: VIAJES ── */}
      {tab === "trips" && (
        <>
          {/* resumen de viajes */}
          <div className="trips-summary-row">
            <div className="trips-stat-card">
              <span className="trips-stat-label">Total viajes</span>
              <span className="trips-stat-value">{trips.length}</span>
            </div>
            <div className="trips-stat-card accent">
              <span className="trips-stat-label">Gasto total en viajes</span>
              <span className="trips-stat-value">${fmtMoney(totalTripsCost)}</span>
            </div>
          </div>

          <div className="dash-card sales-list" style={{ maxWidth: 1200 }}>
            <div className="title">Registro de viajes a proveedores</div>
            {tripsLoading ? (
              <div style={{ padding: 12, color: "var(--text-soft)" }}>Cargando...</div>
            ) : trips.length === 0 ? (
              <div style={{ padding: 12, color: "var(--text-soft)" }}>No hay viajes registrados.</div>
            ) : (
              <div className="table">
                <div className="thead" style={{ gridTemplateColumns: "0.5fr 1.4fr 1.2fr 1fr 1fr 1fr 1fr" }}>
                  <div>ID</div>
                  <div>Destino</div>
                  <div>Proveedor</div>
                  <div>Fecha ida</div>
                  <div>Fecha vuelta</div>
                  <div>Gasto</div>
                  <div>Acciones</div>
                </div>
                <div className="tbody" style={{ maxHeight: 430, overflowY: "auto" }}>
                  {trips.map((trip) => (
                    <div key={trip.id} className="row" style={{ gridTemplateColumns: "0.5fr 1.4fr 1.2fr 1fr 1fr 1fr 1fr" }}>
                      <div>#{trip.id}</div>
                      <div>
                        <strong>{trip.destination}</strong>
                        {trip.notes && <div style={{ fontSize: 11, color: "var(--text-soft)" }}>{trip.notes}</div>}
                      </div>
                      <div>{trip.provider_name || <span style={{ color: "var(--text-soft)" }}>Sin proveedor</span>}</div>
                      <div>{fmtDate(trip.trip_date)}</div>
                      <div>{trip.return_date ? fmtDate(trip.return_date) : <span style={{ color: "var(--text-soft)" }}>-</span>}</div>
                      <div style={{ fontWeight: 600, color: "var(--accent)" }}>${fmtMoney(trip.total_spent)}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" onClick={() => openEditTrip(trip)}>Editar</button>
                        <button type="button" className="danger" onClick={() => removeTrip(trip.id)}>Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MODAL PROVEEDOR ── */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 600 }}>
            <h3>{editing ? "Editar proveedor" : "Nuevo proveedor"}</h3>
            <form className="modal-form" onSubmit={onSubmit}>
              <Input label="Nombre *" name="name" value={form.name} onChange={setForm} required />
              <Input label="Persona de contacto" name="contact_name" value={form.contact_name} onChange={setForm} />
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                <Input label="Teléfono" name="phone" value={form.phone} onChange={setForm} />
                <Input label="Email" name="email" type="email" value={form.email} onChange={setForm} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, color: "var(--text-soft)", fontSize: 12 }}>Notas</label>
                <textarea
                  name="notes" rows={3} value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  style={fieldStyle}
                />
              </div>
              <div className="modal-actions" style={{ marginTop: 12 }}>
                <button type="submit" className="save" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
                <button type="button" className="cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL VIAJE ── */}
      {tripModalOpen && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 620 }}>
            <h3>{editingTrip ? "Editar viaje" : "Registrar viaje a proveedor"}</h3>
            <form className="modal-form" onSubmit={onTripSubmit}>
              <div>
                <label style={{ display: "block", marginBottom: 4, color: "var(--text-soft)", fontSize: 12 }}>Proveedor</label>
                <select
                  value={tripForm.provider_id}
                  onChange={(e) => setTripForm((prev) => ({ ...prev, provider_id: e.target.value }))}
                  style={fieldStyle}
                >
                  <option value="">-- Sin proveedor específico --</option>
                  {ensureProviderArray(items).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <Input label="Destino / Ciudad *" name="destination" value={tripForm.destination} onChange={setTripForm} required />

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <label style={{ display: "block", marginBottom: 4, color: "var(--text-soft)", fontSize: 12 }}>Fecha de ida *</label>
                  <input
                    type="date" required value={tripForm.trip_date}
                    onChange={(e) => setTripForm((prev) => ({ ...prev, trip_date: e.target.value }))}
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 4, color: "var(--text-soft)", fontSize: 12 }}>Fecha de vuelta</label>
                  <input
                    type="date" value={tripForm.return_date}
                    onChange={(e) => setTripForm((prev) => ({ ...prev, return_date: e.target.value }))}
                    style={fieldStyle}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 4, color: "var(--text-soft)", fontSize: 12 }}>Gasto total del viaje ($)</label>
                <input
                  type="number" min="0" step="0.01" placeholder="0"
                  value={tripForm.total_spent}
                  onChange={(e) => setTripForm((prev) => ({ ...prev, total_spent: e.target.value }))}
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 4, color: "var(--text-soft)", fontSize: 12 }}>Notas del viaje</label>
                <textarea
                  rows={3} value={tripForm.notes}
                  onChange={(e) => setTripForm((prev) => ({ ...prev, notes: e.target.value }))}
                  style={fieldStyle}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: 12 }}>
                <button type="submit" className="save" disabled={savingTrip}>{savingTrip ? "Guardando..." : "Guardar"}</button>
                <button type="button" className="cancel" onClick={() => setTripModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── estilos inline compartidos ─────────────────────────────────────────────
const fieldStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #d6cfc7",
  background: "#f5f0eb",
  color: "#1e1b4b",
  fontSize: 13,
};

// ─── componente Input reutilizable ───────────────────────────────────────────
const Input = ({ label, name, value, onChange, type = "text", required = false }) => (
  <div>
    <label style={{ display: "block", marginBottom: 4, color: "var(--text-soft)", fontSize: 12 }}>{label}</label>
    <input
      type={type} name={name} required={required} value={value}
      onChange={(e) => onChange((prev) => ({ ...prev, [name]: e.target.value }))}
      style={fieldStyle}
    />
  </div>
);
