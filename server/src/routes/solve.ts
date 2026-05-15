import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { desc, eq, and, count, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { solveAttempts } from '../db/schema.js';
import { authenticate } from '../middleware/authenticate.js';
import { KERNEL_IDS } from '../types/index.js';

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const;

const solveSchema = z.object({
  kernelId:       z.enum(KERNEL_IDS),
  taskSeed:       z.string().max(200).optional(),
  category:       z.string().max(50).optional(),
  difficulty:     z.enum(DIFFICULTIES).optional(),
  passed:         z.boolean(),
  timeMs:         z.number().int().min(0).max(3_600_000).default(0),
  hintsUsed:      z.number().int().min(0).max(20).default(0),
  solutionViewed: z.boolean().default(false),
  errorType:      z.string().max(50).optional(),
});

export async function solveRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  // ── POST /solve ────────────────────────────────────────────────────────────
  // Log a single task attempt. Fire-and-forget from client.

  app.post('/solve', async (request, reply) => {
    const body = solveSchema.safeParse(request.body);
    if (!body.success) return reply.code(422).send({ error: 'Validation failed', code: 'VALIDATION_ERROR' });

    await db.insert(solveAttempts).values({
      userId:         request.user.sub,
      kernelId:       body.data.kernelId,
      taskSeed:       body.data.taskSeed ?? null,
      category:       body.data.category ?? null,
      difficulty:     body.data.difficulty ?? null,
      passed:         body.data.passed,
      timeMs:         body.data.timeMs,
      hintsUsed:      body.data.hintsUsed,
      solutionViewed: body.data.solutionViewed,
      errorType:      body.data.errorType ?? null,
    });

    return reply.code(201).send({ ok: true });
  });

  // ── GET /solve/stats ────────────────────────────────────────────────────────
  // Personal stats: error patterns, category breakdown, success rate over time.

  app.get('/solve/stats', async (request, reply) => {
    const userId = request.user.sub;

    // Total counts
    const [totals] = await db
      .select({
        total:  count(),
        passed: sql<number>`sum(case when ${solveAttempts.passed} then 1 else 0 end)::int`,
      })
      .from(solveAttempts)
      .where(eq(solveAttempts.userId, userId));

    // Error type breakdown
    const errorBreakdown = await db
      .select({ errorType: solveAttempts.errorType, cnt: count() })
      .from(solveAttempts)
      .where(and(eq(solveAttempts.userId, userId), eq(solveAttempts.passed, false)))
      .groupBy(solveAttempts.errorType)
      .orderBy(desc(count()));

    // Category pass rate
    const categoryStats = await db
      .select({
        category: solveAttempts.category,
        total:    count(),
        passed:   sql<number>`sum(case when ${solveAttempts.passed} then 1 else 0 end)::int`,
      })
      .from(solveAttempts)
      .where(eq(solveAttempts.userId, userId))
      .groupBy(solveAttempts.category)
      .orderBy(desc(count()));

    // Recent 30 attempts (for trend)
    const recent = await db
      .select({
        passed:    solveAttempts.passed,
        category:  solveAttempts.category,
        createdAt: solveAttempts.createdAt,
      })
      .from(solveAttempts)
      .where(eq(solveAttempts.userId, userId))
      .orderBy(desc(solveAttempts.createdAt))
      .limit(30);

    return reply.send({
      total:          totals?.total ?? 0,
      passed:         totals?.passed ?? 0,
      accuracy:       totals?.total ? Math.round(((totals.passed ?? 0) / totals.total) * 1000) / 10 : 0,
      errorBreakdown,
      categoryStats,
      recent,
    });
  });
}
