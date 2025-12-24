const express = require("express");
const router = express.Router();
const controller = require("./rounds.controller");

router.post("/:roundId/start", controller.start);
router.post("/:roundId/stop", controller.stop);
router.post('/:roundId/next', controller.createNextRound);

module.exports = router;
