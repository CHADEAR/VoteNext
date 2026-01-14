// src/api/rooms.api.js
import apiClient from "./apiClient";

export function getRooms() {
  return apiClient.get("/rooms");
}

export function createRoom(formData) {
  return apiClient.post("/rooms", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function patchRoom(id, payload) {
  return apiClient.patch(`/rooms/${id}`, payload, {
    headers: { "Content-Type": "application/json" },
  });
}

export function deleteRoom(roundId) {
  return apiClient.delete(`/rooms/${roundId}`);
}
