// vote_next_server/src/modules/admin/admin.routes.js
const express = require("express");
const { adminLogin } = require("./admin.controller");

const router = express.Router();

// POST /api/admin/login
router.post("/login", adminLogin);

module.exports = router;
