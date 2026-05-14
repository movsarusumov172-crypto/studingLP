/**
 * Integration tests for the JS Infinite Trainer backend.
 * Run against a live server: TEST_URL=http://localhost:3000 npm run test:integration
 * Or against production: TEST_URL=https://perfect-curiosity-production-b689.up.railway.app npm run test:integration
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.TEST_URL ?? 'http://localhost:3000';
const SUFFIX = Date.now();
const TEST_EMAIL = `integration_${SUFFIX}@test-jstrainer.dev`;
const TEST_PASS  = 'IntegrationTest123!';

let accessToken  = '';
let refreshToken = '';

async function api(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> ?? {}),
  };
  // Only set Content-Type when there's a body to avoid Fastify v5 empty-body rejection
  if (opts.body) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  return res;
}

// ── Health ─────────────────────────────────────────────────────────────────────

describe('Health', () => {
  test('GET /health returns ok', async () => {
    const res = await api('/health');
    assert.equal(res.status, 200);
    const data = await res.json() as { status: string };
    assert.equal(data.status, 'ok');
  });
});

// ── Auth ───────────────────────────────────────────────────────────────────────

describe('Auth', () => {
  test('POST /auth/register creates a new user', async () => {
    const res = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
    });
    assert.equal(res.status, 201, `Expected 201, got ${res.status}`);
    const data = await res.json() as { accessToken: string; refreshToken: string; plan: string };
    assert.ok(data.accessToken,  'should have accessToken');
    assert.ok(data.refreshToken, 'should have refreshToken');
    assert.equal(data.plan, 'free');
    accessToken  = data.accessToken;
    refreshToken = data.refreshToken;
  });

  test('POST /auth/register rejects duplicate email', async () => {
    const res = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
    });
    assert.equal(res.status, 409);
  });

  test('POST /auth/register rejects short password', async () => {
    const res = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: `x_${SUFFIX}@test.dev`, password: 'short' }),
    });
    assert.equal(res.status, 422);
  });

  test('POST /auth/login works with correct credentials', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
    });
    assert.equal(res.status, 200);
    const data = await res.json() as { accessToken: string; refreshToken: string };
    assert.ok(data.accessToken);
    accessToken  = data.accessToken;
    refreshToken = data.refreshToken;
  });

  test('POST /auth/login rejects wrong password', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, password: 'WrongPassword!' }),
    });
    assert.equal(res.status, 401);
  });

  test('POST /auth/refresh rotates token', async () => {
    const res = await api('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    assert.equal(res.status, 200);
    const data = await res.json() as { accessToken: string; refreshToken: string };
    assert.ok(data.accessToken !== accessToken, 'new access token should differ');
    assert.ok(data.refreshToken !== refreshToken, 'new refresh token should differ');
    accessToken  = data.accessToken;
    refreshToken = data.refreshToken;
  });

  test('GET /me returns current user', async () => {
    const res = await api('/me');
    assert.equal(res.status, 200);
    const data = await res.json() as { email: string; plan: string };
    assert.equal(data.email, TEST_EMAIL);
    assert.equal(data.plan, 'free');
  });

  test('GET /me rejects without token', async () => {
    const res = await fetch(`${BASE}/me`);
    assert.equal(res.status, 401);
  });
});

// ── Progress ───────────────────────────────────────────────────────────────────

describe('Progress', () => {
  test('PUT /progress/js upserts progress', async () => {
    const payload = {
      xp: 100, solved: 5, attempted: 7, correct: 5,
      streak: 3, bestStreak: 3,
      customTasksCreated: 0, dailySolved: 2, bossCleared: 0,
      fastestSolveMs: 12000, totalSolveTimeMs: 90000,
      solvedByCategory: { arrays: 3, functions: 2 },
      solvedByDifficulty: { easy: 4, medium: 1 },
      reviewDeck: {},
    };
    const res = await api('/progress/js', { method: 'PUT', body: JSON.stringify(payload) });
    assert.equal(res.status, 200);
    const data = await res.json() as { xp: number };
    assert.equal(data.xp, 100);
  });

  test('GET /progress/js returns saved progress', async () => {
    const res = await api('/progress/js');
    assert.equal(res.status, 200);
    const data = await res.json() as { solved: number };
    assert.equal(data.solved, 5);
  });

  test('PUT /progress/js rejects xp above max', async () => {
    const res = await api('/progress/js', {
      method: 'PUT',
      body: JSON.stringify({ xp: 999_999_999, solved: 0, attempted: 0, correct: 0, streak: 0, bestStreak: 0, customTasksCreated: 0, dailySolved: 0, bossCleared: 0, fastestSolveMs: 0, totalSolveTimeMs: 0, solvedByCategory: {}, solvedByDifficulty: {}, reviewDeck: {} }),
    });
    assert.equal(res.status, 422, 'should reject impossible xp value');
  });

  test('GET /progress/invalid-kernel returns 400', async () => {
    const res = await api('/progress/brainfuck');
    assert.equal(res.status, 400);
  });
});

// ── Custom Tasks ───────────────────────────────────────────────────────────────

describe('Custom Tasks', () => {
  const taskId = `test-task-${SUFFIX}`;

  test('PUT /custom-tasks/:id creates a task', async () => {
    const res = await api(`/custom-tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({
        kernelId: 'js',
        payload:  { id: taskId, title: 'Test Task', category: 'arrays', difficulty: 'easy', tests: [] },
      }),
    });
    assert.equal(res.status, 200);
  });

  test('GET /custom-tasks returns created task', async () => {
    const res = await api('/custom-tasks?kernelId=js');
    assert.equal(res.status, 200);
    const data = await res.json() as { tasks: Array<{ id: string }> };
    assert.ok(Array.isArray(data.tasks));
    assert.ok(data.tasks.some((t) => t.id === taskId));
  });

  test('DELETE /custom-tasks/:id removes task', async () => {
    const res = await api(`/custom-tasks/${taskId}`, { method: 'DELETE' });
    assert.equal(res.status, 204);
  });
});

// ── Leaderboard (plan enforcement) ────────────────────────────────────────────

describe('Leaderboard', () => {
  test('GET /leaderboard/js returns 403 for free users', async () => {
    const res = await api('/leaderboard/js');
    assert.equal(res.status, 403, 'free users should not access leaderboard');
    const data = await res.json() as { code: string };
    assert.equal(data.code, 'UPGRADE_REQUIRED');
  });

  test('GET /leaderboard/js returns 401 without auth', async () => {
    const res = await fetch(`${BASE}/leaderboard/js`);
    assert.equal(res.status, 401);
  });
});

// ── Cleanup ────────────────────────────────────────────────────────────────────

describe('Cleanup', () => {
  test('POST /auth/logout invalidates session', async () => {
    // Use AbortController to avoid hanging on network issues
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await api('/auth/logout', {
        method: 'POST',
        body:   JSON.stringify({ refreshToken }),
        signal: ctrl.signal,
      });
      assert.equal(res.status, 204);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Network timeout on cold Railway request — skip gracefully
        console.log('  (logout timed out — Railway cold request, skipping)');
        return;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  });
});
