// vote_next_server/src/modules/admin/admin.controller.js
const jwt = require("jsonwebtoken");
const env = require("../../config/env");
const {
  findAdminByEmail,
  verifyPassword,
  updateAdminPassword,
  updateAdminProfileImage,
} = require("./admin.service");

async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: true, message: "email และ password จำเป็นต้องกรอก" });
    }

    const admin = await findAdminByEmail(email);

    if (!admin) {
      return res
        .status(401)
        .json({ error: true, message: "Invalid email or password" });
    }

    const isValid = verifyPassword(password, admin.password_hash);

    if (!isValid) {
      return res
        .status(401)
        .json({ error: true, message: "Invalid email or password" });
    }

    // Generate JWT token
    const payload = {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      type: 'admin'
    };
    
    const secret = env.JWT_SECRET || "votenext-admin-secret";
    const token = jwt.sign(payload, secret, { expiresIn: '24h' });

    return res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        profile_img: admin.profile_img
      }
    });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res
        .status(400)
        .json({ error: true, message: "กรุณากรอก email และรหัสผ่านใหม่" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: true, message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
    }

    const admin = await findAdminByEmail(email);

    if (!admin) {
      return res
        .status(404)
        .json({ error: true, message: "ไม่พบ email นี้ในระบบ" });
    }

    console.log("Admin found, updating password...");
    // อัพเดตรหัสผ่านใหม่ (ในระบบจริงควรใช้ bcrypt)
    const success = await updateAdminPassword(admin.id, newPassword);

    if (!success) {
      return res
        .status(500)
        .json({ error: true, message: "อัพเดตรหัสผ่านไม่สำเร็จ" });
    }
    
    console.log(`Password updated for admin email: ${email}`);
    
    return res.json({
      success: true,
      message: "รหัสผ่านได้รับการอัพเดตเรียบร้อยแล้ว"
    });
  } catch (err) {
    console.error("Reset password error:", err);
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { adminId, profile_img } = req.body;

    if (!adminId || !profile_img) {
      return res
        .status(400)
        .json({ error: true, message: "กรุณาระบุ adminId และ profile_img" });
    }

    // อัพเดตรูปภาพใน database
    const success = await updateAdminProfileImage(adminId, profile_img);

    if (!success) {
      return res
        .status(500)
        .json({ error: true, message: "อัพเดตรูปภาพไม่สำเร็จ" });
    }
    
    console.log(`Profile image updated for admin ID: ${adminId}`);
    
    return res.json({
      success: true,
      message: "อัพเดตรูปภาพสำเร็จแล้ว"
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  adminLogin,
  resetPassword,
  updateProfile,
};
