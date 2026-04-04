// vote_next_server/src/config/db.js
const { Pool } = require("pg");
const { DATABASE_URL } = require("./env");

console.log("DATABASE_URL =", DATABASE_URL);
console.log("NODE_ENV =", process.env.NODE_ENV);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 50, // เพิ่มจาก default (20) → 50 รองรับ 20 คน/นาที
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.query("SELECT current_database(), current_user")
  .then((res) => {
    console.log("DB CHECK =", res.rows[0]);
  })
  .catch((err) => {
    console.error("DB CHECK ERROR =", err.message);
  });

pool.on("error", (err) => {
  console.error("Unexpected DB error", err);
  process.exit(1);
});

module.exports = { pool };