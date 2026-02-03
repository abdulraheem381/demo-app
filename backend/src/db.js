const { Pool } = require("pg");

const sslEnabled = process.env.DB_SSL === "true";
const ssl = sslEnabled
  ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
    }
  : false;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl,
});

module.exports = { pool };