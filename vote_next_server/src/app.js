// vote_next_server/src/app.js
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

// ใช้ router หลักที่ export มาจาก ./routes
app.use("/api", routes);

// middleware จัดการ error
app.use(errorHandler);

module.exports = app;
