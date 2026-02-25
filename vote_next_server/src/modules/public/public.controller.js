const jwt = require("jsonwebtoken");
const { VOTE_TOKEN_EXPIRY } = require("../../config/constants");
const publicService = require("./public.service");
const env = require("../../config/env");
const roomService = require("../rooms/rooms.service");

const hunterApiKey = env.HUNTER_API_KEY;

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


/**
 * POST /api/public/vote/:publicSlug/verify-email
 * Body: { email }
 * ถ้าผ่าน → สร้าง voteToken (JWT อายุ 15 นาที)
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { publicSlug } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกอีเมล",
      });
    }

    const payload = await publicService.verifyEmailForVote(
      publicSlug,
      email,
      hunterApiKey
    );

    const secret = env.JWT_SECRET || "votenext-vote-token-secret";
    const voteToken = jwt.sign(payload, secret, { expiresIn: VOTE_TOKEN_EXPIRY });

    return res.json({
      success: true,
      voteToken,
    });
  } catch (error) {
    console.error("verifyEmail error:", error);
    
    // กำหนด error message ให้เป็นภาษาไทยและชัดเจน
    let errorMessage = error.message || "ไม่สามารถยืนยันอีเมลได้";
    
    // ถ้า error message เป็นภาษาอังกฤษ ให้ใช้เลย
    if (error.message && !error.message.match(/[ก-ฮ]/)) {
      errorMessage = error.message;
    }
    
    return res.status(400).json({
      success: false,
      message: errorMessage
    });
  }
};

/**
 * POST /api/public/vote
 * Body: { contestantId, voteToken } หรือ Authorization: Bearer <voteToken>
 * Backend ตรวจ token ก่อน insert vote
 */
exports.submitVote = async (req, res) => {
  try {
    const { contestantId, voteToken: bodyToken } = req.body;
    const authHeader = req.headers.authorization;
    const voteToken =
      bodyToken ||
      (authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null);

    if (!voteToken) {
      return res.status(401).json({
        success: false,
        message: "ไม่มี vote token กรุณายืนยันอีเมลก่อนโหวต",
      });
    }

    const secret = env.JWT_SECRET || "votenext-vote-token-secret";
    let payload;
    try {
      payload = jwt.verify(voteToken, secret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Token หมดอายุหรือไม่ถูกต้อง กรุณายืนยันอีเมลใหม่",
      });
    }

    const { roundId, email } = payload;
    if (!roundId || !email) {
      return res.status(401).json({
        success: false,
        message: "Token ไม่ถูกต้อง",
      });
    }

    if (!contestantId) {
      return res.status(400).json({
        success: false,
        message: "กรุณาเลือกผู้เข้าแข่งขัน",
      });
    }

    await publicService.submitOnlineVote({
      roundId,
      contestantId,
      email,
    });

    if (global.io) {
      global.io.emit("vote_update", { roundId, contestantId });
      console.log(
        `📢 Broadcasted vote update for round ${roundId}, contestant ${contestantId}`
      );
    }

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error("Error submitting vote:", error);
    
    // กำหนด error message ให้เป็นภาษาไทยและชัดเจน
    let errorMessage = error.message || "ไม่สามารถโหวตได้";
    
    // ถ้า error message เป็นภาษาอังกฤษ ให้ใช้เลย
    if (error.message && !error.message.match(/[ก-ฮ]/)) {
      errorMessage = error.message;
    }
    
    return res.status(400).json({
      success: false,
      message: errorMessage
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
    
    // กำหนด error message ให้เป็นภาษาไทยและชัดเจน
    let errorMessage = err.message || "ไม่สามารถดึงข้อมูลอันดับได้";
    
    // ถ้า error message เป็นภาษาอังกฤษ ให้ใช้เลย
    if (err.message && !err.message.match(/[ก-ฮ]/)) {
      errorMessage = err.message;
    }
    
    res.status(400).json({
      success: false,
      message: errorMessage
    });
  }
};


exports.checkIfVoted = async (req, res) => {
  try {
    const { publicSlug } = req.params;
    const { email, voteToken } = req.body;

    let hasVoted = false;
    if (voteToken) {
      const secret = env.JWT_SECRET || "votenext-vote-token-secret";
      try {
        const payload = jwt.verify(voteToken, secret);
        hasVoted = await publicService.hasVotedInShow(
          payload.showId,
          payload.email
        );
      } catch {
        hasVoted = false;
      }
    } else if (email) {
      hasVoted = await publicService.checkIfUserVoted(publicSlug, email);
    }

    res.json({
      success: true,
      hasVoted,
    });
  } catch (err) {
    console.error("checkIfVoted error:", err);
    
    // กำหนด error message ให้เป็นภาษาไทยและชัดเจน
    let errorMessage = err.message || "ไม่สามารถตรวจสอบการโหวตได้";
    
    // ถ้า error message เป็นภาษาอังกฤษ ให้ใช้เลย
    if (err.message && !err.message.match(/[ก-ฮ]/)) {
      errorMessage = err.message;
    }
    
    res.status(400).json({
      success: false,
      message: errorMessage
    });
  }
};

