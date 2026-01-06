// src/api/rank.api.js
import apiClient from "./apiClient";

export const getLiveRankBySlug = (publicSlug) => {
  return apiClient.get(`/public/vote/${publicSlug}/rank`);
};
