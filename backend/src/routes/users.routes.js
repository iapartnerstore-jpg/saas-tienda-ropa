import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { tenantResolver } from '../middleware/tenantResolver.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Resolver tenant en todas las rutas (necesario para req.db)
router.use(tenantResolver)

// ── /me: cualquier usuario autenticado puede editar su propio perfil ──
router.put('/me', requireAuth, async (req, res) => {
  const userId = req.user.sub
  const { name, current_password, new_password } = req.body

  try {
    // Obtener usuario actual
    const [rows] = await req.db.query(
      'SELECT id, password_hash FROM store_users WHERE id = ? LIMIT 1',
      [userId]
    )
    const user = rows[0]
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const fields = []
    const values = []

    if (name !== undefined) {
      fields.push('name = ?')
      values.push(name)
    }

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Se requiere la contraseña actual para cambiarla' })
      }
      const ok = await bcrypt.compare(current_password, user.password_hash)
      if (!ok) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' })
      }
      const hash = await bcrypt.hash(new_password, 10)
      fields.push('password_hash = ?')
      values.push(hash)
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nada que actualizar' })
    }

    values.push(userId)
    await req.db.query(
      `UPDATE store_users SET ${fields.join(', ')} WHERE id = ?`,
      values
    )

    // Devolver datos actualizados
    const [updated] = await req.db.query(
      'SELECT id, email, name, role, active, permissions FROM store_users WHERE id = ? LIMIT 1',
      [userId]
    )
    const u = updated[0]
    u.permissions = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions

    res.json({ user: u })
  } catch (err) {
    console.error('Error PUT /users/me:', err)
    res.status(500).json({ error: 'Error al actualizar perfil' })
  }
})

// ── A partir de aquí solo admins ──
router.use(requireAuth)
router.use(requireRole('admin'))

// GET / — listar todos los usuarios
router.get('/', async (req, res) => {
  try {
    const [rows] = await req.db.query(
      'SELECT id, email, name, role, active, permissions FROM store_users ORDER BY id ASC'
    )
    const users = rows.map(u => ({
      ...u,
      permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions
    }))
    res.json(users)
  } catch (err) {
    console.error('Error GET /users:', err)
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

// POST / — crear usuario
router.post('/', async (req, res) => {
  const { name, email, password, role, active = 1, permissions = null } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' })
  }

  try {
    // Verificar que el email no exista
    const [existing] = await req.db.query(
      'SELECT id FROM store_users WHERE email = ? LIMIT 1',
      [email.toLowerCase()]
    )
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' })
    }

    const hash = await bcrypt.hash(password, 10)
    const permJson = permissions ? JSON.stringify(permissions) : null

    const [result] = await req.db.query(
      'INSERT INTO store_users (email, password_hash, role, name, active, permissions) VALUES (?, ?, ?, ?, ?, ?)',
      [email.toLowerCase(), hash, role || 'employee', name || '', active, permJson]
    )

    const [rows] = await req.db.query(
      'SELECT id, email, name, role, active, permissions FROM store_users WHERE id = ? LIMIT 1',
      [result.insertId]
    )
    const u = rows[0]
    u.permissions = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions

    res.status(201).json(u)
  } catch (err) {
    console.error('Error POST /users:', err)
    res.status(500).json({ error: 'Error al crear usuario' })
  }
})

// PUT /:id — actualizar usuario
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const { name, email, password, role, active, permissions } = req.body

  const fields = []
  const values = []

  if (name !== undefined) { fields.push('name = ?'); values.push(name) }
  if (email !== undefined) { fields.push('email = ?'); values.push(email.toLowerCase()) }
  if (role !== undefined) { fields.push('role = ?'); values.push(role) }
  if (active !== undefined) { fields.push('active = ?'); values.push(active ? 1 : 0) }
  if (permissions !== undefined) { fields.push('permissions = ?'); values.push(JSON.stringify(permissions)) }

  if (password) {
    const hash = await bcrypt.hash(password, 10)
    fields.push('password_hash = ?')
    values.push(hash)
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'Nada que actualizar' })
  }

  try {
    values.push(id)
    await req.db.query(
      `UPDATE store_users SET ${fields.join(', ')} WHERE id = ?`,
      values
    )

    const [rows] = await req.db.query(
      'SELECT id, email, name, role, active, permissions FROM store_users WHERE id = ? LIMIT 1',
      [id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' })

    const u = rows[0]
    u.permissions = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions

    res.json(u)
  } catch (err) {
    console.error('Error PUT /users/:id:', err)
    res.status(500).json({ error: 'Error al actualizar usuario' })
  }
})

// DELETE /:id — eliminar usuario
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)

  // Prevenir auto-eliminación
  if (req.user.sub === id) {
    return res.status(403).json({ error: 'No podés eliminar tu propio usuario' })
  }

  try {
    const [result] = await req.db.query('DELETE FROM store_users WHERE id = ?', [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('Error DELETE /users/:id:', err)
    res.status(500).json({ error: 'Error al eliminar usuario' })
  }
})

export default router
