const roomService = require("../rooms/rooms.service");

// GET /api/public/vote/:slug
exports.getPublicVote = async (req, res) => {
  try {
    const { slug } = req.params;
    const round = await roomService.getRoomBySlug(slug, req);
    if (!round) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบโพลนี้",
      });
    }
    return res.json({
      success: true,
      data: round,
    });
  } catch (error) {
    console.error("Error fetching public vote:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลโพล",
    });
  }
};

