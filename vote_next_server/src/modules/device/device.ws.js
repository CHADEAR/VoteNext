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
      // ✅ FIX: แปลงเป็น string แบบชัวร์ + trim
        const text = Buffer.isBuffer(buf) ? buf.toString("utf8") : String(buf);
        const msg = JSON.parse(text.trim());

        if (msg.type === "get_active" && msg.showId) {
           const payload = await DeviceService.getActivePoll(msg.showId);
            ws.send(JSON.stringify({ type: "active", payload }));
          }
        } catch (e) {
          // ✅ เพิ่ม log จะรู้เลยว่ามันพังเพราะอะไร
          console.error("[WS] bad json:", e?.message);
          ws.send(JSON.stringify({ type: "error", message: "bad json" }));
        }
      });
    
  });

  return wss;
}

module.exports = { initDeviceWss };
