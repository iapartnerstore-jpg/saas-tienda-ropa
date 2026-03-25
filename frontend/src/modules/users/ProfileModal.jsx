import React, { useState } from "react";
import axios from "axios";
import { getAuthUser } from "../../utils/auth.js";

const API_URL = import.meta.env.VITE_API_URL;

export default function ProfileModal({ onClose }) {
  const user = getAuthUser();
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "X-Tenant": localStorage.getItem("tenant") || "modashop",
  });

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }

    if (newPassword && !currentPassword) {
      setError("Ingresá tu contraseña actual para cambiarla");
      return;
    }

    setLoading(true);
    try {
      const payload = { name: name.trim() };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const { data } = await axios.put(`${API_URL}/users/me`, payload, {
        headers: getHeaders(),
      });

      // Actualizar authUser en localStorage
      const updated = { ...user, name: data.user.name };
      localStorage.setItem("authUser", JSON.stringify(updated));
      window.dispatchEvent(new Event("authChanged"));

      setSuccess("Perfil actualizado correctamente");
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      const msg = err.response?.data?.error || "Error al guardar";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="profile-avatar-lg">
              {(name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Mi Perfil</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-soft)" }}>
                {user?.email}
              </p>
            </div>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              className="form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>

          <div className="form-divider">
            <span>Cambiar contraseña (opcional)</span>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña actual</label>
            <input
              className="form-input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Contraseña actual"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nueva contraseña</label>
            <input
              className="form-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nueva contraseña"
            />
          </div>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="cancel" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="save" onClick={handleSave} disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
