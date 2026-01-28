// vote_next_server/src/app.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const routes = require("./routes");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

/**
 * DEV + VERCEL MODE
 * Allow localhost + vercel + render + no-origin
 */
const allowedOrigins = new Set([
  "http://localhost:4173",
  "http://localhost:5173",
  "http://localhost:3000",

  // backend render
  "https://votenext.onrender.com",

  // your frontend on vercel (confirmed from log)
  "https://vote-next.vercel.app",
]);

const corsOptions = {
  origin: (origin, callback) => {
    // allow no-origin (Safari / mobile / curl / render health check)
    if (!origin) return callback(null, true);

    // allow fixed
    if (allowedOrigins.has(origin)) return callback(null, true);

    // allow preview on vercel (auto URLs)
    if (origin.endsWith(".vercel.app")) return callback(null, true);

    console.log("❌ Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// apply CORS before all middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// debug logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// health-check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// APIs
app.use("/api", routes);

// static uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// error handler
app.use(errorHandler);

module.exports = app;
