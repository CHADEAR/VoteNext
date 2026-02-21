const roomService = require("../rooms/rooms.service");
const publicService = require("./public.service");


// GET /api/public/vote/:slug
exports.getPublicVote = async (req, res) => {
  try {
    const { publicSlug } = req.params;
    const round = await roomService.getRoomBySlug(publicSlug);

    return res.json({
      success: true,
      data: {
        ...round,
        server_now: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error fetching public vote:", error);
    return res.status(404).json({
      success: false,
      message: error.message || "ไม่พบโพลนี้",
    });
  }
};


exports.submitVote = async (req, res) => {
  try {
    const { roundId, contestantId, email } = req.body;

    await publicService.submitOnlineVote({
      roundId,
      contestantId,
      email,
    });

    // ✅ Broadcast vote update to all connected clients
    if (global.io) {
      global.io.emit('vote_update', { roundId, contestantId });
      console.log(`📢 Broadcasted vote update for round ${roundId}, contestant ${contestantId}`);
    }

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error("Error submitting vote:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "ไม่สามารถโหวตได้",
    });
  }
};


exports.getLiveRank = async (req, res) => {
  try {
    const { publicSlug } = req.params;

    const data = await publicService.getLiveRankBySlug(publicSlug);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("getLiveRank error:", err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};


exports.checkIfVoted = async (req, res) => {
  try {
    const { publicSlug } = req.params;
    const { email } = req.body;

    const hasVoted = await publicService.checkIfUserVoted(publicSlug, email);

    res.json({
      success: true,
      hasVoted,
    });
  } catch (err) {
    console.error("checkIfVoted error:", err);
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

