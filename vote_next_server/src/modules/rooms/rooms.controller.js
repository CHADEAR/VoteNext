// vote_next_server/src/modules/rooms/rooms.controller.js
const { createRoomWithContestants } = require("./rooms.service");

const VALID_VOTE_MODES = ["online", "remote", "hybrid"];

async function createRoom(req, res, next) {
  try {
    const { 
      title, 
      description, 
      vote_mode, 
      contestants = [],
      start_time,
      end_time
    } = req.body;

    // Basic validation
    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ 
        error: true, 
        message: "Title is required" 
      });
    }

    if (!vote_mode || !VALID_VOTE_MODES.includes(vote_mode)) {
      return res.status(400).json({
        error: true,
        message: `Invalid vote_mode. Must be one of: ${VALID_VOTE_MODES.join(", ")}`,
      });
    }

    if (!Array.isArray(contestants) || contestants.length < 1) {
      return res.status(400).json({
        error: true,
        message: "At least one contestant is required",
      });
    }

    // Validate contestants
    for (const [index, contestant] of contestants.entries()) {
      if (!contestant.stage_name || typeof contestant.stage_name !== "string" || 
          contestant.stage_name.trim() === "") {
        return res.status(400).json({
          error: true,
          message: `Contestant ${index + 1} must have a valid stage_name`,
        });
      }
    }

    // Create the room
    const result = await createRoomWithContestants({
      title: title.trim(),
      description: description ? description.trim() : null,
      voteMode: vote_mode,
      contestants,
      start_time,
      end_time
    });

    return res.status(201).json(result);

  } catch (err) {
    console.error('Error in createRoom:', err);
    next(err);
  }
}

module.exports = {
  createRoom,
};