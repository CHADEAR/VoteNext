// vote_next_client/src/api/rounds.api.js
import apiClient from "./apiClient";

export const startRound = (roundId) => {
  return apiClient.post(`/rounds/${roundId}/start`);
};

export const stopRound = (roundId) => {
  return apiClient.post(`/rounds/${roundId}/stop`);
};

