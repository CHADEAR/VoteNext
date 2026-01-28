// vote_next_server/src/app.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const routes = require("./routes");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

// Configure CORS with specific origin and headers
// const corsOptions = {
//   origin: ['http://localhost:5173', 'http://localhost:3000'],
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true
// };
// app.use(cors(corsOptions));

app.use(cors({ origin: true, credentials: true }));

// Handle preflight requests
// app.options('*', cors(corsOptions));
app.options('*', cors());


// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Increase request size limit to 10MB
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get("/health", (req,res)=>{
  res.status(200).json({ status: "ok" });
});

// ใช้ router หลักที่ export มาจาก ./routes
app.use("/api", routes);


// Add this near your other middleware
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

// middleware จัดการ error


module.exports = app;