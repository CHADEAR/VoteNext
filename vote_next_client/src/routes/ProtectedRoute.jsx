import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAdminLoggedIn } from "../services/auth.service";

/**
 * ป้องกัน route แอดมิน: ถ้ายังไม่ login จะ redirect ไป /admin/login
 * ใช้ห่อเฉพาะ route ที่ต้อง login (ทุก admin ยกเว้น /admin/login)
 */
export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAdminLoggedIn()) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}
