import { apiFetch } from './client.mjs';

/**
 * Log a task solve attempt to the server.
 * Fire-and-forget — never blocks the UI.
 */
export async function logSolveAttempt({
  kernelId, taskSeed, category, difficulty,
  passed, timeMs, hintsUsed, solutionViewed, errorType,
}) {
  if (!kernelId) return;
  try {
    await apiFetch('/solve', {
      method: 'POST',
      body: JSON.stringify({
        kernelId, taskSeed, category, difficulty,
        passed:         Boolean(passed),
        timeMs:         Number(timeMs) || 0,
        hintsUsed:      Number(hintsUsed) || 0,
        solutionViewed: Boolean(solutionViewed),
        errorType:      errorType || undefined,
      }),
    });
  } catch { /* offline or not logged in — skip silently */ }
}

/** Fetch personal solve stats for the analytics panel. */
export async function fetchSolveStats() {
  try {
    const res = await apiFetch('/solve/stats');
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}
