// vote_next_server/src/routes/index.js
const express = require("express");
const healthRoutes = require("../modules/health/health.routes");
const adminRoutes = require("../modules/admin/admin.routes"); // ✅ นี่สำคัญ

const router = express.Router();

// เส้น Health Check
router.use("/health", healthRoutes);

// เส้น Admin
router.use("/admin", adminRoutes); // ✅ map /api/admin → admin.routes

module.exports = router;
