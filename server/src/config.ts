import { z } from 'zod';
import { config } from 'dotenv';

config();

const schema = z.object({
  NODE_ENV:              z.enum(['development', 'production', 'test']).default('development'),
  PORT:                  z.coerce.number().default(3000),
  DATABASE_URL:          z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET:            z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET:    z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  CORS_ORIGIN:           z.string().default('null,http://localhost:5173'),
  // Gemini — optional, AI hints skipped without this
  GEMINI_API_KEY:        z.string().optional(),
  // Email via Resend — optional, emails skipped without this
  RESEND_API_KEY:        z.string().optional(),
  EMAIL_FROM:            z.string().default('JS Infinite Trainer <onboarding@resend.dev>'),
  // Sentry — optional, error tracking skipped without this
  SENTRY_DSN:            z.string().optional(),
  // Stripe — optional, billing endpoints return 503 when not configured
  STRIPE_SECRET_KEY:     z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_PRICE_ID:   z.string().optional(),
  APP_URL:               z.string().default('https://perfect-curiosity-production-b689.up.railway.app'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.CORS_ORIGIN.trim() === '*') {
  console.error('CORS_ORIGIN=* is not allowed in production.');
  process.exit(1);
}

export const env = parsed.data;
