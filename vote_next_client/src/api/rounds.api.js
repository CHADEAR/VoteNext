// vote_next_client/src/api/rounds.api.js
import apiClient from "./apiClient";

export const startRound = (roundId) => {
  return apiClient.post(`/rounds/${roundId}/start`);
};

export const stopRound = (roundId) => {
  return apiClient.post(`/rounds/${roundId}/stop`);
};

export const getRound = (roundId) => {
  return apiClient.get(`/rounds/${roundId}`);
};

export const computeRoundResults = (roundId, judgeScores = []) => {
  return apiClient.post(`/rounds/${roundId}/compute-results`, { judgeScores });
};

export const createNextRound = (roundId, data) => {
  return apiClient.post(`/rounds/${roundId}/next`, data);
};

export const finalizeShow = (roundId, { debut, target }) => {
  return apiClient.post(`/rounds/${roundId}/finalize`, { 
    debut, 
    target 
  });
};
