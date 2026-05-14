import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Plan } from '../types/index.js';

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, team: 2 };

/**
 * Returns a preHandler that rejects requests if the user's plan is below the required level.
 * Usage: { preHandler: [authenticate, requirePlan('pro')] }
 */
export function requirePlan(required: Plan) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const userPlan = request.user?.plan ?? 'free';
    if ((PLAN_RANK[userPlan] ?? 0) < PLAN_RANK[required]) {
      // In Fastify v5, we must return after send() to ensure hook chain stops
      return reply.code(403).send({
        error:    'Upgrade required',
        code:     'UPGRADE_REQUIRED',
        required,
        current:  userPlan,
        message:  `This feature requires the ${required} plan.`,
      }) as unknown as void;
    }
  };
}
