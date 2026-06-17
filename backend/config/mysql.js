const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host:     process.env.MYSQL_HOST     || "localhost",
//  port:     parseInt(process.env.MYSQL_PORT || "3306"), (use this port if ur mysql is using 3306)
  port:     parseInt(process.env.MYSQL_PORT || "3308"),
  user:     process.env.MYSQL_USER     || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "medtrack",
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0
});

module.exports = pool;
