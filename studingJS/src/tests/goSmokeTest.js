const assert = require('node:assert/strict');
const kernel = require('../kernels/go');

async function main() {
  if (!kernel.updateRuntimeAvailability()) {
    throw new Error('Go runtime is not available.');
  }

  const matrix = [
    { category: 'arrays', difficulty: 'easy' },
    { category: 'arrays', difficulty: 'expert' },
    { category: 'strings', difficulty: 'medium' },
    { category: 'maps', difficulty: 'hard' },
    { category: 'recursion', difficulty: 'expert' },
    { category: 'algorithms', difficulty: 'hard' }
  ];

  for (const entry of matrix) {
    const task = kernel.generateTask({
      seed: `go-smoke:${entry.category}:${entry.difficulty}`,
      categories: [entry.category],
      difficulties: [entry.difficulty],
      focusCategory: entry.category,
      focusDifficulty: entry.difficulty,
      randomMode: false
    });

    assert.equal(task.kernelId, 'go');
    assert.equal(task.editorLanguage, 'go');
    assert.ok(typeof task.signature === 'string' && task.signature.startsWith('func solve'), 'Go task must expose a Go signature');
    assert.ok(Array.isArray(task.tests) && task.tests.length > 0, 'Go task must expose tests');

    const solutionReport = await kernel.runTaskTests(task, task.solution);
    assert.ok(solutionReport.passed, `Go solution failed for ${entry.category}/${entry.difficulty}: ${solutionReport.error || 'unknown error'}`);

    const starterReport = await kernel.runTaskTests(task, task.starterCode);
    assert.ok(!starterReport.passed, `Go starter unexpectedly passed for ${entry.category}/${entry.difficulty}`);
  }

  console.log(`Go smoke test passed for ${matrix.length} tasks.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
