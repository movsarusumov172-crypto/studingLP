const assert = require('node:assert/strict');
const {
  createReviewDeck,
  normalizeReviewDeck,
  getReviewSnapshot,
  updateReviewDeck,
  formatReviewDue
} = require('../core/reviewPlanner');

function main() {
  const categories = ['arrays', 'objects', 'functions'];
  const emptyDeck = createReviewDeck(categories);

  assert.equal(Object.keys(emptyDeck).length, categories.length, 'review deck should include all categories');
  assert.equal(emptyDeck.arrays.pressure, 0, 'default pressure should be zero');

  const normalized = normalizeReviewDeck(categories, {
    arrays: { dueAt: 'not-a-number', pressure: 7, lastResult: 'maybe' },
    objects: { dueAt: 1234, pressure: 2, lastResult: 'pass' }
  });

  assert.equal(normalized.arrays.dueAt, null, 'invalid dueAt must be dropped');
  assert.equal(normalized.arrays.pressure, 5, 'pressure should be clamped');
  assert.equal(normalized.objects.dueAt, 1234, 'valid dueAt should remain');

  const masteryByCategory = { arrays: 20, objects: 80, functions: 60 };
  const snapshot = getReviewSnapshot(categories, { reviewDeck: normalized }, masteryByCategory, 1_000_000);

  assert.equal(snapshot.items.length, 3, 'snapshot should include all categories');
  assert.equal(snapshot.dueCount, 1, 'one category should be due');
  assert.equal(snapshot.next.category, 'objects', 'due category should be selected first');

  const afterFail = updateReviewDeck(categories, normalized, 'functions', false, 60, 1_000_000);
  assert.ok(afterFail.functions.pressure >= 1, 'failed review should increase pressure');
  assert.ok(afterFail.functions.dueAt > 1_000_000, 'failed review should schedule future retry');

  const afterPass = updateReviewDeck(categories, afterFail, 'functions', true, 60, 1_000_000);
  assert.ok(afterPass.functions.pressure <= afterFail.functions.pressure, 'successful review should lower pressure');
  assert.ok(afterPass.functions.dueAt > 1_000_000, 'successful review should still schedule spaced repetition');
  assert.equal(formatReviewDue(null), 'ещё не назначен', 'empty review slot should not look due');

  console.log('Review loop passed.');
}

main();
