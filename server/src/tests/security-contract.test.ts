import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

function source(path: string): string {
  return readFileSync(resolve(ROOT, path), 'utf8');
}

describe('security and stability contracts', () => {
  test('refresh tokens are hashed before storage or lookup', () => {
    const authService = source('services/auth.service.ts');
    assert.match(authService, /hashRefreshToken/);
    assert.doesNotMatch(authService, /refreshToken:\s*token\b/);
    assert.doesNotMatch(authService, /eq\(sessions\.refreshToken,\s*oldToken\)/);
    assert.doesNotMatch(authService, /eq\(sessions\.refreshToken,\s*token\)/);
  });

  test('refresh token rotation consumes the old token atomically', () => {
    const authService = source('services/auth.service.ts');
    const rotateMethod = authService.match(/async rotateRefreshToken[\s\S]*?async revokeRefreshToken/)?.[0] ?? '';

    assert.match(rotateMethod, /\.delete\(sessions\)/);
    assert.match(rotateMethod, /eq\(sessions\.refreshToken,\s*oldTokenHash\)/);
    assert.match(rotateMethod, /gt\(sessions\.expiresAt,\s*new Date\(\)\)/);
    assert.match(rotateMethod, /\.returning\(\{\s*userId:\s*sessions\.userId\s*\}\)/);
    assert.doesNotMatch(rotateMethod, /\.select\(\)[\s\S]*\.delete\(sessions\)/);
    assert.doesNotMatch(rotateMethod, /eq\(sessions\.id,\s*session\.id\)/);
  });

  test('custom task limit detects existing tasks by taskId, not row uuid', () => {
    const customTasks = source('services/custom-tasks.service.ts');
    assert.match(customTasks, /select\(\{\s*taskId:\s*customTasks\.taskId\s*\}\)/s);
    assert.match(customTasks, /r\.taskId\s*===\s*taskId/);
    assert.doesNotMatch(customTasks, /r\.id\s*===\s*taskId/);
  });

  test('stripe webhook verifies signature against preserved raw body', () => {
    const index = source('index.ts');
    const billing = source('routes/billing.ts');
    assert.match(index, /rawBody/);
    assert.match(billing, /RequestWithRawBody/);
    assert.match(billing, /\.rawBody/);
    assert.doesNotMatch(billing, /Buffer\.from\(JSON\.stringify\(request\.body\)\)/);
  });

  test('production refuses wildcard CORS with credentials', () => {
    const config = source('config.ts');
    const index = source('index.ts');
    assert.doesNotMatch(config, /CORS_ORIGIN:\s*z\.string\(\)\.default\('\*'\)/);
    assert.match(config, /NODE_ENV\s*===\s*'production'/);
    assert.match(config, /CORS_ORIGIN\.trim\(\)\s*===\s*'\*'/);
    assert.match(index, /credentials:\s*env\.CORS_ORIGIN\.trim\(\)\s*!==\s*'\*'/);
  });

  test('stripe webhook signatures are mandatory in production or when stripe is configured', () => {
    const stripeService = source('services/stripe.service.ts');
    assert.match(stripeService, /STRIPE_WEBHOOK_SECRET_REQUIRED/);
    assert.match(stripeService, /requiresWebhookSignature/);
    assert.match(stripeService, /env\.NODE_ENV\s*===\s*'production'/);
    assert.match(stripeService, /Boolean\(env\.STRIPE_SECRET_KEY\)/);
    assert.match(stripeService, /else\s*\{[\s\S]*JSON\.parse\(rawBody\.toString\(\)\)/);
  });

  test('gemini api key is sent as a header, not in the request url', () => {
    const aiRoutes = source('routes/ai.ts');
    assert.doesNotMatch(aiRoutes, /\?key=\$\{env\.GEMINI_API_KEY\}/);
    assert.match(aiRoutes, /x-goog-api-key/);
  });
});
