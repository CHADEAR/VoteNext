// vote_next_server/src/modules/admin/admin.routes.js
const express = require("express");
const { adminLogin } = require("./admin.controller");
const { openPoll, closePoll } = require("./admin.poll.controller"); // ✅ เพิ่ม

const router = express.Router();

// POST /api/admin/login
router.post("/login", adminLogin);

// ✅ เพิ่ม 2 route สำหรับเทสสั่ง device แบบ realtime
// POST /api/admin/polls/open
router.post("/polls/open", express.json(), openPoll);

// POST /api/admin/polls/close
router.post("/polls/close", express.json(), closePoll);

module.exports = router;
