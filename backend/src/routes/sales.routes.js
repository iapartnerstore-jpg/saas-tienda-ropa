import { Router } from "express";
import corePool from "../utils/tenantDb.js";

const router = Router();

let salesPaymentsSchemaReady = false;

const ensureSalesPaymentsSchema = async () => {
  if (salesPaymentsSchemaReady) return;

  await corePool.query(`
    CREATE TABLE IF NOT EXISTS sale_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sale_id INT NOT NULL,
      payment_method VARCHAR(40) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sale_payments_sale (sale_id),
      INDEX idx_sale_payments_method (payment_method),
      CONSTRAINT fk_sale_payments_sale
        FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  // Backfill: ventas históricas sin detalle de pagos
  await corePool.query(`
    INSERT INTO sale_payments (sale_id, payment_method, amount)
    SELECT s.id, s.payment_method, s.total
    FROM sales s
    LEFT JOIN sale_payments sp ON sp.sale_id = s.id
    WHERE sp.id IS NULL
  `);

  salesPaymentsSchemaReady = true;
};

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
 *  GET /sales
 *  Lista de ventas
 *  ============================ */
router.get("/", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        s.id,
        s.ticket_number,
        s.total,
        s.payment_method,
        s.customer_id,
        c.name as customer_name,
        s.created_at
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
    `;
    
    const params = [];
    
    if (startDate && endDate) {
      query += ` WHERE DATE(s.created_at) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    
    query += ` ORDER BY s.id DESC`;
    
    const [rows] = await corePool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ GET /sales", err);
    res.status(500).json({ message: "Error al obtener ventas" });
  }
});

/** ============================
 *  GET /sales/summary/today
 *  Resumen de ventas del día (para Dashboard)
 *  ============================ */
router.get("/summary/today", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    
    // Total de ventas y revenue del día
    const [salesData] = await corePool.query(
      `SELECT 
        COUNT(*) as todaySales,
        COALESCE(SUM(total), 0) as todayRevenue,
        COALESCE(AVG(total), 0) as avgTicket
      FROM sales
      WHERE DATE(created_at) = ?`,
      [today]
    );
    
    // Productos con stock bajo (≤ 10 unidades o ≤ stock_min si existe)
    let lowStockCount = 0;
    try {
      const [lowStock] = await corePool.query(
        `SELECT COUNT(*) as count
         FROM products
         WHERE stock <= COALESCE(stock_min, 10)`
      );
      lowStockCount = lowStock[0]?.count || 0;
    } catch (stockErr) {
      // Si falla (por ejemplo, stock_min no existe), usar stock <= 10
      const [lowStock] = await corePool.query(
        `SELECT COUNT(*) as count
         FROM products
         WHERE stock <= 10`
      );
      lowStockCount = lowStock[0]?.count || 0;
    }
    
    res.json({
      todaySales: salesData[0]?.todaySales || 0,
      todayRevenue: Number(salesData[0]?.todayRevenue || 0),
      avgTicket: Number(salesData[0]?.avgTicket || 0),
      lowStockCount: lowStockCount
    });
  } catch (err) {
    console.error("❌ GET /sales/summary/today", err);
    res.status(500).json({ 
      message: "Error al obtener resumen del día",
      error: err.message 
    });
  }
});

/** ============================
 *  GET /sales/latest
 *  Últimas ventas del día (para Dashboard)
 *  ============================ */
router.get("/latest", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    
    const [rows] = await corePool.query(
      `SELECT 
        s.id,
        s.ticket_number,
        s.total,
        s.payment_method,
        c.name as customer_name,
        s.created_at
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE DATE(s.created_at) = ?
      ORDER BY s.created_at DESC
      LIMIT 10`,
      [today]
    );
    
    res.json(rows);
  } catch (err) {
    console.error("❌ GET /sales/latest", err);
    res.status(500).json({ message: "Error al obtener últimas ventas" });
  }
});

/** ============================
 *  GET /sales/:id
 *  Detalle de una venta
 *  ============================ */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    // Datos de la venta
    const [saleRows] = await corePool.query(
      `SELECT 
        s.id,
        s.ticket_number,
        s.total,
        s.payment_method,
        s.customer_id,
        c.name as customer_name,
        s.created_at
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?`,
      [id]
    );
    
    if (saleRows.length === 0) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }
    
    // Items de la venta
    const [items] = await corePool.query(
      `SELECT 
        si.id,
        si.product_id,
        p.name as product_name,
        si.quantity,
        si.price,
        (si.quantity * si.price) as subtotal
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?`,
      [id]
    );
    
    res.json({
      ...saleRows[0],
      items
    });
  } catch (err) {
    console.error("❌ GET /sales/:id", err);
    res.status(500).json({ message: "Error al obtener detalle de venta" });
  }
});

/** ============================
 *  POST /sales
 *  Crear venta y descontar stock
 *  ============================ */
router.post("/", async (req, res) => {
  const connection = await corePool.getConnection();
  
  try {
    await ensureSalesPaymentsSchema();
    await connection.beginTransaction();
    
    const { items = [], payments = [], subtotal = 0, total: totalReceived = 0, customerId = null, entrega = null, debtToAccount = 0 } = req.body;
    
    // Soporte legacy: si viene paymentMethod en lugar de payments array
    const paymentsArray = payments.length > 0 ? payments : [{ 
      method: req.body.paymentMethod || "cash", 
      amount: totalReceived, 
      finalAmount: totalReceived 
    }];
    
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "La venta debe tener al menos un producto" });
    }
    
    // Validar pagos
    if (paymentsArray.length === 0) {
      return res.status(400).json({ message: "Debe haber al menos un método de pago" });
    }

    const normalizedPayments = paymentsArray.map((p) => ({
      method: normalizePaymentMethod(p.method),
      amount: Number(p.amount || 0)
    }));

    if (normalizedPayments.some((p) => !p.method || !Number.isFinite(p.amount) || p.amount <= 0)) {
      return res.status(400).json({ message: "Los pagos son inválidos" });
    }

    // Calcular total real si no viene
    let calculatedTotal = totalReceived;
    if (!calculatedTotal || calculatedTotal === 0) {
      calculatedTotal = 0;
      for (const item of items) {
        calculatedTotal += Number(item.price) * Number(item.qty);
      }
    }
    
    // Determinar método de pago principal (para compatibilidad)
    const mainPaymentMethod = normalizedPayments[0].method;
    
    // Generar número de ticket
    const [lastTicket] = await connection.query(
      `SELECT MAX(ticket_number) as last FROM sales`
    );
    const ticketNumber = (lastTicket[0]?.last || 0) + 1;
    
    // Insertar venta
    const [saleResult] = await connection.query(
      `INSERT INTO sales (ticket_number, total, payment_method, customer_id, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [ticketNumber, calculatedTotal, mainPaymentMethod, customerId]
    );
    
    const saleId = saleResult.insertId;

    // Registrar detalle de pagos por método
    for (const payment of normalizedPayments) {
      await connection.query(
        `INSERT INTO sale_payments (sale_id, payment_method, amount)
         VALUES (?, ?, ?)`,
        [saleId, payment.method, payment.amount]
      );
    }
    
    // Insertar items y descontar stock
    for (const item of items) {
      const { productId, qty, price } = item;
      
      // Verificar stock disponible
      const [productRows] = await connection.query(
        `SELECT stock FROM products WHERE id = ?`,
        [productId]
      );
      
      if (productRows.length === 0) {
        throw new Error(`Producto con ID ${productId} no encontrado`);
      }
      
      const currentStock = productRows[0].stock;
      
      if (currentStock < qty) {
        throw new Error(`Stock insuficiente para producto ID ${productId}. Disponible: ${currentStock}, solicitado: ${qty}`);
      }
      
      // Insertar item
      await connection.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, price)
         VALUES (?, ?, ?, ?)`,
        [saleId, productId, qty, price]
      );
      
      // Descontar stock
      await connection.query(
        `UPDATE products 
         SET stock = stock - ?
         WHERE id = ?`,
        [qty, productId]
      );
    }
    
    // Si hay cliente y queda deuda, agregar solo la parte impaga a su cuenta corriente
    const actualDebt = Number(debtToAccount) || 0;
    if (customerId && actualDebt > 0) {
      await connection.query(
        `UPDATE customers 
         SET balance = balance + ?
         WHERE id = ?`,
        [actualDebt, customerId]
      );
    }
    
    await connection.commit();
    
    res.status(201).json({
      id: saleId,
      ticket_number: ticketNumber,
      total: calculatedTotal,
      payment_method: mainPaymentMethod,
      payments: normalizedPayments,
      customer_id: customerId,
      entrega: entrega != null ? Number(entrega) : calculatedTotal,
      debt_to_account: actualDebt
    });
    
  } catch (err) {
    await connection.rollback();
    console.error("❌ POST /sales", err);
    res.status(500).json({ 
      message: err.message || "Error al registrar venta"
    });
  } finally {
    connection.release();
  }
});

/** ============================
 *  GET /sales/cash-register/summary
 *  Arqueo de caja (totales por método de pago)
 *  ============================ */
router.get("/cash-register/summary", async (req, res) => {
  try {
    await ensureSalesPaymentsSchema();
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split("T")[0];

    let rows = [];
    try {
      const [paymentRows] = await corePool.query(
        `SELECT 
          sp.payment_method,
          COUNT(DISTINCT sp.sale_id) as count,
          SUM(sp.amount) as total
         FROM sale_payments sp
         INNER JOIN sales s ON s.id = sp.sale_id
         WHERE DATE(s.created_at) = ?
         GROUP BY sp.payment_method`,
        [targetDate]
      );
      rows = paymentRows;
    } catch (_err) {
      const [legacyRows] = await corePool.query(
        `SELECT 
          payment_method,
          COUNT(*) as count,
          SUM(total) as total
         FROM sales
         WHERE DATE(created_at) = ?
         GROUP BY payment_method`,
        [targetDate]
      );
      rows = legacyRows;
    }
    
    const [allSales] = await corePool.query(
      `SELECT 
        s.id,
        s.ticket_number,
        s.total,
        s.payment_method,
        c.name as customer_name,
        s.created_at
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE DATE(s.created_at) = ?
      ORDER BY s.created_at DESC`,
      [targetDate]
    );
    
    // Inicializar todos los métodos de pago en 0
    const summary = {
      cash: 0,
      debit: 0,
      credit: 0,
      transfer: 0
    };
    
    // Actualizar con los valores reales
    rows.forEach(row => {
      const method = normalizePaymentMethod(row.payment_method);
      if (summary.hasOwnProperty(method)) {
        summary[method] = Number(summary[method] || 0) + Number(row.total || 0);
      }
    });
    
    const grandTotal = Object.values(summary).reduce((sum, val) => sum + val, 0);
    
    res.json({
      date: targetDate,
      summary,
      total: grandTotal,
      sales: allSales
    });
  } catch (err) {
    console.error("❌ GET /sales/cash-register/summary", err);
    res.status(500).json({ message: "Error al obtener arqueo de caja" });
  }
});

export default router;
