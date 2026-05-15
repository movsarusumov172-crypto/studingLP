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
});
