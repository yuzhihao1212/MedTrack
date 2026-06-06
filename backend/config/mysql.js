const mysql = require("mysql2/promise");

// shared connection pool for all routes
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3308),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "medtrack",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function testMySQLConnection() {
  // acquire and ping one connection to validate credentials/network
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testMySQLConnection
};
