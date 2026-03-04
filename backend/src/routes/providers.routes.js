import { Router } from 'express';
import corePool from '../utils/tenantDb.js';

const router = Router();

let schemaReady = false;

const ensureProvidersSchema = async () => {
  if (schemaReady) return;

  await corePool.query(`
    CREATE TABLE IF NOT EXISTS providers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      contact_name VARCHAR(120) NULL,
      phone VARCHAR(60) NULL,
      email VARCHAR(160) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  await corePool.query(`
    CREATE TABLE IF NOT EXISTS provider_trips (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      provider_id  INT NULL,
      destination  VARCHAR(200) NOT NULL,
      trip_date    DATE NOT NULL,
      return_date  DATE NULL,
      total_spent  DECIMAL(12,2) NULL DEFAULT 0,
      notes        TEXT NULL,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB
  `);

  schemaReady = true;
};

router.get('/', async (_req, res) => {
  try {
    await ensureProvidersSchema();
    const [rows] = await corePool.query(
      `SELECT id, name, contact_name, phone, email, notes, created_at
       FROM providers
       ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /providers error', err);
    res.status(500).json({ message: 'Error al obtener proveedores' });
  }
});

router.post('/', async (req, res) => {
  try {
    await ensureProvidersSchema();
    const { name = '', contact_name = '', phone = '', email = '', notes = '' } = req.body || {};

    if (!String(name).trim()) {
      return res.status(400).json({ message: 'El nombre del proveedor es requerido' });
    }

    const [result] = await corePool.query(
      `INSERT INTO providers (name, contact_name, phone, email, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        String(contact_name).trim() || null,
        String(phone).trim() || null,
        String(email).trim() || null,
        String(notes).trim() || null,
      ]
    );

    res.status(201).json({
      id: result.insertId,
      name: String(name).trim(),
      contact_name: String(contact_name).trim() || null,
      phone: String(phone).trim() || null,
      email: String(email).trim() || null,
      notes: String(notes).trim() || null,
    });
  } catch (err) {
    console.error('POST /providers error', err);
    res.status(500).json({ message: 'Error al crear proveedor' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    await ensureProvidersSchema();
    const id = Number(req.params.id);
    const { name = '', contact_name = '', phone = '', email = '', notes = '' } = req.body || {};

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID invalido' });
    }

    if (!String(name).trim()) {
      return res.status(400).json({ message: 'El nombre del proveedor es requerido' });
    }

    const [result] = await corePool.query(
      `UPDATE providers
       SET name = ?, contact_name = ?, phone = ?, email = ?, notes = ?
       WHERE id = ?`,
      [
        String(name).trim(),
        String(contact_name).trim() || null,
        String(phone).trim() || null,
        String(email).trim() || null,
        String(notes).trim() || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    res.json({
      id,
      name: String(name).trim(),
      contact_name: String(contact_name).trim() || null,
      phone: String(phone).trim() || null,
      email: String(email).trim() || null,
      notes: String(notes).trim() || null,
    });
  } catch (err) {
    console.error('PUT /providers/:id error', err);
    res.status(500).json({ message: 'Error al editar proveedor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await ensureProvidersSchema();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID invalido' });
    }

    const [result] = await corePool.query('DELETE FROM providers WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /providers/:id error', err);
    res.status(500).json({ message: 'Error al eliminar proveedor' });
  }
});

// ============================================================
// VIAJES A PROVEEDORES
// ============================================================

// GET /providers/trips  — todos los viajes (con nombre del proveedor)
router.get('/trips', async (_req, res) => {
  try {
    await ensureProvidersSchema();
    const [rows] = await corePool.query(
      `SELECT t.id, t.provider_id, p.name AS provider_name,
              t.destination, t.trip_date, t.return_date,
              t.total_spent, t.notes, t.created_at
       FROM provider_trips t
       LEFT JOIN providers p ON p.id = t.provider_id
       ORDER BY t.trip_date DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /providers/trips error', err);
    res.status(500).json({ message: 'Error al obtener viajes' });
  }
});

// POST /providers/trips  — crear viaje
router.post('/trips', async (req, res) => {
  try {
    await ensureProvidersSchema();
    const {
      provider_id = null,
      destination = '',
      trip_date = '',
      return_date = null,
      total_spent = 0,
      notes = '',
    } = req.body || {};

    if (!String(destination).trim()) {
      return res.status(400).json({ message: 'El destino es requerido' });
    }
    if (!trip_date) {
      return res.status(400).json({ message: 'La fecha de viaje es requerida' });
    }

    const [result] = await corePool.query(
      `INSERT INTO provider_trips (provider_id, destination, trip_date, return_date, total_spent, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        provider_id ? Number(provider_id) : null,
        String(destination).trim(),
        trip_date,
        return_date || null,
        Number(total_spent) || 0,
        String(notes).trim() || null,
      ]
    );

    const [rows] = await corePool.query(
      `SELECT t.id, t.provider_id, p.name AS provider_name,
              t.destination, t.trip_date, t.return_date,
              t.total_spent, t.notes, t.created_at
       FROM provider_trips t
       LEFT JOIN providers p ON p.id = t.provider_id
       WHERE t.id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /providers/trips error', err);
    res.status(500).json({ message: 'Error al crear viaje' });
  }
});

// PUT /providers/trips/:id  — editar viaje
router.put('/trips/:id', async (req, res) => {
  try {
    await ensureProvidersSchema();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID invalido' });
    }

    const {
      provider_id = null,
      destination = '',
      trip_date = '',
      return_date = null,
      total_spent = 0,
      notes = '',
    } = req.body || {};

    if (!String(destination).trim()) {
      return res.status(400).json({ message: 'El destino es requerido' });
    }
    if (!trip_date) {
      return res.status(400).json({ message: 'La fecha de viaje es requerida' });
    }

    const [result] = await corePool.query(
      `UPDATE provider_trips
       SET provider_id = ?, destination = ?, trip_date = ?,
           return_date = ?, total_spent = ?, notes = ?
       WHERE id = ?`,
      [
        provider_id ? Number(provider_id) : null,
        String(destination).trim(),
        trip_date,
        return_date || null,
        Number(total_spent) || 0,
        String(notes).trim() || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Viaje no encontrado' });
    }

    const [rows] = await corePool.query(
      `SELECT t.id, t.provider_id, p.name AS provider_name,
              t.destination, t.trip_date, t.return_date,
              t.total_spent, t.notes, t.created_at
       FROM provider_trips t
       LEFT JOIN providers p ON p.id = t.provider_id
       WHERE t.id = ?`,
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /providers/trips/:id error', err);
    res.status(500).json({ message: 'Error al editar viaje' });
  }
});

// DELETE /providers/trips/:id
router.delete('/trips/:id', async (req, res) => {
  try {
    await ensureProvidersSchema();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'ID invalido' });
    }

    const [result] = await corePool.query('DELETE FROM provider_trips WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Viaje no encontrado' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /providers/trips/:id error', err);
    res.status(500).json({ message: 'Error al eliminar viaje' });
  }
});

export default router;
