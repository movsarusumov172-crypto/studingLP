/**
 * Деплой на Railway: node deploy.mjs
 * Требует: railway CLI установлен (npm i -g @railway/cli)
 *           railway login выполнен
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

function step(msg) { console.log(`\n▶  ${msg}`); }
function ok(msg)   { console.log(`   ✓  ${msg}`); }
function fail(msg) { console.error(`   ✗  ${msg}`); process.exit(1); }
function run(cmd)  { return execSync(cmd, { cwd: ROOT, stdio: 'pipe' }).toString().trim(); }
function runIO(cmd){ execSync(cmd, { cwd: ROOT, stdio: 'inherit' }); }

// ── Проверяем railway CLI ─────────────────────────────────────────────────────
step('Проверяю railway CLI…');
try { run('railway version'); ok('railway CLI найден'); }
catch { fail('railway CLI не найден. Запусти: npm i -g @railway/cli  и  railway login'); }

// ── Проверяем .env ────────────────────────────────────────────────────────────
step('Проверяю .env…');
if (!existsSync(resolve(ROOT, '.env'))) fail('.env не найден');
const env = readFileSync(resolve(ROOT, '.env'), 'utf8');
if (env.includes('REPLACE_WITH_NEON')) fail('DATABASE_URL не заполнен в .env');
ok('.env готов');

// ── Устанавливаем переменные окружения на Railway ─────────────────────────────
step('Загружаю переменные в Railway…');

const vars = {};
for (const line of env.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  vars[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
}

// Удаляем dev-специфичные переменные
delete vars['NODE_ENV'];
delete vars['PORT'];

const varArgs = Object.entries(vars)
  .map(([k, v]) => `${k}="${v}"`)
  .join(' ');

try {
  runIO(`railway variables set NODE_ENV=production ${varArgs}`);
  ok('переменные загружены');
} catch {
  fail('Не удалось загрузить переменные. Проверь railway login');
}

// ── Деплой ────────────────────────────────────────────────────────────────────
step('Деплой…');
runIO('railway up');

// ── Получаем URL ──────────────────────────────────────────────────────────────
step('Получаю URL…');
try {
  const url = run('railway domain');
  console.log(`\n🎉  Готово! API доступен на: https://${url}`);
  console.log(`    Проверь: curl https://${url}/health\n`);
} catch {
  ok('Деплой завершён. Проверь URL в Railway Dashboard');
}
