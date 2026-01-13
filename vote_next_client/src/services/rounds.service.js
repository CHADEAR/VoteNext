//vote_next_client/src/services/rounds.service.js
import {
  apiStartRound,
  apiStopRound,
  apiComputeResults,
  apiCreateFirstRound,
  apiCreateNextRound,
} from "../api/rounds.api";

function unwrap(res) {
  const body = res?.data;
  if (!body) return body;
  return body.data ?? body.payload ?? body;
}



export async function startRound(roundId) {
  const res = await apiStartRound(roundId);
  return unwrap(res);
}

export async function stopRound(roundId) {
  const res = await apiStopRound(roundId);
  return unwrap(res);
}

export async function computeResults(roundId) {
  const res = await apiComputeResults(roundId);
  return unwrap(res);
}

export async function createFirstRound(showId, payload) {
  const res = await apiCreateFirstRound(showId, payload);
  return unwrap(res);
}

export async function createNextRound(roundId, payload) {
  const res = await apiCreateNextRound(roundId, payload);
  return unwrap(res);
}