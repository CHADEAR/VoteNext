const express = require("express");
const router = express.Router();
const controller = require("./rounds.controller");

router.post("/:roundId/start", controller.start);
router.post("/:roundId/stop", controller.stop);
router.post('/:roundId/next', controller.createNextRound);
router.post("/:roundId/compute-results", controller.computeResults);
router.post("/shows/:showId/first-round", controller.createFirstRound);


module.exports = router;
