const assert = require('node:assert/strict');
const pythonKernel = require('../kernels/python');

const REQUIRED_CATEGORIES = ['variables', 'conditionals', 'loops'];

(async () => {
  for (const category of REQUIRED_CATEGORIES) {
    const task = pythonKernel.generateTask({
      categories: [category],
      focusCategory: category,
      randomMode: false,
      difficulty: 'easy',
      seed: `theory-practice-${category}`
    });

    assert.ok(task, `Expected a task for ${category}`);
    assert.equal(task.category, category, `Expected category ${category} to generate matching practice`);
    assert.ok(Array.isArray(task.tests) && task.tests.length > 0, `Expected tests for ${category}`);

    const result = await pythonKernel.runTaskTests(task, task.solution);
    assert.equal(result.passed, true, `Expected solution for ${category} to pass`);

    const starterResult = await pythonKernel.runTaskTests(task, task.starterCode);
    assert.equal(starterResult.passed, false, `Expected starter code for ${category} to stay unfinished`);
  }

  console.log('Python theory-practice bridge passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
