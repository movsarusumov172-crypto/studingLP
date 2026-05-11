const assert = require('node:assert/strict');
const { buildFallbackTask, resolveSeed } = require('../core/taskEngine');

function main() {
  const seed = resolveSeed({ seed: 'fallback-seed' });
  const task = buildFallbackTask(seed, { mode: 'practice', randomMode: true });

  assert.ok(task, 'fallback task must exist');
  assert.equal(task.category, 'arrays', 'fallback must use arrays category');
  assert.equal(task.difficulty, 'easy', 'fallback must use easy difficulty');
  assert.equal(task.meta && task.meta.fallback, true, 'fallback task must be marked as fallback');
  assert.equal(typeof task.id, 'string', 'fallback task must have an id');
  assert.equal(typeof task.title, 'string', 'fallback task must have a title');
  assert.equal(typeof task.solution, 'string', 'fallback task must have a solution');

  console.log('Fallback path passed.');
}

main();
