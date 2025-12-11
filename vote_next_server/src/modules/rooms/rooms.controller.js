// vote_next_server/src/modules/rooms/rooms.controller.js
const { createRoomWithContestants } = require("./rooms.service");

const VALID_VOTE_MODES = ["online", "remote", "hybrid"];

async function createRoom(req, res, next) {
  try {
    const { title, description, vote_mode, contestants } = req.body;

    // 1) validate ขั้นพื้นฐาน
    if (!title || typeof title !== "string") {
      return res
        .status(400)
        .json({ error: true, message: "title จำเป็นต้องกรอก" });
    }

    if (!vote_mode || !VALID_VOTE_MODES.includes(vote_mode)) {
      return res.status(400).json({
        error: true,
        message: `vote_mode ต้องเป็นหนึ่งใน: ${VALID_VOTE_MODES.join(", ")}`,
      });
    }

    if (!Array.isArray(contestants) || contestants.length === 0) {
      return res.status(400).json({
        error: true,
        message: "ต้องมีรายการ contestants อย่างน้อย 1 คน",
      });
    }

    // เช็ก contestants แบบคร่าว ๆ
    for (const c of contestants) {
      if (!c.stage_name || typeof c.stage_name !== "string") {
        return res.status(400).json({
          error: true,
          message: "contestant ทุกคนต้องมี stage_name (string)",
        });
      }
    }

    // 2) เรียก service ทำงานจริง (สร้าง show + contestants + round)
    const room = await createRoomWithContestants({
      title,
      description: description || null,
      voteMode: vote_mode,
      contestants,
    });

    return res.status(201).json(room);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRoom,
};
