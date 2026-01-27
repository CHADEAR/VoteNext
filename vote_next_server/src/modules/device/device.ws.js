// vote_next_server/src/modules/device/device.ws.js
const WebSocket = require("ws");
const url = require("url");
const DeviceService = require("./device.service");

function initDeviceWss(server) {
  const wss = new WebSocket.Server({ server, path: "/ws/device" });

  // ✅ ต้องเป็น attachWss
  DeviceService.attachWss(wss);

  wss.on("connection", async (ws, req) => {
    const parsed = url.parse(req.url, true);
    const deviceId = parsed.query.deviceId || "";

    ws.send(JSON.stringify({ type: "connected", deviceId }));

    ws.on("message", async (buf) => {
      try {
        const msg = JSON.parse(buf.toString());

        if (msg.type === "get_active" && msg.showId) {
          const payload = await DeviceService.getActivePoll(msg.showId);
          ws.send(JSON.stringify({ type: "active", payload }));
        }
      } catch (e) {
        ws.send(JSON.stringify({ type: "error", message: "bad json" }));
      }
    });
  });

  return wss;
}

module.exports = { initDeviceWss };
