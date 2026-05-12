const assert = require('node:assert/strict');

const kernels = {
  cpp: require('../kernels/cpp'),
  csharp: require('../kernels/csharp'),
  java: require('../kernels/java')
};

const topicsByKernel = {
  cpp: [
    'variables',
    'classes',
    'stl',
    'templates',
    'memory',
    'move-semantics',
    'exceptions',
    'lambdas',
    'iterators-algorithms',
    'build-model',
    'strings-string-view',
    'enum-class',
    'concurrency-basics'
  ],
  csharp: [
    'variables',
    'classes',
    'collections',
    'linq',
    'async',
    'nullable-references',
    'records',
    'pattern-matching',
    'delegates-events',
    'exceptions',
    'di-async-streams',
    'generics',
    'files-disposable'
  ],
  java: [
    'variables',
    'classes',
    'collections',
    'streams',
    'interfaces',
    'exceptions',
    'generics',
    'optional-null-safety',
    'concurrency-basics',
    'records-sealed',
    'packages-build',
    'annotations',
    'io-files'
  ]
};

for (const [kernelId, topicIds] of Object.entries(topicsByKernel)) {
  const kernel = kernels[kernelId];

  for (const topicId of topicIds) {
    const topicTitle = `${kernelId} topic ${topicId}`;
    const task = kernel.generateTask({
      seed: `topic-practice:${kernelId}:${topicId}`,
      practiceTopicId: topicId,
      practiceTopicTitle: topicTitle,
      randomMode: false
    });

    assert.equal(task.kernelId, kernelId, `${kernelId}/${topicId} must preserve kernel id`);
    assert.equal(task.practiceTopicId, topicId, `${kernelId}/${topicId} must expose practiceTopicId`);
    assert.equal(task.practiceTopicTitle, topicTitle, `${kernelId}/${topicId} must expose practiceTopicTitle`);
    assert.equal(task.meta?.practiceTopicId, topicId, `${kernelId}/${topicId} must expose topic id in meta`);
    assert.equal(task.meta?.practiceTopicTitle, topicTitle, `${kernelId}/${topicId} must expose topic title in meta`);
    assert.ok(Array.isArray(task.tests) && task.tests.length > 0, `${kernelId}/${topicId} must include tests`);
    assert.ok(typeof task.title === 'string' && task.title.length > 0, `${kernelId}/${topicId} must include title`);
    assert.ok(typeof task.solution === 'string' && task.solution.length > 0, `${kernelId}/${topicId} must include solution`);
  }
}

for (const [kernelId, kernel] of Object.entries(kernels)) {
  const fallback = kernel.generateTask({
    seed: `topic-practice:${kernelId}:unknown`,
    practiceTopicId: 'unknown-topic',
    practiceTopicTitle: 'Unknown topic',
    randomMode: false
  });

  assert.equal(fallback.kernelId, kernelId, `${kernelId} fallback must still generate in the same kernel`);
  assert.equal(fallback.practiceTopicId, undefined, `${kernelId} fallback must not pretend to know unknown topic`);
  assert.ok(Array.isArray(fallback.tests) && fallback.tests.length > 0, `${kernelId} fallback must keep normal generation`);
}

console.log('C++/C#/Java topic practice generation test passed.');
