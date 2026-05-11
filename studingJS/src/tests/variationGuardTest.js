const assert = require('node:assert/strict');
const { createRng } = require('../engine/rng');
const { buildObjectsTask } = require('../tasks/objects');
const { buildFunctionsTask } = require('../tasks/functions');

function sampleVariations(label, builder) {
  const answerFormats = new Set();
  const thinkingStyles = new Set();

  for (const difficulty of ['easy', 'medium', 'hard', 'expert']) {
    for (let index = 0; index < 8; index += 1) {
      const task = builder(difficulty, createRng(`variation:${label}:${difficulty}:${index}`));
      assert.ok(task && typeof task === 'object', `${label} must return a task object`);
      assert.ok(task.meta && typeof task.meta === 'object', `${label} must provide meta`);
      assert.equal(typeof task.meta.answerFormat, 'string', `${label} must expose answerFormat`);
      assert.equal(typeof task.meta.thinkingStyle, 'string', `${label} must expose thinkingStyle`);
      assert.ok(Array.isArray(task.meta.variationNotes), `${label} must expose variationNotes`);
      assert.ok(task.meta.variationNotes.length > 0, `${label} must include variation notes`);

      answerFormats.add(task.meta.answerFormat);
      thinkingStyles.add(task.meta.thinkingStyle);
    }
  }

  assert.ok(answerFormats.size >= 2, `${label} must vary answerFormat`);
  assert.ok(thinkingStyles.size >= 2, `${label} must vary thinkingStyle`);
}

sampleVariations('objects', buildObjectsTask);
sampleVariations('functions', buildFunctionsTask);

console.log('Variation guard passed for objects and functions.');
