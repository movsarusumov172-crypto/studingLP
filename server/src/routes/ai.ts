import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { env } from '../config.js';

const bodySchema = z.object({
  taskTitle:       z.string().max(200),
  taskPrompt:      z.string().max(2000),
  signature:       z.string().max(100).optional(),
  userCode:        z.string().max(8000),
  error:           z.string().max(1000).optional(),
  failedInput:     z.unknown().optional(),
  failedExpected:  z.unknown().optional(),
  failedActual:    z.unknown().optional(),
});

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /ai/hint ─────────────────────────────────────────────────────────
  // Returns a concise AI explanation of why the test failed.
  // Requires auth. Gracefully returns 503 if ANTHROPIC_API_KEY is not set.

  app.post('/ai/hint', { preHandler: authenticate }, async (request, reply) => {
    if (!env.ANTHROPIC_API_KEY) {
      return reply.code(503).send({
        error:   'AI not configured',
        code:    'AI_NOT_CONFIGURED',
        message: 'Добавь ANTHROPIC_API_KEY в переменные окружения сервера.',
      });
    }

    const body = bodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(422).send({ error: 'Validation failed', code: 'VALIDATION_ERROR' });
    }

    const { taskTitle, taskPrompt, signature, userCode, error, failedInput, failedExpected, failedActual } = body.data;

    const contextParts = [
      `Задача: "${taskTitle}"`,
      `Условие: ${taskPrompt}`,
      signature ? `Сигнатура: ${signature}` : '',
      `\nКод пользователя:\n\`\`\`javascript\n${userCode}\n\`\`\``,
      error ? `\nОшибка: ${error}` : '',
      failedInput !== undefined ? `\nВходные данные теста: ${JSON.stringify(failedInput)}` : '',
      failedExpected !== undefined ? `Ожидалось: ${JSON.stringify(failedExpected)}` : '',
      failedActual !== undefined ? `Получилось: ${JSON.stringify(failedActual)}` : '',
    ].filter(Boolean).join('\n');

    const prompt = `Ты наставник по программированию. Помоги студенту понять почему его код не проходит тест.

${contextParts}

Объясни в 2-4 предложениях на русском языке:
1. Что именно пошло не так в коде
2. На что обратить внимание чтобы исправить

Говори просто и конкретно. Не показывай готовое решение — только направление.`;

    try {
      const { Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

      const message = await client.messages.create({
        model:      'claude-haiku-4-5',
        max_tokens: 300,
        messages:   [{ role: 'user', content: prompt }],
      });

      const hint = message.content
        .filter((c) => c.type === 'text')
        .map((c) => (c as { type: 'text'; text: string }).text)
        .join('');

      return reply.send({ hint: hint.trim() });
    } catch (err: any) {
      app.log.error({ err }, 'AI hint request failed');
      return reply.code(500).send({
        error:   'AI request failed',
        code:    'AI_ERROR',
        message: 'Не удалось получить подсказку от ИИ.',
      });
    }
  });
}
