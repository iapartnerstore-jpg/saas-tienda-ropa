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

    // Verificar si ya existen usuarios
    const [users] = await db.query('SELECT COUNT(*) as count FROM store_users')
    if (users[0].count === 0) {
      // Crear admin
      const adminHash = await bcrypt.hash('Yaninaadmin2026', 10)
      await db.query(
        'INSERT INTO store_users (email, password_hash, role) VALUES (?, ?, ?)',
        ['admin', adminHash, 'admin']
      )

      // Crear usuario regular
      const userHash = await bcrypt.hash('usuario2026', 10)
      await db.query(
        'INSERT INTO store_users (email, password_hash, role) VALUES (?, ?, ?)',
        ['usuario', userHash, 'employee']
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
      "SELECT id, email, password_hash, role FROM store_users WHERE email = ? LIMIT 1",
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

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        tenant: req.tenant.slug
      },
      process.env.JWT_SECRET || 'changeme',
      { expiresIn: '8h' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    })
  } catch (err) {
    console.error('Error login', err)
    res.status(500).json({ error: 'Error en login' })
  }
})

export default router
