const assert = require('node:assert/strict');
const { CATEGORY_ORDER, DIFFICULTIES, generateTask } = require('../core/taskEngine');
const { verifyTaskWithRuntime } = require('../core/taskQuality');

async function main() {
  for (let index = 0; index < 10; index += 1) {
    const task = await generateTask({
      seed: `qa-${index}`,
      categories: CATEGORY_ORDER,
      difficulties: DIFFICULTIES,
      randomMode: true
    });

    assert.equal(task.meta && task.meta.qaStatus, 'verified', `task ${index} must be QA verified`);
    assert.equal(task.meta && task.meta.verified, true, `task ${index} must carry verified flag`);
    assert.ok(Array.isArray(task.tests) && task.tests.length > 0, `task ${index} must include tests`);
    assert.ok(task.meta && Array.isArray(task.meta.qaIssues), `task ${index} must include qaIssues array`);
  }

  const reference = await generateTask({
    seed: 'qa-reference',
    categories: CATEGORY_ORDER,
    difficulties: DIFFICULTIES,
    randomMode: true
  });

  const invalidStarter = await verifyTaskWithRuntime({
    ...reference,
    id: `${reference.id}-broken-starter`,
    starterCode: reference.solution
  });
  assert.equal(invalidStarter.passed, false, 'starter that solves task must fail QA');

  const invalidTests = await verifyTaskWithRuntime({
    ...reference,
    id: `${reference.id}-broken-tests`,
    tests: []
  });
  assert.equal(invalidTests.passed, false, 'task without tests must fail QA');

  console.log('Task quality passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
