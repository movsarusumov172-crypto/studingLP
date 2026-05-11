const assert = require('node:assert/strict');
const {
  chooseCategory,
  rememberTask,
  resetCategoryWeights,
  categoryWeights
} = require('../core/taskEngine');

function main() {
  resetCategoryWeights();

  const rng = {
    weighted(items) {
      return items.slice().sort((left, right) => right.weight - left.weight)[0].value;
    },
    bool() {
      return false;
    },
    pick(list) {
      return list[0];
    }
  };

  categoryWeights.arrays = 0.5;
  categoryWeights.objects = 1;

  const chosen = chooseCategory(rng, {
    categories: ['arrays', 'objects'],
    randomMode: true,
    adaptive: true
  });

  assert.equal(chosen, 'objects', 'higher weighted category should win selection');

  resetCategoryWeights();
  assert.equal(categoryWeights.arrays, 1, 'reset must restore arrays weight');
  assert.equal(categoryWeights.objects, 1, 'reset must restore objects weight');

  rememberTask({
    id: 'weight-a',
    category: 'arrays',
    difficulty: 'easy',
    kernelId: 'js'
  });

  assert.equal(categoryWeights.arrays, 0.9, 'selected category should decay by 10%');

  rememberTask({
    id: 'weight-b',
    category: 'arrays',
    difficulty: 'easy',
    kernelId: 'js'
  });

  assert.equal(categoryWeights.arrays, 0.81, 'repeated selection should keep decaying');

  console.log('Weighting boost passed.');
}

main();
