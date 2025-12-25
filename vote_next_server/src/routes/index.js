// vote_next_server/src/routes/index.js
const express = require("express");

const healthRoutes = require("../modules/health/health.routes");
const adminRoutes = require("../modules/admin/admin.routes");
const showRoutes = require("../modules/shows/shows.routes");
const roomRoutes = require("../modules/rooms/rooms.routes");
const publicRoutes = require("../modules/public/public.routes");

// ✅ add device routes
const deviceRoutes = require("../modules/device/device.routes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/admin", adminRoutes);
router.use("/shows", showRoutes);
router.use("/rooms", roomRoutes);
router.use("/public", publicRoutes);

// ✅ mount device api
router.use("/device", deviceRoutes);

module.exports = router;
