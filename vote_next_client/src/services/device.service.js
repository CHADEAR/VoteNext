//vote_next_client/src/services/device.service.js
import { apiGetDeviceActive, apiRegisterDevice, apiDeviceVote } from "../api/device.api";

function unwrap(res) {
  return res?.data;
}

export async function getDeviceActive(showId) {
  const res = await apiGetDeviceActive(showId);
  return unwrap(res);
}

export async function registerDevice(deviceId, ownerLabel) {
  const res = await apiRegisterDevice({ deviceId, ownerLabel });
  return unwrap(res);
}

export async function deviceVote(payload) {
  const res = await apiDeviceVote(payload);
  return unwrap(res);
}