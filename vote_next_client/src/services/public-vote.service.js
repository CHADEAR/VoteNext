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

export function normalizePublicVote(raw) {
  const now = raw.server_now ? new Date(raw.server_now) : new Date();
  const start = raw.start_time ? new Date(raw.start_time) : null;
  const end = raw.end_time ? new Date(raw.end_time) : null;

  let computedStatus = raw.status;
  let startInFuture = false;

  if (raw.counter_type === "auto" && start && end) {
    if (now < start) {
      computedStatus = "pending";
      startInFuture = true;
    } else if (now >= start && now < end) {
      computedStatus = "voting";
    } else {
      computedStatus = "closed";
    }
  }

  return {
    ...raw,
    computedStatus,
    startInFuture,
    start,
    end,
    now,
    isAuto: raw.counter_type === "auto",
    isManual: raw.counter_type === "manual",
  };
}

export const getPublicVote = async (publicSlug) => {
  const response = await apiClient.get(`/public/vote/${publicSlug}`);
  return normalizePublicVote(response.data.data);

};


export const submitVote = async (roundId, contestantId, email) => {
  const response = await apiClient.post("/public/vote", {
    roundId,        // ✅ ชื่อต้องตรง backend
    contestantId,
    email,
  });
  return response.data; // Return the response directly, not normalizePublicVote
};


export const verifyVoter = async (voteId, email) => {
  try {
    const response = await apiClient.post(`/public/vote/${voteId}/verify`, {
      email,
    });
    return normalizePublicVote(response.data.data);

  } catch (error) {
    console.error("Error verifying voter:", error);
    throw error;
  }
};

export const getVoteResults = async (voteId) => {
  try {
    const response = await apiClient.get(`/public/vote/${voteId}/results`);
    return normalizePublicVote(response.data.data);

  } catch (error) {
    console.error("Error fetching vote results:", error);
    throw error;
  }
};
