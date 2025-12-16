import { login } from "../api/admin.api";

// Business logic wrapper for admin auth
export async function adminLogin({ email, password }) {
  const res = await login({ email, password });
  return res.data;
}

export default {
  adminLogin,
};

