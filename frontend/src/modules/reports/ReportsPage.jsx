import React, { useEffect, useState } from "react";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  const tenant = localStorage.getItem("tenant") || "modashop";

  return token
    ? {
        Authorization: `Bearer ${token}`,
        "X-Tenant": tenant
      }
    : { "X-Tenant": tenant };
}

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function ReportsPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });

  const [to, setTo] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [investment, setInvestment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const headers = getAuthHeaders();

      const [summaryRes, dailyRes, topRes, investRes] = await Promise.all([
        api.get("/reports/summary", { params: { from, to }, headers }),
        api.get("/reports/daily",   { params: { from, to }, headers }),
        api.get("/reports/top-products", { params: { from, to }, headers }),
        api.get("/reports/investment", { headers }).catch(() => ({ data: null })),
      ]);

      setSummary(summaryRes.data);
      setDaily(dailyRes.data || []);
      setTopProducts(topRes.data || []);
      setInvestment(investRes.data);
    } catch (err) {
      console.error("Error cargando reportes", err);
      setError("No se pudieron cargar los reportes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = (e) => {
    e.preventDefault();
    loadReports();
  };

  return (
    <div className="reports-root">
      <div className="reports-header">
        <div>
          <h1>Reportes</h1>
          <p>
            Analiza el rendimiento de tu tienda por período. Totales, ventas
            diarias y productos más vendidos.
          </p>
        </div>

        <form className="reports-filters" onSubmit={handleApply}>
          <div className="field">
            <label>Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Cargando..." : "Aplicar"}
          </button>
        </form>
      </div>

      {error && <div className="reports-error">{error}</div>}

      {/* KPIs principales */}
      <div className="reports-kpis">
        <div className="reports-card">
          <span className="label">Ventas del período</span>
          <span className="value">
            {summary ? `$${summary.total_sales.toLocaleString()}` : "-"}
          </span>
          <span className="sub">
            Tickets: {summary ? summary.total_tickets : "-"}
          </span>
        </div>

        <div className="reports-card">
          <span className="label">Ticket promedio</span>
          <span className="value">
            {summary ? `$${summary.avg_ticket.toLocaleString()}` : "-"}
          </span>
          <span className="sub">Promedio por venta</span>
        </div>

        <div className="reports-card">
          <span className="label">Total ventas</span>
          <span className="value">
            {summary ? summary.total_tickets : "-"}
          </span>
          <span className="sub">Cantidad de tickets</span>
        </div>
      </div>

      {/* Métodos de pago */}
      {summary && (
        <div className="reports-payment-methods">
          <h2>Ventas por método de pago</h2>
          <div className="payment-grid">
            <div className="payment-card">
              <div className="payment-icon">💵</div>
              <div className="payment-info">
                <span className="payment-label">Efectivo</span>
                <span className="payment-value">
                  ${summary.cash.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="payment-card">
              <div className="payment-icon">💳</div>
              <div className="payment-info">
                <span className="payment-label">Débito</span>
                <span className="payment-value">
                  ${summary.debit.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="payment-card">
              <div className="payment-icon">💳</div>
              <div className="payment-info">
                <span className="payment-label">Crédito</span>
                <span className="payment-value">
                  ${summary.credit.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="payment-card">
              <div className="payment-icon">🏦</div>
              <div className="payment-info">
                <span className="payment-label">Transferencia</span>
                <span className="payment-value">
                  ${summary.transfer.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inversión y Margen de Ganancia */}
      {investment && (
        <div className="reports-investment-section">
          <h2 className="reports-section-title">Inversión y Margen de Ganancia</h2>
          <div className="reports-investment-grid">

            <div className="reports-invest-card primary">
              <div className="invest-icon">📦</div>
              <div className="invest-body">
                <span className="invest-label">Total inversión en stock</span>
                <span className="invest-value">${fmtMoney(investment.total_cost)}</span>
                <span className="invest-sub">
                  {investment.products_with_cost} de {investment.total_products} productos con costo cargado
                </span>
              </div>
            </div>

            <div className="reports-invest-card accent">
              <div className="invest-icon">✈️</div>
              <div className="invest-body">
                <span className="invest-label">Gasto en viajes a proveedores</span>
                <span className="invest-value">${fmtMoney(investment.trips_cost)}</span>
                <span className="invest-sub">{investment.trips_count} viaje{investment.trips_count !== 1 ? "s" : ""} registrado{investment.trips_count !== 1 ? "s" : ""}</span>
              </div>
            </div>

            <div className={`reports-invest-card ${investment.margin >= 0 ? "positive" : "negative"}`}>
              <div className="invest-icon">{investment.margin >= 0 ? "📈" : "📉"}</div>
              <div className="invest-body">
                <span className="invest-label">Margen de ganancia potencial</span>
                <span className="invest-value">${fmtMoney(investment.margin)}</span>
                <span className="invest-sub">
                  {investment.margin_pct}% sobre el stock · Valor venta: ${fmtMoney(investment.total_sale_value)}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Layout inferior */}
      <div className="reports-grid">
        {/* Ventas diarias */}
        <div className="reports-panel">
          <div className="panel-header">
            <h2>Ventas diarias</h2>
            <span>{daily.length} días</span>
          </div>
          {daily.length === 0 ? (
            <div className="empty">Sin datos en el período seleccionado.</div>
          ) : (
            <div className="table">
              <div className="thead">
                <div>Fecha</div>
                <div>Tickets</div>
                <div>Total</div>
              </div>
              <div className="tbody">
                {daily.map((d) => (
                  <div className="row" key={d.date}>
                    <div>
                      {new Date(d.date + "T00:00:00").toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                      })}
                    </div>
                    <div>{d.tickets}</div>
                    <div>${d.total.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top productos */}
        <div className="reports-panel">
          <div className="panel-header">
            <h2>Productos más vendidos</h2>
            <span>{topProducts.length} items</span>
          </div>
          {topProducts.length === 0 ? (
            <div className="empty">Todavía no hay productos en este período.</div>
          ) : (
            <div className="table">
              <div className="thead">
                <div>Producto</div>
                <div>Cant.</div>
                <div>Total</div>
              </div>
              <div className="tbody">
                {topProducts.map((p, i) => (
                  <div className="row" key={i}>
                    <div>{p.name}</div>
                    <div>{p.qty}</div>
                    <div>${p.total.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
