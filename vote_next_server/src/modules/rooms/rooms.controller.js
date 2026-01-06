// vote_next_server/src/modules/rooms/rooms.controller.js
const { pool } = require("../../config/db");
const roomService = require('./rooms.service');
const path = require('path');
const fs = require('fs');

exports.createRoom = async (req, res) => {
  try {
    const { title, description, voteMode, start_time, end_time } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'title จำเป็นต้องกรอก',
      });
    }

    // debug log โครงสร้างที่ได้รับจาก frontend (ช่วยเช็คว่า field ชื่ออะไร)
    console.log("createRoom req.body keys:", Object.keys(req.body || {}));
    console.log("createRoom req.files keys:", Object.keys(req.files || {}));

    const contestants = [];

    // case 1: body มีโครงสร้างเป็น req.body.contestants (เช่น จาก qs parsing)
    if (req.body.contestants) {
      const contestantData = Array.isArray(req.body.contestants)
        ? req.body.contestants
        : [req.body.contestants];

      contestantData.forEach((contestant, index) => {
        if (!contestant || !contestant.stage_name) return;

        const contestantObj = {
          stage_name: contestant.stage_name,
          description: contestant.description || "",
          order_number:
            parseInt(contestant.order_number, 10) || index + 1,
        };

        if (req.files && req.files[`contestants[${index}][image]`]) {
          const file = req.files[`contestants[${index}][image]`][0];
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          contestantObj.image_url = `${baseUrl}/uploads/${file.filename}`;
        }

        contestants.push(contestantObj);
      });
    } else {
      // case 2: field เป็นชื่อแบบ contestants[0][stage_name]
      const indices = new Set();

      Object.keys(req.body || {}).forEach((key) => {
        const match = key.match(/^contestants\[(\d+)\]\[(.+)\]$/);
        if (match) {
          indices.add(parseInt(match[1], 10));
        }
      });

      const sortedIndices = Array.from(indices).sort((a, b) => a - b);

      sortedIndices.forEach((index) => {
        const stageName = req.body[`contestants[${index}][stage_name]`];
        if (!stageName) return; // ข้ามถ้าไม่มีชื่อ

        const contestantObj = {
          stage_name: stageName,
          description: req.body[`contestants[${index}][description]`] || "",
          order_number:
            parseInt(req.body[`contestants[${index}][order_number]`], 10) ||
            index + 1,
        };

        // Handle file upload if exists
        if (req.files && req.files[`contestants[${index}][image]`]) {
          const file = req.files[`contestants[${index}][image]`][0];
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          contestantObj.image_url = `${baseUrl}/uploads/${file.filename}`;
        }

        contestants.push(contestantObj);
      });
    }

    const newRoom = await roomService.createRoomWithContestants({
      title,
      description,
      contestants,
    });

    // 🔥 สร้าง first round ทันที
    const round = await require('../rounds/rounds.service').createFirstRound({
      showId: newRoom.show.id,
      roundName: 'Round 1',
      startTime: start_time || null,
      endTime: end_time || null,
      voteMode: voteMode || 'online',
      createdBy: null,
    });

    res.status(201).json({
      success: true,
      data: {
        show: newRoom.show,
        round: round.round,
        contestants: newRoom.contestants,
      },
    });

  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการสร้างโพล'
    });
  }
};

// GET /api/rooms
exports.getRooms = async (_req, res) => {
  try {
    const rooms = await roomService.getRoomsWithContestants();
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

// PUT /api/rooms/:id
exports.updateRoom = async (req, res) => {
  const { id: roundId } = req.params;

  const client = await pool.connect();
  try {
    const { title, description, voteMode, start_time, end_time } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "title จำเป็นต้องกรอก",
      });
    }

    await client.query("BEGIN");

    // -----------------------------
    // parse contestants
    // -----------------------------
    const contestants = [];
    const indices = new Set();

    Object.keys(req.body || {}).forEach((key) => {
      const match = key.match(/^contestants\[(\d+)\]\[(.+)\]$/);
      if (match) indices.add(parseInt(match[1], 10));
    });

    [...indices].sort((a, b) => a - b).forEach((index) => {
      const stageName = req.body[`contestants[${index}][stage_name]`];
      if (!stageName) return;

      const contestant = {
        stage_name: stageName,
        description: req.body[`contestants[${index}][description]`] || "",
        order_number:
          parseInt(req.body[`contestants[${index}][order_number]`], 10) ||
          index + 1,
      };

      const imageUrl = req.body[`contestants[${index}][image_url]`];
      if (imageUrl) contestant.image_url = imageUrl;

      if (req.files && req.files[`contestants[${index}][image]`]) {
        const file = req.files[`contestants[${index}][image]`][0];
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        contestant.image_url = `${baseUrl}/uploads/${file.filename}`;
      }

      contestants.push(contestant);
    });

    // -----------------------------
    // 1) round → show
    // -----------------------------
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

    // -----------------------------
    // 2) update show + contestants
    // -----------------------------
    await roomService.updateShowWithContestants(showId, {
      title,
      description,
      contestants,
    });

    // -----------------------------
    // 3) update round meta
    // -----------------------------
    await client.query(
      `
      UPDATE rounds
      SET vote_mode = $1,
          start_time = $2,
          end_time = $3,
          counter_type = CASE
            WHEN $2 IS NOT NULL AND $3 IS NOT NULL THEN 'auto'
            ELSE 'manual'
          END
      WHERE id = $4
      `,
      [voteMode || "online", start_time || null, end_time || null, roundId]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Updated poll successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating room:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาดในการแก้ไขโพล",
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
