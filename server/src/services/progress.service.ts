import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { progress } from '../db/schema.js';
import type { Progress } from '../db/schema.js';
import type { KernelId } from '../types/index.js';

export interface ProgressPayload {
  xp:                 number;
  solved:             number;
  attempted:          number;
  correct:            number;
  streak:             number;
  bestStreak:         number;
  customTasksCreated: number;
  dailySolved:        number;
  bossCleared:        number;
  fastestSolveMs:     number;
  totalSolveTimeMs:   number;
  solvedByCategory:   Record<string, number>;
  solvedByDifficulty: Record<string, number>;
  reviewDeck:         Record<string, unknown>;
}

export class ProgressService {
  async get(userId: string, kernelId: KernelId): Promise<Progress | null> {
    const [row] = await db
      .select()
      .from(progress)
      .where(and(eq(progress.userId, userId), eq(progress.kernelId, kernelId)))
      .limit(1);

    return row ?? null;
  }

  async upsert(userId: string, kernelId: KernelId, payload: ProgressPayload): Promise<Progress> {
    const now = new Date();

    const values = {
      userId,
      kernelId,
      xp:                 payload.xp,
      solved:             payload.solved,
      attempted:          payload.attempted,
      correct:            payload.correct,
      streak:             payload.streak,
      bestStreak:         payload.bestStreak,
      customTasksCreated: payload.customTasksCreated,
      dailySolved:        payload.dailySolved,
      bossCleared:        payload.bossCleared,
      fastestSolveMs:     payload.fastestSolveMs,
      totalSolveTimeMs:   payload.totalSolveTimeMs,
      solvedByCategory:   payload.solvedByCategory,
      solvedByDifficulty: payload.solvedByDifficulty,
      reviewDeck:         payload.reviewDeck,
      updatedAt:          now,
    };

    const [row] = await db
      .insert(progress)
      .values(values)
      .onConflictDoUpdate({
        target:  [progress.userId, progress.kernelId],
        set:     values,
      })
      .returning();

    return row;
  }
}
