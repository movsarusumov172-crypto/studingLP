import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CustomTasksService } from '../services/custom-tasks.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { KERNEL_IDS } from '../types/index.js';

const svc = new CustomTasksService();

const payloadSchema = z.object({
  taskId:   z.string().min(1).max(128),
  kernelId: z.enum(KERNEL_IDS),
  payload:  z.record(z.string(), z.unknown()),
});

export async function customTasksRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  // ── GET /custom-tasks?kernelId=js ────────────────────────────────────────
  app.get<{ Querystring: { kernelId?: string } }>('/custom-tasks', async (request, reply) => {
    const { kernelId } = request.query;
    if (kernelId && !KERNEL_IDS.includes(kernelId as never)) {
      return reply.code(400).send({ error: 'Invalid kernelId', code: 'INVALID_KERNEL' });
    }
    const rows = await svc.list(request.user.sub, kernelId);
    return reply.send({ tasks: rows.map((r) => r.payload) });
  });

  // ── PUT /custom-tasks/:taskId ─────────────────────────────────────────────
  app.put<{ Params: { taskId: string } }>('/custom-tasks/:taskId', async (request, reply) => {
    const body = payloadSchema.safeParse(Object.assign({}, request.body as object, { taskId: request.params.taskId }));
    if (!body.success) {
      return reply.code(422).send({ error: 'Validation failed', code: 'VALIDATION_ERROR', issues: body.error.flatten().fieldErrors });
    }
    try {
      const row = await svc.upsert(request.user.sub, body.data.taskId, body.data.kernelId, body.data.payload);
      return reply.send(row.payload);
    } catch (err: any) {
      if (err.message?.startsWith('MAX_CUSTOM_TASKS')) {
        return reply.code(403).send({ error: err.message, code: 'LIMIT_REACHED' });
      }
      throw err;
    }
  });

  // ── DELETE /custom-tasks/:taskId ──────────────────────────────────────────
  app.delete<{ Params: { taskId: string } }>('/custom-tasks/:taskId', async (request, reply) => {
    await svc.delete(request.user.sub, request.params.taskId);
    return reply.code(204).send();
  });
}
