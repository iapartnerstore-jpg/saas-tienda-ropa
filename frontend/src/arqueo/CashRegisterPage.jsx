import React, { useEffect, useState } from "react";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

const PAYMENT_METHODS = {
  cash:     { label: "Efectivo",       icon: "💵", color: "#10b981" },
  debit:    { label: "Débito",         icon: "💳", color: "#3b82f6" },
  credit:   { label: "Crédito",        icon: "💳", color: "#8b5cf6" },
  transfer: { label: "Transferencia",  icon: "🏦", color: "#f59e0b" }
};

export default function CashRegisterPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const token  = localStorage.getItem("token");
  const tenant = localStorage.getItem("tenant") || "modashop";
  const authHeaders = { Authorization: `Bearer ${token}`, "X-Tenant": tenant };

  const fetchCashRegister = async () => {
    try {
      setLoading(true);
      const { data: response } = await api.get(
        `/sales/cash-register/summary?date=${date}`,
        { headers: authHeaders }
      );
      setData(response);
    } catch (err) {
      console.error("Error cargando arqueo", err);
      alert("Error al cargar el arqueo de caja");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCashRegister();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const exportToPDF = () => {
    if (!data) return;
    const printWindow = window.open("", "_blank");
    const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Arqueo de Caja - ${formattedDate}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; padding: 40px; color: #000; }
        h1 { font-size: 24px; margin-bottom: 8px; }
        h2 { font-size: 18px; margin: 20px 0 10px; border-bottom: 2px solid #000; padding-bottom: 4px; }
        .date { font-size: 14px; color: #666; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; margin-bottom: 30px; }
        .summary-card { border: 1px solid #ddd; padding: 16px; border-radius: 8px; }
        .summary-card .label { font-size: 12px; color: #666; margin-bottom: 4px; }
        .summary-card .value { font-size: 24px; font-weight: bold; }
        .total-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px; text-align: center; }
        .total-box .label { font-size: 14px; color: #666; margin-bottom: 8px; }
        .total-box .value { font-size: 36px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th,td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #f3f4f6; font-weight: bold; }
        .text-right { text-align: right; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>Arqueo de Caja</h1>
      <div class="date">${formattedDate}</div>
      <div class="total-box">
        <div class="label">Total General</div>
        <div class="value">$${data.total.toLocaleString("es-AR")}</div>
      </div>
      <h2>Resumen por Método de Pago</h2>
      <div class="summary">
        ${Object.entries(data.summary).map(([method, amount]) => `
          <div class="summary-card">
            <div class="label">${PAYMENT_METHODS[method]?.label || method}</div>
            <div class="value">$${amount.toLocaleString("es-AR")}</div>
          </div>`).join("")}
      </div>
      <h2>Detalle de Ventas (${data.sales.length})</h2>
      <table>
        <thead><tr>
          <th>Ticket</th><th>Cliente</th><th>Método</th><th>Hora</th>
          <th class="text-right">Total</th>
        </tr></thead>
        <tbody>
          ${data.sales.map((sale) => `
            <tr>
              <td>#${sale.ticket_number}</td>
              <td>${sale.customer_name || "Consumidor final"}</td>
              <td>${PAYMENT_METHODS[sale.payment_method]?.label || sale.payment_method}</td>
              <td>${new Date(sale.created_at).toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit" })}</td>
              <td class="text-right">$${Number(sale.total).toLocaleString("es-AR")}</td>
            </tr>`).join("")}
        </tbody>
      </table>
      <script>window.onload = function(){ window.print(); };</script>
      </body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="arqueo-root">
      {/* Encabezado */}
      <div className="arqueo-header">
        <div>
          <h1 className="arqueo-title">Arqueo de Caja</h1>
          <p className="arqueo-subtitle">Resumen de ingresos por fecha</p>
        </div>
        <div className="arqueo-controls">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input arqueo-date-input"
          />
          <button
            className="primary"
            onClick={exportToPDF}
            disabled={!data}
          >
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {loading && <p style={{ color: "var(--text-soft)" }}>Cargando...</p>}

      {!loading && data && (
        <>
          {/* Total general */}
          <div className="arqueo-total-card">
            <div className="arqueo-total-label">Total del día</div>
            <div className="arqueo-total-value">
              ${data.total.toLocaleString("es-AR")}
            </div>
          </div>

          {/* Resumen por método */}
          <h3 className="arqueo-section-title">Resumen por método de pago</h3>
          <div className="arqueo-methods-grid">
            {Object.entries(data.summary).map(([method, amount]) => {
              const info = PAYMENT_METHODS[method];
              return (
                <div key={method} className="arqueo-method-card">
                  <div className="arqueo-method-header">
                    <span className="arqueo-method-icon">{info?.icon}</span>
                    <span className="arqueo-method-label">{info?.label || method}</span>
                  </div>
                  <div className="arqueo-method-amount" style={{ color: info?.color }}>
                    ${amount.toLocaleString("es-AR")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detalle de ventas */}
          <h3 className="arqueo-section-title">
            Detalle de ventas ({data.sales.length})
          </h3>
          <div className="arqueo-table-wrapper">
            <table className="arqueo-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Cliente</th>
                  <th>Método</th>
                  <th>Hora</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.sales.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--text-soft)" }}>
                      No hay ventas en esta fecha
                    </td>
                  </tr>
                ) : (
                  data.sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>#{sale.ticket_number}</td>
                      <td>{sale.customer_name || "Consumidor final"}</td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{PAYMENT_METHODS[sale.payment_method]?.icon}</span>
                          <span>{PAYMENT_METHODS[sale.payment_method]?.label || sale.payment_method}</span>
                        </span>
                      </td>
                      <td style={{ color: "var(--text-soft)" }}>
                        {new Date(sale.created_at).toLocaleTimeString("es-AR", {
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        ${Number(sale.total).toLocaleString("es-AR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
