// vote_next_server/src/config/db.js
const { Pool } = require("pg");
const { DATABASE_URL } = require("./env");

// Fallback DATABASE_URL for development if not set
const databaseUrl = DATABASE_URL || "postgresql://postgres:password@localhost:5432/votenext";

const pool = new Pool({
  connectionString: databaseUrl,
});

pool.on("error", (err) => {
  console.error("Unexpected DB error", err);
  process.exit(1);
});

module.exports = pool;

