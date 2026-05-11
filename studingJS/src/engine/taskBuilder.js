const { hashString } = require('./rng');
const { cloneJson } = require('./utils');

const XP_BY_DIFFICULTY = {
  easy: 10,
  medium: 20,
  hard: 35,
  expert: 60
};

function indentLines(lines, spaces = 2) {
  const prefix = ' '.repeat(spaces);
  return lines.map((line) => `${prefix}${line}`).join('\n');
}

function codeBlock(signature, bodyLines, options = {}) {
  const isAsync = options.async === true;
  const lines = Array.isArray(bodyLines)
    ? bodyLines.slice()
    : String(bodyLines || '')
        .split(/\r?\n/)
        .filter((line, index, items) => !(index === items.length - 1 && line === ''));
  return `${isAsync ? 'async ' : ''}function ${signature} {\n${indentLines(lines)}\n}`;
}

function makeTaskId(category, difficulty, title, seed, kernelId = 'js') {
  if (kernelId === 'js') {
    return `${category}-${difficulty}-${hashString(`${title}:${seed}`)}`;
  }

  return `${kernelId}-${category}-${difficulty}-${hashString(`${kernelId}:${title}:${seed}`)}`;
}

function deriveTaskSeed(data) {
  const testsSeed = Array.isArray(data.tests) ? JSON.stringify(data.tests) : '';
  const tagsSeed = Array.isArray(data.tags) ? data.tags.join('|') : '';
  const metaSeed = [
    data.kernelId || 'js',
    data.category || '',
    data.difficulty || '',
    data.title || '',
    data.prompt || '',
    data.signature || '',
    data.starterCode || '',
    data.solution || '',
    testsSeed,
    String(data.strategy || ''),
    String(data.challengeType || ''),
    tagsSeed
  ].join('::');
  return `task:${hashString(metaSeed)}`;
}

function makeTask(data) {
  const kernelId = data.kernelId || 'js';
  const seed = data.seed !== undefined && data.seed !== null ? String(data.seed) : deriveTaskSeed(data);

  return {
    id: data.id || makeTaskId(data.category, data.difficulty, data.title, seed, kernelId),
    seed,
    source: data.source || 'generated',
    createdAt: data.createdAt || null,
    kernelId,
    category: data.category,
    difficulty: data.difficulty,
    title: data.title,
    prompt: data.prompt,
    signature: data.signature || 'solve(input)',
    starterCode: data.starterCode,
    solution: data.solution,
    hints: Array.isArray(data.hints) ? data.hints.slice() : [],
    explanation: data.explanation || '',
    strategy: data.strategy || 'simple',
    tests: cloneJson(data.tests || []),
    xp: data.xp || (XP_BY_DIFFICULTY[data.difficulty] ? XP_BY_DIFFICULTY[data.difficulty] : 0),
    tags: Array.isArray(data.tags) ? data.tags.slice() : [],
    meta: data.meta && typeof data.meta === 'object' ? cloneJson(data.meta) : {},
    challengeType: data.challengeType || 'practice'
  };
}

function normalizeDifficulty(value) {
  const allowed = ['easy', 'medium', 'hard', 'expert'];
  return allowed.includes(value) ? value : 'easy';
}

function normalizeCategory(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : 'arrays';
}

function normalizeStrategy(value) {
  return ['simple', 'closure', 'async', 'dom'].includes(value) ? value : 'simple';
}

function buildTaskFromParts({
  category,
  difficulty,
  title,
  prompt,
  signature,
  starterBody,
  solutionBody,
  hints,
  explanation,
  tests,
  strategy = 'simple',
  async = false,
  tags = [],
  challengeType = 'practice',
  seed,
  kernelId = 'js',
  meta = {},
  source = 'generated',
  createdAt = null
}) {
  return makeTask({
    kernelId,
    source,
    createdAt,
    category,
    difficulty,
    title,
    prompt,
    signature,
    starterCode: codeBlock(signature, starterBody, { async }),
    solution: codeBlock(signature, solutionBody, { async }),
    hints,
    explanation,
    tests,
    strategy,
    tags,
    challengeType,
    seed,
    meta: {
      ...meta,
      async: async === true
    }
  });
}

function normalizeCustomTask(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const kernelId = typeof raw.kernelId === 'string' && raw.kernelId.trim() ? raw.kernelId.trim() : 'js';
  const strategy = normalizeStrategy(raw.strategy);
  const category = normalizeCategory(raw.category);
  const difficulty = normalizeDifficulty(raw.difficulty);

  let tests = [];
  if (Array.isArray(raw.tests)) {
    tests = cloneJson(raw.tests);
  } else if (typeof raw.testsJson === 'string') {
    try {
      const parsedTests = JSON.parse(raw.testsJson);
      if (Array.isArray(parsedTests)) {
        tests = cloneJson(parsedTests);
      }
    } catch (error) {
      tests = [];
    }
  }

  const hints = Array.isArray(raw.hints)
    ? raw.hints.slice()
    : typeof raw.hintsText === 'string'
      ? raw.hintsText
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      : [];

  const signature = typeof raw.signature === 'string' && raw.signature.trim() ? raw.signature.trim() : 'solve(input)';
  const starterCode = typeof raw.starterCode === 'string'
    ? raw.starterCode
    : typeof raw.starter === 'string'
      ? raw.starter
      : codeBlock(signature, ['// TODO: implement']);
  const solution = typeof raw.solution === 'string'
    ? raw.solution
    : typeof raw.solutionCode === 'string'
      ? raw.solutionCode
      : starterCode;
  const createdAt = raw.createdAt || raw.importedAt || Date.now();

  return makeTask({
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : undefined,
    seed: raw.seed,
    source: raw.source || 'custom',
    createdAt,
    kernelId,
    category,
    difficulty,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Моя задача',
    prompt: typeof raw.prompt === 'string' && raw.prompt.trim() ? raw.prompt.trim() : 'Опиши условие задачи здесь.',
    signature,
    starterCode,
    solution,
    hints,
    explanation: typeof raw.explanation === 'string' ? raw.explanation : '',
    strategy,
    tests,
    xp: typeof raw.xp === 'number' ? raw.xp : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags.slice() : [],
    challengeType: raw.challengeType || 'practice',
    meta: raw.meta && typeof raw.meta === 'object' ? raw.meta : {},
    createdAt
  });
}

module.exports = {
  XP_BY_DIFFICULTY,
  codeBlock,
  makeTaskId,
  makeTask,
  buildTaskFromParts,
  normalizeCustomTask,
  normalizeDifficulty,
  normalizeCategory,
  normalizeStrategy
};
