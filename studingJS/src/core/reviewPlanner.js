'use strict';

const REVIEW_FAIL_INTERVALS = [5, 20, 60, 180, 720];
const REVIEW_PASS_INTERVALS = [720, 1440, 4320, 10080, 20160];

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toTimestamp(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createReviewEntry() {
  return {
    dueAt: null,
    pressure: 0,
    lastAttemptAt: null,
    lastReviewedAt: null,
    lastResult: null
  };
}

function createReviewDeck(categories = []) {
  return categories.reduce((acc, category) => {
    acc[category] = createReviewEntry();
    return acc;
  }, {});
}

function normalizeReviewEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return createReviewEntry();
  }

  const dueAt = toTimestamp(entry.dueAt);
  const pressure = clamp(Math.floor(toNumber(entry.pressure, 0)), 0, 5);
  const lastAttemptAt = toTimestamp(entry.lastAttemptAt);
  const lastReviewedAt = toTimestamp(entry.lastReviewedAt);
  const lastResult = entry.lastResult === 'pass' || entry.lastResult === 'fail' ? entry.lastResult : null;

  return {
    dueAt,
    pressure,
    lastAttemptAt,
    lastReviewedAt,
    lastResult
  };
}

function normalizeReviewDeck(categories = [], raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return categories.reduce((acc, category) => {
    acc[category] = normalizeReviewEntry(source[category]);
    return acc;
  }, {});
}

function formatReviewDue(dueAt, now = Date.now()) {
  if (dueAt === null || dueAt === undefined || dueAt === '') {
    return 'ещё не назначен';
  }

  const timestamp = Number(dueAt);
  if (!Number.isFinite(timestamp)) {
    return 'ещё не назначен';
  }

  const deltaMs = timestamp - now;
  if (deltaMs <= 0) {
    return 'сейчас';
  }

  const minutes = Math.round(deltaMs / 60000);
  if (minutes < 60) {
    return `через ${Math.max(1, minutes)} мин`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `через ${Math.max(1, hours)} ч`;
  }

  const days = Math.round(hours / 24);
  return `через ${Math.max(1, days)} д`;
}

function getStageLabel(pressure, mastery) {
  if (pressure >= 4) {
    return 'Срочно повторить';
  }

  if (pressure >= 2) {
    return 'На повторении';
  }

  if (mastery < 35) {
    return 'Нужно укрепить';
  }

  if (mastery < 70) {
    return 'На поддержке';
  }

  return 'В порядке';
}

function getFallbackIntervalMinutes(mastery) {
  if (mastery < 20) {
    return 15;
  }

  if (mastery < 40) {
    return 120;
  }

  if (mastery < 60) {
    return 360;
  }

  if (mastery < 80) {
    return 1440;
  }

  return 4320;
}

function getReviewSnapshot(categories = [], progress = {}, masteryByCategory = {}, now = Date.now()) {
  const reviewDeck = normalizeReviewDeck(categories, progress.reviewDeck);
  const items = categories.map((category) => {
    const mastery = clamp(Math.floor(toNumber(masteryByCategory[category], 0)), 0, 100);
    const review = reviewDeck[category] || createReviewEntry();
    const dueAt = toTimestamp(review.dueAt);
    const due = dueAt !== null && dueAt <= now;
    const overdueMs = dueAt !== null ? Math.max(0, now - dueAt) : Number.POSITIVE_INFINITY;
    const pressure = clamp(Math.floor(toNumber(review.pressure, 0)), 0, 5);

    return {
      category,
      mastery,
      pressure,
      dueAt,
      due,
      overdueMs,
      lastAttemptAt: toTimestamp(review.lastAttemptAt),
      lastReviewedAt: toTimestamp(review.lastReviewedAt),
      lastResult: review.lastResult,
      stage: getStageLabel(pressure, mastery),
      dueLabel: formatReviewDue(dueAt, now)
    };
  });

  const dueItems = items
    .filter((item) => item.due)
    .sort((a, b) => {
      if (a.overdueMs !== b.overdueMs) {
        return b.overdueMs - a.overdueMs;
      }
      if (a.pressure !== b.pressure) {
        return b.pressure - a.pressure;
      }
      if (a.mastery !== b.mastery) {
        return a.mastery - b.mastery;
      }
      return a.category.localeCompare(b.category);
    });

  const weakItems = items
    .slice()
    .sort((a, b) => {
      if (a.mastery !== b.mastery) {
        return a.mastery - b.mastery;
      }
      if (a.pressure !== b.pressure) {
        return b.pressure - a.pressure;
      }
      if (a.dueAt === null && b.dueAt !== null) {
        return 1;
      }
      if (a.dueAt !== null && b.dueAt === null) {
        return -1;
      }
      if (a.dueAt !== b.dueAt) {
        return (a.dueAt || 0) - (b.dueAt || 0);
      }
      return a.category.localeCompare(b.category);
    });

  return {
    deck: reviewDeck,
    items,
    dueItems,
    dueCount: dueItems.length,
    next: dueItems[0] || weakItems[0] || null
  };
}

function updateReviewDeck(categories = [], reviewDeck = {}, category, passed, mastery = 0, now = Date.now()) {
  const normalized = normalizeReviewDeck(categories, reviewDeck);
  if (!category || !Object.prototype.hasOwnProperty.call(normalized, category)) {
    return normalized;
  }

  const current = normalized[category] || createReviewEntry();
  const nextPressure = passed ? Math.max(0, current.pressure - 1) : Math.min(5, current.pressure + 1);
  const dueMinutes = passed
    ? (nextPressure > 0
      ? REVIEW_PASS_INTERVALS[Math.min(nextPressure - 1, REVIEW_PASS_INTERVALS.length - 1)]
      : getFallbackIntervalMinutes(mastery))
    : REVIEW_FAIL_INTERVALS[Math.min(Math.max(0, nextPressure - 1), REVIEW_FAIL_INTERVALS.length - 1)];

  normalized[category] = {
    ...current,
    pressure: nextPressure,
    lastAttemptAt: now,
    lastReviewedAt: now,
    lastResult: passed ? 'pass' : 'fail',
    dueAt: now + dueMinutes * 60000
  };

  return normalized;
}

module.exports = {
  REVIEW_FAIL_INTERVALS,
  REVIEW_PASS_INTERVALS,
  createReviewDeck,
  normalizeReviewDeck,
  getReviewSnapshot,
  updateReviewDeck,
  formatReviewDue,
  getStageLabel,
  getFallbackIntervalMinutes
};
