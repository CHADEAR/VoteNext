// src/services/public-vote.service.js
import apiClient from "../api/apiClient";

// export const getPublicVote = async (voteId) => {
//   try {
//     const response = await apiClient.get(`/public/vote/${voteId}`);
//     return response.data.data; // ✅ normalize ตรงนี้
//   } catch (error) {
//     console.error("Error fetching public vote:", error);
//     throw error;
//   }
// };

export const getPublicVote = async (publicSlug) => {
  const response = await apiClient.get(`/public/vote/${publicSlug}`);
  return response.data.data;
};


export const submitVote = async (roundId, contestantId, email) => {
  const response = await apiClient.post("/public/vote", {
    roundId,        // ✅ ชื่อต้องตรง backend
    contestantId,
    email,
  });
  return response.data;
};


export const verifyVoter = async (voteId, email) => {
  try {
    const response = await apiClient.post(`/public/vote/${voteId}/verify`, {
      email,
    });
    return response.data.data;
  } catch (error) {
    console.error("Error verifying voter:", error);
    throw error;
  }
};

export const getVoteResults = async (voteId) => {
  try {
    const response = await apiClient.get(`/public/vote/${voteId}/results`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching vote results:", error);
    throw error;
  }
};
