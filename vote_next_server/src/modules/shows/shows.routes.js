// vote_next_server/src/modules/shows/shows.routes.js
const express = require("express");
const { createShow, getShowById } = require("./shows.controller");

const router = express.Router();

// TODO: ภายหลังค่อยใส่ authAdmin ถ้าจะให้เฉพาะ admin ใช้

// POST /api/shows
router.post("/", createShow);

// GET /api/shows/:id
router.get("/:id", getShowById);

module.exports = router;
