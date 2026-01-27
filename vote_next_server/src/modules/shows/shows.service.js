// vote_next_server/src/modules/shows/shows.service.js
const pool = require("../../config/db");

async function createShowInDb({ title, description, createdBy }) {
  const result = await pool.query(
    `INSERT INTO shows (title, description, created_by)
     VALUES ($1, $2, $3)
     RETURNING id, title, description, created_by, created_at`,
    [title, description, createdBy]
  );

  return result.rows[0];
}

async function findShowById(id) {
  const result = await pool.query(
    `SELECT id, title, description, created_by, created_at
     FROM shows
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  createShowInDb,
  findShowById,
};
