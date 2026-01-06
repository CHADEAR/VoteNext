// vote_next_client/src/services/poll.service.js
import apiClient from "../api/apiClient";

export const createVotePoll = async (pollData) => {
  const response = await apiClient.post("/rooms", pollData);
  return response.data;
};

export const updateVotePoll = async (id, pollData) => {
  const response = await apiClient.put(`/rooms/${id}`, pollData);
  return response.data;
};
