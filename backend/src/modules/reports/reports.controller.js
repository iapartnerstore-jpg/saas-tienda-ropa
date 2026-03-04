import corePool from "../../utils/tenantDb.js";

const normalizePaymentMethod = (method) => {
  const raw = String(method || "").trim().toLowerCase();
  if (!raw) return "cash";

  if (["cash", "efectivo"].includes(raw)) return "cash";
  if (["debit", "debito", "débito", "tarjeta_debito"].includes(raw)) return "debit";
  if (["credit", "credito", "crédito", "tarjeta_credito"].includes(raw)) return "credit";
  if (["transfer", "transferencia", "bank_transfer", "transfer_bank"].includes(raw)) return "transfer";

  return raw;
};

/** ============================
 *  GET /reports/summary
 *  Resumen general del período
 *  ============================ */
export const getSummary = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "Parámetros 'from' y 'to' son requeridos" });
    }

    // Total de ventas y tickets
    const [salesData] = await corePool.query(
      `SELECT 
        COUNT(*) as total_tickets,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(AVG(total), 0) as avg_ticket
       FROM sales
       WHERE DATE(created_at) BETWEEN ? AND ?`,
      [from, to]
    );

    // Totales por método de pago (usa detalle real por pago si existe)
    let paymentData = [];
    try {
      const [rows] = await corePool.query(
        `SELECT 
          sp.payment_method,
          COALESCE(SUM(sp.amount), 0) as total
         FROM sale_payments sp
         INNER JOIN sales s ON s.id = sp.sale_id
         WHERE DATE(s.created_at) BETWEEN ? AND ?
         GROUP BY sp.payment_method`,
        [from, to]
      );
      paymentData = rows;
    } catch (_err) {
      const [legacyRows] = await corePool.query(
        `SELECT 
          payment_method,
          COALESCE(SUM(total), 0) as total
         FROM sales
         WHERE DATE(created_at) BETWEEN ? AND ?
         GROUP BY payment_method`,
        [from, to]
      );
      paymentData = legacyRows;
    }

    // Organizar por método de pago
    const payments = {
      cash: 0,
      debit: 0,
      credit: 0,
      transfer: 0
    };

    paymentData.forEach(row => {
      const method = normalizePaymentMethod(row.payment_method);
      if (Object.prototype.hasOwnProperty.call(payments, method)) {
        payments[method] = Number(payments[method] || 0) + Number(row.total || 0);
      }
    });

    const data = {
      from,
      to,
      total_sales: Number(salesData[0]?.total_sales || 0),
      total_tickets: Number(salesData[0]?.total_tickets || 0),
      avg_ticket: Math.round(Number(salesData[0]?.avg_ticket || 0)),
      cash: payments.cash,
      debit: payments.debit,
      credit: payments.credit,
      transfer: payments.transfer
    };

    res.json(data);
  } catch (err) {
    console.error("❌ Error getSummary", err);
    res.status(500).json({ error: "Error obteniendo resumen" });
  }
};

/** ============================
 *  GET /reports/daily
 *  Ventas agrupadas por día
 *  ============================ */
export const getDaily = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "Parámetros 'from' y 'to' son requeridos" });
    }

    const [rows] = await corePool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as tickets,
        COALESCE(SUM(total), 0) as total
       FROM sales
       WHERE DATE(created_at) BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [from, to]
    );

    const formatted = rows.map(row => {
      // MySQL2 devuelve DATE como objeto Date de JS — convertir a string YYYY-MM-DD
      const d = row.date instanceof Date ? row.date : new Date(row.date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        date: dateStr,
        tickets: Number(row.tickets),
        total: Number(row.total)
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("❌ Error getDaily", err);
    res.status(500).json({ error: "Error obteniendo ventas diarias" });
  }
};

/** ============================
 *  GET /reports/top-products
 *  Productos más vendidos
 *  ============================ */
export const getTopProducts = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "Parámetros 'from' y 'to' son requeridos" });
    }

    const [rows] = await corePool.query(
      `SELECT 
        p.name,
        SUM(si.quantity) as qty,
        SUM(si.quantity * si.price) as total
       FROM sale_items si
       INNER JOIN sales s ON si.sale_id = s.id
       INNER JOIN products p ON si.product_id = p.id
       WHERE DATE(s.created_at) BETWEEN ? AND ?
       GROUP BY p.id, p.name
       ORDER BY total DESC
       LIMIT 10`,
      [from, to]
    );

    const formatted = rows.map(row => ({
      name: row.name,
      qty: Number(row.qty),
      total: Number(row.total)
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ Error getTopProducts", err);
    res.status(500).json({ error: "Error obteniendo top productos" });
  }
};

/** ============================
 *  GET /reports/investment
 *  Inversión total y margen de ganancia
 *  basado en el catálogo de productos (cost vs price)
 *  y viajes a proveedores
 *  ============================ */
export const getInvestment = async (req, res) => {
  try {
    // Inversión total = suma de (cost * stock) de todos los productos con cost > 0
    // Valor de venta potencial = suma de (price * stock)
    // Margen = valor venta potencial - inversión total
    const [productRows] = await corePool.query(
      `SELECT
        COUNT(*) as total_products,
        COALESCE(SUM(CASE WHEN cost > 0 AND stock > 0 THEN cost * stock ELSE 0 END), 0) as total_cost,
        COALESCE(SUM(CASE WHEN price > 0 AND stock > 0 THEN price * stock ELSE 0 END), 0) as total_sale_value,
        COALESCE(SUM(CASE WHEN cost > 0 THEN cost ELSE 0 END), 0) as sum_costs,
        COALESCE(SUM(CASE WHEN price > 0 THEN price ELSE 0 END), 0) as sum_prices,
        COUNT(CASE WHEN cost > 0 THEN 1 END) as products_with_cost
       FROM products`
    );

    // Viajes a proveedores: gasto total acumulado
    let tripsCost = 0;
    let tripsCount = 0;
    try {
      const [tripRows] = await corePool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(total_spent), 0) as total FROM provider_trips`
      );
      tripsCost = Number(tripRows[0]?.total || 0);
      tripsCount = Number(tripRows[0]?.count || 0);
    } catch (_err) {
      // tabla puede no existir aún
    }

    const totalCost = Number(productRows[0]?.total_cost || 0);
    const totalSaleValue = Number(productRows[0]?.total_sale_value || 0);
    const margin = totalSaleValue - totalCost;
    const marginPct = totalCost > 0 ? ((margin / totalCost) * 100).toFixed(1) : 0;

    res.json({
      total_cost: totalCost,
      total_sale_value: totalSaleValue,
      margin,
      margin_pct: Number(marginPct),
      total_products: Number(productRows[0]?.total_products || 0),
      products_with_cost: Number(productRows[0]?.products_with_cost || 0),
      trips_cost: tripsCost,
      trips_count: tripsCount,
    });
  } catch (err) {
    console.error("❌ Error getInvestment", err);
    res.status(500).json({ error: "Error obteniendo datos de inversión" });
  }
};
