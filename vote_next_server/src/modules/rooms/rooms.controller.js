// vote_next_server/src/modules/rooms/rooms.controller.js
const pool = require("../../config/db");
const roomService = require('./rooms.service');
const { applyContestantPatch, updatePollMeta } = require('./rooms.service');
const path = require('path');
const fs = require('fs');

exports.createRoom = async (req, res) => {
  try {
    const {
      title,
      description,
      vote_mode,
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

    // 🔍 debug ดู payload จริง
    console.log("createRoom req.body:", JSON.stringify(req.body, null, 2));

    // For development without database, return mock data
    if (!pool || process.env.NODE_ENV !== 'production') {
      const mockId = Date.now();
      return res.status(201).json({
        success: true,
        data: {
          show: { id: mockId, title, description },
          round: { id: mockId, round_name: "Round 1" },
          contestants: contestants.map((c, index) => ({
            id: mockId + index + 1,
            stage_name: c.stage_name,
            description: c.description || "",
            image_url: c.image_url || null,
            order_number: c.order_number || index + 1,
          })),
        },
      });
    }

    // ✅ map contestants จาก JSON ตรง ๆ
    const formattedContestants = contestants.map((c, index) => ({
      stage_name: c.stage_name,
      description: c.description || "",
      image_url: c.image_url || null,   // ⭐ จุดสำคัญ
      order_number: c.order_number || index + 1,
    }));

    const newRoom = await roomService.createRoomWithContestants({
      title,
      description,
      contestants: formattedContestants,
    });

    // 🔥 create first round
    const round = await require("../rounds/rounds.service").createFirstRound({
      showId: newRoom.show.id,
      roundName: "Round 1",
      startTime: start_time || null,
      endTime: end_time || null,
      voteMode: vote_mode || "online",
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
exports.getRooms = async (_req, res) => {
  try {
    // For development without database, return mock data
    if (!pool || process.env.NODE_ENV !== 'production') {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const rooms = await roomService.getRoomsWithContestants();
    return res.json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    // Return mock data on error for development
    return res.json({
      success: true,
      data: []
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

    // ----------- 1) find show_id from round -----------
    const roundRes = await client.query(
      `SELECT show_id FROM rounds WHERE id = $1`,
      [roundId]
    );

    if (roundRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Round not found"
      });
    }

    const showId = roundRes.rows[0].show_id;

    // ----------- 2) PATCH poll meta (optional) -----------
    await updatePollMeta(client, showId, roundId, poll);

    // ----------- 3) PATCH contestants CRUD (optional) -----------
    await applyContestantPatch(client, showId, roundId, contestants);

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "PATCH update successful"
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("PATCH updateRoom error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to patch room"
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
      message: 'Deleted room successfully',
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete room',
    });
  }
};
