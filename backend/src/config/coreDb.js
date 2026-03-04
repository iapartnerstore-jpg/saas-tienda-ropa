import mysql from 'mysql2/promise'
import 'dotenv/config'

let corePool

export function getCorePool() {
  if (!corePool) {
    corePool = mysql.createPool({
      host: process.env.CORE_DB_HOST,
      user: process.env.CORE_DB_USER,
      password: process.env.CORE_DB_PASS,
      database: process.env.CORE_DB_NAME,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,

      // Límite conservador para hosting compartido
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,

      // Mantener conexiones vivas y reconectar ante caídas
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,   // ping cada 10s
      connectTimeout: 20000,          // 20s timeout de conexión
    })

    console.log('✅ Pool MySQL (singleton) inicializado con', {
      host: process.env.CORE_DB_HOST,
      database: process.env.CORE_DB_NAME,
      user: process.env.CORE_DB_USER,
      port: process.env.DB_PORT || 3306,
    })
  }
  return corePool
}
