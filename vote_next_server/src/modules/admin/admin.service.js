// vote_next_server/src/modules/admin/admin.service.js
const pool = require("../../config/db");

async function findAdminByEmail(email) {
  const result = await pool.query(
    `SELECT id, email, password_hash, full_name
     FROM admins
     WHERE email = $1`,
    [email]
  );

  return result.rows[0] || null;
}

function verifyPassword(plainPassword, storedPasswordHash) {
  // ตอนนี้เทียบตรง ๆ ก่อน
  return plainPassword === storedPasswordHash;
}

module.exports = {
  findAdminByEmail,
  verifyPassword,
};
