// src/api/vote.api.js
import apiClient from './apiClient';

export const getVoteDetails = async (publicSlug) => {
  const response = await apiClient.get(`/public/vote/${publicSlug}`);
  return response.data;
};

export const submitVote = async (roundId, contestantId, email = null) => {
  const payload = { roundId, contestantId };
  if (email) payload.email = email;
   
  const response = await apiClient.post('/public/vote', payload);
  return response.data;
};

export const getVoteResults = async (roundId) => {
  const response = await apiClient.get(`/public/vote/${roundId}/results`);
  return response.data;
};