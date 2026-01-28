// vote_next_server/src/routes/index.js
const express = require("express");

const adminRoutes = require("../modules/admin/admin.routes");
const showRoutes = require("../modules/shows/shows.routes");
const roomRoutes = require("../modules/rooms/rooms.routes");
const publicRoutes = require("../modules/public/public.routes");
const roundsRoutes = require("../modules/rounds/rounds.routes");

// ✅ add device routes
const deviceRoutes = require("../modules/device/device.routes");

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/shows", showRoutes);
router.use("/rooms", roomRoutes);
router.use("/public", publicRoutes);
router.use("/rounds", roundsRoutes);

// ✅ mount device api
router.use("/device", deviceRoutes);

module.exports = router;
