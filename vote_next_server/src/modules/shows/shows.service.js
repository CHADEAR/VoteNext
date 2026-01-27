// vote_next_server/src/modules/shows/shows.service.js
const { pool } = require("../../config/db");

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

async function listShows(limit = 50) {
  const r = await pool.query(
    `
    SELECT
      s.id,
      s.title,
      s.created_at,
      CASE
        WHEN EXISTS (SELECT 1 FROM rounds rr WHERE rr.show_id = s.id AND rr.status='voting') THEN 'voting'
        WHEN EXISTS (SELECT 1 FROM rounds rr WHERE rr.show_id = s.id AND rr.status='pending') THEN 'pending'
        ELSE 'closed'
      END AS status
    FROM shows s
    ORDER BY s.created_at DESC
    LIMIT $1
    `,
    [limit]
  );
  return r.rows;
}

module.exports = { createShowInDb, findShowById, listShows };
