const express = require("express");
const router = express.Router();

const controller = require("./public.controller");

// GET /api/public/vote/:publicSlug
router.get("/vote/:publicSlug", controller.getPublicVote);

// POST /api/public/vote
router.post("/vote", controller.submitVote);

// GET /api/public/vote/:publicSlug/rank
router.get("/vote/:publicSlug/rank", controller.getLiveRank);

module.exports = router;
