import { login } from "../api/admin.api";
import apiClient from "../api/apiClient";

/** คีย์ที่ใช้เก็บข้อมูลแอดมินใน localStorage */
export const ADMIN_STORAGE_KEY = "votenext_admin";

/** ดึงข้อมูล admin จาก localStorage (ใช้ตรวจสอบว่า login แล้วหรือยัง) */
export function getAdminFromStorage() {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

/** ตรวจสอบว่าแอดมิน login อยู่หรือไม่ */
export function isAdminLoggedIn() {
  return getAdminFromStorage() != null;
}

/** ล้าง session แอดมิน (logout) */
export function clearAdminSession() {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
}

// Business logic wrapper for admin auth
export async function adminLogin({ email, password }) {
  const res = await login({ email, password });
  return res.data;
}

export async function resetPassword(email, newPassword) {
  const res = await apiClient.post("/admin/reset-password", { email, newPassword });
  return res.data;
}

export default {
  adminLogin,
  resetPassword,
  getAdminFromStorage,
  isAdminLoggedIn,
  clearAdminSession,
  ADMIN_STORAGE_KEY,
};
