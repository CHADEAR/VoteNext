// src/api/apiClient.js
import axios from "axios";

const ADMIN_STORAGE_KEY = "votenext_admin";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  timeout: 50000,
});

// เพิ่ม Authorization header ในทุก request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 [API Debug] Adding Authorization header for:', config.url);
    } else {
      console.log('❌ [API Debug] No token found for:', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ถ้า API คืน 401 (Unauthorized) ให้ล้าง session แอดมินและส่งไปหน้า login (ไม่ใช้ auth.service เพื่อเลี่ยง circular import)
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const url = err?.config?.url || "";
      const isLoginOrReset =
        url.includes("/admin/login") || url.includes("/admin/reset-password");
      if (!isLoginOrReset) {
        console.log('❌ [API Debug] 401 Error, redirecting to login for:', url);
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        localStorage.removeItem('adminToken');
        window.location.replace("/admin/login");
      }
    }
    return Promise.reject(err);
  }
);

export default apiClient;
