const assert = require('node:assert/strict');
const { chooseCategory, rememberTask } = require('../core/taskEngine');

function main() {
  rememberTask({
    id: 'category-seed',
    category: 'arrays',
    difficulty: 'easy',
    kernelId: 'js'
  });

  const rng = {
    weighted(items) {
      const repeated = items.find((item) => item.value === 'arrays');
      return repeated ? repeated.value : items[0].value;
    },
    bool() {
      return true;
    },
    pick(list) {
      return list[0];
    }
  };

  const diversified = chooseCategory(rng, {
    categories: ['arrays', 'objects'],
    randomMode: true
  });

  assert.equal(diversified, 'objects', 'category should diversify when it repeats consecutively');

  const stableRng = {
    weighted(items) {
      const repeated = items.find((item) => item.value === 'arrays');
      return repeated ? repeated.value : items[0].value;
    },
    bool() {
      return false;
    },
    pick(list) {
      return list[0];
    }
  };

  const stable = chooseCategory(stableRng, {
    categories: ['arrays', 'objects'],
    randomMode: true
  });

  assert.equal(stable, 'arrays', 'category should stay the same when boost does not trigger');

  console.log('Diversity boost passed.');
}

main();
