import React, { useState } from "react";
import axios from "axios";
import "./Login.css";

export default function Login() {
  const [tenant, setTenant] = useState("modashop");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        { email, password },
        { headers: { "X-Tenant": tenant } }
      );

      console.log("Login ok", response.data);
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("tenant", tenant);
      localStorage.setItem("authUser", JSON.stringify(response.data.user || {}));
      window.dispatchEvent(new Event("authChanged"));
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Error login:", err);
      setError("Credenciales inválidas o error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <form className="login-box" onSubmit={handleLogin}>
        <h1>Iniciar sesión</h1>
        <p className="subtitle">Bienvenido a Tienda Alex</p>

        <input
          type="text"
          placeholder="Tienda (slug)"
          value={tenant}
          onChange={(e) => setTenant(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Usuario"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Conectando..." : "Ingresar"}
        </button>

        <footer>
          <p>© {new Date().getFullYear()} · Asesoría Tecnológica LY</p>
        </footer>
      </form>
      
    </div>
  );
}
