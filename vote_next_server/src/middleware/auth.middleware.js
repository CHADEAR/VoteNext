// vote_next_server/src/middleware/auth.middleware.js
const jwt = require("jsonwebtoken");
const env = require("../config/env");

function verifyAdminToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: true, 
        message: "ไม่พบ authorization header" 
      });
    }

    const token = authHeader.split(" ")[1]; // Bearer <token>
    
    if (!token) {
      return res.status(401).json({ 
        error: true, 
        message: "ไม่พบ token" 
      });
    }

    const secret = env.JWT_SECRET || "votenext-admin-secret";
    const decoded = jwt.verify(token, secret);
    
    // ตรวจสอบว่าเป็น admin token
    if (decoded.type !== 'admin') {
      return res.status(403).json({ 
        error: true, 
        message: "ไม่มีสิทธิ์เข้าถึง (admin only)" 
      });
    }

    // เก็บข้อมูล admin ไว้ใน request
    req.admin = decoded;
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: true, 
        message: "Token หมดอายุ" 
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: true, 
        message: "Token ไม่ถูกต้อง" 
      });
    } else {
      return res.status(500).json({ 
        error: true, 
        message: "เกิดข้อผิดพลาดในการตรวจสอบ token" 
      });
    }
  }
}

module.exports = {
  verifyAdminToken
};
