import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService, AppError } from '../services/auth.service.js';
import { authenticate } from '../middleware/authenticate.js';
import { sendWelcomeEmail } from '../services/email.service.js';

const authService = new AuthService();

const credentialsSchema = z.object({
  email:    z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /auth/register ──────────────────────────────────────────────────

  // Strict rate limit on auth endpoints — prevents brute force and spam registration
  const authRateLimit = {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  };

  app.post('/auth/register', authRateLimit, async (request, reply) => {
    const body = credentialsSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(422).send({
        error:  'Validation failed',
        code:   'VALIDATION_ERROR',
        issues: body.error.flatten().fieldErrors,
      });
    }

    const { email, password } = body.data;

    const user         = await authService.register(email, password);
    const accessToken  = buildAccessToken(app, user.id, user.plan);
    const refreshToken = await authService.createRefreshToken(user.id);

    // Fire-and-forget — don't delay response if email fails
    void sendWelcomeEmail(email);

    return reply.code(201).send({ accessToken, refreshToken, plan: user.plan });
  });

  // ── POST /auth/login ─────────────────────────────────────────────────────

  app.post('/auth/login', authRateLimit, async (request, reply) => {
    const body = credentialsSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(422).send({
        error:  'Validation failed',
        code:   'VALIDATION_ERROR',
        issues: body.error.flatten().fieldErrors,
      });
    }

    const { email, password } = body.data;

    const user         = await authService.login(email, password);
    const accessToken  = buildAccessToken(app, user.id, user.plan);
    const refreshToken = await authService.createRefreshToken(user.id);

    return reply.send({ accessToken, refreshToken, plan: user.plan });
  });

  // ── POST /auth/refresh ───────────────────────────────────────────────────

  app.post('/auth/refresh', async (request, reply) => {
    const body = z.object({ refreshToken: z.string().min(1) }).safeParse(request.body);
    if (!body.success) {
      return reply.code(422).send({ error: 'refreshToken is required', code: 'VALIDATION_ERROR' });
    }

    const { userId, newToken } = await authService.rotateRefreshToken(body.data.refreshToken);

    const user = await authService.getUserById(userId);
    if (!user) {
      return reply.code(401).send({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const accessToken = buildAccessToken(app, user.id, user.plan);

    return reply.send({ accessToken, refreshToken: newToken, plan: user.plan });
  });

  // ── POST /auth/logout ────────────────────────────────────────────────────

  app.post('/auth/logout', { preHandler: authenticate }, async (request, reply) => {
    const body = z.object({ refreshToken: z.string().optional() }).safeParse(request.body);

    if (body.success && body.data.refreshToken) {
      await authService.revokeRefreshToken(body.data.refreshToken);
    }

    return reply.code(204).send();
  });

  // ── GET /me ──────────────────────────────────────────────────────────────

  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = await authService.getUserById(request.user.sub);
    if (!user) {
      return reply.code(404).send({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    return reply.send({
      id:        user.id,
      email:     user.email,
      plan:      user.plan,
      createdAt: user.createdAt,
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildAccessToken(
  app:    FastifyInstance,
  userId: string,
  plan:   string,
): string {
  return app.jwt.sign({ sub: userId, plan: plan as 'free' | 'pro' | 'team' }, { expiresIn: '15m' });
}
