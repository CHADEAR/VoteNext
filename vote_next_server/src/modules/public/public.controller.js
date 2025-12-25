const roomService = require("../rooms/rooms.service");
const publicService = require("./public.service");


// GET /api/public/vote/:slug
exports.getPublicVote = async (req, res) => {
  try {
    const { slug } = req.params;

    const round = await roomService.getRoomBySlug(slug);

    return res.json({
      success: true,
      data: round,
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