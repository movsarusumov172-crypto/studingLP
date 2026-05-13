import type { FastifyInstance } from 'fastify';
import { desc, eq, gt, and, count } from 'drizzle-orm';
import { db } from '../db/client.js';
import { progress, users } from '../db/schema.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePlan } from '../middleware/requirePlan.js';
import { KERNEL_IDS } from '../types/index.js';

const TOP_N = 50;

/** Anonymizes email: "movsarusumov@gmail.com" → "movs***@gmail.com" */
function anonymize(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(4, Math.floor(local.length / 2)));
  return `${visible}***@${domain}`;
}

export async function leaderboardRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /leaderboard/:kernelId ────────────────────────────────────────────
  // Auth required. All plans can read. Returns top N by XP.

  app.get<{ Params: { kernelId: string } }>(
    '/leaderboard/:kernelId',
    { preHandler: [authenticate, requirePlan('pro')] },
    async (request, reply) => {
      const { kernelId } = request.params;

      if (!KERNEL_IDS.includes(kernelId as never)) {
        return reply.code(400).send({ error: 'Invalid kernelId', code: 'INVALID_KERNEL' });
      }

      const rows = await db
        .select({
          userId:   progress.userId,
          xp:       progress.xp,
          solved:   progress.solved,
          email:    users.email,
          plan:     users.plan,
        })
        .from(progress)
        .innerJoin(users, eq(progress.userId, users.id))
        .where(eq(progress.kernelId, kernelId))
        .orderBy(desc(progress.xp))
        .limit(TOP_N);

      const callerUserId = request.user.sub;

      const entries = rows.map((row, i) => ({
        rank:        i + 1,
        displayName: anonymize(row.email),
        xp:          row.xp,
        solved:      row.solved,
        isYou:       row.userId === callerUserId,
        plan:        row.plan,
      }));

      // Find caller's rank using COUNT — O(log n) index scan, not full table scan
      const callerInTop = entries.some((e) => e.isYou);
      let callerRank: number | null = null;

      if (!callerInTop) {
        const callerRow = await db
          .select({ xp: progress.xp })
          .from(progress)
          .where(and(eq(progress.userId, callerUserId), eq(progress.kernelId, kernelId)))
          .limit(1);

        if (callerRow.length > 0) {
          const [{ value: ahead }] = await db
            .select({ value: count() })
            .from(progress)
            .where(and(eq(progress.kernelId, kernelId), gt(progress.xp, callerRow[0].xp)));

          callerRank = Number(ahead) + 1;
        }
      }

      return reply.send({
        kernelId,
        entries,
        total:      rows.length,
        callerRank: callerInTop ? (entries.find((e) => e.isYou)?.rank ?? null) : callerRank,
      });
    },
  );
}
