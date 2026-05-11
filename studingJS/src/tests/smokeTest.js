const {
  CATEGORY_ORDER,
  DIFFICULTIES,
  generateTask,
  runTaskTests
} = require('../core/taskEngine');

async function main() {
  const ids = new Set();

  for (let index = 0; index < 200; index += 1) {
    const task = await generateTask({
      seed: index,
      categories: CATEGORY_ORDER,
      difficulties: DIFFICULTIES,
      randomMode: true
    });

    if (!task) {
      throw new Error(`Task is null for seed ${index}`);
    }

    if (!task.id) {
      throw new Error(`Task has no id for seed ${index}`);
    }

    if (ids.has(task.id)) {
      throw new Error(`Duplicate task id detected: ${task.id}`);
    }
    ids.add(task.id);

    if (!Array.isArray(task.tests) || task.tests.length === 0) {
      throw new Error(`Task has no tests for seed ${index}`);
    }

    if (typeof task.starterCode !== 'string' || task.starterCode.length === 0) {
      throw new Error(`Task has no starterCode for seed ${index}`);
    }

    if (typeof task.solution !== 'string' || task.solution.length === 0) {
      throw new Error(`Task has no solution for seed ${index}`);
    }

    if (index % 25 === 0) {
      const solutionReport = await runTaskTests(task, task.solution);
      if (!solutionReport.passed) {
        throw new Error(`Solution failed for seed ${index}: ${solutionReport.error || 'unknown error'}`);
      }

      const starterReport = await runTaskTests(task, task.starterCode);
      if (starterReport.passed) {
        throw new Error(`Starter code unexpectedly passed for seed ${index}`);
      }
    }
  }

  console.log(`Smoke test passed for ${ids.size} generated tasks.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
