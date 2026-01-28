const http = require("http");
const app = require("./app");
const { initDeviceWss } = require("./modules/device/device.ws");

// const PORT = process.env.PORT || 4000;

const PORT = 4000;
const server = http.createServer(app);

// ✅ init websocket
initDeviceWss(server);

server.listen(PORT, () => {
  console.log(`🚀 VoteNext server running on port ${PORT}`);
  console.log(`✅ WS path: ws://<host>:${PORT}/ws/device`);
});
