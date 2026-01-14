// vote_next_server/src/modules/rooms/rooms.routes.js
const express = require('express');
const router = express.Router();

const roomsController = require('./rooms.controller');
const upload = require('../../utils/fileUpload');

// ✅ FIX: รับไฟล์ทุก field (รองรับ contestants แบบ dynamic)
const cpUpload = upload.any();

// Final path: /api/rooms
router.get('/', roomsController.getRooms);
router.post('/', cpUpload, roomsController.createRoom);
router.patch("/:id", roomsController.patchRoom);
router.delete('/:id', roomsController.deleteRoom);

module.exports = router;
