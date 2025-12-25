// vote_next_server/src/modules/device/device.routes.js
const express = require("express");
const { registerDevice, getActive, vote } = require("./device.controller");

const router = express.Router();

router.post("/register", registerDevice);
router.get("/active", getActive);
router.post("/vote", vote);

module.exports = router;
