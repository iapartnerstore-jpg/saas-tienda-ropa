import { getCorePool } from '../config/coreDb.js'
import { getTenantPool } from '../config/createTenantPool.js'

export async function tenantResolver(req, res, next) {
  try {
    const host = req.headers.host || ''
    const subdomain = host.split('.')[0]
    const slug = req.headers['x-tenant'] || subdomain

    if (!slug) {
      return res.status(400).json({ error: 'Tenant no especificado' })
    }

    const corePool = getCorePool()
    const [rows] = await corePool.query(
      "SELECT * FROM tenants WHERE slug = ? AND status = 'active' LIMIT 1",
      [slug]
    )
    const tenant = rows[0]
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant no encontrado' })
    }

    req.tenant = tenant
    req.db = getTenantPool(tenant)
    next()
  } catch (err) {
    console.error('Error tenantResolver', err)
    res.status(500).json({ error: 'Error resolviendo tenant' })
  }
}
