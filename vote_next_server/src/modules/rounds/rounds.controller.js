const {
  startRound,
  closeRound,
  getRound,
  finalizeShow,
} = require("./rounds.service");

/**
 * POST /api/rounds/:roundId/start
 */
exports.start = async (req, res) => {
  try {
    const { roundId } = req.params;
    const round = await startRound(roundId);
    res.json({ success: true, data: round });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/rounds/:roundId/stop (manual)
 */
exports.stop = async (req, res) => {
  try {
    const { roundId } = req.params;

    await getRound(roundId); // ensure auto-close if time passed

    await closeRound(roundId, "manual");

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const roundsService = require("./rounds.service");

/**
 * POST /api/rounds/:roundId/finalize
 * Finalize the show with the final lineup
 */
exports.finalize = async (req, res) => {
  try {
    const { roundId } = req.params;
    const { debut, target } = req.body;

    if (!debut || !Array.isArray(debut) || debut.length === 0) {
      throw new Error('Debut lineup is required');
    }

    if (target !== undefined && (typeof target !== 'number' || target < 0)) {
      throw new Error('Target must be a non-negative number');
    }

    const result = await finalizeShow(roundId, debut, target);
    
    res.json({ 
      success: true, 
      data: {
        lineup: result.final_lineup,
        target: result.target_debut || target || debut.length
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.createFirstRound = async (req, res) => {
  try {
    const { showId } = req.params;
    const { roundName, startTime, endTime } = req.body;

    const result = await roundsService.createFirstRound({
      showId,
      roundName,
      startTime,
      endTime,
      createdBy: req.admin?.id || null,
    });

    res.json({ success: true, data: result });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

exports.createNextRound = async (req, res) => {
  try {
    const { roundId } = req.params;
    const result = await roundsService.createNextRound({
      fromRoundId: roundId,
      ...req.body,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.computeResults = async (req, res) => {
  try {
    const { roundId } = req.params;
    const { judgeScores = [] } = req.body;
    
    const results = await roundsService.computeRoundResults(roundId, judgeScores);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error in computeResults:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/rounds/:roundId
 */
exports.getRound = async (req, res) => {
  try {
    const { roundId } = req.params;
    const data = await getRound(roundId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};
