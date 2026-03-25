import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRole } from "../../utils/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

export default function Dashboard() {
  const [summary, setSummary] = useState({
    todaySales: 0,
    todayRevenue: 0,
    avgTicket: 0,
    lowStockCount: 0
  });
  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const tenant = localStorage.getItem("tenant") || "modashop";
  const { admin } = useRole();

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "X-Tenant": tenant
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [summaryRes, latestRes] = await Promise.all([
        api.get("/sales/summary/today", { headers: authHeaders }),
        api.get("/sales/latest", { headers: authHeaders })
      ]);

      setSummary(summaryRes.data || {});
      setLatest(latestRes.data || []);
    } catch (err) {
      console.error("Error cargando dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    todaySales,
    todayRevenue,
    avgTicket,
    lowStockCount
  } = summary;

  return (
    <div className="dashboard-root">
      {/* KPIs */}
      <div className="dash-row">
        {admin && (
          <>
            <div className="dash-card kpi">
              <div className="label">Ventas de hoy</div>
              <div className="value">
                {loading ? "…" : todaySales}
              </div>
              <div className="hint">Tickets emitidos</div>
            </div>

            <div className="dash-card kpi">
              <div className="label">Ingresos de hoy</div>
              <div className="value">
                {loading
                  ? "…"
                  : `$${Number(todayRevenue || 0).toLocaleString("es-AR")}`}
              </div>
              <div className="hint">Incluye todos los medios de pago</div>
            </div>

            <div className="dash-card kpi">
              <div className="label">Ticket promedio</div>
              <div className="value">
                {loading
                  ? "…"
                  : `$${Number(avgTicket || 0).toLocaleString("es-AR")}`}
              </div>
              <div className="hint">Monto promedio por venta hoy</div>
            </div>
          </>
        )}

        <div className="dash-card kpi alert">
          <div className="label">Stock crítico</div>
          <div className="value">
            {loading ? "…" : lowStockCount}
          </div>
          <div className="hint">Productos ≤ stock mínimo</div>
        </div>
      </div>

      {/* Atajos + Últimas ventas */}
      <div className="dash-row">
        <div className="dash-card quick-actions">
          <div className="title">Atajos rápidos</div>
          <div className="quick-grid">
            <button onClick={() => (window.location.href = "/pos")}>
              <span>🧾</span>
              <strong>Punto de venta</strong>
              <small>Iniciar venta rápida</small>
            </button>
            <button onClick={() => (window.location.href = "/productos")}>
              <span>📦</span>
              <strong>Productos</strong>
              <small>Gestión de catálogo</small>
            </button>
            <button onClick={() => (window.location.href = "/clientes")}>
              <span>👥</span>
              <strong>Clientes</strong>
              <small>Fidelización y cuentas</small>
            </button>
            <button onClick={() => (window.location.href = "/proveedores")}>
              <span>🏭</span>
              <strong>Proveedores</strong>
              <small>Gestion de compras</small>
            </button>
            <button onClick={() => (window.location.href = "/promociones")}>
              <span>🔥</span>
              <strong>Promociones</strong>
              <small>Combos y liquidacion</small>
            </button>
            {admin && (
              <button onClick={() => (window.location.href = "/reportes")}>
                <span>📊</span>
                <strong>Reportes</strong>
                <small>Reportes</small>
              </button>
            )}
          </div>
        </div>

        <div className="dash-card sales-list">
          <div className="title">Últimas ventas</div>
          <div className="table">
            <div className="thead">
              <div>ID</div>
              <div>Cliente</div>
              <div>Total</div>
              <div>Hora</div>
            </div>
            <div className="tbody">
              {loading ? (
                <div
                  style={{
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "#9ca3af"
                  }}
                >
                  Cargando ventas…
                </div>
              ) : latest.length === 0 ? (
                <div
                  style={{
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "#9ca3af"
                  }}
                >
                  Todavía no hay ventas registradas hoy.
                </div>
                            ) : (
                latest.map((sale, idx) => {
                  const created = new Date(sale.created_at);
                  const time = created.toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <div className="row" key={idx}>
                      <div>#{sale.ticket_number}</div>
                      <div>{sale.customer_name || "Mostrador"}</div>
                      <div>
                        ${Number(sale.total).toLocaleString("es-AR")}
                      </div>
                      <div>{time}</div>
                    </div>
                  );
                })
              )}

            </div>
          </div>
        
        </div>
      </div>
    </div>
  );
}
