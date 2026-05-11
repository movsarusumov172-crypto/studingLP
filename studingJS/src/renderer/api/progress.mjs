import { apiFetch } from './client.mjs';

/** Sends local progress to server. Silent fail — never blocks the user. */
export async function syncProgress(kernelId, progress) {
  console.log(`[sync] push progress → ${kernelId} (xp=${progress.xp}, solved=${progress.solved})`);
  try {
    const res = await apiFetch(`/progress/${kernelId}`, {
      method: 'PUT',
      body:   JSON.stringify({
        xp:                 progress.xp                ?? 0,
        solved:             progress.solved             ?? 0,
        attempted:          progress.attempted          ?? 0,
        correct:            progress.correct            ?? 0,
        streak:             progress.streak             ?? 0,
        bestStreak:         progress.bestStreak         ?? 0,
        customTasksCreated: progress.customTasksCreated ?? 0,
        dailySolved:        progress.dailySolved        ?? 0,
        bossCleared:        progress.bossCleared        ?? 0,
        fastestSolveMs:     progress.fastestSolveMs     ?? 0,
        totalSolveTimeMs:   progress.totalSolveTimeMs   ?? 0,
        solvedByCategory:   progress.solvedByCategory   ?? {},
        solvedByDifficulty: progress.solvedByDifficulty ?? {},
        reviewDeck:         progress.reviewDeck         ?? {},
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Fetches server progress and returns merged result (takes best of local vs server). */
export async function fetchAndMergeProgress(kernelId, localProgress) {
  try {
    const res = await apiFetch(`/progress/${kernelId}`);
    if (!res.ok) return localProgress;
    const remote = await res.json();
    if (!remote) return localProgress;
    return mergeProgress(localProgress, remote);
  } catch {
    return localProgress;
  }
}

function mergeProgress(local, remote) {
  const takeMax = (a, b) => Math.max(Number(a) || 0, Number(b) || 0);
  const mergeRecord = (a, b) => {
    const result = { ...(a ?? {}) };
    for (const key of Object.keys(b ?? {})) {
      result[key] = takeMax(result[key], b[key]);
    }
    return result;
  };

  return {
    ...local,
    xp:                 takeMax(local.xp, remote.xp),
    solved:             takeMax(local.solved, remote.solved),
    attempted:          takeMax(local.attempted, remote.attempted),
    correct:            takeMax(local.correct, remote.correct),
    streak:             takeMax(local.streak, remote.streak),
    bestStreak:         takeMax(local.bestStreak, remote.bestStreak),
    customTasksCreated: takeMax(local.customTasksCreated, remote.customTasksCreated),
    dailySolved:        takeMax(local.dailySolved, remote.dailySolved),
    bossCleared:        takeMax(local.bossCleared, remote.bossCleared),
    fastestSolveMs:     local.fastestSolveMs > 0 && remote.fastestSolveMs > 0
      ? Math.min(local.fastestSolveMs, remote.fastestSolveMs)
      : takeMax(local.fastestSolveMs, remote.fastestSolveMs),
    totalSolveTimeMs:   takeMax(local.totalSolveTimeMs, remote.totalSolveTimeMs),
    solvedByCategory:   mergeRecord(local.solvedByCategory, remote.solvedByCategory),
    solvedByDifficulty: mergeRecord(local.solvedByDifficulty, remote.solvedByDifficulty),
    reviewDeck:         local.reviewDeck ?? remote.reviewDeck ?? {},
  };
}
