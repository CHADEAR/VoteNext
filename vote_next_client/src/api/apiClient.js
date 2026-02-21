// src/api/apiClient.js
import axios from "axios";

const ADMIN_STORAGE_KEY = "votenext_admin";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  timeout: 50000,
});

// ถ้า API คืน 401 (Unauthorized) ให้ล้าง session แอดมินและส่งไปหน้า login (ไม่ใช้ auth.service เพื่อเลี่ยง circular import)
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const url = err?.config?.url || "";
      const isLoginOrReset =
        url.includes("/admin/login") || url.includes("/admin/reset-password");
      if (!isLoginOrReset) {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        window.location.replace("/admin/login");
      }
    }
    return Promise.reject(err);
  }
);

export default apiClient;
