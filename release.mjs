/**
 * Release checklist — запускать перед каждым релизом.
 * node release.mjs
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT       = dirname(fileURLToPath(import.meta.url));
const ELECTRON   = join(ROOT, 'studingJS');
const SERVER     = join(ROOT, 'server');

let passed = 0, failed = 0;

function step(name, fn) {
  process.stdout.write(`  ${name}... `);
  try {
    fn();
    console.log('✓');
    passed++;
  } catch (e) {
    console.log(`✗  ${e.message}`);
    failed++;
  }
}

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'pipe', timeout: 120_000 });
}

function auditJson(cwd) {
  try {
    return JSON.parse(execSync('npm audit --json', { cwd }).toString());
  } catch (err) {
    const stdout = err?.stdout?.toString?.() ?? '';
    if (!stdout) throw err;
    return JSON.parse(stdout);
  }
}

console.log('\n📋  Release checklist\n');

// ── Frontend ──────────────────────────────────────────────────────────────────
console.log('Frontend (studingJS):');

step('smoke test (200 tasks)', () => run('node src/tests/smokeTest.js', ELECTRON));
step('theory:practice contract', () => run('npm run theory:practice', ELECTRON));
step('theory:coverage (94 topics)', () => run('npm run theory:coverage', ELECTRON));
step('node syntax check app.js', () => run('node --check src/renderer/app.js', ELECTRON));
step('audit (no critical/high)', () => {
  const d = auditJson(ELECTRON);
  const { critical = 0, high = 0 } = d.metadata?.vulnerabilities ?? {};
  if (critical > 0) throw new Error(`${critical} critical vulnerabilities`);
  if (high > 1) throw new Error(`${high} high vulnerabilities (1 accepted: electron)`);
});

// ── Backend ───────────────────────────────────────────────────────────────────
console.log('\nBackend (server):');

step('TypeScript build', () => run('npx tsc --noEmit', SERVER));
step('audit (0 critical, 0 high)', () => {
  const d = auditJson(SERVER);
  const { critical = 0, high = 0 } = d.metadata?.vulnerabilities ?? {};
  if (critical > 0) throw new Error(`${critical} critical vulnerabilities`);
  if (high > 0) throw new Error(`${high} high vulnerabilities`);
});

// ── Integration tests (prod) ──────────────────────────────────────────────────
console.log('\nIntegration tests:');

step('production backend health', () => {
  const out = execSync('curl -sf https://perfect-curiosity-production-b689.up.railway.app/health', { timeout: 10_000 }).toString();
  const d = JSON.parse(out);
  if (d.status !== 'ok') throw new Error(`health status: ${d.status}`);
});

// ── Build ─────────────────────────────────────────────────────────────────────
console.log('\nBuild:');

step('installer build', () => run('npm run dist', ELECTRON));
step('installer exists', () => {
  const f = join(ELECTRON, 'dist', 'JS Infinite Trainer Setup 1.0.0.exe');
  if (!existsSync(f)) throw new Error('installer not found');
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`✓ ${passed} passed   ${failed > 0 ? `✗ ${failed} failed` : ''}`);

if (failed > 0) {
  console.log('\n❌  Release blocked — fix failures above.\n');
  process.exit(1);
} else {
  console.log('\n✅  Ready to release!\n');
  console.log('Next steps:');
  console.log('  1. cd server && railway up');
  console.log('  2. Upload installer to GitHub Release');
  console.log('  3. git tag v1.x.x && git push --tags\n');
}
