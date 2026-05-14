import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { env } from '../config.js';

// ── Shared AI client ──────────────────────────────────────────────────────────

async function callClaude(prompt: string, maxTokens = 350): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) throw new Error('AI_NOT_CONFIGURED');
  const { Anthropic } = await import('@anthropic-ai/sdk');
  const client  = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model:      'claude-haiku-4-5',
    max_tokens: maxTokens,
    messages:   [{ role: 'user', content: prompt }],
  });
  return message.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { type: 'text'; text: string }).text)
    .join('').trim();
}

function notConfiguredReply(reply: any) {
  return reply.code(503).send({
    error:   'AI not configured',
    code:    'AI_NOT_CONFIGURED',
    message: 'Добавь ANTHROPIC_API_KEY в переменные окружения Railway.',
  });
}

// ── Route schemas ─────────────────────────────────────────────────────────────

const hintSchema = z.object({
  taskTitle:      z.string().max(200),
  taskPrompt:     z.string().max(2000),
  signature:      z.string().max(100).optional(),
  language:       z.string().max(20).default('javascript'),
  userCode:       z.string().max(8000),
  error:          z.string().max(1000).optional(),
  failedInput:    z.unknown().optional(),
  failedExpected: z.unknown().optional(),
  failedActual:   z.unknown().optional(),
});

const breakdownSchema = z.object({
  taskTitle:    z.string().max(200),
  taskPrompt:   z.string().max(2000),
  signature:    z.string().max(100).optional(),
  language:     z.string().max(20).default('javascript'),
  userSolution: z.string().max(8000),
  category:     z.string().max(50).optional(),
  strategy:     z.string().max(50).optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /ai/hint ─────────────────────────────────────────────────────────
  // Why did the test fail? Called after test failure.

  app.post('/ai/hint', { preHandler: authenticate }, async (request, reply) => {
    if (!env.ANTHROPIC_API_KEY) return notConfiguredReply(reply);

    const body = hintSchema.safeParse(request.body);
    if (!body.success) return reply.code(422).send({ error: 'Validation failed', code: 'VALIDATION_ERROR' });

    const { taskTitle, taskPrompt, signature, language, userCode, error, failedInput, failedExpected, failedActual } = body.data;

    const ctx = [
      `Задача: "${taskTitle}"`,
      `Условие: ${taskPrompt}`,
      signature ? `Сигнатура: ${signature}` : '',
      `\nКод пользователя (${language}):\n\`\`\`${language}\n${userCode}\n\`\`\``,
      error           ? `\nОшибка: ${error}` : '',
      failedInput     !== undefined ? `\nВход теста: ${JSON.stringify(failedInput)}` : '',
      failedExpected  !== undefined ? `Ожидалось: ${JSON.stringify(failedExpected)}` : '',
      failedActual    !== undefined ? `Получилось: ${JSON.stringify(failedActual)}` : '',
    ].filter(Boolean).join('\n');

    const prompt = `Ты наставник по программированию. Студент пишет на ${language}. Тест упал.

${ctx}

Ответь в 2-3 предложениях на русском:
1. Что конкретно пошло не так (конкретная строка/логика если видно)
2. На что обратить внимание чтобы исправить

Не показывай готовое решение — только направление. Говори как живой наставник, без списков и заголовков.`;

    try {
      const hint = await callClaude(prompt, 300);
      return reply.send({ hint });
    } catch (err: any) {
      if (err.message === 'AI_NOT_CONFIGURED') return notConfiguredReply(reply);
      app.log.error({ err }, 'AI hint failed');
      return reply.code(500).send({ error: 'AI request failed', code: 'AI_ERROR', message: 'Не удалось получить подсказку.' });
    }
  });

  // ── POST /ai/breakdown ────────────────────────────────────────────────────
  // Post-success analysis: what concept, why it works, edge cases, alternative.
  // Called after test PASSES.

  app.post('/ai/breakdown', { preHandler: authenticate }, async (request, reply) => {
    if (!env.ANTHROPIC_API_KEY) return notConfiguredReply(reply);

    const body = breakdownSchema.safeParse(request.body);
    if (!body.success) return reply.code(422).send({ error: 'Validation failed', code: 'VALIDATION_ERROR' });

    const { taskTitle, taskPrompt, signature, language, userSolution, category, strategy } = body.data;

    const prompt = `Ты наставник по программированию. Студент только что решил задачу на ${language}. Помоги ему понять что именно он сделал и почему это работает.

Задача: "${taskTitle}"
Категория: ${category ?? 'общая'}${strategy ? ` · Стратегия: ${strategy}` : ''}
Условие: ${taskPrompt}
${signature ? `Сигнатура: ${signature}` : ''}

Решение студента:
\`\`\`${language}
${userSolution}
\`\`\`

Ответь в формате JSON (без markdown, только JSON):
{
  "concept": "какой главный паттерн/концепт применён, 1 предложение",
  "whyItWorks": "почему это решение работает, 1-2 предложения простым языком",
  "edgeCases": "какие граничные случаи это решение обрабатывает или нет, 1 предложение",
  "nextStep": "что стоит потренировать дальше по этой теме, 1 предложение"
}

Отвечай на русском, коротко и по делу.`;

    try {
      const raw = await callClaude(prompt, 400);
      // Extract JSON from response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      const breakdown = JSON.parse(jsonMatch[0]);
      return reply.send({ breakdown });
    } catch (err: any) {
      if (err.message === 'AI_NOT_CONFIGURED') return notConfiguredReply(reply);
      app.log.error({ err }, 'AI breakdown failed');
      return reply.code(500).send({ error: 'AI request failed', code: 'AI_ERROR', message: 'Не удалось получить разбор.' });
    }
  });
}
