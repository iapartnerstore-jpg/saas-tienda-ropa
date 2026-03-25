import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { tenantResolver } from '../../middleware/tenantResolver.js'

const router = Router()

// Crear tabla y usuarios si no existen
const ensureUsersTableAndData = async (db) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS store_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(180) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'employee',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `)

    // Agregar columnas nuevas si no existen (migracion idempotente)
    await db.query(`ALTER TABLE store_users ADD COLUMN IF NOT EXISTS name VARCHAR(100) NULL`)
    await db.query(`ALTER TABLE store_users ADD COLUMN IF NOT EXISTS active TINYINT(1) NOT NULL DEFAULT 1`)
    await db.query(`ALTER TABLE store_users ADD COLUMN IF NOT EXISTS permissions JSON NULL`)

    // Verificar si ya existen usuarios
    const [users] = await db.query('SELECT COUNT(*) as count FROM store_users')
    if (users[0].count === 0) {
      // Crear admin
      const adminHash = await bcrypt.hash('Yaninaadmin2026', 10)
      await db.query(
        'INSERT INTO store_users (email, password_hash, role, name) VALUES (?, ?, ?, ?)',
        ['admin', adminHash, 'admin', 'Administrador']
      )

      // Crear usuario regular
      const userHash = await bcrypt.hash('usuario2026', 10)
      await db.query(
        'INSERT INTO store_users (email, password_hash, role, name) VALUES (?, ?, ?, ?)',
        ['usuario', userHash, 'employee', 'Empleado']
      )
    }
  } catch (err) {
    console.error('Error en ensureUsersTableAndData:', err)
  }
}

// Login ejemplo mínimo: busca usuario en la DB de la tienda
router.post('/login', tenantResolver, async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password requeridos' })
  }

  try {
    // Asegurar que la tabla y usuarios existan
    await ensureUsersTableAndData(req.db)

    // Buscar por email o por usuario (email también se usa como username)
    const [rows] = await req.db.query(
      "SELECT id, email, password_hash, role, name, active, permissions FROM store_users WHERE email = ? LIMIT 1",
      [email.toLowerCase()]
    )
    const user = rows[0]
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Usuario inactivo' })
    }

    const permissions = typeof user.permissions === 'string'
      ? JSON.parse(user.permissions)
      : user.permissions

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        name: user.name,
        tenant: req.tenant.slug
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        permissions
      }
    })
  } catch (err) {
    console.error('Error login', err)
    res.status(500).json({ error: 'Error en login' })
  }
})

export default router
