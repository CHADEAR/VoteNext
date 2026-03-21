const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const controller = require("./public.controller");

const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Please try again in 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: "Too many votes submitted. Please try again in 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/vote/:publicSlug", controller.getPublicVote);
router.post("/vote/:publicSlug/verify-email", verifyEmailLimiter, controller.verifyEmail);
router.post("/vote", voteLimiter, controller.submitVote);
router.post("/vote/:publicSlug/check-vote", controller.checkIfVoted);
router.get("/vote/:publicSlug/rank", controller.getLiveRank);

module.exports = router;
