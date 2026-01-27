// vote_next_server/src/modules/rounds/rounds.routes.js
const express = require("express");
const router = express.Router();
const controller = require("./rounds.controller");

router.post("/:roundId/start", controller.start);
router.post("/:roundId/stop", controller.stop);
router.post('/:roundId/next', controller.createNextRound);
router.post("/:roundId/compute-results", controller.computeResults);
router.post("/:roundId/finalize", controller.finalize);
router.post("/shows/:showId/first-round", controller.createFirstRound);

router.get("/:roundId", controller.getRound);



module.exports = router;
