import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProgressService } from '../services/progress.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { KERNEL_IDS } from '../types/index.js';

const progressService = new ProgressService();

const MAX_XP       = 10_000_000; // ~166k задач решено по 60xp — физически недостижимо обманом
const MAX_SOLVED   = 500_000;
const MAX_STREAK   = 10_000;
const MAX_TIME_MS  = 30 * 24 * 60 * 60 * 1000; // 30 дней суммарно — разумный предел

const progressBodySchema = z.object({
  xp:                 z.number().int().min(0).max(MAX_XP),
  solved:             z.number().int().min(0).max(MAX_SOLVED),
  attempted:          z.number().int().min(0).max(MAX_SOLVED),
  correct:            z.number().int().min(0).max(MAX_SOLVED),
  streak:             z.number().int().min(0).max(MAX_STREAK),
  bestStreak:         z.number().int().min(0).max(MAX_STREAK),
  customTasksCreated: z.number().int().min(0).max(10_000),
  dailySolved:        z.number().int().min(0).max(MAX_SOLVED),
  bossCleared:        z.number().int().min(0).max(MAX_SOLVED),
  fastestSolveMs:     z.number().int().min(0).max(MAX_TIME_MS),
  totalSolveTimeMs:   z.number().int().min(0).max(MAX_TIME_MS * 365),
  solvedByCategory:   z.record(z.string().max(32), z.number().int().min(0).max(MAX_SOLVED)),
  solvedByDifficulty: z.record(z.string().max(16), z.number().int().min(0).max(MAX_SOLVED)),
  reviewDeck:         z.record(z.string().max(32), z.unknown()),
});

export async function progressRoutes(app: FastifyInstance): Promise<void> {
  // All progress routes require auth
  app.addHook('preHandler', authenticate);

  // ── GET /progress/:kernelId ──────────────────────────────────────────────

  app.get<{ Params: { kernelId: string } }>('/progress/:kernelId', async (request, reply) => {
    const { kernelId } = request.params;

    if (!KERNEL_IDS.includes(kernelId as never)) {
      return reply.code(400).send({
        error: 'Invalid kernelId',
        code:  'INVALID_KERNEL',
        valid: KERNEL_IDS,
      });
    }

    const row = await progressService.get(request.user.sub, kernelId as never);

    // Return empty progress if not found yet — client handles defaults
    return reply.send(row ?? null);
  });

  // ── PUT /progress/:kernelId ──────────────────────────────────────────────

  app.put<{ Params: { kernelId: string } }>('/progress/:kernelId', async (request, reply) => {
    const { kernelId } = request.params;

    if (!KERNEL_IDS.includes(kernelId as never)) {
      return reply.code(400).send({
        error: 'Invalid kernelId',
        code:  'INVALID_KERNEL',
        valid: KERNEL_IDS,
      });
    }

    const body = progressBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(422).send({
        error:  'Validation failed',
        code:   'VALIDATION_ERROR',
        issues: body.error.flatten().fieldErrors,
      });
    }

    const row = await progressService.upsert(request.user.sub, kernelId as never, body.data);

    return reply.send(row);
  });
}
