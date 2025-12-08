// vote_next_server/src/modules/admin/admin.controller.js
const {
  findAdminByEmail,
  verifyPassword,
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

    return res.json({
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  adminLogin,
};
