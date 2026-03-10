// vote_next_server/src/modules/rounds/rounds.routes.js
const express = require("express");
const router = express.Router();
const controller = require("./rounds.controller");
const { verifyAdminToken } = require("../../middleware/auth.middleware");

// การควบคุม rounds ทั้งหมดต้องมี admin token
router.post("/:roundId/start", express.json(), verifyAdminToken, controller.start);
router.post("/:roundId/stop", express.json(), verifyAdminToken, controller.stop);
router.post('/:roundId/next', express.json(), verifyAdminToken, controller.createNextRound);
router.post("/:roundId/compute-results", express.json(), verifyAdminToken, controller.computeResults);
router.post("/:roundId/finalize", express.json(), verifyAdminToken, controller.finalize);
router.post("/shows/:showId/first-round", express.json(), verifyAdminToken, controller.createFirstRound);

// GET สามารถเข้าถึงได้ (ดูข้อมูล round)
router.get("/:roundId", controller.getRound);

module.exports = router;
