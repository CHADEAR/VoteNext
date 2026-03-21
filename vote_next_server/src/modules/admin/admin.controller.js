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
      return res.status(400).json({
        error: true,
        message: "Email and password are required",
      });
    }

    const admin = await findAdminByEmail(email);
    console.log("DEBUG: Found admin =", admin);
    console.log("DEBUG: Requested email =", email);

    if (!admin) {
      return res.status(401).json({ error: true, message: "Invalid email or password" });
    }

    const isValid = verifyPassword(password, admin.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: true, message: "Invalid email or password" });
    }

    const payload = {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      type: "admin",
    };

    const secret = env.JWT_SECRET || "votenext-admin-secret";
    const token = jwt.sign(payload, secret, { expiresIn: "24h" });

    return res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        profile_img: admin.profile_img,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        error: true,
        message: "Please provide your email and a new password",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: true,
        message: "Password must be at least 6 characters long",
      });
    }

    const admin = await findAdminByEmail(email);

    if (!admin) {
      return res.status(404).json({
        error: true,
        message: "Email address not found",
      });
    }

    console.log("Admin found, updating password...");
    const success = await updateAdminPassword(admin.id, newPassword);

    if (!success) {
      return res.status(500).json({
        error: true,
        message: "Failed to update password",
      });
    }

    console.log(`Password updated for admin email: ${email}`);

    return res.json({
      success: true,
      message: "Password updated successfully",
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
      return res.status(400).json({
        error: true,
        message: "adminId and profile_img are required",
      });
    }

    console.log("DEBUG: req.admin =", req.admin);
    const admin = await findAdminByEmail(req.admin.email);

    if (!admin) {
      return res.status(404).json({
        error: true,
        message: "Admin not found",
      });
    }

    const success = await updateAdminProfileImage(adminId, profile_img);

    if (!success) {
      return res.status(500).json({
        error: true,
        message: "Failed to update profile image",
      });
    }

    console.log(`Profile image updated for admin ID: ${adminId}`);

    const payload = {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      type: "admin",
    };

    const secret = env.JWT_SECRET || "votenext-admin-secret";
    const newToken = jwt.sign(payload, secret, { expiresIn: "24h" });

    return res.json({
      success: true,
      token: newToken,
      message: "Profile image updated successfully",
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
