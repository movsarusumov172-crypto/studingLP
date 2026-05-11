/**
 * Одна команда для полного запуска:  node setup.mjs
 * Проверяет .env, подключается к БД, накатывает схему, стартует сервер.
 */
import { execSync, spawn }    from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve }            from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

function step(msg) { console.log(`\n▶  ${msg}`); }
function ok(msg)   { console.log(`   ✓  ${msg}`); }
function fail(msg) { console.error(`   ✗  ${msg}`); process.exit(1); }
function run(cmd)  { execSync(cmd, { cwd: ROOT, stdio: 'inherit' }); }

// ── 1. Проверяем .env ─────────────────────────────────────────────────────────
step('Проверяю .env…');

if (!existsSync(resolve(ROOT, '.env'))) {
  fail('.env не найден. Скопируй .env.example → .env и заполни DATABASE_URL');
}

const env = readFileSync(resolve(ROOT, '.env'), 'utf8');
if (env.includes('REPLACE_WITH_NEON')) {
  fail('DATABASE_URL не заполнен. Иди на neon.tech, создай проект, вставь connection string в .env');
}

ok('.env найден');

// ── 2. Устанавливаем зависимости ──────────────────────────────────────────────
step('npm install…');
run('npm install');
ok('зависимости установлены');

// ── 3. Накатываем схему БД ────────────────────────────────────────────────────
step('Накатываю схему на Neon…');
run('npm run db:push -- --force');
ok('таблицы созданы');

// ── 4. Запускаем dev-сервер ───────────────────────────────────────────────────
step('Запускаю сервер на http://localhost:3000\n');

const server = spawn('npm', ['run', 'dev'], {
  cwd:   ROOT,
  stdio: 'inherit',
  shell: true,
});

process.on('SIGINT', () => { server.kill(); process.exit(0); });
