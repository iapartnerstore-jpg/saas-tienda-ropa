import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import corePool from '../utils/tenantDb.js';

const router = Router();

// Proteger todas las rutas de productos
router.use(requireAuth);

const PRODUCT_CATEGORIES = ['varon', 'mujer', 'ninos', 'bebes', 'colegio', 'blanqueria'];
const PRODUCT_DEPARTMENTS = ['ropa', 'calzado'];

let productsSchemaReady = false;

const ensureProductsSchema = async () => {
  if (productsSchemaReady) return;

  await corePool.query(
    `ALTER TABLE products
     ADD COLUMN IF NOT EXISTS department VARCHAR(32) NULL,
     ADD COLUMN IF NOT EXISTS size VARCHAR(64) NULL,
     ADD COLUMN IF NOT EXISTS color VARCHAR(64) NULL,
     ADD COLUMN IF NOT EXISTS model VARCHAR(128) NULL,
     ADD COLUMN IF NOT EXISTS season VARCHAR(64) NULL,
     ADD COLUMN IF NOT EXISTS brand VARCHAR(128) NULL,
     ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) NULL`
  );

  // Índice único para barcodes (ignorar si ya existe)
  try {
    await corePool.query(`CREATE UNIQUE INDEX idx_products_barcode ON products(barcode)`)
  } catch (_) { /* ya existe */ }

  productsSchemaReady = true;
};

const normalizeCategory = (value) => {
  if (value == null) return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;

  if (raw === 'hombre') return 'varon';
  if (raw === 'niño' || raw === 'nino' || raw === 'niños') return 'ninos';
  if (raw === 'bebé' || raw === 'bebe') return 'bebes';

  return raw;
};

const normalizeDepartment = (value) => {
  if (value == null) return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  return raw;
};

const toNullableText = (value) => {
  const text = String(value || '').trim();
  return text || null;
};

/** ============================
 *  GET /products
 *  Lista de productos
 *  ============================ */
router.get('/', async (_req, res) => {
  try {
    await ensureProductsSchema();

    const [rows] = await corePool.query(
      `SELECT id, name, category, department, size, color, model, season, brand, description, cost, price, stock, barcode
       FROM products
       ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /products', err);
    res.status(500).json({ message: 'Error al obtener productos' });
  }
});

/** ============================
 *  GET /products/barcode/:code
 *  Buscar producto por código de barras
 *  (debe ir ANTES de /:id)
 *  ============================ */
router.get('/barcode/:code', async (req, res) => {
  try {
    await ensureProductsSchema();
    const [rows] = await corePool.query(
      `SELECT id, name, category, department, size, color, model, season, brand, description, cost, price, stock, barcode
       FROM products WHERE barcode = ? LIMIT 1`,
      [req.params.code]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ GET /products/barcode/:code', err);
    res.status(500).json({ message: 'Error al buscar por código de barras' });
  }
});

/** ============================
 *  POST /products
 *  Crear producto
 *  ============================ */
router.post('/', async (req, res) => {
  try {
    await ensureProductsSchema();

    const {
      name = '',
      category = '',
      department = '',
      size = '',
      color = '',
      model = '',
      season = '',
      brand = '',
      description = '',
      cost,
      price,
      stock,
      barcode
    } = req.body || {};

    // Validaciones
    if (!name?.trim()) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    const normalizedCategory = normalizeCategory(category);
    if (!normalizedCategory) {
      return res.status(400).json({ message: 'La categoria es requerida' });
    }

    if (!PRODUCT_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({
        message: `Categoria invalida. Permitidas: ${PRODUCT_CATEGORIES.join(', ')}`
      });
    }

    const normalizedDepartment = normalizeDepartment(department);
    if (!normalizedDepartment) {
      return res.status(400).json({ message: 'El tipo es requerido (ropa o calzado)' });
    }

    if (!PRODUCT_DEPARTMENTS.includes(normalizedDepartment)) {
      return res.status(400).json({
        message: `Tipo invalido. Permitidos: ${PRODUCT_DEPARTMENTS.join(', ')}`
      });
    }

    const numericCost = Number(cost) || 0;
    const numericPrice = Number(price);
    const numericStock = Number(stock) || 0;

    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ message: 'Precio de venta inválido' });
    }

    if (isNaN(numericStock) || numericStock < 0) {
      return res.status(400).json({ message: 'Stock inválido' });
    }

    const normalizedBarcode = barcode?.trim() || null;
    if (normalizedBarcode) {
      const [dup] = await corePool.query('SELECT id FROM products WHERE barcode = ? LIMIT 1', [normalizedBarcode]);
      if (dup.length) return res.status(409).json({ message: 'El código de barras ya está registrado en otro producto' });
    }

    const [result] = await corePool.query(
      `INSERT INTO products (name, category, department, size, color, model, season, brand, description, cost, price, stock, barcode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        normalizedCategory,
        normalizedDepartment,
        toNullableText(size),
        toNullableText(color),
        toNullableText(model),
        toNullableText(season),
        toNullableText(brand),
        description.trim() || null,
        numericCost,
        numericPrice,
        numericStock,
        normalizedBarcode
      ]
    );

    res.status(201).json({
      id: result.insertId,
      name: name.trim(),
      category: normalizedCategory,
      department: normalizedDepartment,
      size: toNullableText(size),
      color: toNullableText(color),
      model: toNullableText(model),
      season: toNullableText(season),
      brand: toNullableText(brand),
      description: description.trim() || null,
      cost: numericCost,
      price: numericPrice,
      stock: numericStock,
      barcode: normalizedBarcode
    });
  } catch (err) {
    console.error('❌ POST /products', err);
    res.status(500).json({ 
      message: 'Error al crear producto',
      error: err.message 
    });
  }
});

/** ============================
 *  PUT /products/:id
 *  Editar producto
 *  ============================ */
router.put('/:id', async (req, res) => {
  try {
    await ensureProductsSchema();

    const id = Number(req.params.id);
    const {
      name,
      category,
      department,
      size,
      color,
      model,
      season,
      brand,
      description,
      cost,
      price,
      stock,
      barcode
    } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID invalido' });
    }

    if (!name?.trim()) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    const normalizedCategory = normalizeCategory(category);
    if (!normalizedCategory) {
      return res.status(400).json({ message: 'La categoria es requerida' });
    }

    if (!PRODUCT_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({
        message: `Categoria invalida. Permitidas: ${PRODUCT_CATEGORIES.join(', ')}`
      });
    }

    const normalizedDepartment = normalizeDepartment(department);
    if (!normalizedDepartment) {
      return res.status(400).json({ message: 'El tipo es requerido (ropa o calzado)' });
    }

    if (!PRODUCT_DEPARTMENTS.includes(normalizedDepartment)) {
      return res.status(400).json({
        message: `Tipo invalido. Permitidos: ${PRODUCT_DEPARTMENTS.join(', ')}`
      });
    }

    const numericCost = Number(cost) || 0;
    const numericPrice = Number(price);
    const numericStock = Number(stock) || 0;

    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ message: 'Precio de venta inválido' });
    }

    if (isNaN(numericStock) || numericStock < 0) {
      return res.status(400).json({ message: 'Stock inválido' });
    }

    const normalizedBarcode = barcode?.trim() || null;
    if (normalizedBarcode) {
      const [dup] = await corePool.query('SELECT id FROM products WHERE barcode = ? AND id != ? LIMIT 1', [normalizedBarcode, id]);
      if (dup.length) return res.status(409).json({ message: 'El código de barras ya está registrado en otro producto' });
    }

    const [result] = await corePool.query(
      `UPDATE products
       SET name = ?, category = ?, department = ?, size = ?, color = ?, model = ?, season = ?, brand = ?, description = ?, cost = ?, price = ?, stock = ?, barcode = ?
       WHERE id = ?`,
      [
        name.trim(),
        normalizedCategory,
        normalizedDepartment,
        toNullableText(size),
        toNullableText(color),
        toNullableText(model),
        toNullableText(season),
        toNullableText(brand),
        description?.trim() || null,
        numericCost,
        numericPrice,
        numericStock,
        normalizedBarcode,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Devolver producto actualizado
    const [rows] = await corePool.query(
      `SELECT id, name, category, department, size, color, model, season, brand, description, cost, price, stock, barcode
       FROM products
       WHERE id = ?`,
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('❌ PUT /products/:id', err);
    res.status(500).json({ 
      message: 'Error al editar producto',
      error: err.message 
    });
  }
});

/** ============================
 *  DELETE /products/:id
 *  Eliminar producto (desvincula sale_items y promotion_items primero)
 *  ============================ */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    // Desvincular de sale_items (poner product_id = NULL o borrar refs)
    await corePool.query(
      `DELETE FROM sale_items WHERE product_id = ?`,
      [id]
    ).catch(() => {});

    // Desvincular de promotion_items
    await corePool.query(
      `DELETE FROM promotion_items WHERE product_id = ?`,
      [id]
    ).catch(() => {});

    const [result] = await corePool.query(
      `DELETE FROM products WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ DELETE /products/:id', err);
    res.status(500).json({ message: 'Error al eliminar producto' });
  }
});

export default router;
