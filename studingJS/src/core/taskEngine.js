const { createRng } = require('../engine/rng');
const { codeBlock, makeTaskId, buildTaskFromParts, normalizeCustomTask: normalizeCustomTaskPayload, XP_BY_DIFFICULTY } = require('../engine/taskBuilder');
const { runTaskTests } = require('../runtime/executor');
const { buildArraysTask } = require('../tasks/arrays');
const { buildObjectsTask } = require('../tasks/objects');
const { buildFunctionsTask } = require('../tasks/functions');
const { buildClosuresTask } = require('../tasks/closures');
const { buildAsyncTask } = require('../tasks/async');
const { buildAlgorithmsTask } = require('../tasks/algorithms');
const { buildDomTask } = require('../tasks/dom');
const { verifyTaskWithRuntime, markVerifiedTask } = require('./taskQuality');

const CATEGORY_META = {
  arrays: {
    title: 'Массивы',
    description: 'Фильтрация, сортировка, окна, частоты и преобразования',
    accent: '#7dd3fc'
  },
  objects: {
    title: 'Объекты',
    description: 'Поля, вложенность, слияние, нормализация и diff',
    accent: '#a78bfa'
  },
  functions: {
    title: 'Функции',
    description: 'Параметры, callbacks, композиция и универсальные утилиты',
    accent: '#f59e0b'
  },
  closures: {
    title: 'Замыкания',
    description: 'Скрытое состояние, фабрики, кэш и event bus',
    accent: '#34d399'
  },
  async: {
    title: 'Асинхронность',
    description: 'Promise, async/await, retry, pipeline и concurrency',
    accent: '#fb7185'
  },
  dom: {
    title: 'DOM',
    description: 'Обновление интерфейса, списки, классы и события',
    accent: '#22c55e'
  },
  algorithms: {
    title: 'Алгоритмы',
    description: 'Двухуказатели, интервалы, строки и поиск',
    accent: '#f97316'
  }
};

const CATEGORY_ORDER = Object.keys(CATEGORY_META);
const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];

const DIFFICULTY_META = {
  easy: { title: 'Лёгкий', xp: 10 },
  medium: { title: 'Средний', xp: 20 },
  hard: { title: 'Сложный', xp: 35 },
  expert: { title: 'Эксперт', xp: 60 }
};

const TASK_BUILDERS = Object.freeze({
  arrays: buildArraysTask,
  objects: buildObjectsTask,
  functions: buildFunctionsTask,
  closures: buildClosuresTask,
  async: buildAsyncTask,
  algorithms: buildAlgorithmsTask,
  dom: buildDomTask
});

const usedSeeds = new Set();
const categoryWeights = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, 1]));
const recentTasks = [];
let lastCategory = null;
let seedCounter = 0;
const CATEGORY_SWITCH_CHANCE = 0.7;

function resolveChallengeType(mode) {
  if (mode === 'daily') {
    return 'daily';
  }
  if (mode === 'boss') {
    return 'boss';
  }
  if (mode === 'review') {
    return 'review';
  }
  return 'practice';
}

function normalizeSelection(list, fallback) {
  const filtered = Array.isArray(list) ? list.filter((item) => fallback.includes(item)) : [];
  return filtered.length > 0 ? filtered : fallback.slice();
}

function resolveSeed(options = {}) {
  if (options.seed !== undefined && options.seed !== null) {
    return String(options.seed);
  }

  const categoryPart = Array.isArray(options.categories) ? options.categories.join('|') : 'all';
  const difficultyPart = Array.isArray(options.difficulties) ? options.difficulties.join('|') : 'all';
  const modePart = options.mode || 'practice';
  const focusPart = `${options.focusCategory || 'any'}:${options.focusDifficulty || 'any'}`;
  const counterPart = options.seriesIndex !== undefined ? String(options.seriesIndex) : `${Date.now()}:${seedCounter += 1}`;
  return `${modePart}:${categoryPart}:${difficultyPart}:${focusPart}:${counterPart}`;
}

function generateUniqueSeed(baseSeed) {
  let seed = String(baseSeed);
  while (usedSeeds.has(seed)) {
    seed = `${seed}_x`;
  }
  usedSeeds.add(seed);
  return seed;
}

function resetCategoryWeights() {
  for (const category of CATEGORY_ORDER) {
    categoryWeights[category] = 1;
  }
}

function decayCategoryWeight(category) {
  if (Object.prototype.hasOwnProperty.call(categoryWeights, category)) {
    categoryWeights[category] *= 0.9;
  }
}

function getRecentCounts(key) {
  const counts = new Map();
  for (const entry of recentTasks) {
    const value = entry[key];
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

function chooseCategory(rng, options = {}) {
  const pool = normalizeSelection(options.categories, CATEGORY_ORDER);
  if (options.randomMode === false) {
    if (pool.includes(options.focusCategory)) {
      return options.focusCategory;
    }
    return pool[0];
  }

  if (options.adaptive === false) {
    return rng.pick(pool);
  }

  const counts = getRecentCounts('category');
  const weights = pool.map((value) => ({
    value,
    weight: (1 / (1 + (counts.get(value) || 0))) * (categoryWeights[value] || 1)
  }));
  let category = rng.weighted(weights) || pool[0];

  if (options.randomMode !== false && pool.length > 1 && lastCategory && category === lastCategory) {
    if (typeof rng.bool === 'function' ? rng.bool(CATEGORY_SWITCH_CHANCE) : true) {
      category = pickAnotherCategory(rng, pool, category);
    }
  }

  return category;
}

function pickAnotherCategory(rng, pool, current) {
  const alternatives = pool.filter((value) => value !== current);
  if (alternatives.length === 0) {
    return current;
  }

  const counts = getRecentCounts('category');
  const weights = alternatives.map((value) => ({
    value,
    weight: (1 / (1 + (counts.get(value) || 0))) * (categoryWeights[value] || 1)
  }));

  return rng.weighted(weights) || rng.pick(alternatives) || current;
}

function chooseDifficulty(rng, options = {}) {
  const pool = normalizeSelection(options.difficulties, DIFFICULTIES);
  if (options.mode === 'boss') {
    const baseWeights = {
      easy: 1,
      medium: 3,
      hard: 7,
      expert: 10
    };
    const counts = getRecentCounts('difficulty');
    return rng.weighted(pool.map((value) => ({
      value,
      weight: (baseWeights[value] || 1) / (1 + (counts.get(value) || 0))
    })));
  }

  if (options.mode === 'daily') {
    const baseWeights = {
      easy: 2,
      medium: 7,
      hard: 6,
      expert: 3
    };
    const counts = getRecentCounts('difficulty');
    return rng.weighted(pool.map((value) => ({
      value,
      weight: (baseWeights[value] || 1) / (1 + (counts.get(value) || 0))
    })));
  }

  if (options.randomMode === false) {
    if (pool.includes(options.focusDifficulty)) {
      return options.focusDifficulty;
    }
    return pool[0];
  }

  if (options.adaptive === false) {
    return rng.pick(pool);
  }

  const counts = getRecentCounts('difficulty');
  return rng.weighted(pool.map((value) => ({
    value,
    weight: 1 / (1 + (counts.get(value) || 0))
  })));
}

function xpForDifficulty(difficulty) {
  return XP_BY_DIFFICULTY[difficulty] || 0;
}

function buildGeneratedTask(category, difficulty, rng) {
  const builder = getTaskBuilder(category);
  return builder(difficulty, rng);
}

function getTaskBuilder(category) {
  const builder = TASK_BUILDERS[category];
  if (!builder) {
    throw new Error(`Unknown category: ${category}`);
  }
  return builder;
}

function selectWeightedTask(rng, tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return null;
  }

  if (tasks.length === 1) {
    return tasks[0];
  }

  return rng.weighted(tasks.map((task) => ({
    value: task,
    weight: Math.max(1, Number(task?.meta?.weight ?? task?.weight ?? 1))
  })));
}

function rememberTask(task) {
  if (!task || typeof task !== 'object') {
    return;
  }
  if (typeof task.category === 'string' && task.category) {
    lastCategory = task.category;
    decayCategoryWeight(task.category);
  }
  recentTasks.push({
    id: task.id,
    category: task.category,
    difficulty: task.difficulty,
    kernelId: task.kernelId
  });
  if (recentTasks.length > 100) {
    recentTasks.shift();
  }
}

function buildProgressSummary(progress = {}) {
  const solvedByCategory = CATEGORY_ORDER.reduce((acc, category) => {
    acc[category] = Number(progress.solvedByCategory && progress.solvedByCategory[category]) || 0;
    return acc;
  }, {});
  const solvedByDifficulty = DIFFICULTIES.reduce((acc, difficulty) => {
    acc[difficulty] = Number(progress.solvedByDifficulty && progress.solvedByDifficulty[difficulty]) || 0;
    return acc;
  }, {});
  const xp = Number(progress.xp) || 0;
  let level = 1;
  while (xp >= level * level * 100) {
    level += 1;
  }
  const prevThreshold = (level - 1) * (level - 1) * 100;
  const nextThreshold = level * level * 100;
  const inLevel = xp - prevThreshold;
  const levelSpan = Math.max(1, nextThreshold - prevThreshold);
  const attempted = Number(progress.attempted) || 0;
  const correct = Number(progress.correct) || 0;
  const solved = Number(progress.solved) || 0;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 1000) / 10 : 0;

  return {
    xp,
    level,
    prevThreshold,
    nextThreshold,
    progressToNext: Math.max(0, Math.min(1, inLevel / levelSpan)),
    xpRemaining: Math.max(0, nextThreshold - xp),
    solved,
    attempted,
    correct,
    accuracy,
    streak: Number(progress.streak) || 0,
    bestStreak: Number(progress.bestStreak) || 0,
    solvedByCategory,
    solvedByDifficulty,
    customTasksCreated: Number(progress.customTasksCreated) || 0,
    dailySolved: Number(progress.dailySolved) || 0,
    bossCleared: Number(progress.bossCleared) || 0
  };
}

function buildAchievements(progress = {}) {
  const summary = buildProgressSummary(progress);
  const unlockedCategories = Object.values(summary.solvedByCategory).filter((count) => count > 0).length;
  const unlockedDifficulties = Object.values(summary.solvedByDifficulty).filter((count) => count > 0).length;

  return [
    {
      id: 'first-step',
      title: 'Первые шаги',
      description: 'Реши первую задачу',
      unlocked: summary.solved >= 1
    },
    {
      id: 'double-digit',
      title: 'Десятка',
      description: 'Реши 10 задач',
      unlocked: summary.solved >= 10
    },
    {
      id: 'combo',
      title: 'Разносторонний',
      description: 'Победи минимум в 4 категориях',
      unlocked: unlockedCategories >= 4
    },
    {
      id: 'precision',
      title: 'Точность',
      description: 'Достигни точности 80% при 10+ попытках',
      unlocked: summary.attempted >= 10 && summary.accuracy >= 80
    },
    {
      id: 'streak-3',
      title: 'Серия',
      description: 'Сделай серию из 3 правильных решений',
      unlocked: summary.bestStreak >= 3
    },
    {
      id: 'expert-hunter',
      title: 'Эксперт',
      description: 'Реши хотя бы 3 экспертные задачи',
      unlocked: summary.solvedByDifficulty.expert >= 3
    },
    {
      id: 'variety',
      title: 'Исследователь',
      description: 'Попробуй все уровни сложности',
      unlocked: unlockedDifficulties >= DIFFICULTIES.length
    },
    {
      id: 'daily-solver',
      title: 'Ежедневный',
      description: 'Реши ежедневное испытание',
      unlocked: summary.dailySolved >= 1
    },
    {
      id: 'boss-slayer',
      title: 'Босс',
      description: 'Закрой хотя бы одно сложное испытание',
      unlocked: summary.bossCleared >= 1
    },
    {
      id: 'creator',
      title: 'Создатель',
      description: 'Добавь хотя бы 3 своих задачи',
      unlocked: summary.customTasksCreated >= 3
    },
    {
      id: 'level-5',
      title: 'Уровень 5',
      description: 'Достигни 5 уровня',
      unlocked: summary.level >= 5
    },
    {
      id: 'level-10',
      title: 'Уровень 10',
      description: 'Достигни 10 уровня',
      unlocked: summary.level >= 10
    }
  ];
}

function createCustomTaskTemplate() {
  return {
    kernelId: 'js',
    title: 'Моя задача',
    category: 'arrays',
    difficulty: 'medium',
    strategy: 'simple',
    prompt: 'Опиши условие задачи здесь.',
    signature: 'solve(input)',
    starterCode: codeBlock('solve(input)', ['// TODO: implement']),
    solution: codeBlock('solve(input)', ['return input;']),
    testsJson: `[
  {
    "args": [[1, 2, 3]],
    "expected": [1, 2, 3]
  }
]`,
    hints: ['Первая подсказка', 'Вторая подсказка'],
    explanation: 'Краткий разбор решения.'
  };
}

function normalizeCustomTask(task) {
  const normalized = normalizeCustomTaskPayload(task);
  return normalized
    ? {
        ...normalized,
        kernelId: normalized.kernelId || 'js',
        kernelTitle: 'JavaScript',
        editorLanguage: 'javascript'
      }
    : null;
}

async function generateNewTask(options = {}) {
  return generateTask(options);
}

function createTaskCandidate(options = {}, baseSeed, attempt = 0) {
  const seed = generateUniqueSeed(attempt === 0 ? baseSeed : `${baseSeed}:retry:${attempt}`);
  const rng = createRng(seed);
  const kernelId = typeof options.kernelId === 'string' && options.kernelId.trim() ? options.kernelId.trim() : 'js';
  const categories = normalizeSelection(options.categories, CATEGORY_ORDER);
  const difficulties = normalizeSelection(options.difficulties, DIFFICULTIES);
  const category = chooseCategory(rng, { ...options, categories });
  const difficulty = chooseDifficulty(rng, { ...options, difficulties });
  const challengeType = resolveChallengeType(options.mode);

  const standard = buildGeneratedTask(category, difficulty, rng);
  standard.challengeType = challengeType;
  standard.kernelId = kernelId;
  standard.seed = seed;
  standard.id = makeTaskId(category, difficulty, standard.title, seed, kernelId);
  standard.meta = {
    ...standard.meta,
    challengeType,
    randomMode: options.randomMode !== false,
    seed,
    kernelId
  };

  const customs = (options.customTasks || [])
    .map(normalizeCustomTask)
    .filter(Boolean)
    .filter((task) => task.kernelId === kernelId && task.category === category && task.difficulty === difficulty);

  const pool = [standard, ...customs];
  if (pool.length === 1) {
    return { task: standard, standard };
  }

  const chosen = selectWeightedTask(rng, pool) || standard;
  chosen.meta = {
    ...chosen.meta,
    challengeType,
    randomMode: options.randomMode !== false,
    seed,
    kernelId
  };
  chosen.kernelId = kernelId;
  chosen.seed = seed;
  if (chosen === standard) {
    chosen.id = standard.id;
  }
  return { task: chosen, standard };
}

async function verifyTaskCandidate(task, standard = null) {
  const qa = await verifyTaskWithRuntime(task);
  if (qa.passed) {
    return markVerifiedTask(task, qa);
  }

  if (standard && standard !== task) {
    const standardQa = await verifyTaskWithRuntime(standard);
    if (standardQa.passed) {
      return markVerifiedTask(standard, standardQa);
    }
  }

  return null;
}

function buildFallbackTask(baseSeed, options = {}) {
  const fallbackRng = createRng(`${baseSeed}:fallback`);
  const fallbackBuilder = TASK_BUILDERS.arrays;
  if (typeof fallbackBuilder !== 'function') {
    throw new Error('Fallback builder is not available');
  }

  const task = fallbackBuilder('easy', fallbackRng);
  task.seed = generateUniqueSeed(`${baseSeed}:fallback`);
  task.id = makeTaskId(task.category, task.difficulty, task.title, task.seed, task.kernelId || 'js');
  task.meta = {
    ...task.meta,
    challengeType: resolveChallengeType(options.mode),
    randomMode: options.randomMode !== false,
    seed: task.seed,
    kernelId: task.kernelId || 'js',
    fallback: true
  };
  return task;
}

async function generateTask(options = {}) {
  const baseSeed = resolveSeed(options);
  const MAX_ATTEMPTS = 5;
  let candidate = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    candidate = createTaskCandidate(options, baseSeed, attempt);
    const verifiedCandidate = await verifyTaskCandidate(candidate.task, candidate.standard);
    if (verifiedCandidate) {
      rememberTask(verifiedCandidate);
      return verifiedCandidate;
    }
  }

  const fallback = buildFallbackTask(baseSeed, options);
  const verifiedFallback = await verifyTaskCandidate(fallback);
  if (verifiedFallback) {
    rememberTask(verifiedFallback);
    return verifiedFallback;
  }

  const rescue = createTaskCandidate(options, `${baseSeed}:rescue`, MAX_ATTEMPTS);
  const verifiedRescue = await verifyTaskCandidate(rescue.task, rescue.standard);
  if (verifiedRescue) {
    rememberTask(verifiedRescue);
    return verifiedRescue;
  }

  const fallbackFinal = verifiedFallback || markVerifiedTask(fallback, { passed: false, issues: [] });
  rememberTask(fallbackFinal);
  return fallbackFinal;
}

module.exports = {
  CATEGORY_META,
  CATEGORY_ORDER,
  DIFFICULTIES,
  DIFFICULTY_META,
  TASK_BUILDERS,
  getTaskBuilder,
  usedSeeds,
  categoryWeights,
  createRng,
  resetCategoryWeights,
  generateUniqueSeed,
  decayCategoryWeight,
  pickAnotherCategory,
  rememberTask,
  resolveSeed,
  normalizeSelection,
  chooseCategory,
  chooseDifficulty,
  xpForDifficulty,
  buildGeneratedTask,
  buildFallbackTask,
  generateNewTask,
  generateTask,
  runTaskTests,
  getProgressSummary: buildProgressSummary,
  buildAchievements,
  createCustomTaskTemplate,
  normalizeCustomTask,
  makeTaskId,
  codeBlock,
  buildTaskFromParts
};
