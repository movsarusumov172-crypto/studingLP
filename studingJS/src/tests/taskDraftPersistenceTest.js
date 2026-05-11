const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  const modulePath = path.join(__dirname, '..', 'renderer', 'taskDrafts.mjs');
  const drafts = await import(pathToFileURL(modulePath).href);

  const task = { id: 'task-1', starterCode: 'starter-code' };
  const stored = { 'task-1': 'solved-code', 'task-2': 'other-code' };

  assert.equal(drafts.readDraftForTask(stored, task), 'solved-code', 'must read existing draft for task');

  drafts.forgetDraftForTask(stored, task.id);
  assert.equal(Object.prototype.hasOwnProperty.call(stored, 'task-1'), false, 'solved task draft must be removed');
  assert.equal(drafts.readDraftForTask(stored, task), 'starter-code', 'after removal task must fall back to starter');

  drafts.rememberDraftForTask(stored, task.id, 'typed-code');
  assert.equal(stored['task-1'], 'typed-code', 'must store draft value for task');

  console.log('Task draft persistence passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
