// vote_next_server/src/modules/admin/admin.routes.js
const express = require("express");
const { adminLogin } = require("./admin.controller");
const {
  openPoll,
  closePoll,
  openRoundPoll,
  closeShowPoll,
} = require("./admin.poll.controller");

const DeviceService = require("../device/device.service");

const router = express.Router();
const controller = require("./admin.controller");
const { openPoll, closePoll } = require("./admin.poll.controller"); // เพิ่ม

// POST /api/admin/login
router.post("/login", express.json(), adminLogin);

// demo open/close
router.post("/polls/open", express.json(), openPoll);
router.post("/polls/close", express.json(), closePoll);

// เปิดจาก DB แล้ว push ไป TFT
router.post("/polls/open-round", express.json(), openRoundPoll);

// ปิดโพลของ show
router.post("/polls/close-show", express.json(), closeShowPoll);

// ดู active poll (เผื่อหน้า admin ใช้)
router.get("/polls/active", async (req, res) => {
  const showId = String(req.query.showId || "");
  if (!showId) return res.status(400).json({ ok: false, message: "showId required" });

  const payload = await DeviceService.getActivePoll(showId);
  return res.json({ ok: true, payload });
});

module.exports = router;
