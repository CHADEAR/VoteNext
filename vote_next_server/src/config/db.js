// vote_next_server/src/config/db.js
const { Pool } = require("pg");
const { DATABASE_URL } = require("./env");

// const pool = new Pool({
//   connectionString: DATABASE_URL,
// });

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Unexpected DB error", err);
  process.exit(1);
});

module.exports = { pool };

