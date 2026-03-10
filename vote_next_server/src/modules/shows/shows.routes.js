// vote_next_server/src/modules/shows/shows.routes.js
const express = require("express");
const { createShow, getShowById, getShows } = require("./shows.controller");
const { verifyAdminToken } = require("../../middleware/auth.middleware");

const router = express.Router();

// GET /api/shows (ดูรายการ shows - ไม่ต้องมี token)
router.get("/", getShows);

// POST /api/shows (สร้าง show - ต้องมี token)
router.post("/", express.json(), verifyAdminToken, createShow);

// GET /api/shows/:id (ดู show ตาม id - ไม่ต้องมี token)
router.get("/:id", getShowById);

module.exports = router;
