//vote_next_client/src/api/device.api.js
import apiClient from "./apiClient";

// GET /api/device/active?showId=...
export function apiGetDeviceActive(showId) {
  return apiClient.get(`/device/active`, {
    params: { showId },
  });
}

// POST /api/device/register
export function apiRegisterDevice(payload) {
  // payload: { deviceId, ownerLabel }
  return apiClient.post(`/device/register`, payload);
}

// POST /api/device/vote
export function apiDeviceVote(payload) {
  // payload: { deviceId, showId, roundId, contestantId }
  return apiClient.post(`/device/vote`, payload);
}