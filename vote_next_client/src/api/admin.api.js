import apiClient from "./apiClient";

export function login(payload) {
  return apiClient.post("/admin/login", payload);
}

