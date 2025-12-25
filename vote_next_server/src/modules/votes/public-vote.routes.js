const express = require("express");
const router = express.Router();
const controller = require("./public-vote.controller");

router.get("/:slug", controller.getPublicVote);
router.post("/", controller.submitVote);

module.exports = router;
