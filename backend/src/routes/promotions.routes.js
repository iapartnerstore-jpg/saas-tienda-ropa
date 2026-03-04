import { Router } from 'express';
import corePool from '../utils/tenantDb.js';

const router = Router();

let schemaReady = false;

const ensurePromotionsSchema = async () => {
  if (schemaReady) return;

  await corePool.query(`
    CREATE TABLE IF NOT EXISTS promotions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      type VARCHAR(30) NOT NULL,
      discount_percent DECIMAL(5,2) NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      start_date DATE NULL,
      end_date DATE NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  await corePool.query(`
    CREATE TABLE IF NOT EXISTS promotion_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      promotion_id INT NOT NULL,
      product_id INT NOT NULL,
      qty INT NOT NULL DEFAULT 1,
      price_override DECIMAL(10,2) NULL,
      FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
      INDEX idx_promotion_items_promotion (promotion_id),
      INDEX idx_promotion_items_product (product_id)
    ) ENGINE=InnoDB
  `);

  schemaReady = true;
};

const loadPromotionItems = async (promotionId) => {
  const [items] = await corePool.query(
    `SELECT pi.id, pi.product_id, p.name as product_name, pi.qty, pi.price_override
     FROM promotion_items pi
     LEFT JOIN products p ON p.id = pi.product_id
     WHERE pi.promotion_id = ?
     ORDER BY pi.id ASC`,
    [promotionId]
  );
  return items;
};

router.get('/', async (_req, res) => {
  try {
    await ensurePromotionsSchema();

    const [rows] = await corePool.query(
      `SELECT id, name, type, discount_percent, active, start_date, end_date, notes, created_at
       FROM promotions
       ORDER BY id DESC`
    );

    const result = [];
    for (const row of rows) {
      const items = await loadPromotionItems(row.id);
      result.push({ ...row, items });
    }

    res.json(result);
  } catch (err) {
    console.error('GET /promotions error', err);
    res.status(500).json({ message: 'Error al obtener promociones' });
  }
});

router.post('/', async (req, res) => {
  const connection = await corePool.getConnection();
  try {
    await ensurePromotionsSchema();
    await connection.beginTransaction();

    const {
      name = '',
      type = 'combo',
      discount_percent = null,
      active = true,
      start_date = null,
      end_date = null,
      notes = '',
      items = [],
    } = req.body || {};

    const normalizedType = String(type).trim().toLowerCase();
    if (!String(name).trim()) {
      return res.status(400).json({ message: 'El nombre de la promocion es requerido' });
    }
    if (!['combo', 'liquidacion'].includes(normalizedType)) {
      return res.status(400).json({ message: 'Tipo invalido. Usa combo o liquidacion' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'La promocion debe incluir al menos 1 producto' });
    }

    const discount = discount_percent == null || discount_percent === '' ? null : Number(discount_percent);
    if (discount != null && (Number.isNaN(discount) || discount < 0 || discount > 100)) {
      return res.status(400).json({ message: 'Descuento invalido' });
    }

    const [promoResult] = await connection.query(
      `INSERT INTO promotions (name, type, discount_percent, active, start_date, end_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        normalizedType,
        discount,
        active ? 1 : 0,
        start_date || null,
        end_date || null,
        String(notes).trim() || null,
      ]
    );

    const promotionId = promoResult.insertId;

    for (const item of items) {
      const productId = Number(item.product_id);
      const qty = Number(item.qty) || 1;
      const priceOverride = item.price_override == null || item.price_override === ''
        ? null
        : Number(item.price_override);

      if (!Number.isInteger(productId) || productId <= 0) {
        throw new Error('Producto invalido en promocion');
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error('Cantidad invalida en promocion');
      }
      if (priceOverride != null && (!Number.isFinite(priceOverride) || priceOverride < 0)) {
        throw new Error('Precio de liquidacion invalido');
      }

      await connection.query(
        `INSERT INTO promotion_items (promotion_id, product_id, qty, price_override)
         VALUES (?, ?, ?, ?)`,
        [promotionId, productId, qty, priceOverride]
      );
    }

    await connection.commit();

    const itemsRows = await loadPromotionItems(promotionId);
    res.status(201).json({
      id: promotionId,
      name: String(name).trim(),
      type: normalizedType,
      discount_percent: discount,
      active: active ? 1 : 0,
      start_date: start_date || null,
      end_date: end_date || null,
      notes: String(notes).trim() || null,
      items: itemsRows,
    });
  } catch (err) {
    await connection.rollback();
    console.error('POST /promotions error', err);
    res.status(500).json({ message: err.message || 'Error al crear promocion' });
  } finally {
    connection.release();
  }
});

router.patch('/:id/toggle', async (req, res) => {
  try {
    await ensurePromotionsSchema();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID invalido' });
    }

    await corePool.query(
      `UPDATE promotions
       SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END
       WHERE id = ?`,
      [id]
    );

    const [rows] = await corePool.query(
      `SELECT id, name, type, discount_percent, active, start_date, end_date, notes, created_at
       FROM promotions
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Promocion no encontrada' });
    }

    const items = await loadPromotionItems(id);
    res.json({ ...rows[0], items });
  } catch (err) {
    console.error('PATCH /promotions/:id/toggle error', err);
    res.status(500).json({ message: 'Error al actualizar promocion' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await ensurePromotionsSchema();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID invalido' });
    }

    const [result] = await corePool.query('DELETE FROM promotions WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Promocion no encontrada' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /promotions/:id error', err);
    res.status(500).json({ message: 'Error al eliminar promocion' });
  }
});

router.get('/active/current', async (_req, res) => {
  try {
    await ensurePromotionsSchema();
    const today = new Date().toISOString().split('T')[0];

    const [rows] = await corePool.query(
      `SELECT id, name, type, discount_percent, active, start_date, end_date, notes, created_at
       FROM promotions
       WHERE active = 1
       AND (start_date IS NULL OR start_date <= ?)
       AND (end_date IS NULL OR end_date >= ?)
       ORDER BY id DESC`,
      [today, today]
    );

    const result = [];
    for (const row of rows) {
      const items = await loadPromotionItems(row.id);
      result.push({ ...row, items });
    }

    res.json(result);
  } catch (err) {
    console.error('GET /promotions/active/current error', err);
    res.status(500).json({ message: 'Error al obtener promociones activas' });
  }
});

export default router;
