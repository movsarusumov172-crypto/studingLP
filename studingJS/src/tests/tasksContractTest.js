const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRng } = require('../engine/rng');

const TASKS_DIR = path.join(__dirname, '..', 'tasks');
const FORBIDDEN_IMPORTS = [
  /require\(['"]\.\.\/runtime/,
  /require\(['"]\.\.\/core/,
  /require\(['"]\.\.\/legacy/,
  /from\s+['"]\.\.\/runtime/,
  /from\s+['"]\.\.\/core/,
  /from\s+['"]\.\.\/legacy/
];

function getTaskFiles() {
  return fs
    .readdirSync(TASKS_DIR)
    .filter((file) => file.endsWith('.js'))
    .filter((file) => file !== 'shared.js')
    .sort();
}

function assertNoForbiddenImports(source, fileName) {
  for (const pattern of FORBIDDEN_IMPORTS) {
    assert.ok(!pattern.test(source), `${fileName} must not import runtime/core/legacy`);
  }
}

function getGeneratorExport(moduleExports, fileName) {
  const functionEntries = Object.entries(moduleExports).filter(([, value]) => typeof value === 'function');
  assert.equal(functionEntries.length, 1, `${fileName} must export exactly one generator function`);

  const [exportName, generator] = functionEntries[0];
  assert.ok(/^build[A-Z].*Task$/.test(exportName), `${fileName} export name must look like buildXTask`);
  assert.equal(typeof generator, 'function', `${fileName} export must be a function`);
  return generator;
}

function serializeTask(task) {
  return JSON.stringify(task);
}

async function main() {
  const files = getTaskFiles();
  assert.ok(files.length > 0, 'No task generator files found');

  for (const file of files) {
    const fullPath = path.join(TASKS_DIR, file);
    const source = fs.readFileSync(fullPath, 'utf8');
    assertNoForbiddenImports(source, file);

    const moduleExports = require(fullPath);
    const generator = getGeneratorExport(moduleExports, file);

    for (const difficulty of ['easy', 'medium', 'hard', 'expert']) {
      const seed = `contract:${file}:${difficulty}`;
      const first = generator(difficulty, createRng(seed));
      const second = generator(difficulty, createRng(seed));

      assert.deepEqual(first, second, `${file} must be deterministic for difficulty "${difficulty}"`);
      assert.ok(first && typeof first === 'object', `${file} must return a task object`);
      assert.equal(typeof first.id, 'string', `${file} must assign task.id`);
      assert.equal(typeof first.title, 'string', `${file} must assign task.title`);
      assert.equal(typeof first.prompt, 'string', `${file} must assign task.prompt`);
      assert.equal(typeof first.starterCode, 'string', `${file} must assign starterCode`);
      assert.equal(typeof first.solution, 'string', `${file} must assign solution`);
      assert.ok(Array.isArray(first.tests) && first.tests.length > 0, `${file} must provide tests`);
      assert.equal(first.kernelId, 'js', `${file} must stay isolated from runtime/kernel layers`);
    }

    const baseline = serializeTask(generator('easy', createRng(`contract:${file}:baseline`)));
    const repeat = serializeTask(generator('easy', createRng(`contract:${file}:baseline`)));
    assert.equal(baseline, repeat, `${file} must remain pure across repeated calls`);
  }

  console.log(`Task generator contract passed for ${files.length} files.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
