import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import corePool from "../utils/tenantDb.js";

const router = Router();

// Proteger todas las rutas de clientes
router.use(requireAuth);

/** ============================
 *  GET LISTA DE CLIENTES
 *  ============================ */
router.get("/", async (_req, res) => {
  try {
    const [rows] = await corePool.query(
      `SELECT id, name, phone, dni AS document, COALESCE(balance, 0) as balance
       FROM customers 
       ORDER BY id DESC`
    );
    
    res.json(rows);
  } catch (err) {
    console.error("❌ GET /customers", err);
    res.status(500).json({ message: "Error al obtener clientes" });
  }
});

/** ============================
 *  POST – AGREGAR CLIENTE
 *  ============================ */
router.post("/", async (req, res) => {
  try {
    const { name = "", phone = "", document = "" } = req.body;

    if (!name.trim()) {
      return res.status(400).json({ message: "El nombre es requerido" });
    }

    const [result] = await corePool.query(
      `INSERT INTO customers (name, phone, dni, balance)
       VALUES (?, ?, ?, 0)`,
      [name.trim(), phone.trim(), document.trim()]
    );

    res.status(201).json({
      id: result.insertId,
      name: name.trim(),
      phone: phone.trim(),
      document: document.trim(),
      balance: 0
    });
  } catch (err) {
    console.error("❌ POST /customers", err);
    res.status(500).json({ message: "Error al crear cliente", error: err.message });
  }
});

/** ============================
 *  PUT – EDITAR CLIENTE
 *  ============================ */
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, phone, document } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "El nombre es requerido" });
    }

    const [result] = await corePool.query(
      `UPDATE customers 
       SET name = ?, phone = ?, dni = ?
       WHERE id = ?`,
      [name.trim(), phone.trim(), document.trim(), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    // Devolver el cliente actualizado
    const [rows] = await corePool.query(
      `SELECT id, name, phone, dni AS document, balance 
       FROM customers 
       WHERE id = ?`,
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ PUT /customers/:id", err);
    res.status(500).json({ message: "Error al editar cliente", error: err.message });
  }
});

/** ============================
 *  DELETE – ELIMINAR CLIENTE
 *  ============================ */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [result] = await corePool.query(
      `DELETE FROM customers WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ DELETE /customers/:id", err);
    res.status(500).json({ message: "Error al eliminar cliente" });
  }
});

/** ============================
 *  POST – AGREGAR DEUDA
 *  ============================ */
router.post("/:id/debt", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { amount } = req.body;

    const value = Number(amount);

    if (isNaN(value) || value <= 0) {
      return res.status(400).json({ message: "Monto inválido" });
    }

    await corePool.query(
      `UPDATE customers 
       SET balance = balance + ?
       WHERE id = ?`,
      [value, id]
    );

    // Devolver el balance actualizado
    const [rows] = await corePool.query(
      `SELECT balance FROM customers WHERE id = ?`,
      [id]
    );

    res.json({ ok: true, balance: rows[0]?.balance || 0 });
  } catch (err) {
    console.error("❌ POST /customers/:id/debt", err);
    res.status(500).json({ message: "Error al cargar deuda" });
  }
});

/** ============================
 *  POST – REGISTRAR PAGO
 *  ============================ */
router.post("/:id/pay", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { amount } = req.body;

    const value = Number(amount);

    if (isNaN(value) || value <= 0) {
      return res.status(400).json({ message: "Monto inválido" });
    }

    await corePool.query(
      `UPDATE customers 
       SET balance = balance - ?
       WHERE id = ?`,
      [value, id]
    );

    // Devolver el balance actualizado
    const [rows] = await corePool.query(
      `SELECT balance FROM customers WHERE id = ?`,
      [id]
    );

    res.json({ ok: true, balance: rows[0]?.balance || 0 });
  } catch (err) {
    console.error("❌ POST /customers/:id/pay", err);
    res.status(500).json({ message: "Error al registrar pago" });
  }
});

export default router;
