// vote_next_server/src/modules/rooms/rooms.routes.js
const express = require('express');
const router = express.Router();
const roomsController = require('./rooms.controller');
const upload = require('../../utils/fileUpload');

// Use multer for file uploads
const cpUpload = upload.fields([
  { name: 'contestants[0][image]', maxCount: 1 },
  { name: 'contestants[1][image]', maxCount: 1 },
  { name: 'contestants[2][image]', maxCount: 1 },
  // Add more if you expect more images
]);

// Final path: POST /api/rooms  (mounted from src/routes/index.js with base "/rooms")
router.post('/', cpUpload, roomsController.createRoom);

module.exports = router;