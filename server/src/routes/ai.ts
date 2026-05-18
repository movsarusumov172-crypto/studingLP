import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { env } from '../config.js';

const GEMINI_MODEL = 'gemini-flash-lite-latest';

// ── Gemini API client ─────────────────────────────────────────────────────────

async function callGemini(prompt: string, maxTokens = 400): Promise<string> {
  if (!env.GEMINI_API_KEY) throw new Error('AI_NOT_CONFIGURED');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(`Gemini error ${res.status}: ${err?.error?.message ?? res.statusText}`);
  }

  const data = await res.json() as any;
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

function notConfiguredReply(reply: any) {
  return reply.code(503).send({
    error:   'AI not configured',
    code:    'AI_NOT_CONFIGURED',
    message: 'Добавь GEMINI_API_KEY в переменные окружения Railway.',
  });
}

// ── Schemas ───────────────────────────────────────────────────────────────────

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

  app.post('/ai/hint', { preHandler: authenticate }, async (request, reply) => {
    if (!env.GEMINI_API_KEY) return notConfiguredReply(reply);

    const body = hintSchema.safeParse(request.body);
    if (!body.success) return reply.code(422).send({ error: 'Validation failed', code: 'VALIDATION_ERROR' });

    const { taskTitle, taskPrompt, signature, language, userCode, error, failedInput, failedExpected, failedActual } = body.data;

    const ctx = [
      `Задача: "${taskTitle}"`,
      `Условие: ${taskPrompt}`,
      signature ? `Сигнатура: ${signature}` : '',
      `\nКод (${language}):\n\`\`\`${language}\n${userCode}\n\`\`\``,
      error           ? `\nОшибка: ${error}` : '',
      failedInput     !== undefined ? `Вход теста: ${JSON.stringify(failedInput)}` : '',
      failedExpected  !== undefined ? `Ожидалось: ${JSON.stringify(failedExpected)}` : '',
      failedActual    !== undefined ? `Получилось: ${JSON.stringify(failedActual)}` : '',
    ].filter(Boolean).join('\n');

    const prompt = `Ты наставник по программированию. Студент пишет на ${language}. Тест упал.

${ctx}

Объясни в 2-3 предложениях на русском языке:
1. Что конкретно пошло не так
2. На что обратить внимание чтобы исправить

Не показывай готовое решение. Говори просто, без заголовков и списков.`;

    try {
      const hint = await callGemini(prompt, 300);
      return reply.send({ hint });
    } catch (err: any) {
      if (err.message === 'AI_NOT_CONFIGURED') return notConfiguredReply(reply);
      app.log.error({ err }, 'AI hint failed');
      return reply.code(500).send({ error: 'AI request failed', code: 'AI_ERROR', message: 'Не удалось получить подсказку.' });
    }
  });

  // ── POST /ai/breakdown ────────────────────────────────────────────────────

  app.post('/ai/breakdown', { preHandler: authenticate }, async (request, reply) => {
    if (!env.GEMINI_API_KEY) return notConfiguredReply(reply);

    const body = breakdownSchema.safeParse(request.body);
    if (!body.success) return reply.code(422).send({ error: 'Validation failed', code: 'VALIDATION_ERROR' });

    const { taskTitle, taskPrompt, signature, language, userSolution, category, strategy } = body.data;

    const prompt = `Ты наставник по программированию. Студент решил задачу на ${language}.

Задача: "${taskTitle}"
Категория: ${category ?? 'общая'}${strategy ? ` · ${strategy}` : ''}
Условие: ${taskPrompt}
${signature ? `Сигнатура: ${signature}` : ''}

Решение:
\`\`\`${language}
${userSolution}
\`\`\`

Ответь строго в JSON (без markdown, только объект):
{"concept":"какой паттерн применён — 1 предложение","whyItWorks":"почему работает — 1-2 предложения","edgeCases":"граничные случаи — 1 предложение","nextStep":"что тренировать дальше — 1 предложение"}

Отвечай на русском.`;

    try {
      const raw = await callGemini(prompt, 400);
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
