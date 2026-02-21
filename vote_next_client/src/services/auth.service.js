import { login } from "../api/admin.api";
import apiClient from "../api/apiClient";

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
};
