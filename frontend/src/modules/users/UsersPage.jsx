import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getAuthUser } from "../../utils/auth.js";
import "./UsersPage.css";

const API_URL = import.meta.env.VITE_API_URL;

const MODULES = [
  { key: "pos",         label: "Punto de venta" },
  { key: "productos",   label: "Productos" },
  { key: "clientes",    label: "Clientes" },
  { key: "proveedores", label: "Proveedores" },
  { key: "promociones", label: "Promociones" },
  { key: "reportes",    label: "Reportes" },
  { key: "arqueo",      label: "Arqueo" },
];

const EMPTY_NEW = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  active: true,
  permissions: {},
};

export default function UsersPage() {
  const me = getAuthUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_NEW);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pageError, setPageError] = useState("");

  const getHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "X-Tenant": localStorage.getItem("tenant") || "modashop",
  }), []);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/users`, { headers: getHeaders() });
      setUsers(data);
    } catch {
      setPageError("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Contar permisos activos ──
  const countPermissions = (u) => {
    if (!u.permissions) return 0;
    return MODULES.filter((m) => u.permissions[m.key]).length;
  };

  // ── Abrir edición ──
  const openEdit = (u) => {
    setExpandedId(u.id);
    setEditForm({
      name: u.name || "",
      email: u.email || "",
      password: "",
      role: u.role || "employee",
      active: u.active !== 0,
      permissions: u.permissions ? { ...u.permissions } : {},
    });
  };

  // ── Cerrar edición ──
  const closeEdit = () => {
    setExpandedId(null);
    setEditForm({});
  };

  // ── Toggle permiso en formulario de edición ──
  const togglePerm = (key) => {
    setEditForm((f) => ({
      ...f,
      permissions: { ...f.permissions, [key]: !f.permissions[key] },
    }));
  };

  // ── Todo / Nada en edición ──
  const setAllPerms = (val) => {
    const all = {};
    MODULES.forEach((m) => { all[m.key] = val; });
    setEditForm((f) => ({ ...f, permissions: all }));
  };

  // ── Guardar edición ──
  const handleSave = async () => {
    setSaving(true);
    setPageError("");
    try {
      const payload = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        active: editForm.active ? 1 : 0,
        permissions: editForm.role === "admin" ? null : editForm.permissions,
      };
      if (editForm.password) payload.password = editForm.password;

      const { data } = await axios.put(
        `${API_URL}/users/${expandedId}`,
        payload,
        { headers: getHeaders() }
      );
      setUsers((prev) => prev.map((u) => (u.id === expandedId ? data : u)));
      closeEdit();
    } catch (err) {
      setPageError(err.response?.data?.error || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle permiso en formulario nuevo ──
  const toggleNewPerm = (key) => {
    setNewForm((f) => ({
      ...f,
      permissions: { ...f.permissions, [key]: !f.permissions[key] },
    }));
  };

  // ── Todo / Nada en nuevo ──
  const setAllNewPerms = (val) => {
    const all = {};
    MODULES.forEach((m) => { all[m.key] = val; });
    setNewForm((f) => ({ ...f, permissions: all }));
  };

  // ── Crear usuario ──
  const handleCreate = async () => {
    if (!newForm.email || !newForm.password) {
      setPageError("Email y contraseña son requeridos");
      return;
    }
    setSaving(true);
    setPageError("");
    try {
      const payload = {
        name: newForm.name,
        email: newForm.email,
        password: newForm.password,
        role: newForm.role,
        active: 1,
        permissions: newForm.role === "admin" ? null : newForm.permissions,
      };
      const { data } = await axios.post(`${API_URL}/users`, payload, {
        headers: getHeaders(),
      });
      setUsers((prev) => [...prev, data]);
      setShowNew(false);
      setNewForm(EMPTY_NEW);
    } catch (err) {
      setPageError(err.response?.data?.error || "Error al crear usuario");
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar ──
  const handleDelete = async (id) => {
    setSaving(true);
    setPageError("");
    try {
      await axios.delete(`${API_URL}/users/${id}`, { headers: getHeaders() });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      setPageError(err.response?.data?.error || "Error al eliminar");
    } finally {
      setSaving(false);
    }
  };

  // ── Formulario compartido (edición o nuevo) ──
  const renderPermissionToggles = (form, toggleFn, setAllFn) => (
    <div className="perm-section">
      <div className="perm-section-header">
        <span className="perm-title">Permisos de acceso</span>
        <div className="perm-quick-btns">
          <button type="button" className="perm-btn-todo" onClick={() => setAllFn(true)}>Todo</button>
          <button type="button" className="perm-btn-nada" onClick={() => setAllFn(false)}>Nada</button>
        </div>
      </div>
      <div className="perm-grid">
        {MODULES.map((m) => (
          <label key={m.key} className="toggle-switch">
            <input
              type="checkbox"
              checked={Boolean(form.permissions?.[m.key])}
              onChange={() => toggleFn(m.key)}
            />
            <span className="toggle-track">
              <span className="toggle-thumb" />
            </span>
            <span className="toggle-label">{m.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="users-page">
      <div className="users-page-header">
        <div>
          <h1 className="users-page-title">Usuarios</h1>
          <p className="users-page-subtitle">Gestion de Usuarios</p>
        </div>
        {!showNew && (
          <button className="primary" onClick={() => { setShowNew(true); setExpandedId(null); }}>
            + Nuevo Usuario
          </button>
        )}
      </div>

      {pageError && <p className="form-error" style={{ marginBottom: 12 }}>{pageError}</p>}

      {/* ── Formulario nuevo usuario ── */}
      {showNew && (
        <div className="user-new-card">
          <div className="user-form-grid">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input
                className="form-input"
                value={newForm.name}
                onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre completo"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email / Usuario</label>
              <input
                className="form-input"
                value={newForm.email}
                onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email o usuario"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input
                className="form-input"
                type="password"
                value={newForm.password}
                onChange={(e) => setNewForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Contraseña"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rol</label>
              <select
                className="form-select"
                value={newForm.role}
                onChange={(e) => setNewForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="employee">Empleado</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>

          {newForm.role !== "admin" && renderPermissionToggles(newForm, toggleNewPerm, setAllNewPerms)}

          <div className="user-form-actions">
            <button className="cancel" onClick={() => { setShowNew(false); setNewForm(EMPTY_NEW); setPageError(""); }}>
              Cancelar
            </button>
            <button className="save" onClick={handleCreate} disabled={saving}>
              {saving ? "Guardando..." : "Crear Usuario"}
            </button>
          </div>
        </div>
      )}

      {/* ── Tabla ── */}
      {loading ? (
        <p style={{ color: "var(--text-soft)" }}>Cargando usuarios...</p>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Permisos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <React.Fragment key={u.id}>
                  <tr className={expandedId === u.id ? "user-row user-row--expanded" : "user-row"}>
                    <td>
                      <span className="user-name">
                        {u.name || u.email}
                        {u.id === me?.id && <span className="badge-you">Tú</span>}
                      </span>
                    </td>
                    <td className="user-email">{u.email}</td>
                    <td>
                      <span className={`role-badge role-badge--${u.role === "admin" ? "admin" : "employee"}`}>
                        {u.role === "admin" ? "Admin" : "Usuario"}
                      </span>
                    </td>
                    <td>
                      <span className={`status-dot ${u.active ? "active" : "inactive"}`} />
                      {u.active ? "Activo" : "Inactivo"}
                    </td>
                    <td>
                      {u.role === "admin" ? (
                        <span className="perms-total">Acceso total</span>
                      ) : (
                        <span className="perms-count">{countPermissions(u)}/{MODULES.length} módulos</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        {expandedId === u.id ? (
                          <button className="cancel" onClick={closeEdit}>Cerrar</button>
                        ) : (
                          <button onClick={() => openEdit(u)}>Editar</button>
                        )}
                        {u.id !== me?.id && (
                          confirmDelete === u.id ? (
                            <button className="danger" onClick={() => handleDelete(u.id)} disabled={saving}>
                              Confirmar
                            </button>
                          ) : (
                            <button className="danger" onClick={() => setConfirmDelete(u.id)}>
                              Eliminar
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* ── Fila expandida de edición ── */}
                  {expandedId === u.id && (
                    <tr className="user-expanded-row">
                      <td colSpan={6}>
                        <div className="user-edit-card">
                          <div className="user-form-grid">
                            <div className="form-group">
                              <label className="form-label">Nombre</label>
                              <input
                                className="form-input"
                                value={editForm.name}
                                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Nombre"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Email / Usuario</label>
                              <input
                                className="form-input"
                                value={editForm.email}
                                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                                placeholder="email o usuario"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Nueva contraseña (dejar vacío para no cambiar)</label>
                              <input
                                className="form-input"
                                type="password"
                                value={editForm.password}
                                onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                                placeholder="Nueva contraseña"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Rol</label>
                              <select
                                className="form-select"
                                value={editForm.role}
                                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                              >
                                <option value="employee">Empleado</option>
                                <option value="admin">Administrador</option>
                              </select>
                            </div>
                          </div>

                          <div className="edit-active-row">
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={editForm.active}
                                onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))}
                              />
                              <span className="toggle-track">
                                <span className="toggle-thumb" />
                              </span>
                              <span className="toggle-label">Activo</span>
                            </label>
                          </div>

                          {editForm.role !== "admin" && renderPermissionToggles(editForm, togglePerm, setAllPerms)}

                          <div className="user-form-actions">
                            <button className="cancel" onClick={closeEdit}>Cancelar</button>
                            <button className="save" onClick={handleSave} disabled={saving}>
                              {saving ? "Guardando..." : "Guardar cambios"}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
