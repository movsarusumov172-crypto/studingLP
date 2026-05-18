const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function source(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function assertNoRefreshTokenLocalStorage(file) {
  const text = source(file);
  assert.doesNotMatch(
    text,
    /localStorage\.(getItem|setItem)\([^)]*refreshToken/,
    `${file} must not read/write refresh tokens in renderer localStorage`,
  );
  assert.doesNotMatch(
    text,
    /localStorage\.(getItem|setItem)\(['"]jt\.auth\.refreshToken['"]/,
    `${file} must not read/write literal refresh-token localStorage keys`,
  );
}

assertNoRefreshTokenLocalStorage('renderer/api/auth.mjs');
assertNoRefreshTokenLocalStorage('renderer/api/client.mjs');
assertNoRefreshTokenLocalStorage('renderer/app.js');

function runTaskTestsSource(file) {
  const text = source(file);
  const start = text.indexOf('function runTaskTests');
  assert.notEqual(start, -1, `${file} must define runTaskTests`);
  const exportIndex = text.indexOf('module.exports', start);
  return text.slice(start, exportIndex === -1 ? text.length : exportIndex);
}

function spawnSyncCalls(segment) {
  return [...segment.matchAll(/spawnSync\([\s\S]*?\n\s*\}\);/g)].map((match) => match[0]);
}

function assertNativeKernelIsBounded(file) {
  const segment = runTaskTestsSource(file);
  const calls = spawnSyncCalls(segment);
  assert.ok(calls.length > 0, `${file} must run user code through spawnSync in this contract`);
  for (const call of calls) {
    assert.match(call, /timeout:\s*(NATIVE_RUN_TIMEOUT_MS|NATIVE_COMPILE_TIMEOUT_MS|\d+)/, `${file} spawnSync call needs a timeout`);
  }
  assert.match(segment, /buildSafeProcessEnv/, `${file} must use a scrubbed child-process env`);
  assert.doesNotMatch(segment, /\.\.\.process\.env|env:\s*process\.env/, `${file} must not pass raw process.env to user code`);
}

for (const file of [
  'kernels/python/index.js',
  'kernels/go/index.js',
  'kernels/c/index.js',
  'kernels/cpp/index.js',
  'kernels/java/index.js',
  'kernels/csharp/index.js',
]) {
  assertNativeKernelIsBounded(file);
}

{
  const safety = source('runtime/childProcessSafety.js');
  assert.match(safety, /SENSITIVE_ENV_KEY_PATTERN/);
  for (const secretName of ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'GEMINI_API_KEY', 'STRIPE_SECRET_KEY']) {
    assert.match(safety, new RegExp(secretName));
  }
}

{
  const preload = source('../preload.js');
  assert.match(preload, /openTrustedExternal/);
  assert.match(preload, /TRUSTED_EXTERNAL_HOSTS/);
  assert.doesNotMatch(preload, /openExternal:\s*\(url\)\s*=>\s*shell\.openExternal\(String\(url\)\)/);
}

{
  const main = source('../main.js');
  assert.match(main, /setWindowOpenHandler/);
  assert.match(main, /will-navigate/);
  assert.match(main, /isTrustedRendererUrl/);
}

{
  const executor = source('runtime/executor.js');
  assert.match(executor, /Object\.create\(null\)/);
  assert.match(executor, /codeGeneration:\s*\{\s*strings:\s*false,\s*wasm:\s*false\s*\}/);
  assert.doesNotMatch(executor, /\bsetTimeout,\s*$/m);
  assert.doesNotMatch(executor, /\bObject,\s*$/m);
  assert.doesNotMatch(executor, /\bprocess:\s*undefined/);
}

{
  const go = source('kernels/go/index.js');
  assert.match(go, /function isSafeGoType/);
  assert.match(go, /GO_PRIMITIVE_TYPES/);
  assert.doesNotMatch(go, /lower\.startsWith\('map\['\)\s*\|\|\s*lower\.startsWith\('\[\]'\)/);
}

{
  const python = source('kernels/python/index.js');
  const ensureRunner = python.match(/function ensureRunnerPath[\s\S]*?async function runTaskTests/)?.[0] ?? '';
  assert.match(ensureRunner, /fs\.writeFileSync\(extractedRunnerPath,\s*runnerSource/);
  assert.doesNotMatch(ensureRunner, /if\s*\(!fs\.existsSync\(extractedRunnerPath\)\)/);
}

{
  const app = source('renderer/app.js');
  assert.match(app, /syncResult\.conflict/);
  assert.doesNotMatch(app, /setSyncDot\(ok\s*\?/);
}

async function assertJsRunnerDoesNotExposeNode() {
  const { runTaskTests } = require('../runtime/executor');
  const globalEscape = await runTaskTests(
    {
      strategy: 'simple',
      tests: [{ args: [], expected: 'blocked' }],
    },
    `
      function solve() {
        try {
          return typeof this.constructor.constructor('return process')().versions.node === 'string'
            ? 'escaped'
            : 'blocked';
        } catch (error) {
          return 'blocked';
        }
      }
    `,
  );

  assert.equal(globalEscape.passed, true, `JS runner must block global Function-constructor escape: ${globalEscape.error || JSON.stringify(globalEscape.tests)}`);

  const callbackEscape = await runTaskTests(
    {
      strategy: 'simple',
      tests: [{ args: [{ __fn: 'returnArgument', key: 'safe-callback' }], expected: 'blocked' }],
    },
    `
      function solve(fn) {
        try {
          return typeof fn.constructor('return process')().versions.node === 'string'
            ? 'escaped'
            : 'blocked';
        } catch (error) {
          return 'blocked';
        }
      }
    `,
  );

  assert.equal(callbackEscape.passed, true, `JS runner must block callback Function-constructor escape: ${callbackEscape.error || JSON.stringify(callbackEscape.tests)}`);

  const timerEscape = await runTaskTests(
    {
      strategy: 'simple',
      tests: [{ args: [], expected: 'blocked' }],
    },
    `
      function solve() {
        try {
          setTimeout(() => {}, 0);
          return 'timer';
        } catch (error) {
          return 'blocked';
        }
      }
    `,
  );

  assert.equal(timerEscape.passed, true, `JS runner must block host timers: ${timerEscape.error || JSON.stringify(timerEscape.tests)}`);

  const domEscape = await runTaskTests(
    {
      strategy: 'dom',
      tests: [{ args: [], expected: 'blocked', fixture: { body: [{ tag: 'main', id: 'root' }] } }],
    },
    `
      function solve(document) {
        try {
          return typeof document.createElement.constructor('return process')().versions.node === 'string'
            ? 'escaped'
            : 'blocked';
        } catch (error) {
          return 'blocked';
        }
      }
    `,
  );

  assert.equal(domEscape.passed, true, `JS runner must block DOM helper Function-constructor escape: ${domEscape.error || JSON.stringify(domEscape.tests)}`);
}

async function assertGoTypeMetadataIsSanitized() {
  const goKernel = require('../kernels/go');
  const maliciousType = '[]int) { println("owned") }; func injected() []int';
  const task = goKernel.normalizeCustomTask({
    title: 'Malicious Go metadata',
    prompt: 'metadata must not inject Go code',
    returnType: maliciousType,
    argTypes: [maliciousType],
    argNames: ['values'],
    starterCode: 'package main\nfunc solve(values int) int { return values }',
    tests: [{ input: [1], expected: 1 }],
  });

  assert.equal(task.returnType, 'int');
  assert.deepEqual(task.argTypes, ['int']);
  assert.equal(task.meta.go.returnType, 'int');
  assert.deepEqual(task.meta.go.argTypes, ['int']);
}

Promise.all([
  assertJsRunnerDoesNotExposeNode(),
  assertGoTypeMetadataIsSanitized(),
])
  .then(() => {
    console.log('Security contract passed.');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
