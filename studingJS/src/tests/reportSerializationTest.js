const assert = require('node:assert/strict');
const kernelManager = require('../execution');

async function main() {
  const task = {
    kernelId: 'js',
    category: 'functions',
    difficulty: 'easy',
    title: 'Callback report serialization',
    prompt: 'Test structured clone safety.',
    signature: 'solve(cb)',
    starterCode: 'function solve(cb) { return cb(1); }',
    solution: 'function solve(cb) { return cb(42); }',
    hints: [],
    explanation: '',
    strategy: 'simple',
    tests: [
      {
        args: [{ __fn: 'record', key: 'cb', returnValue: 42 }],
        expected: 42
      }
    ],
    tags: ['serialization'],
    meta: {
      answerFormat: 'number',
      thinkingStyle: 'direct',
      variationNotes: ['safe report']
    }
  };

  const report = await kernelManager.runTaskTests(task, 'function solve(cb) { return cb(42); }');

  assert.ok(report && typeof report === 'object', 'Report must be an object');
  assert.equal(report.passed, true, 'Report should pass');
  assert.doesNotThrow(() => structuredClone(report), 'Report must be structured-clone safe');
  assert.ok(Array.isArray(report.tests) && report.tests.length === 1, 'Report must include tests');
  assert.equal(typeof report.tests[0].input[0], 'string', 'Function inputs must be serialized');

  console.log('Report serialization test passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
