//vote_next_server/src/server.js
const http = require("http");
const app = require("./app");
const { initDeviceWss } = require("./modules/device/device.ws");
const { Server } = require("socket.io");

// const PORT = process.env.PORT || 4000;

const PORT = 4000;
const server = http.createServer(app);

// ✅ init websocket
initDeviceWss(server);

// ✅ init Socket.IO for realtime voting
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000", 
      "http://localhost:5173", 
      "http://127.0.0.1:3000", 
      "http://127.0.0.1:5173",
      "https://vote-next.vercel.app",
      "https://votenext.onrender.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io available globally
global.io = io;

io.on('connection', (socket) => {
  console.log('🔌 User connected to realtime voting');
  
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected from realtime voting');
  });
});

server.listen(PORT, () => {
  console.log(`🚀 VoteNext server running on port ${PORT}`);
  console.log(`✅ WS path: ws://<host>:${PORT}/ws/device`);
  console.log(`✅ Socket.IO: ws://<host>:${PORT}/socket.io`);
});
