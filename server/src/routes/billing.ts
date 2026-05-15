import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authenticate } from '../middleware/authenticate.js';
import { AppError } from '../services/auth.service.js';
import {
  stripe,
  createCheckoutSession,
  createPortalSession,
  handleWebhookEvent,
} from '../services/stripe.service.js';
import { db } from '../db/client.js';
import { users, subscriptions } from '../db/schema.js';
import { eq } from 'drizzle-orm';

type RequestWithRawBody = FastifyRequest & { rawBody?: string };

function stripeRequired(reply: any) {
  if (!stripe) {
    reply.code(503).send({
      error:   'Billing not configured',
      code:    'STRIPE_NOT_CONFIGURED',
      message: 'Add STRIPE_SECRET_KEY to environment variables.',
    });
    return false;
  }
  return true;
}

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /billing/status ───────────────────────────────────────────────────
  // Returns current plan + subscription info for the logged-in user

  app.get('/billing/status', { preHandler: authenticate }, async (request, reply) => {
    const [user] = await db.select({ plan: users.plan }).from(users)
      .where(eq(users.id, request.user.sub)).limit(1);

    const [sub] = await db.select().from(subscriptions)
      .where(eq(subscriptions.userId, request.user.sub)).limit(1);

    return reply.send({
      plan:             user?.plan ?? 'free',
      subscription:     sub
        ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd) }
        : null,
      stripeConfigured: Boolean(stripe),
    });
  });

  // ── POST /billing/checkout ────────────────────────────────────────────────
  // Creates a Stripe Checkout session and returns the URL

  app.post('/billing/checkout', { preHandler: authenticate }, async (request, reply) => {
    if (!stripeRequired(reply)) return;

    const [user] = await db.select({ email: users.email, plan: users.plan })
      .from(users).where(eq(users.id, request.user.sub)).limit(1);

    if (!user) return reply.code(404).send({ error: 'User not found', code: 'USER_NOT_FOUND' });
    if (user.plan === 'pro') {
      return reply.code(400).send({ error: 'Already on Pro plan', code: 'ALREADY_PRO' });
    }

    const url = await createCheckoutSession(request.user.sub, user.email);
    return reply.send({ url });
  });

  // ── POST /billing/portal ──────────────────────────────────────────────────
  // Stripe Customer Portal — manage/cancel subscription

  app.post('/billing/portal', { preHandler: authenticate }, async (request, reply) => {
    if (!stripeRequired(reply)) return;

    try {
      const url = await createPortalSession(request.user.sub);
      return reply.send({ url });
    } catch (err: any) {
      if (err.message === 'NO_STRIPE_CUSTOMER') {
        return reply.code(400).send({ error: 'No active subscription', code: 'NO_SUBSCRIPTION' });
      }
      throw err;
    }
  });

  // ── GET /billing/success ──────────────────────────────────────────────────
  // Simple redirect page after successful checkout

  app.get('/billing/success', async (_request, reply) => {
    return reply.type('text/html').send(`
      <!doctype html><html lang="ru"><head><meta charset="UTF-8">
      <title>Оплата прошла успешно</title>
      <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#07090f;color:#eef2ff}div{text-align:center}h1{color:#d6b25a;font-size:2rem}p{color:#7a8ba6;margin-top:.5rem}</style>
      </head><body><div>
      <h1>✓ Pro активирован</h1>
      <p>Вернись в приложение — план обновится автоматически.</p>
      </div></body></html>
    `);
  });

  // ── GET /billing/portal-return ────────────────────────────────────────────

  app.get('/billing/portal-return', async (_request, reply) => {
    return reply.type('text/html').send(`
      <!doctype html><html lang="ru"><head><meta charset="UTF-8">
      <title>Управление подпиской</title>
      <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#07090f;color:#eef2ff}div{text-align:center}h1{color:#d6b25a;font-size:2rem}p{color:#7a8ba6;margin-top:.5rem}</style>
      </head><body><div>
      <h1>Готово</h1>
      <p>Вернись в приложение — изменения применятся после обновления плана.</p>
      </div></body></html>
    `);
  });

  // ── GET /billing/cancel ───────────────────────────────────────────────────

  app.get('/billing/cancel', async (_request, reply) => {
    return reply.type('text/html').send(`
      <!doctype html><html lang="ru"><head><meta charset="UTF-8">
      <title>Оплата отменена</title>
      <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#07090f;color:#eef2ff}div{text-align:center}h1{color:#7a8ba6;font-size:2rem}</style>
      </head><body><div>
      <h1>Оплата отменена</h1>
      <p style="color:#7a8ba6">Вернись в приложение в любое время.</p>
      </div></body></html>
    `);
  });

  // ── POST /billing/webhook ─────────────────────────────────────────────────
  // Stripe sends events here. Raw body required for signature verification.

  app.post('/billing/webhook', async (request, reply) => {
    if (!stripe) return reply.code(200).send({ received: true });

    const sig     = request.headers['stripe-signature'] as string ?? '';
    const rawBody = (request as RequestWithRawBody).rawBody;
    if (!rawBody) {
      return reply.code(400).send({ error: 'Missing raw webhook body' });
    }
    const rawBuf  = Buffer.from(rawBody);

    try {
      await handleWebhookEvent(rawBuf, sig);
      return reply.send({ received: true });
    } catch (err: any) {
      app.log.error({ err }, 'Webhook handling failed');
      // Never expose internal error messages to Stripe — use generic response
      return reply.code(400).send({ error: 'Webhook processing failed' });
    }
  });
}
