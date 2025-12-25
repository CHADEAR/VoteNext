const express = require("express");
const router = express.Router();
const publicController = require("./public.controller");

// GET /api/public/vote/:slug
router.get("/vote/:slug", publicController.getPublicVote);
router.post("/vote", publicController.submitVote);

module.exports = router;

