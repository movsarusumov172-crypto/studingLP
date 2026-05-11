import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { env } from '../config.js';
import { db } from '../db/client.js';
import { users, subscriptions } from '../db/schema.js';
import { sendProActivatedEmail } from './email.service.js';

// Stripe client — null when not configured (graceful degradation)
export const stripe: Stripe | null = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY)
  : null;

export function requireStripe(): Stripe {
  if (!stripe) throw new Error('STRIPE_NOT_CONFIGURED');
  return stripe;
}

// ── Checkout ──────────────────────────────────────────────────────────────────

export async function createCheckoutSession(userId: string, email: string): Promise<string> {
  const s = requireStripe();

  if (!env.STRIPE_PRO_PRICE_ID) throw new Error('STRIPE_PRO_PRICE_ID not set');

  const session = await s.checkout.sessions.create({
    customer_email:        email,
    line_items:            [{ price: env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
    mode:                  'subscription',
    allow_promotion_codes: true,
    success_url:           `${env.APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:            `${env.APP_URL}/billing/cancel`,
    metadata:              { userId },
  });

  return session.url!;
}

// ── Customer Portal ───────────────────────────────────────────────────────────

export async function createPortalSession(userId: string): Promise<string> {
  const s = requireStripe();

  const [user] = await db.select({ stripeCustomerId: users.stripeCustomerId })
    .from(users).where(eq(users.id, userId)).limit(1);

  if (!user?.stripeCustomerId) throw new Error('NO_STRIPE_CUSTOMER');

  const session = await s.billingPortal.sessions.create({
    customer:   user.stripeCustomerId,
    return_url: `${env.APP_URL}/billing/portal-return`,
  });

  return session.url;
}

// ── Webhook handlers ──────────────────────────────────────────────────────────

export async function handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
  const s = requireStripe();

  let event: Stripe.Event;

  if (env.STRIPE_WEBHOOK_SECRET) {
    event = s.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } else {
    // No webhook secret — parse without verification (dev/testing only)
    event = JSON.parse(rawBody.toString()) as Stripe.Event;
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.metadata?.userId) {
        await _activateSubscription(session.metadata.userId, session);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await _updateSubscription(sub);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await _cancelSubscription(sub);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
      const subId   = invoice.subscription;
      if (subId) {
        await db.update(subscriptions)
          .set({ status: 'past_due', updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, String(subId)));
      }
      break;
    }
  }
}

// ── Internal ──────────────────────────────────────────────────────────────────

type StripeSub = Stripe.Subscription & {
  current_period_end?: number;
  cancel_at_period_end?: boolean;
};

async function _activateSubscription(userId: string, session: Stripe.Checkout.Session) {
  const s = requireStripe();
  const stripeSubId = String(session.subscription);
  const sub = await s.subscriptions.retrieve(stripeSubId) as StripeSub;

  await db.update(users)
    .set({ plan: 'pro', stripeCustomerId: String(session.customer), updatedAt: new Date() })
    .where(eq(users.id, userId));

  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Send receipt email (fire-and-forget)
  const [activatedUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (activatedUser) void sendProActivatedEmail(activatedUser.email);

  await db.insert(subscriptions).values({
    userId,
    stripeSubscriptionId: stripeSubId,
    stripePriceId:        String(sub.items.data[0]?.price.id ?? ''),
    status:               'active',
    currentPeriodEnd:     periodEnd,
    cancelAtPeriodEnd:    sub.cancel_at_period_end ? 1 : 0,
  }).onConflictDoUpdate({
    target: subscriptions.userId,
    set:    { status: 'active', stripeSubscriptionId: stripeSubId, updatedAt: new Date() },
  });
}

async function _updateSubscription(sub: StripeSub) {
  const plan = sub.status === 'active' || sub.status === 'trialing' ? 'pro' : 'free';
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : new Date();

  await db.update(subscriptions).set({
    status:            sub.status as 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete',
    currentPeriodEnd:  periodEnd,
    cancelAtPeriodEnd: sub.cancel_at_period_end ? 1 : 0,
    updatedAt:         new Date(),
  }).where(eq(subscriptions.stripeSubscriptionId, sub.id));

  // Update user plan based on subscription status
  const [row] = await db.select({ userId: subscriptions.userId })
    .from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, sub.id)).limit(1);

  if (row) {
    await db.update(users).set({ plan, updatedAt: new Date() }).where(eq(users.id, row.userId));
  }
}

async function _cancelSubscription(sub: StripeSub) {
  await db.update(subscriptions).set({
    status:    'canceled',
    updatedAt: new Date(),
  }).where(eq(subscriptions.stripeSubscriptionId, sub.id));

  const [row] = await db.select({ userId: subscriptions.userId })
    .from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, sub.id)).limit(1);

  if (row) {
    await db.update(users).set({ plan: 'free', updatedAt: new Date() }).where(eq(users.id, row.userId));
  }
}
