// vote_next_server/src/modules/device/device.routes.js
const express = require("express");
const { registerDevice, getActive, vote } = require("./device.controller");

const router = express.Router();

// ✅ กันกรณี app.js ไม่ได้เปิด express.json() ไว้
router.use(express.json());

router.post("/register", registerDevice);
router.get("/active", getActive);
router.post("/vote", vote);

module.exports = router;
