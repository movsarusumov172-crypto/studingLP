import * as Sentry from '@sentry/node';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { env } from './config.js';
import { authRoutes } from './routes/auth.js';
import { progressRoutes } from './routes/progress.js';
import { billingRoutes } from './routes/billing.js';
import { leaderboardRoutes } from './routes/leaderboard.js';
import { customTasksRoutes } from './routes/custom-tasks.js';
import { aiRoutes } from './routes/ai.js';
import { solveRoutes } from './routes/solve.js';
import { AppError } from './services/auth.service.js';

// ── Sentry ────────────────────────────────────────────────────────────────────

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn:              env.SENTRY_DSN,
    environment:      env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

// ── App ───────────────────────────────────────────────────────────────────────

const app = Fastify({
  logger: {
    level:     env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

// ── Plugins ───────────────────────────────────────────────────────────────────

// Allow DELETE/GET requests without Content-Type (Fastify v5 is strict)
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  const rawBody = typeof body === 'string' ? body : '';
  (req as unknown as { rawBody?: string }).rawBody = rawBody;
  if (!rawBody) { done(null, {}); return; }
  try { done(null, JSON.parse(rawBody)); }
  catch (e: any) { done(e); }
});

await app.register(helmet, { global: true });
await app.register(rateLimit, {
  global:     true,
  max:        200,
  timeWindow: '1 minute',
  errorResponseBuilder: (_req, context) => ({
    error:   'Too Many Requests',
    code:    'RATE_LIMITED',
    message: `Слишком много запросов. Попробуй через ${Math.ceil(context.ttl / 1000)} сек.`,
  }),
});
await app.register(cors, {
  origin:      env.CORS_ORIGIN,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
});
await app.register(jwt, { secret: env.JWT_SECRET });

// ── Global error handler ──────────────────────────────────────────────────────

app.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, _request, reply) => {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error:   error.name,
      code:    error.code,
      message: error.message,
    });
  }
  if (error.validation) {
    return reply.code(422).send({ error: 'Validation failed', code: 'VALIDATION_ERROR', issues: error.validation });
  }
  if (error.message === 'STRIPE_NOT_CONFIGURED') {
    return reply.code(503).send({ error: 'Billing not configured', code: 'STRIPE_NOT_CONFIGURED' });
  }

  // Capture unexpected errors in Sentry
  if (env.SENTRY_DSN) Sentry.captureException(error);
  app.log.error(error);

  return reply.code(500).send({
    error:   'Internal Server Error',
    code:    'INTERNAL_ERROR',
    message: env.NODE_ENV === 'development' ? error.message : 'Something went wrong.',
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

await app.register(authRoutes);
await app.register(progressRoutes);
await app.register(billingRoutes);
await app.register(leaderboardRoutes);
await app.register(customTasksRoutes);
await app.register(aiRoutes);
await app.register(solveRoutes);

// ── Start ─────────────────────────────────────────────────────────────────────

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (err) {
  if (env.SENTRY_DSN) Sentry.captureException(err);
  app.log.error(err);
  process.exit(1);
}
