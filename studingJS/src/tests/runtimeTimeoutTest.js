const assert = require('node:assert/strict');
const { runTaskTests } = require('../runtime/executor');

const task = {
  kernelId: 'js',
  category: 'functions',
  difficulty: 'easy',
  title: 'Runtime timeout guard',
  prompt: 'Check timeout handling for unresolved async work.',
  signature: 'solve(value)',
  starterCode: 'function solve(value) { return value; }',
  solution: 'function solve(value) { return value; }',
  hints: [],
  explanation: '',
  strategy: 'simple',
  tests: [
    {
      args: [1],
      expected: 2
    }
  ],
  tags: ['runtime', 'timeout'],
  meta: {
    answerFormat: 'number',
    thinkingStyle: 'direct',
    structureType: 'single',
    contextType: 'signals',
    variationNotes: ['timeout guard']
  }
};

async function withDeadline(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Test hung for more than ${ms}ms`)), ms);
    })
  ]);
}

async function run() {
  const asyncHang = await withDeadline(
    runTaskTests(task, `
      async function solve(value) {
        return new Promise(() => {});
      }
    `)
  );

  assert.equal(asyncHang.passed, false, 'Unresolved async promise must fail');
  assert.match(String(asyncHang.error || ''), /timed out/i, 'Async hang must report timeout');

  const syncHang = await withDeadline(
    runTaskTests(task, `
      function solve(value) {
        while (true) {}
      }
    `)
  );

  assert.equal(syncHang.passed, false, 'Infinite loop must fail');
  assert.match(String(syncHang.error || ''), /timed out/i, 'Infinite loop must report timeout');

  console.log('Runtime timeout test passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
