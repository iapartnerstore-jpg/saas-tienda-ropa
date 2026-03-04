import mysql from 'mysql2/promise'

const tenantPools = new Map()

export function getTenantPool(tenant) {
  if (!tenant) throw new Error('Tenant requerido')
  const key = tenant.slug
  if (tenantPools.has(key)) return tenantPools.get(key)

  const pool = mysql.createPool({
    host: tenant.db_host,
    user: tenant.db_user,
    password: tenant.db_pass,
    database: tenant.db_name,
    waitForConnections: true,
    connectionLimit: 10
  })

  tenantPools.set(key, pool)
  return pool
}
