import apiClient from "./apiClient";

export function getRooms() {
  return apiClient.get("/rooms");
}

export function createRoom(formData) {
  return apiClient.post("/rooms", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export function updateRoom(id, formData) {
  return apiClient.put(`/rooms/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

