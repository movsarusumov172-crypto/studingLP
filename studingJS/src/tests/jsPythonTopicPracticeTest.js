const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const jsKernel = require('../kernels/js');
const pythonKernel = require('../kernels/python');

async function loadTopics(filename) {
  const modulePath = path.join(__dirname, '..', 'renderer', filename);
  const module = await import(pathToFileURL(modulePath).href);
  const topics = Array.isArray(module.default)
    ? module.default
    : Array.isArray(module.THEORY_TOPICS)
      ? module.THEORY_TOPICS
      : Array.isArray(module.theoryTopics)
        ? module.theoryTopics
        : [];

  return topics.map((topic) => ({
    id: topic.topicId || topic.id,
    title: topic.topicTitle || topic.title
  })).filter((topic) => topic.id && topic.title);
}

async function assertTopicPractice({ kernel, kernelName, topics, run }) {
  for (const topic of topics) {
    const task = await kernel.generateTask({
      practiceTopicId: topic.id,
      practiceTopicTitle: topic.title,
      randomMode: false,
      focusDifficulty: 'easy',
      difficulties: ['easy'],
      seed: `${kernelName}:topic:${topic.id}`
    });

    assert.ok(task, `${kernelName}: expected task for ${topic.id}`);
    assert.equal(task.meta?.practiceTopicId, topic.id, `${kernelName}: expected topic id trace for ${topic.id}`);
    assert.equal(task.meta?.practiceTopicTitle, topic.title, `${kernelName}: expected topic title trace for ${topic.id}`);
    assert.ok(String(task.prompt || '').includes(topic.title) || String(task.explanation || '').includes(topic.title), `${kernelName}: expected prompt/explanation to reference ${topic.title}`);
    assert.ok(Array.isArray(task.tests) && task.tests.length > 0, `${kernelName}: expected tests for ${topic.id}`);

    const solutionResult = await run(task, task.solution);
    assert.equal(solutionResult.passed, true, `${kernelName}: expected solution for ${topic.id} to pass`);

    const starterResult = await run(task, task.starterCode);
    assert.equal(starterResult.passed, false, `${kernelName}: expected starter for ${topic.id} to be unfinished`);
  }
}

(async () => {
  const jsTopics = await loadTopics('theoryContent.js.mjs');
  const pythonTopics = await loadTopics('theoryContent.mjs');

  assert.ok(jsTopics.length > 0, 'Expected JS theory topics');
  assert.ok(pythonTopics.length > 0, 'Expected Python theory topics');

  await assertTopicPractice({
    kernel: jsKernel,
    kernelName: 'js',
    topics: jsTopics,
    run: (task, code) => jsKernel.runTaskTests(task, code)
  });

  await assertTopicPractice({
    kernel: pythonKernel,
    kernelName: 'python',
    topics: pythonTopics,
    run: (task, code) => pythonKernel.runTaskTests(task, code)
  });

  console.log(`JS/Python topic practice bridge passed (${jsTopics.length} JS, ${pythonTopics.length} Python topics).`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
