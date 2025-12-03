const { Pool } = require("pg");
const { DATABASE_URL } = require("./env");

const pool = new Pool({
  connectionString: DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("Unexpected DB error", err);
  process.exit(1);
});

module.exports = { pool };

