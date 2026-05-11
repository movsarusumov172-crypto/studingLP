import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  bigint,
  jsonb,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ── Enums ─────────────────────────────────────────────────────────────────────

export const planEnum   = pgEnum('plan',   ['free', 'pro', 'team']);
export const subStatus  = pgEnum('sub_status', ['active', 'canceled', 'past_due', 'trialing', 'incomplete']);

// ── Tables ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:               uuid('id').defaultRandom().primaryKey(),
  email:            text('email').notNull().unique(),
  passwordHash:     text('password_hash').notNull(),
  plan:             planEnum('plan').default('free').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id:           uuid('id').defaultRandom().primaryKey(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshToken: text('refresh_token').notNull().unique(),
  expiresAt:    timestamp('expires_at').notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id:                   uuid('id').defaultRandom().primaryKey(),
  userId:               uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  stripePriceId:        text('stripe_price_id').notNull(),
  status:               subStatus('status').notNull(),
  currentPeriodEnd:     timestamp('current_period_end').notNull(),
  cancelAtPeriodEnd:    integer('cancel_at_period_end').default(0).notNull(),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
  updatedAt:            timestamp('updated_at').defaultNow().notNull(),
});

export const progress = pgTable(
  'progress',
  {
    id:                 uuid('id').defaultRandom().primaryKey(),
    userId:             uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    kernelId:           text('kernel_id').notNull(),
    xp:                 integer('xp').default(0).notNull(),
    solved:             integer('solved').default(0).notNull(),
    attempted:          integer('attempted').default(0).notNull(),
    correct:            integer('correct').default(0).notNull(),
    streak:             integer('streak').default(0).notNull(),
    bestStreak:         integer('best_streak').default(0).notNull(),
    customTasksCreated: integer('custom_tasks_created').default(0).notNull(),
    dailySolved:        integer('daily_solved').default(0).notNull(),
    bossCleared:        integer('boss_cleared').default(0).notNull(),
    fastestSolveMs:     integer('fastest_solve_ms').default(0).notNull(),
    totalSolveTimeMs:   bigint('total_solve_time_ms', { mode: 'number' }).default(0).notNull(),
    solvedByCategory:   jsonb('solved_by_category').$type<Record<string, number>>().default({}).notNull(),
    solvedByDifficulty: jsonb('solved_by_difficulty').$type<Record<string, number>>().default({}).notNull(),
    reviewDeck:         jsonb('review_deck').$type<Record<string, unknown>>().default({}).notNull(),
    updatedAt:          timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    userKernelIdx: uniqueIndex('progress_user_kernel_idx').on(t.userId, t.kernelId),
  }),
);

export const customTasks = pgTable(
  'custom_tasks',
  {
    id:        uuid('id').defaultRandom().primaryKey(),
    userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    taskId:    text('task_id').notNull(),
    kernelId:  text('kernel_id').notNull(),
    payload:   jsonb('payload').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    userTaskIdx: uniqueIndex('custom_tasks_user_task_idx').on(t.userId, t.taskId),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type User         = typeof users.$inferSelect;
export type NewUser      = typeof users.$inferInsert;
export type Session      = typeof sessions.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Progress     = typeof progress.$inferSelect;
