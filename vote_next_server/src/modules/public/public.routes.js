const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const controller = require("./public.controller");

// Rate limit: กัน spam verify-email (ต่อ IP)
const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "ลองใหม่อีกครั้งใน 15 นาที" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit: กัน spam โหวต
const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: "โหวตบ่อยเกินไป ลองใหม่อีกครั้งใน 15 นาที" },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/public/vote/:publicSlug
router.get("/vote/:publicSlug", controller.getPublicVote);

// POST /api/public/vote/:publicSlug/verify-email (format, MX, Hunter, ยังไม่เคยโหวต → voteToken)
router.post(
  "/vote/:publicSlug/verify-email",
  verifyEmailLimiter,
  controller.verifyEmail
);

// POST /api/public/vote (ต้องส่ง voteToken กลับมา)
router.post("/vote", voteLimiter, controller.submitVote);

// POST /api/public/vote/:publicSlug/check-vote
router.post("/vote/:publicSlug/check-vote", controller.checkIfVoted);

// GET /api/public/vote/:publicSlug/rank
router.get("/vote/:publicSlug/rank", controller.getLiveRank);

module.exports = router;
