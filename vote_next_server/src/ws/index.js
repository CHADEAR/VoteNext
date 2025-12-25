// src/ws/index.js
const { initDeviceWs } = require("../modules/device/device.ws");

function initWebSockets(httpServer) {
  // เพิ่ม WS ของ device
  initDeviceWs(httpServer);
}

module.exports = { initWebSockets };
