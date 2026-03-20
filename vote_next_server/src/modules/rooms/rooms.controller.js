// vote_next_server/src/modules/rooms/rooms.controller.js
const { pool } = require("../../config/db");
const roomService = require("./rooms.service");
const { applyContestantPatch, updatePollMeta } = require("./rooms.service");

exports.createRoom = async (req, res) => {
  try {
    const {
      title,
      description,
      vote_mode,
      counter_type,
      start_time,
      end_time,
      contestants = [],
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "title จำเป็นต้องกรอก",
      });
    }

    console.log("createRoom req.body:", JSON.stringify(req.body, null, 2));

    const formattedContestants = contestants.map((c, index) => ({
      stage_name: c.stage_name,
      description: c.description || "",
      image_url: c.image_url || null,
      order_number: c.order_number || index + 1,
    }));

    const newRoom = await roomService.createRoomWithContestants({
      title,
      description,
      contestants: formattedContestants,
    });

    const round = await require("../rounds/rounds.service").createFirstRound({
      showId: newRoom.show.id,
      roundName: "Round 1",
      startTime: start_time || null,
      endTime: end_time || null,
      voteMode: vote_mode || "online",
      counterType: counter_type || null,
      createdBy: null,
    });

    return res.status(201).json({
      success: true,
      data: {
        show: newRoom.show,
        round: round.round,
        contestants: newRoom.contestants,
      },
    });
  } catch (error) {
    console.error("Error creating room:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการสร้างโพล",
    });
  }
};

// GET /api/rooms
exports.getRooms = async (req, res) => {
  try {
    const { showId = null } = req.query;
    const rooms = await roomService.getRoomsWithContestants(showId || null);

    return res.json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลโพล",
    });
  }
};

// PATCH /api/rooms/:id
exports.patchRoom = async (req, res) => {
  const { id: roundId } = req.params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { poll, contestants } = req.body || {};

    const roundRes = await client.query(
      `SELECT show_id FROM rounds WHERE id = $1`,
      [roundId]
    );

    if (roundRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Round not found",
      });
    }

    const showId = roundRes.rows[0].show_id;

    await updatePollMeta(client, showId, roundId, poll);
    await applyContestantPatch(client, showId, roundId, contestants);

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "PATCH update successful",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("PATCH updateRoom error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to patch room",
    });
  } finally {
    client.release();
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const { id: roundId } = req.params;

    await roomService.deleteRoom(roundId);

    return res.json({
      success: true,
      message: "Deleted room successfully",
    });
  } catch (error) {
    console.error("Error deleting room:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete room",
    });
  }
};