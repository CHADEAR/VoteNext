// vote_next_server/src/modules/admin/admin.service.js
const { pool } = require("../../config/db");

let bcrypt = null;
try {
  bcrypt = require("bcryptjs");
} catch (_) {
  // ถ้ายังไม่ติดตั้ง bcryptjs ก็จะ fallback เป็น plain compare ได้
}

async function findAdminByEmail(email) {
  try {
    const result = await pool.query(
      `SELECT id, email, password_hash, full_name, profile_img
       FROM admins
       WHERE email = $1`,
      [email]
    );
    return result.rows[0] || null;
  } catch (err) {
    if (err.code === "42703") {
      // column "profile_img" does not exist (ยังไม่ได้รัน migration)
      const result = await pool.query(
        `SELECT id, email, password_hash, full_name
         FROM admins
         WHERE email = $1`,
        [email]
      );
      const row = result.rows[0] || null;
      if (row) row.profile_img = null;
      return row;
    }
    throw err;
  }
}

function verifyPassword(plainPassword, storedPasswordHash) {
  // ตอนนี้เทียบตรง ๆ ก่อน
  return plainPassword === storedPasswordHash;
}

async function updateAdminPassword(adminId, newPassword) {
  try {
    const result = await pool.query(
      `UPDATE admins 
       SET password_hash = $1 
       WHERE id = $2`,
      [newPassword, adminId] // ในระบบจริงควรใช้ bcrypt.hash(newPassword)
    );
    
    return result.rowCount > 0;
  } catch (error) {
    console.error("Error updating admin password:", error);
    return false;
  }
}

async function updateAdminProfileImage(adminId, profileImageUrl) {
  try {
    const result = await pool.query(
      `UPDATE admins 
       SET profile_img = $1 
       WHERE id = $2`,
      [profileImageUrl, adminId]
    );
    
    return result.rowCount > 0;
  } catch (error) {
    console.error("Error updating admin profile image:", error);
    return false;
  }
}

module.exports = {
  findAdminByEmail,
  verifyPassword,
  updateAdminPassword,
  updateAdminProfileImage,
};
