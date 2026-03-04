import React, { useEffect, useState } from "react";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

const PAYMENT_METHODS = {
  cash: { label: "Efectivo", icon: "💵", color: "#10b981" },
  debit: { label: "Débito", icon: "💳", color: "#3b82f6" },
  credit: { label: "Crédito", icon: "💳", color: "#8b5cf6" },
  transfer: { label: "Transferencia", icon: "🏦", color: "#f59e0b" }
};

export default function CashRegisterPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const tenant = localStorage.getItem("tenant") || "modashop";

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "X-Tenant": tenant
  };

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

    // Crear contenido HTML para imprimir
    const printWindow = window.open("", "_blank");
    const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Arqueo de Caja - ${formattedDate}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #000;
          }
          h1 {
            font-size: 24px;
            margin-bottom: 8px;
          }
          h2 {
            font-size: 18px;
            margin: 20px 0 10px;
            border-bottom: 2px solid #000;
            padding-bottom: 4px;
          }
          .date {
            font-size: 14px;
            color: #666;
            margin-bottom: 30px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 30px;
          }
          .summary-card {
            border: 1px solid #ddd;
            padding: 16px;
            border-radius: 8px;
          }
          .summary-card .label {
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
          }
          .summary-card .value {
            font-size: 24px;
            font-weight: bold;
          }
          .total-box {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
          }
          .total-box .label {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
          }
          .total-box .value {
            font-size: 36px;
            font-weight: bold;
            color: #000;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 13px;
          }
          th {
            background: #f3f4f6;
            font-weight: bold;
          }
          .text-right {
            text-align: right;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <h1>Arqueo de Caja</h1>
        <div class="date">${formattedDate}</div>

        <div class="total-box">
          <div class="label">Total General</div>
          <div class="value">$${data.total.toLocaleString("es-AR")}</div>
        </div>

        <h2>Resumen por Método de Pago</h2>
        <div class="summary">
          ${Object.entries(data.summary)
            .map(
              ([method, amount]) => `
            <div class="summary-card">
              <div class="label">${PAYMENT_METHODS[method]?.label || method}</div>
              <div class="value">$${amount.toLocaleString("es-AR")}</div>
            </div>
          `
            )
            .join("")}
        </div>

        <h2>Detalle de Ventas (${data.sales.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Cliente</th>
              <th>Método</th>
              <th>Hora</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.sales
              .map(
                (sale) => `
              <tr>
                <td>#${sale.ticket_number}</td>
                <td>${sale.customer_name || "Consumidor final"}</td>
                <td>${PAYMENT_METHODS[sale.payment_method]?.label || sale.payment_method}</td>
                <td>${new Date(sale.created_at).toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit"
                })}</td>
                <td class="text-right">$${Number(sale.total).toLocaleString("es-AR")}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <script>
          window.onload = function() {
            window.print();
            // window.close(); // Descomentar si querés que se cierre automáticamente
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Arqueo de Caja</h2>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Arqueo de Caja</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #4b5563",
              background: "#020817",
              color: "#e5e7eb",
              fontSize: 14
            }}
          />
          <button
            onClick={exportToPDF}
            disabled={!data}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #38bdf8",
              background: "#38bdf8",
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500
            }}
          >
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* Total general */}
          <div
            style={{
              background: "#020817",
              border: "1px solid #1f2937",
              borderRadius: 16,
              padding: 32,
              marginBottom: 24,
              textAlign: "center"
            }}
          >
            <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 8 }}>
              Total del día
            </div>
            <div style={{ fontSize: 48, fontWeight: "bold", color: "#38bdf8" }}>
              ${data.total.toLocaleString("es-AR")}
            </div>
          </div>

          {/* Resumen por método */}
          <h3 style={{ marginBottom: 16, fontSize: 18 }}>Resumen por método de pago</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
            {Object.entries(data.summary).map(([method, amount]) => {
              const info = PAYMENT_METHODS[method];
              return (
                <div
                  key={method}
                  style={{
                    background: "#020817",
                    border: "1px solid #1f2937",
                    borderRadius: 12,
                    padding: 20
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>{info?.icon}</span>
                    <span style={{ fontSize: 13, color: "#9ca3af" }}>
                      {info?.label || method}
                    </span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: "bold", color: info?.color || "#fff" }}>
                    ${amount.toLocaleString("es-AR")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detalle de ventas */}
          <h3 style={{ marginBottom: 16, fontSize: 18 }}>
            Detalle de ventas ({data.sales.length})
          </h3>
          <div style={{ background: "#020817", border: "1px solid #1f2937", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#111827" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, color: "#9ca3af" }}>
                    Ticket
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, color: "#9ca3af" }}>
                    Cliente
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, color: "#9ca3af" }}>
                    Método
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, color: "#9ca3af" }}>
                    Hora
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, color: "#9ca3af" }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.sales.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>
                      No hay ventas en esta fecha
                    </td>
                  </tr>
                ) : (
                  data.sales.map((sale) => (
                    <tr key={sale.id} style={{ borderTop: "1px solid #1f2937" }}>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>
                        #{sale.ticket_number}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>
                        {sale.customer_name || "Consumidor final"}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{PAYMENT_METHODS[sale.payment_method]?.icon}</span>
                          <span>{PAYMENT_METHODS[sale.payment_method]?.label || sale.payment_method}</span>
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#9ca3af" }}>
                        {new Date(sale.created_at).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, textAlign: "right", fontWeight: 500 }}>
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