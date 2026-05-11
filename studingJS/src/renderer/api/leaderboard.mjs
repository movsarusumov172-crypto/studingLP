import { apiFetch } from './client.mjs';

/**
 * Fetches leaderboard for a given kernel.
 * Returns { kernelId, entries, total, callerRank } or null on error.
 */
export async function fetchLeaderboard(kernelId) {
  try {
    const res = await apiFetch(`/leaderboard/${kernelId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
