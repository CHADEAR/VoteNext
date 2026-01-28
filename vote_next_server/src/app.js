// vote_next_server/src/app.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const routes = require("./routes");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

/**
 * DEV MODE (vite preview)
 * Allow localhost + render + no-origin (Safari / Mobile)
 */
const allowedOrigins = [
  "http://localhost:4173",
  "http://localhost:5173",
  "http://localhost:3000",
  "https://votenext.onrender.com", // backend render itself
];

const corsOptions = {
  origin: (origin, callback) => {
    // allow no-origin (Safari, mobile web, render health check, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("❌ Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

//preflight
app.options("*", cors(corsOptions));

//body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

//debug logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

//health
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

//API entry point
app.use("/api", routes);

//static uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

//global error
app.use(errorHandler);

module.exports = app;
