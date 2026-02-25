// vote_next_server/src/modules/rooms/rooms.routes.js
const express = require("express");
const router = express.Router();

const roomsController = require("./rooms.controller");
const upload = require("../../utils/fileUpload");
const cpUpload = upload.any();

function smartBody(req, res, next) {
  const ct = String(req.headers["content-type"] || "");
  if (ct.includes("multipart/form-data")) return cpUpload(req, res, next);
  return express.json()(req, res, next);
}

router.get("/", roomsController.getRooms);
router.post("/", smartBody, roomsController.createRoom);
router.patch("/:id", express.json(), roomsController.patchRoom);
router.delete("/:id", roomsController.deleteRoom);

module.exports = router;
