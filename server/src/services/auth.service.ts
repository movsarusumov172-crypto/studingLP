import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { eq, and, gt, asc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, sessions } from '../db/schema.js';
import type { User } from '../db/schema.js';

const BCRYPT_ROUNDS     = 12;
const REFRESH_TTL_DAYS  = 30;
const MAX_SESSIONS      = 5; // max active sessions per user

export class AuthService {
  // ── Register ───────────────────────────────────────────────────────────────

  async register(email: string, password: string): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      throw new AppError('EMAIL_TAKEN', 'An account with this email already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const [user] = await db
      .insert(users)
      .values({ email: normalizedEmail, passwordHash })
      .returning();

    return user;
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    // Constant-time comparison even when user not found — prevents timing attacks
    const hash  = user?.passwordHash ?? '$2b$12$invalidhashpadding000000000000000000000000000000000000';
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid) {
      throw new AppError('INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
    }

    return user;
  }

  // ── Refresh tokens ─────────────────────────────────────────────────────────

  async createRefreshToken(userId: string): Promise<string> {
    // Enforce session cap — delete oldest sessions beyond MAX_SESSIONS
    const existing = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(asc(sessions.createdAt));

    if (existing.length >= MAX_SESSIONS) {
      const toDelete = existing.slice(0, existing.length - MAX_SESSIONS + 1).map((s) => s.id);
      for (const id of toDelete) {
        await db.delete(sessions).where(eq(sessions.id, id));
      }
    }

    const token     = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({ userId, refreshToken: token, expiresAt });

    return token;
  }

  async rotateRefreshToken(oldToken: string): Promise<{ userId: string; newToken: string }> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.refreshToken, oldToken),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!session) {
      throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.', 401);
    }

    await db.delete(sessions).where(eq(sessions.id, session.id));

    const newToken = await this.createRefreshToken(session.userId);

    return { userId: session.userId, newToken };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.refreshToken, token));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  async getUserById(id: string): Promise<Omit<User, 'passwordHash'> | null> {
    const [user] = await db
      .select({
        id:               users.id,
        email:            users.email,
        plan:             users.plan,
        stripeCustomerId: users.stripeCustomerId,
        createdAt:        users.createdAt,
        updatedAt:        users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user ?? null;
  }
}

// ── AppError ──────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly code:       string,
    message:                    string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
