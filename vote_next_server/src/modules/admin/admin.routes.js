// vote_next_server/src/modules/admin/admin.routes.js
const express = require("express");
const { adminLogin, resetPassword, updateProfile } = require("./admin.controller");
const {
  openPoll,
  closePoll,
  openRoundPoll,
  closeShowPoll,
} = require("./admin.poll.controller");
const { verifyAdminToken } = require("../../middleware/auth.middleware");

const DeviceService = require("../device/device.service");

const router = express.Router();
const controller = require("./admin.controller");

// POST /api/admin/login
router.post("/login", express.json(), adminLogin);

// POST /api/admin/reset-password
router.post("/reset-password", express.json(), resetPassword);

// POST /api/admin/update-profile  
router.post("/update-profile", express.json(), verifyAdminToken, updateProfile);

// demo open/close
router.post("/polls/open", express.json(), verifyAdminToken, openPoll);
router.post("/polls/close", express.json(), verifyAdminToken, closePoll);

// เปิดจาก DB แล้ว push ไป TFT
router.post("/polls/open-round", express.json(), verifyAdminToken, openRoundPoll);

// ปิดโพลของ show
router.post("/polls/close-show", express.json(), verifyAdminToken, closeShowPoll);

// ดู active poll (เผื่อหน้า admin ใช้)
router.get("/polls/active", verifyAdminToken, async (req, res) => {
  const showId = String(req.query.showId || "");
  if (!showId) return res.status(400).json({ ok: false, message: "showId required" });

  const payload = await DeviceService.getActivePoll(showId);
  return res.json({ ok: true, payload });
});

module.exports = router;
