// vote_next_server/src/modules/shows/shows.routes.js
const express = require("express");
const { createShow, getShowById, getShows } = require("./shows.controller");

const router = express.Router();

// GET /api/shows
router.get("/", getShows);

// POST /api/shows  (รับ JSON)
router.post("/", express.json(), createShow);

// GET /api/shows/:id
router.get("/:id", getShowById);

module.exports = router;
