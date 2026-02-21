// vote_next_server/src/modules/admin/admin.routes.js
const express = require("express");
const router = express.Router();
const controller = require("./admin.controller");
const { openPoll, closePoll } = require("./admin.poll.controller"); // เพิ่ม

// POST /api/admin/login
router.post("/login", controller.adminLogin);

// POST /api/admin/reset-password
router.post("/reset-password", controller.resetPassword);

// POST /api/admin/update-profile
router.post("/update-profile", controller.updateProfile);

// เพิ่ม 2 route สำหรับเทสสั่ง device แบบ realtime
// POST /api/admin/polls/open
router.post("/polls/open", express.json(), openPoll);

// POST /api/admin/polls/close
router.post("/polls/close", express.json(), closePoll);

module.exports = router;
