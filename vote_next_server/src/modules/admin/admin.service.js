// vote_next_server/src/modules/admin/admin.service.js
const { pool } = require("../../config/db");

let bcrypt = null;
try {
  bcrypt = require("bcrypt");
} catch (err) {
  // ถ้ายังไม่ติดตั้ง bcrypt ก็จะ fallback เป็น plain compare ได้
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
  if (!bcrypt) {
    // Fallback ถ้าไม่มี bcrypt (ไม่ควรเกิดใน production)
    return plainPassword === storedPasswordHash;
  }
  return bcrypt.compareSync(plainPassword, storedPasswordHash);
}

async function updateAdminPassword(adminId, newPassword) {
  try {
    let hashedPassword = newPassword;
    if (bcrypt) {
      hashedPassword = bcrypt.hashSync(newPassword, 10);
    }
    
    const result = await pool.query(
      `UPDATE admins 
       SET password_hash = $1 
       WHERE id = $2`,
      [hashedPassword, adminId]
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
