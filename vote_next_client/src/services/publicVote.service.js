import { getPublicVote } from "../api/public.api";

export async function fetchPublicVote(slug) {
  const res = await getPublicVote(slug);
  return res.data?.data;
}

export default {
  fetchPublicVote,
};

