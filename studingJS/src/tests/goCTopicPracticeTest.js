const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const goKernel = require('../kernels/go');
const cKernel = require('../kernels/c');

async function loadTheoryTopics(fileName) {
  const moduleUrl = pathToFileURL(path.join(__dirname, '..', 'renderer', fileName)).href;
  const module = await import(moduleUrl);
  assert.ok(Array.isArray(module.THEORY_TOPICS), `${fileName} must export THEORY_TOPICS`);
  return module.THEORY_TOPICS.map((topic) => ({
    id: topic.id,
    title: topic.title
  }));
}

async function assertTopicPractice({ kernel, kernelId, topics, canRunSolutions }) {
  for (const topic of topics) {
    const task = kernel.generateTask({
      practiceTopicId: topic.id,
      practiceTopicTitle: topic.title,
      randomMode: false,
      difficulty: 'easy',
      seed: `${kernelId}:topic-practice:${topic.id}`
    });

    assert.equal(task.kernelId, kernelId, `${kernelId}/${topic.id} should use the requested kernel`);
    assert.equal(task.meta?.practiceTopicId, topic.id, `${kernelId}/${topic.id} should keep the topic id in meta`);
    assert.equal(task.meta?.practiceTopicTitle, topic.title, `${kernelId}/${topic.id} should keep the topic title in meta`);
    assert.ok(Array.isArray(task.tests) && task.tests.length > 0, `${kernelId}/${topic.id} should include tests`);
    assert.ok(typeof task.prompt === 'string' && task.prompt.length > 20, `${kernelId}/${topic.id} should include a prompt`);
    assert.ok(typeof task.solution === 'string' && task.solution.includes('solve'), `${kernelId}/${topic.id} should include a solution`);

    if (canRunSolutions) {
      const result = await kernel.runTaskTests(task, task.solution);
      assert.equal(result.passed, true, `${kernelId}/${topic.id} solution should pass: ${result.error || 'unknown error'}`);
    }
  }
}

(async () => {
  const goTopics = await loadTheoryTopics('theoryContent.go.mjs');
  const cTopics = await loadTheoryTopics('theoryContent.c.mjs');

  await assertTopicPractice({
    kernel: goKernel,
    kernelId: 'go',
    topics: goTopics,
    canRunSolutions: goKernel.updateRuntimeAvailability()
  });

  await assertTopicPractice({
    kernel: cKernel,
    kernelId: 'c',
    topics: cTopics,
    canRunSolutions: cKernel.updateRuntimeAvailability()
  });

  console.log(`Go/C topic practice bridge passed for ${goTopics.length + cTopics.length} topics.`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
