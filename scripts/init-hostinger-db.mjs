import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const required = ["CORE_DB_HOST", "CORE_DB_NAME", "CORE_DB_USER", "CORE_DB_PASS"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error("Faltan variables de entorno:", missing.join(", "));
  process.exit(1);
}

const dbConfig = {
  host: process.env.CORE_DB_HOST,
  user: process.env.CORE_DB_USER,
  password: process.env.CORE_DB_PASS,
  database: process.env.CORE_DB_NAME,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  multipleStatements: true,
};

const sqlStatements = [
  `CREATE TABLE IF NOT EXISTS tenants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      db_host VARCHAR(191) NOT NULL,
      db_name VARCHAR(191) NOT NULL,
      db_user VARCHAR(191) NOT NULL,
      db_pass VARCHAR(191) NOT NULL,
      status ENUM('active','suspended') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS store_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(180) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'employee',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      category VARCHAR(50) NOT NULL,
      department VARCHAR(32) NULL,
      size VARCHAR(64) NULL,
      color VARCHAR(64) NULL,
      model VARCHAR(128) NULL,
      season VARCHAR(64) NULL,
      brand VARCHAR(128) NULL,
      description TEXT NULL,
      cost DECIMAL(12,2) NOT NULL DEFAULT 0,
      price DECIMAL(12,2) NOT NULL DEFAULT 0,
      stock INT NOT NULL DEFAULT 0,
      stock_min INT NOT NULL DEFAULT 10,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      phone VARCHAR(60) NULL,
      dni VARCHAR(60) NULL,
      balance DECIMAL(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS sales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_number INT NOT NULL,
      total DECIMAL(12,2) NOT NULL,
      payment_method VARCHAR(40) NOT NULL,
      customer_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sales_ticket (ticket_number),
      INDEX idx_sales_customer (customer_id),
      INDEX idx_sales_created (created_at)
    ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS sale_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sale_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(12,2) NOT NULL,
      INDEX idx_sale_items_sale (sale_id),
      INDEX idx_sale_items_product (product_id)
    ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS sale_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sale_id INT NOT NULL,
      payment_method VARCHAR(40) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sale_payments_sale (sale_id),
      INDEX idx_sale_payments_method (payment_method)
    ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS store_settings (
      id INT PRIMARY KEY,
      store_name VARCHAR(180) NOT NULL,
      primary_color VARCHAR(20) NOT NULL DEFAULT '#38bdf8',
      accent_color VARCHAR(20) NOT NULL DEFAULT '#22c55e',
      background_color VARCHAR(20) NULL,
      logo_url TEXT NULL,
      ticket_footer TEXT NULL
    ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS providers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      contact_name VARCHAR(120) NULL,
      phone VARCHAR(60) NULL,
      email VARCHAR(160) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS provider_trips (
      id INT AUTO_INCREMENT PRIMARY KEY,
      provider_id INT NULL,
      destination VARCHAR(200) NOT NULL,
      trip_date DATE NOT NULL,
      return_date DATE NULL,
      total_spent DECIMAL(12,2) NULL DEFAULT 0,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_provider_trips_provider (provider_id)
    ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS promotions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      type VARCHAR(30) NOT NULL,
      discount_percent DECIMAL(5,2) NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      start_date DATE NULL,
      end_date DATE NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS promotion_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      promotion_id INT NOT NULL,
      product_id INT NOT NULL,
      qty INT NOT NULL DEFAULT 1,
      price_override DECIMAL(10,2) NULL,
      INDEX idx_promotion_items_promotion (promotion_id),
      INDEX idx_promotion_items_product (product_id)
    ) ENGINE=InnoDB`,
];

async function main() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    console.log("Conectado a MySQL:", dbConfig.host, dbConfig.database);

    for (const sql of sqlStatements) {
      await conn.query(sql);
    }

    const tenantRows = [
      ["Tienda Alex", "tiendaalex"],
      ["ModaShop", "modashop"],
    ];

    for (const [name, slug] of tenantRows) {
      await conn.query(
        `INSERT INTO tenants (name, slug, db_host, db_name, db_user, db_pass, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           db_host = VALUES(db_host),
           db_name = VALUES(db_name),
           db_user = VALUES(db_user),
           db_pass = VALUES(db_pass),
           status = 'active'`,
        [
          name,
          slug,
          process.env.CORE_DB_HOST,
          process.env.CORE_DB_NAME,
          process.env.CORE_DB_USER,
          process.env.CORE_DB_PASS,
        ]
      );
    }

    await conn.query(
      `INSERT INTO store_settings (id, store_name, primary_color, accent_color, background_color, logo_url, ticket_footer)
       VALUES (1, 'Tienda Alex', '#38bdf8', '#22c55e', '#0f172a', '', 'Gracias por su compra. No se aceptan cambios pasados los 30 días.')
       ON DUPLICATE KEY UPDATE
         store_name = VALUES(store_name),
         primary_color = VALUES(primary_color),
         accent_color = VALUES(accent_color),
         background_color = VALUES(background_color),
         logo_url = VALUES(logo_url),
         ticket_footer = VALUES(ticket_footer)`
    );

    console.log("OK: Tablas creadas y tenants inicializados (tiendaalex, modashop)");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Error inicializando DB:", err.message);
  process.exit(1);
});
