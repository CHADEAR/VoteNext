// vote_next_server/src/modules/rooms/rooms.controller.js
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

    // -----------------------------
    // แปลง body ของ multipart/form-data
    // ให้กลายเป็น array ของ contestants แบบที่ service ใช้งานได้
    // field ที่ frontend ส่งมาเป็นรูปแบบ:
    //   contestants[0][stage_name]
    //   contestants[0][description]
    //   contestants[0][order_number]
    // -----------------------------
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
          contestantObj.image_url = `/uploads/${file.filename}`;
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
          contestantObj.image_url = `/uploads/${file.filename}`;
        }

        contestants.push(contestantObj);
      });
    }

    // Create room with contestants
    const newRoom = await roomService.createRoomWithContestants({
      title,
      description,
      voteMode,
      contestants,
      startTime: start_time,
      endTime: end_time
    });

    res.status(201).json({
      success: true,
      data: newRoom
    });

  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการสร้างโพล'
    });
  }
};