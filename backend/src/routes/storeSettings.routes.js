import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getCorePool } from '../config/coreDb.js';

const router = Router();

let schemaReady = false;

async function ensureStoreSettingsSchema() {
  if (schemaReady) return;
  const pool = getCorePool();

  await pool.query(
    `ALTER TABLE store_settings
     ADD COLUMN IF NOT EXISTS background_color VARCHAR(20) NULL`
  );

  await pool.query(
    `ALTER TABLE store_settings
     MODIFY COLUMN logo_url TEXT NULL`
  );

  schemaReady = true;
}

function mapRowToResponse(row) {
  return {
    storeName: row.store_name,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    backgroundColor: row.background_color || '#0f172a',
    logoUrl: row.logo_url,
    ticketFooter: row.ticket_footer,
  };
}

/**
 * GET /store/settings
 * Devuelve la configuración (fila id = 1) en camelCase para el frontend
 */
router.get('/', async (req, res) => {
  try {
    await ensureStoreSettingsSchema();

    const [rows] = await getCorePool().query(
      `SELECT id,
              store_name,
              primary_color,
              accent_color,
              background_color,
              logo_url,
              ticket_footer
       FROM store_settings
       WHERE id = 1`
    );

    if (!rows.length) {
      // Valores por defecto (también en camelCase)
      return res.json({
        storeName: 'SaaS Tienda',
        primaryColor: '#38bdf8',
        accentColor: '#22c55e',
        backgroundColor: '#0f172a',
        logoUrl: '',
        ticketFooter:
          'Gracias por su compra. No se aceptan cambios pasados los 30 días.',
      });
    }

    res.json(mapRowToResponse(rows[0]));
  } catch (err) {
    console.error('❌ Error GET /store/settings:', err);
    res.status(500).json({
      message: err.sqlMessage || 'Error cargando configuración de tienda',
    });
  }
});

/**
 * PUT /store/settings
 * Guarda/actualiza configuración (id = 1)
 * Acepta tanto camelCase como snake_case en el body.
 * Requiere autenticación.
 */
router.put('/', requireAuth, async (req, res) => {
  try {
    await ensureStoreSettingsSchema();

    const b = req.body;

    const storeName =
      b.storeName || b.store_name || 'SaaS Tienda';

    const primaryColor =
      b.primaryColor || b.primary_color || '#38bdf8';

    const accentColor =
      b.accentColor || b.accent_color || '#22c55e';

    const backgroundColor =
      b.backgroundColor || b.background_color || '#0f172a';

    const logoUrl =
      b.logoUrl || b.logo_url || '';

    const ticketFooter =
      b.ticketFooter ||
      b.ticket_footer ||
      'Gracias por su compra. No se aceptan cambios pasados los 30 días.';

    await getCorePool().query(
      `INSERT INTO store_settings
         (id, store_name, primary_color, accent_color, background_color, logo_url, ticket_footer)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
          store_name = VALUES(store_name),
          primary_color = VALUES(primary_color),
          accent_color = VALUES(accent_color),
          background_color = VALUES(background_color),
          logo_url = VALUES(logo_url),
          ticket_footer = VALUES(ticket_footer)`,
      [storeName, primaryColor, accentColor, backgroundColor, logoUrl, ticketFooter]
    );

    const [rows] = await getCorePool().query(
      `SELECT id,
              store_name,
              primary_color,
              accent_color,
              background_color,
              logo_url,
              ticket_footer
       FROM store_settings
       WHERE id = 1`
    );

    res.json(mapRowToResponse(rows[0]));
  } catch (err) {
    console.error('❌ Error PUT /store/settings:', err);
    res.status(500).json({
      message: err.sqlMessage || 'Error guardando configuración de tienda',
    });
  }
});

export default router;
