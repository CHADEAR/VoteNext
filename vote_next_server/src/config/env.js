//src/config/env.js
require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 4000,
  DATABASE_URL: process.env.DATABASE_URL,
  HUNTER_API_KEY: process.env.HUNTER_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET || "votenext-vote-token-secret",
};
