// src/services/adminApi.js
import apiClient from "./apiClient";

export async function adminLogin({ email, password }) {
  const res = await apiClient.post("/admin/login", { email, password });
  return res.data; // { id, email, full_name }
}
