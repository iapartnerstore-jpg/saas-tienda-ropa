import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ClientsPage.css";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    document: "",
    phone: ""
  });
  const [error, setError] = useState("");
  
  // Modal de cuenta corriente
  const [accountModal, setAccountModal] = useState(null);
  const [debtAmount, setDebtAmount] = useState("");
  const [payAmount, setPayAmount] = useState("");

  const token = localStorage.getItem("token");
  const tenant = localStorage.getItem("tenant") || "modashop";

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "X-Tenant": tenant
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/customers", { headers: authHeaders });
      setClients(data || []);
      setFiltered(data || []);
    } catch (err) {
      console.error("Error cargando clientes", err);
      setError("No se pudieron cargar los clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: "",
      document: "",
      phone: ""
    });
    setModalOpen(true);
  };

  const openEdit = (client) => {
    setEditing(client.id);
    setForm({
      name: client.name || "",
      document: client.document || "",
      phone: client.phone || ""
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Seguro que querés eliminar este cliente?")) return;
    try {
      await api.delete(`/customers/${id}`, { headers: authHeaders });
      setClients((prev) => prev.filter((c) => c.id !== id));
      setFiltered((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Error eliminando cliente", err);
      alert("No se pudo eliminar el cliente.");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      document: form.document.trim() || "",
      phone: form.phone.trim() || ""
    };

    try {
      if (editing) {
        const { data } = await api.put(
          `/customers/${editing}`,
          payload,
          { headers: authHeaders }
        );
        setClients((prev) =>
          prev.map((c) => (c.id === editing ? data : c))
        );
        setFiltered((prev) =>
          prev.map((c) => (c.id === editing ? data : c))
        );
      } else {
        const { data } = await api.post("/customers", payload, {
          headers: authHeaders
        });
        setClients((prev) => [data, ...prev]);
        setFiltered((prev) => [data, ...prev]);
      }

      setModalOpen(false);

    } catch (err) {
      console.error("Error guardando cliente", err);
      setError("No se pudo guardar el cliente.");
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
    const term = value.toLowerCase();
    if (!term) {
      setFiltered(clients);
      return;
    }
    setFiltered(
      clients.filter((c) => {
        return (
          (c.name && c.name.toLowerCase().includes(term)) ||
          (c.document && c.document.toLowerCase().includes(term)) ||
          (c.phone && c.phone.toLowerCase().includes(term))
        );
      })
    );
  };

  const openAccountModal = (client) => {
    setAccountModal(client);
    setDebtAmount("");
    setPayAmount("");
  };

  const handleAddDebt = async () => {
    if (!debtAmount || Number(debtAmount) <= 0) {
      alert("Ingresá un monto válido");
      return;
    }

    try {
      const { data } = await api.post(
        `/customers/${accountModal.id}/debt`,
        { amount: Number(debtAmount) },
        { headers: authHeaders }
      );

      // Actualizar balance en la lista
      setClients((prev) =>
        prev.map((c) =>
          c.id === accountModal.id ? { ...c, balance: data.balance } : c
        )
      );
      setFiltered((prev) =>
        prev.map((c) =>
          c.id === accountModal.id ? { ...c, balance: data.balance } : c
        )
      );
      setAccountModal({ ...accountModal, balance: data.balance });
      setDebtAmount("");
    } catch (err) {
      console.error("Error agregando deuda", err);
      alert("No se pudo agregar la deuda.");
    }
  };

  const handleRegisterPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) {
      alert("Ingresá un monto válido");
      return;
    }

    try {
      const { data } = await api.post(
        `/customers/${accountModal.id}/pay`,
        { amount: Number(payAmount) },
        { headers: authHeaders }
      );

      // Actualizar balance en la lista
      setClients((prev) =>
        prev.map((c) =>
          c.id === accountModal.id ? { ...c, balance: data.balance } : c
        )
      );
      setFiltered((prev) =>
        prev.map((c) =>
          c.id === accountModal.id ? { ...c, balance: data.balance } : c
        )
      );
      setAccountModal({ ...accountModal, balance: data.balance });
      setPayAmount("");
    } catch (err) {
      console.error("Error registrando pago", err);
      alert("No se pudo registrar el pago.");
    }
  };
  

  return (
    <div className="clients-page">
      <div className="clients-header">
        <h2>Clientes</h2>
        <div className="clients-actions">
          <input
            className="clients-search"
            placeholder="Buscar por nombre, documento o teléfono..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <button onClick={openNew}>+ Nuevo cliente</button>

        </div>


      </div>


      {error && (
        <div style={{ color: "#f97316", fontSize: 13, marginTop: 4 }}>
          {error}
        </div>
      )}

      <div className="clients-table-wrapper">
        {loading ? (
          <div className="clients-empty">Cargando clientes...</div>
        ) : filtered.length === 0 ? (
          <div className="clients-empty">
            No hay clientes cargados. Crea el primero con
            <strong> "+ Nuevo cliente"</strong>.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Documento</th>
                <th>Teléfono</th>
                <th>Saldo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.document}</td>
                  <td>{c.phone}</td>
                  <td style={{ 
                    fontWeight: "bold",
                    color: (c.balance || 0) > 0 ? "#f93816" : "#10b981"
                  }}>
                    ${Number(c.balance || 0).toFixed(2)}
                  </td>
                  <td>
                    <button 
                      className="edit" 
                      onClick={() => openEdit(c)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="edit"
                      onClick={() => openAccountModal(c)}
                      title="Cuenta corriente"
                    >
                      💰
                    </button>
                    <button
                      className="delete"
                      onClick={() => handleDelete(c.id)}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de crear/editar cliente */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>{editing ? "Editar cliente" : "Nuevo cliente"}</h3>

            <form className="modal-form" onSubmit={handleSubmit}>
              <input
                name="name"
                placeholder="Nombre completo *"
                value={form.name}
                onChange={handleChange}
                required
              />
              <input
                name="document"
                placeholder="Documento / CUIT / DNI"
                value={form.document}
                onChange={handleChange}
              />
              <input
                name="phone"
                placeholder="Teléfono"
                value={form.phone}
                onChange={handleChange}
              />

              {error && (
                <div
                  style={{
                    color: "#f97316",
                    fontSize: 12,
                    marginTop: -2
                  }}
                >
                  {error}
                </div>
              )}

              <div className="modal-actions">
                <button type="submit" className="save">
                  {editing ? "Guardar cambios" : "Agregar"}
                </button>
                <button
                  type="button"
                  className="cancel"
                  onClick={() => setModalOpen(false)}

                >

                  Cancelar
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de cuenta corriente */}
      {accountModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Cuenta Corriente: {accountModal.name}</h3>
            
            <div style={{ 
              fontSize: 24, 
              fontWeight: "bold", 
              textAlign: "center",
              margin: "20px 0",
              color: (accountModal.balance || 0) > 0 ? "#f97316" : "#10b981"
            }}>
              Saldo actual: ${Number(accountModal.balance || 0).toFixed(2)}
            </div>

            <div className="modal-form">
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: "500" }}>
                  Agregar deuda
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Monto"
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    className="save"
                    onClick={handleAddDebt}
                  >
                    + Deuda
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: "500" }}>
                  Registrar pago
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Monto"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    className="save"
                    onClick={handleRegisterPayment}
                  >
                    💵 Pagar
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel"
                  onClick={() => setAccountModal(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}