// vote_next_server/src/modules/rooms/rooms.routes.js
const express = require("express");
const { createRoom } = require("./rooms.controller");

const router = express.Router();

// TODO: ภายหลังค่อยใส่ authAdmin ถ้าจะล็อกเฉพาะ admin

// POST /api/rooms
router.post("/", createRoom);

module.exports = router;
