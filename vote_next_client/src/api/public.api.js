// src/api/public.api.js
import apiClient from "./apiClient";

export function getPublicVote(publicSlug) {
  return apiClient.get(`/public/vote/${publicSlug}`);
}

