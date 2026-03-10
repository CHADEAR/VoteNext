// vote_next_server/src/modules/rooms/rooms.routes.js
const express = require("express");
const router = express.Router();

const roomsController = require("./rooms.controller");
const upload = require("../../utils/fileUpload");
const { verifyAdminToken } = require("../../middleware/auth.middleware");
const cpUpload = upload.any();

function smartBody(req, res, next) {
  const ct = String(req.headers["content-type"] || "");
  if (ct.includes("multipart/form-data")) return cpUpload(req, res, next);
  return express.json()(req, res, next);
}

// GET สามารถเข้าถึงได้ (สำหรับดูรายการ rooms)
router.get("/", roomsController.getRooms);

// POST/PATCH/DELETE ต้องมี token (สำหรับจัดการ rooms)
router.post("/", smartBody, verifyAdminToken, roomsController.createRoom);
router.patch("/:id", express.json(), verifyAdminToken, roomsController.patchRoom);
router.delete("/:id", express.json(), verifyAdminToken, roomsController.deleteRoom);

module.exports = router;
