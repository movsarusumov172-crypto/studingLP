const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const taskEngine = require('../../generation');
const { createRng, hashString } = require('../../engine/rng');
const { cloneJson, preview, sampleNumbers, sampleWords, unique } = require('../../engine/utils');
const { buildVariationProfile, extractVariationFields, normalizeTextList } = require('../../engine/variationProfile');
const { makeTaskId } = require('../../engine/taskBuilder');

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];

const CATEGORY_META = {
  arrays: {
    title: 'Массивы',
    description: 'Сумма, фильтрация, уникализация и скользящие окна по срезам чисел.',
    accent: '#7dd3fc'
  },
  strings: {
    title: 'Строки',
    description: 'Нормализация текста, перестановка слов, палиндромы и поиск длинных слов.',
    accent: '#34d399'
  },
  maps: {
    title: 'Карты',
    description: 'Подсчёт частот, слияние словарей, инверсия и выбор топ-элементов.',
    accent: '#f59e0b'
  },
  recursion: {
    title: 'Рекурсия',
    description: 'Факториал, сумма цифр, степени и последовательность Фибоначчи.',
    accent: '#a78bfa'
  },
  algorithms: {
    title: 'Алгоритмы',
    description: 'Бинарный поиск, two-sum, максимум подмассива и окна.',
    accent: '#fb7185'
  }
};

const STRATEGY_META = {
  arrays: 'Массивы',
  strings: 'Строки',
  collections: 'Коллекции',
  recursion: 'Рекурсия',
  algorithms: 'Алгоритмы',
  simple: 'Обычная'
};

const GO_KERNEL_META = {
  id: 'go',
  title: 'Go',
  shortTitle: 'Go',
  family: 'backend',
  editorLanguage: 'go',
  strategies: Object.keys(STRATEGY_META),
  strategyLabels: STRATEGY_META,
  description: 'Ядро Go с генерацией задач и запуском решений через локальный go.exe.',
  status: 'planned',
  available: false,
  accent: '#22c55e'
};

const XP_BY_DIFFICULTY = {
  easy: 12,
  medium: 24,
  hard: 42,
  expert: 72
};

const SHAPE_BY_DIFFICULTY = {
  easy: { count: 5, min: 0, max: 12, words: 5, window: 2, limit: 3 },
  medium: { count: 6, min: -8, max: 20, words: 6, window: 3, limit: 3 },
  hard: { count: 8, min: -20, max: 35, words: 7, window: 3, limit: 4 },
  expert: { count: 10, min: -30, max: 50, words: 8, window: 4, limit: 4 }
};

let seedCounter = 0;
let cachedGoRuntime = null;

function indentLines(lines, spaces = 2) {
  const prefix = ' '.repeat(spaces);
  return lines.map((line) => `${prefix}${line}`).join('\n');
}

function normalizeDifficulty(value) {
  return DIFFICULTIES.includes(value) ? value : 'easy';
}

function normalizeCategory(value) {
  return Object.prototype.hasOwnProperty.call(CATEGORY_META, value) ? value : 'arrays';
}

function normalizeStrategy(value) {
  return Object.prototype.hasOwnProperty.call(STRATEGY_META, value) ? value : 'arrays';
}

function normalizeSelection(list, fallback) {
  const filtered = Array.isArray(list) ? list.filter((item) => fallback.includes(item)) : [];
  return filtered.length > 0 ? filtered : fallback.slice();
}

function xpForDifficulty(difficulty) {
  return XP_BY_DIFFICULTY[normalizeDifficulty(difficulty)] || XP_BY_DIFFICULTY.easy;
}

function shapeForDifficulty(difficulty) {
  return SHAPE_BY_DIFFICULTY[normalizeDifficulty(difficulty)] || SHAPE_BY_DIFFICULTY.easy;
}

function sampleDistinctNumbers(rng, count, min, max, allowNegative = false) {
  const values = [];
  const seen = new Set();
  let safety = Math.max(10, count * 20);
  while (values.length < count && safety > 0) {
    let value = rng.int(min, max);
    if (allowNegative && rng.bool(0.35)) {
      value = -value;
    }
    if (!seen.has(value)) {
      seen.add(value);
      values.push(value);
    }
    safety -= 1;
  }
  while (values.length < count) {
    values.push(values.length);
  }
  return values;
}

function sampleUniqueWords(rng, count) {
  const values = [];
  const seen = new Set();
  let safety = Math.max(10, count * 10);
  while (values.length < count && safety > 0) {
    const word = rng.pick(sampleWords(rng, 1));
    if (!seen.has(word)) {
      seen.add(word);
      values.push(word);
    }
    safety -= 1;
  }
  while (values.length < count) {
    values.push(`word${values.length + 1}`);
  }
  return values;
}

function sampleSentence(rng, wordCount) {
  const words = sampleWords(rng, wordCount).map((word, index) => {
    let text = word;
    if (rng.bool(0.4)) {
      text = index % 2 === 0 ? word.toUpperCase() : `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    }
    if (rng.bool(0.25)) {
      text = `${text}${rng.pick(['.', '!', '?', ','])}`;
    }
    return text;
  });
  const joined = words.join(rng.bool(0.5) ? '   ' : ' ');
  return `${rng.bool(0.5) ? '  ' : ''}${joined}${rng.bool(0.5) ? '  ' : ''}`;
}

function samplePalindromeText(rng) {
  const options = [
    'level',
    'racecar',
    'never odd or even',
    'madam, i am adam',
    'step on no pets',
    'was it a car or a cat i saw'
  ];
  const base = String(rng.pick(options));
  return rng.bool(0.5) ? base.toUpperCase() : base;
}

function makeSentencePreview(rng, count) {
  return sampleSentence(rng, count);
}

function pickPrompt(rng, templates, data) {
  const template = rng.pick(templates);
  return typeof template === 'function' ? template(data) : String(template);
}

function normalizeGoType(type) {
  const text = String(type || '').trim();
  if (!text) {
    return 'int';
  }

  const compact = text.replace(/\s+/g, '');
  const lower = compact.toLowerCase();

  if (lower === 'number' || lower === 'integer') {
    return 'int';
  }
  if (lower === 'boolean') {
    return 'bool';
  }
  if (lower === 'text') {
    return 'string';
  }
  if (lower === 'int[]') {
    return '[]int';
  }
  if (lower === 'string[]') {
    return '[]string';
  }
  if (lower === 'bool[]') {
    return '[]bool';
  }
  if (lower.startsWith('map[') || lower.startsWith('[]')) {
    return compact;
  }

  return compact;
}

function defaultArgNameForType(type, index) {
  const normalized = normalizeGoType(type);
  switch (normalized) {
    case '[]int':
      return index === 0 ? 'values' : `values${index + 1}`;
    case '[]string':
      return index === 0 ? 'words' : `words${index + 1}`;
    case 'string':
      return index === 0 ? 'text' : `text${index + 1}`;
    case 'bool':
      return index === 0 ? 'flag' : `flag${index + 1}`;
    case 'map[string]int':
      return index === 0 ? 'counts' : `counts${index + 1}`;
    case 'map[string]string':
      return index === 0 ? 'lookup' : `lookup${index + 1}`;
    default:
      return index === 0 ? 'value' : `value${index + 1}`;
  }
}

function buildArgNames(argTypes, preferredNames = []) {
  const used = new Set();
  return argTypes.map((type, index) => {
    const preferred = typeof preferredNames[index] === 'string' && preferredNames[index].trim()
      ? preferredNames[index].trim()
      : defaultArgNameForType(type, index);
    const sanitized = preferred.replace(/[^A-Za-z0-9_]/g, '') || `arg${index + 1}`;
    let uniqueName = sanitized;
    let suffix = 2;
    while (used.has(uniqueName)) {
      uniqueName = `${sanitized}${suffix}`;
      suffix += 1;
    }
    used.add(uniqueName);
    return uniqueName;
  });
}

function buildGoSignature(returnType, argTypes, argNames) {
  const signatureArgs = argTypes.map((type, index) => `${argNames[index]} ${normalizeGoType(type)}`).join(', ');
  return `func solve(${signatureArgs}) ${normalizeGoType(returnType)}`;
}

function normalizeBodyLines(body, fallbackLines = ['return 0']) {
  if (Array.isArray(body)) {
    const lines = body.map((line) => String(line));
    return lines.length > 0 ? lines : fallbackLines.slice();
  }

  if (typeof body === 'string') {
    const lines = body.split(/\r?\n/).map((line) => line.replace(/\s+$/, ''));
    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    return lines.length > 0 ? lines : fallbackLines.slice();
  }

  return fallbackLines.slice();
}

function goDefaultReturnLines(returnType) {
  const normalized = normalizeGoType(returnType);
  if (normalized.startsWith('[]') || normalized.startsWith('map[')) {
    return ['return nil'];
  }
  if (normalized === 'string') {
    return ['return ""'];
  }
  if (normalized === 'bool') {
    return ['return false'];
  }
  return ['return 0'];
}

function goFileCode(signature, bodyLines) {
  return `package main\n\n${signature} {\n${indentLines(normalizeBodyLines(bodyLines, goDefaultReturnLines('int')))}\n}\n`;
}

function makeTask(data) {
  const kernelId = data.kernelId || GO_KERNEL_META.id;
  const difficulty = normalizeDifficulty(data.difficulty);
  const category = normalizeCategory(data.category);
  const seed = data.seed !== undefined && data.seed !== null ? String(data.seed) : `${kernelId}:${category}:${difficulty}:${data.title || 'task'}`;
  const title = String(data.title || 'Go task');
  const prompt = String(data.prompt || '');
  const signature = String(data.signature || 'func solve(value int) int');

  return {
    id: data.id || makeTaskId(category, difficulty, title, seed, kernelId),
    seed,
    source: data.source || 'generated',
    createdAt: data.createdAt || null,
    kernelId,
    kernelTitle: GO_KERNEL_META.title,
    editorLanguage: GO_KERNEL_META.editorLanguage,
    category,
    difficulty,
    title,
    prompt,
    signature,
    starterCode: String(data.starterCode || goFileCode(signature, goDefaultReturnLines(data.returnType || 'int'))),
    solution: String(data.solution || goFileCode(signature, goDefaultReturnLines(data.returnType || 'int'))),
    hints: Array.isArray(data.hints) ? data.hints.slice() : [],
    explanation: String(data.explanation || ''),
    strategy: normalizeStrategy(data.strategy),
    tests: cloneJson(Array.isArray(data.tests) ? data.tests : []),
    xp: typeof data.xp === 'number' ? data.xp : xpForDifficulty(difficulty),
    tags: Array.isArray(data.tags) ? data.tags.slice() : [],
    meta: data.meta && typeof data.meta === 'object' ? cloneJson(data.meta) : {},
    challengeType: data.challengeType || 'practice',
    family: String(data.family || category),
    logicType: String(data.logicType || data.family || category),
    structureType: String(data.structureType || ''),
    answerFormat: String(data.answerFormat || ''),
    thinkingStyle: String(data.thinkingStyle || ''),
    contextType: String(data.contextType || ''),
    constraints: Array.isArray(data.constraints) ? data.constraints.slice() : [],
    variationNotes: Array.isArray(data.variationNotes) ? data.variationNotes.slice() : [],
    variantId: String(data.variantId || ''),
    returnType: String(data.returnType || 'int'),
    argTypes: Array.isArray(data.argTypes) ? data.argTypes.slice() : ['int'],
    argNames: Array.isArray(data.argNames) ? data.argNames.slice() : ['value']
  };
}

function buildGoTaskFromParts({
  category,
  variationCategory,
  difficulty,
  title,
  prompt,
  signature,
  returnType = 'int',
  argTypes = ['int'],
  argNames = [],
  starterBody,
  solutionBody,
  hints = [],
  explanation = '',
  tests = [],
  strategy,
  tags = [],
  family,
  logicType,
  challengeType = 'practice',
  seed = title,
  createdAt = null,
  meta = {}
}) {
  const normalizedCategory = normalizeCategory(category);
  const normalizedVariationCategory = variationCategory ? String(variationCategory) : normalizedCategory;
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const normalizedReturnType = normalizeGoType(returnType);
  const normalizedArgTypes = Array.isArray(argTypes) && argTypes.length > 0
    ? argTypes.map((type) => normalizeGoType(type))
    : ['int'];
  const normalizedArgNames = buildArgNames(normalizedArgTypes, Array.isArray(argNames) ? argNames : []);
  const resolvedSignature = typeof signature === 'string' && signature.trim()
    ? signature.trim()
    : buildGoSignature(normalizedReturnType, normalizedArgTypes, normalizedArgNames);
  const variation = buildVariationProfile({
    kernelId: GO_KERNEL_META.id,
    category: normalizedVariationCategory,
    difficulty: normalizedDifficulty,
    title,
    prompt,
    signature: resolvedSignature,
    returnType: normalizedReturnType,
    argTypes: normalizedArgTypes,
    argNames: normalizedArgNames,
    strategy: strategy || normalizedVariationCategory,
    family: family || normalizedCategory,
    logicType: logicType || family || normalizedCategory,
    seed,
    tags
  });
  const starterCode = goFileCode(resolvedSignature, starterBody || goDefaultReturnLines(normalizedReturnType));
  const solutionCode = goFileCode(resolvedSignature, solutionBody || goDefaultReturnLines(normalizedReturnType));
  const task = makeTask({
    seed: variation.seed,
    source: 'generated',
    createdAt,
    kernelId: GO_KERNEL_META.id,
    category: normalizedCategory,
    difficulty: normalizedDifficulty,
    title,
    prompt: variation.prompt,
    signature: resolvedSignature,
    starterCode,
    solution: solutionCode,
    hints,
    explanation,
    strategy: strategy || normalizedVariationCategory,
    tests,
    xp: xpForDifficulty(normalizedDifficulty),
    tags: unique([...tags, ...variation.tags]),
    meta: {
      ...cloneJson(variation.meta),
      go: {
        returnType: normalizedReturnType,
        argTypes: normalizedArgTypes,
        argNames: normalizedArgNames,
        signature: resolvedSignature,
        category: normalizedCategory,
        family: family || normalizedCategory,
        logicType: logicType || family || normalizedCategory
      },
      ...cloneJson(meta)
    },
    challengeType,
    family: family || normalizedCategory,
    logicType: logicType || family || normalizedCategory,
    structureType: variation.structureType,
    answerFormat: variation.answerFormat,
    thinkingStyle: variation.thinkingStyle,
    contextType: variation.contextType,
    constraints: Array.isArray(variation.constraints) ? variation.constraints.slice() : [],
    variationNotes: Array.isArray(variation.variationNotes) ? variation.variationNotes.slice() : [],
    variantId: variation.variantId,
    returnType: normalizedReturnType,
    argTypes: normalizedArgTypes,
    argNames: normalizedArgNames
  });

  return task;
}

function sumValues(values) {
  return Array.isArray(values) ? values.reduce((acc, value) => acc + Number(value || 0), 0) : 0;
}

function filterGreaterThan(values, threshold) {
  return Array.isArray(values) ? values.filter((value) => value > threshold) : [];
}

function dedupeStrings(values) {
  const seen = new Set();
  const result = [];
  for (const value of Array.isArray(values) ? values : []) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

function slidingWindowMax(values, window) {
  if (!Array.isArray(values) || values.length === 0 || window <= 0 || window > values.length) {
    return [];
  }
  const result = [];
  for (let index = 0; index + window <= values.length; index += 1) {
    let best = values[index];
    for (let cursor = index + 1; cursor < index + window; cursor += 1) {
      if (values[cursor] > best) {
        best = values[cursor];
      }
    }
    result.push(best);
  }
  return result;
}

function normalizeSpaces(text) {
  const source = String(text || '');
  let result = '';
  let pendingSpace = false;
  for (const char of source) {
    const isSpace = char === ' ' || char === '\t' || char === '\n' || char === '\r';
    if (isSpace) {
      if (result.length > 0) {
        pendingSpace = true;
      }
      continue;
    }
    if (pendingSpace && result.length > 0) {
      result += ' ';
      pendingSpace = false;
    }
    result += char;
  }
  return result.trim();
}

function reverseWords(text) {
  const source = String(text || '').trim();
  if (!source) {
    return '';
  }
  const words = source.split(/\s+/).filter(Boolean);
  return words.reverse().join(' ');
}

function isPalindromeText(text) {
  const source = String(text || '');
  const letters = [];
  for (const char of source) {
    let current = char;
    if (current >= 'A' && current <= 'Z') {
      current = String.fromCharCode(current.charCodeAt(0) + 32);
    }
    const code = current.charCodeAt(0);
    const isLetter = (current >= 'a' && current <= 'z');
    const isDigit = code >= 48 && code <= 57;
    if (isLetter || isDigit) {
      letters.push(current);
    }
  }
  for (let left = 0, right = letters.length - 1; left < right; left += 1, right -= 1) {
    if (letters[left] !== letters[right]) {
      return false;
    }
  }
  return true;
}

function longestWord(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  let best = '';
  for (const word of words) {
    const cleaned = word.replace(/[^A-Za-z0-9]+/g, '');
    if (cleaned.length > best.length) {
      best = cleaned;
    }
  }
  return best;
}

function wordFrequency(words) {
  const result = {};
  for (const word of Array.isArray(words) ? words : []) {
    const key = String(word);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

function mergeMaps(left, right) {
  const result = {};
  for (const source of [left, right]) {
    if (!source || typeof source !== 'object') {
      continue;
    }
    for (const key of Object.keys(source)) {
      result[key] = (result[key] || 0) + Number(source[key] || 0);
    }
  }
  return result;
}

function invertMap(values) {
  const result = {};
  if (!values || typeof values !== 'object') {
    return result;
  }
  for (const key of Object.keys(values)) {
    result[values[key]] = key;
  }
  return result;
}

function topKeysByCount(counts, limit = 3) {
  const entries = Object.entries(counts || {});
  const picked = [];
  const used = new Set();
  while (picked.length < limit && used.size < entries.length) {
    let bestKey = '';
    let bestValue = Number.NEGATIVE_INFINITY;
    for (const [key, value] of entries) {
      if (used.has(key)) {
        continue;
      }
      const normalizedValue = Number(value || 0);
      if (normalizedValue > bestValue || (normalizedValue === bestValue && (bestKey === '' || key < bestKey))) {
        bestKey = key;
        bestValue = normalizedValue;
      }
    }
    if (!bestKey) {
      break;
    }
    used.add(bestKey);
    picked.push(bestKey);
  }
  return picked;
}

function factorialValue(n) {
  const value = Math.max(0, Math.trunc(Number(n) || 0));
  if (value <= 1) {
    return 1;
  }
  return value * factorialValue(value - 1);
}

function sumDigitsValue(n) {
  let value = Math.abs(Math.trunc(Number(n) || 0));
  if (value < 10) {
    return value;
  }
  return (value % 10) + sumDigitsValue(Math.floor(value / 10));
}

function powerValue(base, exp) {
  const normalizedExp = Math.max(0, Math.trunc(Number(exp) || 0));
  if (normalizedExp === 0) {
    return 1;
  }
  if (normalizedExp === 1) {
    return Math.trunc(Number(base) || 0);
  }
  return Math.trunc(Number(base) || 0) * powerValue(base, normalizedExp - 1);
}

function fibonacciValue(n) {
  const value = Math.max(0, Math.trunc(Number(n) || 0));
  const memo = { 0: 0, 1: 1 };
  function fib(cursor) {
    if (Object.prototype.hasOwnProperty.call(memo, cursor)) {
      return memo[cursor];
    }
    memo[cursor] = fib(cursor - 1) + fib(cursor - 2);
    return memo[cursor];
  }
  return fib(value);
}

function binarySearchIndex(values, target) {
  let left = 0;
  let right = Array.isArray(values) ? values.length - 1 : -1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (values[mid] === target) {
      return mid;
    }
    if (values[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return -1;
}

function twoSumExists(values, target) {
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    if (seen.has(target - value)) {
      return true;
    }
    seen.add(value);
  }
  return false;
}

function maxSubarraySum(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  let best = values[0];
  let current = values[0];
  for (let index = 1; index < values.length; index += 1) {
    current = Math.max(values[index], current + values[index]);
    if (current > best) {
      best = current;
    }
  }
  return best;
}

function makeArraySumTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const values = sampleNumbers(rng, shape.count + index, shape.min, shape.max, true);
    return {
      name: `Case ${index + 1}`,
      input: [values],
      expected: sumValues(values)
    };
  });
}

function makeArrayFilterTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const values = sampleNumbers(rng, shape.count + index, shape.min, shape.max, true);
    const threshold = rng.int(shape.min, shape.max);
    return {
      name: `Case ${index + 1}`,
      input: [values, threshold],
      expected: filterGreaterThan(values, threshold)
    };
  });
}

function makeArrayDedupeTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const values = sampleUniqueWords(rng, shape.words + index);
    if (values.length > 2) {
      values.splice(1, 0, values[0]);
    }
    return {
      name: `Case ${index + 1}`,
      input: [values],
      expected: dedupeStrings(values)
    };
  });
}

function makeArrayWindowTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const values = sampleNumbers(rng, shape.count + index, shape.min, shape.max, true);
    const window = Math.min(values.length, Math.max(2, shape.window));
    return {
      name: `Case ${index + 1}`,
      input: [values, window],
      expected: slidingWindowMax(values, window)
    };
  });
}

function makeStringNormalizeTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const text = sampleSentence(rng, shape.words + index);
    return {
      name: `Case ${index + 1}`,
      input: [text],
      expected: normalizeSpaces(text)
    };
  });
}

function makeStringReverseTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const text = sampleSentence(rng, shape.words + index);
    return {
      name: `Case ${index + 1}`,
      input: [text],
      expected: reverseWords(text)
    };
  });
}

function makeStringPalindromeTests(rng) {
  return Array.from({ length: 4 }, (_, index) => {
    const text = samplePalindromeText(rng);
    return {
      name: `Case ${index + 1}`,
      input: [text],
      expected: isPalindromeText(text)
    };
  });
}

function makeStringLongestTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const text = sampleSentence(rng, shape.words + index);
    return {
      name: `Case ${index + 1}`,
      input: [text],
      expected: longestWord(text)
    };
  });
}

function makeMapFrequencyTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const words = sampleWords(rng, shape.words + index).concat(sampleWords(rng, 2));
    return {
      name: `Case ${index + 1}`,
      input: [words],
      expected: wordFrequency(words)
    };
  });
}

function makeMapMergeTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const left = {};
    const right = {};
    const keys = sampleUniqueWords(rng, shape.limit + index);
    for (let cursor = 0; cursor < keys.length; cursor += 1) {
      left[keys[cursor]] = rng.int(1, 7);
      right[keys[cursor]] = rng.int(1, 7);
    }
    return {
      name: `Case ${index + 1}`,
      input: [left, right],
      expected: mergeMaps(left, right)
    };
  });
}

function makeMapInvertTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const source = {};
    const keys = sampleUniqueWords(rng, shape.limit + index);
    const numbers = sampleDistinctNumbers(rng, keys.length, 1, 99, false);
    for (let cursor = 0; cursor < keys.length; cursor += 1) {
      source[keys[cursor]] = numbers[cursor];
    }
    return {
      name: `Case ${index + 1}`,
      input: [source],
      expected: invertMap(source)
    };
  });
}

function makeMapTopTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const source = {};
    const keys = sampleUniqueWords(rng, shape.limit + index + 2);
    const counts = sampleDistinctNumbers(rng, keys.length, 1, 15, false);
    for (let cursor = 0; cursor < keys.length; cursor += 1) {
      source[keys[cursor]] = counts[cursor];
    }
    return {
      name: `Case ${index + 1}`,
      input: [source, Math.min(shape.limit, keys.length)],
      expected: topKeysByCount(source, Math.min(shape.limit, keys.length))
    };
  });
}

function makeRecursionFactorialTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const value = rng.int(2, shape.window + 3 + index);
    return {
      name: `Case ${index + 1}`,
      input: [value],
      expected: factorialValue(value)
    };
  });
}

function makeRecursionSumDigitsTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const value = rng.int(100 + index * 10, 9999);
    return {
      name: `Case ${index + 1}`,
      input: [value],
      expected: sumDigitsValue(value)
    };
  });
}

function makeRecursionPowerTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const base = rng.int(2, 5 + index);
    const exp = rng.int(2, shape.window + 2);
    return {
      name: `Case ${index + 1}`,
      input: [base, exp],
      expected: powerValue(base, exp)
    };
  });
}

function makeRecursionFibTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const value = rng.int(4, shape.window + 6 + index);
    return {
      name: `Case ${index + 1}`,
      input: [value],
      expected: fibonacciValue(value)
    };
  });
}

function makeAlgorithmsBinaryTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const values = sampleDistinctNumbers(rng, shape.count + index, -20, 40, true).sort((a, b) => a - b);
    const target = values[rng.int(0, values.length - 1)];
    return {
      name: `Case ${index + 1}`,
      input: [values, target],
      expected: binarySearchIndex(values, target)
    };
  });
}

function makeAlgorithmsTwoSumTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const values = sampleNumbers(rng, shape.count + index, shape.min, shape.max, true);
    const left = values[rng.int(0, values.length - 1)];
    const right = values[rng.int(0, values.length - 1)];
    const target = left + right;
    return {
      name: `Case ${index + 1}`,
      input: [values, target],
      expected: twoSumExists(values, target)
    };
  });
}

function makeAlgorithmsMaxSubarrayTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const values = sampleNumbers(rng, shape.count + index, shape.min, shape.max, true);
    return {
      name: `Case ${index + 1}`,
      input: [values],
      expected: maxSubarraySum(values)
    };
  });
}

function makeAlgorithmsWindowTests(rng, shape) {
  return Array.from({ length: 4 }, (_, index) => {
    const values = sampleNumbers(rng, shape.count + index, shape.min, shape.max, true);
    const window = Math.min(values.length, Math.max(2, shape.window));
    return {
      name: `Case ${index + 1}`,
      input: [values, window],
      expected: slidingWindowMax(values, window)
    };
  });
}

function buildArraySumTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const values = sampleNumbers(rng, shape.count, shape.min, shape.max, true);
  const prompt = pickPrompt(rng, [
    (data) => `Дан массив чисел ${preview(data.values)}. Верни их сумму.`,
    (data) => `У тебя есть список значений ${preview(data.values)}. Сложи все элементы и верни одно число.`,
    (data) => `Посчитай итог по массиву ${preview(data.values)}.`
  ], { values });

  return buildGoTaskFromParts({
    category: 'arrays',
    difficulty,
    title: 'Сумма массива',
    prompt,
    returnType: 'int',
    argTypes: ['[]int'],
    argNames: ['values'],
    starterBody: ['return 0'],
    solutionBody: [
      'total := 0',
      'for _, value := range values {',
      '  total += value',
      '}',
      'return total'
    ],
    tests: makeArraySumTests(rng, shape),
    strategy: 'arrays',
    family: 'arrays',
    logicType: 'sum',
    seed: `go-arrays-sum:${difficulty}:${values.join(',')}`,
    tags: ['arrays', 'sum', 'numbers'],
    explanation: 'Сложение можно сделать за один проход через накопитель.'
  });
}

function buildArrayFilterTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const values = sampleNumbers(rng, shape.count + 1, shape.min, shape.max, true);
  const threshold = rng.int(shape.min, shape.max);
  const prompt = pickPrompt(rng, [
    (data) => `Дан массив чисел ${preview(data.values)} и порог ${data.threshold}. Верни только элементы больше порога.`,
    (data) => `Отфильтруй массив ${preview(data.values)}: оставь только значения строго больше ${data.threshold}.`,
    (data) => `Нужен новый срез из массива ${preview(data.values)}, где останутся только элементы выше ${data.threshold}.`
  ], { values, threshold });

  return buildGoTaskFromParts({
    category: 'arrays',
    difficulty,
    title: 'Фильтр массива',
    prompt,
    returnType: '[]int',
    argTypes: ['[]int', 'int'],
    argNames: ['values', 'threshold'],
    starterBody: ['return nil'],
    solutionBody: [
      'result := make([]int, 0, len(values))',
      'for _, value := range values {',
      '  if value > threshold {',
      '    result = append(result, value)',
      '  }',
      '}',
      'return result'
    ],
    tests: makeArrayFilterTests(rng, shape),
    strategy: 'arrays',
    family: 'arrays',
    logicType: 'filter',
    seed: `go-arrays-filter:${difficulty}:${values.join(',')}:${threshold}`,
    tags: ['arrays', 'filter', 'numbers'],
    explanation: 'Собери новый срез, не меняя исходный массив.'
  });
}

function buildArrayDedupeTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const words = sampleUniqueWords(rng, shape.words).concat(sampleWords(rng, 2));
  const prompt = pickPrompt(rng, [
    (data) => `Дан список слов ${preview(data.words)}. Убери повторы, сохранив исходный порядок.`,
    (data) => `Верни уникальные слова из массива ${preview(data.words)}, не ломая порядок появления.`,
    (data) => `Сделай срез без дублей для набора слов ${preview(data.words)}.`
  ], { words });

  return buildGoTaskFromParts({
    category: 'arrays',
    difficulty,
    title: 'Уникальные элементы',
    prompt,
    returnType: '[]string',
    argTypes: ['[]string'],
    argNames: ['words'],
    starterBody: ['return nil'],
    solutionBody: [
      'seen := map[string]bool{}',
      'result := make([]string, 0, len(words))',
      'for _, word := range words {',
      '  if !seen[word] {',
      '    seen[word] = true',
      '    result = append(result, word)',
      '  }',
      '}',
      'return result'
    ],
    tests: makeArrayDedupeTests(rng, shape),
    strategy: 'arrays',
    family: 'arrays',
    logicType: 'dedupe',
    seed: `go-arrays-dedupe:${difficulty}:${words.join(',')}`,
    tags: ['arrays', 'dedupe', 'strings'],
    explanation: 'Используй set-like map, чтобы запомнить уже встреченные слова.'
  });
}

function buildArrayWindowTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const values = sampleNumbers(rng, shape.count + 2, shape.min, shape.max, true);
  const window = Math.min(values.length, Math.max(2, shape.window));
  const prompt = pickPrompt(rng, [
    (data) => `Дан массив чисел ${preview(data.values)} и размер окна ${data.window}. Для каждого окна верни максимум.`,
    (data) => `Нужен массив максимумов по скользящему окну ${data.window} для среза ${preview(data.values)}.`,
    (data) => `Просканируй массив ${preview(data.values)} окнами по ${data.window} элементов и собери максимумы.`
  ], { values, window });

  return buildGoTaskFromParts({
    category: 'arrays',
    difficulty,
    title: 'Скользящее окно',
    prompt,
    returnType: '[]int',
    argTypes: ['[]int', 'int'],
    argNames: ['values', 'window'],
    starterBody: ['return nil'],
    solutionBody: [
      'if window <= 0 || len(values) == 0 || window > len(values) {',
      '  return nil',
      '}',
      'result := make([]int, 0, len(values)-window+1)',
      'for left := 0; left+window <= len(values); left += 1 {',
      '  best := values[left]',
      '  for right := left + 1; right < left+window; right += 1 {',
      '    if values[right] > best {',
      '      best = values[right]',
      '    }',
      '  }',
      '  result = append(result, best)',
      '}',
      'return result'
    ],
    tests: makeArrayWindowTests(rng, shape),
    strategy: 'arrays',
    family: 'arrays',
    logicType: 'window',
    seed: `go-arrays-window:${difficulty}:${values.join(',')}:${window}`,
    tags: ['arrays', 'window', 'max'],
    explanation: 'Для каждого окна найди максимум, двигая левую границу по массиву.'
  });
}

function buildStringNormalizeTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const text = sampleSentence(rng, shape.words);
  const prompt = pickPrompt(rng, [
    (data) => `Очисти строку ${preview(data.text)}: убери лишние пробелы и оставь один пробел между словами.`,
    (data) => `Нормализуй текст ${preview(data.text)} без двойных пробелов по краям и внутри.`,
    (data) => `Приведи строку ${preview(data.text)} к аккуратному виду без лишних пробелов.`
  ], { text });

  return buildGoTaskFromParts({
    category: 'strings',
    difficulty,
    title: 'Нормализация строки',
    prompt,
    returnType: 'string',
    argTypes: ['string'],
    argNames: ['text'],
    starterBody: ['return ""'],
    solutionBody: [
      'result := ""',
      'pendingSpace := false',
      'for _, char := range text {',
      '  isSpace := char == \' \' || char == \'\\t\' || char == \'\\n\' || char == \'\\r\'',
      '  if isSpace {',
      '    if len(result) > 0 {',
      '      pendingSpace = true',
      '    }',
      '    continue',
      '  }',
      '  if pendingSpace && len(result) > 0 {',
      '    result += " "',
      '    pendingSpace = false',
      '  }',
      '  result += string(char)',
      '}',
      'return result'
    ],
    tests: makeStringNormalizeTests(rng, shape),
    strategy: 'strings',
    family: 'strings',
    logicType: 'normalize',
    seed: `go-strings-normalize:${difficulty}:${text}`,
    tags: ['strings', 'normalize', 'text'],
    explanation: 'Сначала убери лишние пробелы, затем собери итоговую строку.'
  });
}

function buildStringReverseTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const text = sampleSentence(rng, shape.words + 1);
  const prompt = pickPrompt(rng, [
    (data) => `Разверни порядок слов в строке ${preview(data.text)}.`,
    (data) => `У тебя есть строка ${preview(data.text)}. Верни слова в обратном порядке.`,
    (data) => `Переставь слова строки ${preview(data.text)} справа налево.`
  ], { text });

  return buildGoTaskFromParts({
    category: 'strings',
    difficulty,
    title: 'Обратный порядок слов',
    prompt,
    returnType: 'string',
    argTypes: ['string'],
    argNames: ['text'],
    starterBody: ['return ""'],
    solutionBody: [
      'words := make([]string, 0)',
      'current := ""',
      'for _, char := range text {',
      '  if char == \' \' || char == \'\\t\' || char == \'\\n\' || char == \'\\r\' {',
      '    if current != "" {',
      '      words = append(words, current)',
      '      current = ""',
      '    }',
      '    continue',
      '  }',
      '  current += string(char)',
      '}',
      'if current != "" {',
      '  words = append(words, current)',
      '}',
      'for left, right := 0, len(words)-1; left < right; left, right = left+1, right-1 {',
      '  words[left], words[right] = words[right], words[left]',
      '}',
      'result := ""',
      'for index, word := range words {',
      '  if index > 0 {',
      '    result += " "',
      '  }',
      '  result += word',
      '}',
      'return result'
    ],
    tests: makeStringReverseTests(rng, shape),
    strategy: 'strings',
    family: 'strings',
    logicType: 'reverse',
    seed: `go-strings-reverse:${difficulty}:${text}`,
    tags: ['strings', 'reverse', 'text'],
    explanation: 'Сначала разбей строку на слова, потом собери их в обратном порядке.'
  });
}

function buildStringPalindromeTask(difficulty, rng) {
  const text = samplePalindromeText(rng);
  const prompt = pickPrompt(rng, [
    (data) => `Проверь, является ли строка ${preview(data.text)} палиндромом, игнорируя регистр и символы кроме букв и цифр.`,
    (data) => `Верни true, если текст ${preview(data.text)} читается одинаково слева направо и справа налево.`,
    (data) => `Определи, палиндром ли строка ${preview(data.text)}.`
  ], { text });

  return buildGoTaskFromParts({
    category: 'strings',
    difficulty,
    title: 'Палиндром',
    prompt,
    returnType: 'bool',
    argTypes: ['string'],
    argNames: ['text'],
    starterBody: ['return false'],
    solutionBody: [
      'letters := make([]rune, 0, len(text))',
      'for _, char := range text {',
      '  current := char',
      '  if current >= \'A\' && current <= \'Z\' {',
      '    current = rune(current + 32)',
      '  }',
      '  isLetter := current >= \'a\' && current <= \'z\'',
      '  isDigit := current >= \'0\' && current <= \'9\'',
      '  if isLetter || isDigit {',
      '    letters = append(letters, current)',
      '  }',
      '}',
      'for left, right := 0, len(letters)-1; left < right; left, right = left+1, right-1 {',
      '  if letters[left] != letters[right] {',
      '    return false',
      '  }',
      '}',
      'return true'
    ],
    tests: makeStringPalindromeTests(rng),
    strategy: 'strings',
    family: 'strings',
    logicType: 'palindrome',
    seed: `go-strings-palindrome:${difficulty}:${text}`,
    tags: ['strings', 'palindrome', 'bool'],
    explanation: 'Сравни нормализованную строку с самой собой в обратном порядке.'
  });
}

function buildStringLongestTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const text = sampleSentence(rng, shape.words + 1);
  const prompt = pickPrompt(rng, [
    (data) => `Найди самое длинное слово в строке ${preview(data.text)}.`,
    (data) => `Из текста ${preview(data.text)} верни слово максимальной длины.`,
    (data) => `Определи longest word для строки ${preview(data.text)} и верни его.`
  ], { text });

  return buildGoTaskFromParts({
    category: 'strings',
    difficulty,
    title: 'Самое длинное слово',
    prompt,
    returnType: 'string',
    argTypes: ['string'],
    argNames: ['text'],
    starterBody: ['return ""'],
    solutionBody: [
      'current := ""',
      'best := ""',
      'for _, char := range text {',
      '  isLetter := (char >= \'A\' && char <= \'Z\') || (char >= \'a\' && char <= \'z\')',
      '  isDigit := char >= \'0\' && char <= \'9\'',
      '  if isLetter || isDigit {',
      '    current += string(char)',
      '    continue',
      '  }',
      '  if len(current) > len(best) {',
      '    best = current',
      '  }',
      '  current = ""',
      '}',
      'if len(current) > len(best) {',
      '  best = current',
      '}',
      'return best'
    ],
    tests: makeStringLongestTests(rng, shape),
    strategy: 'strings',
    family: 'strings',
    logicType: 'longest',
    seed: `go-strings-longest:${difficulty}:${text}`,
    tags: ['strings', 'longest', 'text'],
    explanation: 'Сканируй текст и запоминай слово с максимальной длиной.'
  });
}

function buildMapFrequencyTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const words = sampleWords(rng, shape.words + 2);
  const prompt = pickPrompt(rng, [
    (data) => `Посчитай частоту слов в массиве ${preview(data.words)} и верни карту word -> count.`,
    (data) => `Для списка слов ${preview(data.words)} собери словарь частот.`,
    (data) => `Сделай частотную карту для набора слов ${preview(data.words)}.`
  ], { words });

  return buildGoTaskFromParts({
    category: 'maps',
    variationCategory: 'collections',
    difficulty,
    title: 'Частоты слов',
    prompt,
    returnType: 'map[string]int',
    argTypes: ['[]string'],
    argNames: ['words'],
    starterBody: ['return nil'],
    solutionBody: [
      'counts := map[string]int{}',
      'for _, word := range words {',
      '  counts[word] += 1',
      '}',
      'return counts'
    ],
    tests: makeMapFrequencyTests(rng, shape),
    strategy: 'collections',
    family: 'maps',
    logicType: 'frequency',
    seed: `go-maps-frequency:${difficulty}:${words.join(',')}`,
    tags: ['maps', 'frequency', 'collections'],
    explanation: 'Считай каждое слово в словаре и увеличивай счётчик.'
  });
}

function buildMapMergeTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const leftWords = sampleUniqueWords(rng, shape.limit + 1);
  const rightWords = sampleUniqueWords(rng, shape.limit + 1);
  const left = {};
  const right = {};
  for (let index = 0; index < leftWords.length; index += 1) {
    left[leftWords[index]] = rng.int(1, 7);
    right[rightWords[index]] = rng.int(1, 7);
  }
  const prompt = pickPrompt(rng, [
    (data) => `Слей две карты ${preview(data.left)} и ${preview(data.right)}, суммируя значения одинаковых ключей.`,
    (data) => `Объедини словари ${preview(data.left)} и ${preview(data.right)} в один.`,
    (data) => `Сделай merge для карт ${preview(data.left)} и ${preview(data.right)}.`
  ], { left, right });

  return buildGoTaskFromParts({
    category: 'maps',
    variationCategory: 'collections',
    difficulty,
    title: 'Слияние карт',
    prompt,
    returnType: 'map[string]int',
    argTypes: ['map[string]int', 'map[string]int'],
    argNames: ['left', 'right'],
    starterBody: ['return nil'],
    solutionBody: [
      'result := map[string]int{}',
      'for key, value := range left {',
      '  result[key] += value',
      '}',
      'for key, value := range right {',
      '  result[key] += value',
      '}',
      'return result'
    ],
    tests: makeMapMergeTests(rng, shape),
    strategy: 'collections',
    family: 'maps',
    logicType: 'merge',
    seed: `go-maps-merge:${difficulty}:${Object.keys(left).join(',')}:${Object.keys(right).join(',')}`,
    tags: ['maps', 'merge', 'collections'],
    explanation: 'Сложи значения по одинаковым ключам в новый словарь.'
  });
}

function buildMapInvertTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const keys = sampleUniqueWords(rng, shape.limit + 1);
  const source = {};
  const numbers = sampleDistinctNumbers(rng, keys.length, 1, 99, false);
  for (let index = 0; index < keys.length; index += 1) {
    source[keys[index]] = numbers[index];
  }
  const prompt = pickPrompt(rng, [
    (data) => `Инвертируй карту ${preview(data.source)}: ключи и значения должны поменяться местами.`,
    (data) => `Построй обратный словарь для ${preview(data.source)}.`,
    (data) => `Сделай инверсию map ${preview(data.source)}.`
  ], { source });

  return buildGoTaskFromParts({
    category: 'maps',
    variationCategory: 'collections',
    difficulty,
    title: 'Инверсия карты',
    prompt,
    returnType: 'map[int]string',
    argTypes: ['map[string]int'],
    argNames: ['source'],
    starterBody: ['return nil'],
    solutionBody: [
      'result := map[int]string{}',
      'for key, value := range source {',
      '  result[value] = key',
      '}',
      'return result'
    ],
    tests: makeMapInvertTests(rng, shape),
    strategy: 'collections',
    family: 'maps',
    logicType: 'invert',
    seed: `go-maps-invert:${difficulty}:${Object.keys(source).join(',')}`,
    tags: ['maps', 'invert', 'collections'],
    explanation: 'Переставь местами ключи и значения в новой карте.'
  });
}

function buildMapTopTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const keys = sampleUniqueWords(rng, shape.limit + 3);
  const source = {};
  for (let index = 0; index < keys.length; index += 1) {
    source[keys[index]] = rng.int(1, 15);
  }
  const prompt = pickPrompt(rng, [
    (data) => `Верни ${shape.limit} ключа с наибольшими значениями из карты ${preview(data.source)}.`,
    (data) => `Из словаря ${preview(data.source)} выбери самые большие значения и верни их ключи.`,
    (data) => `Найди top-${shape.limit} ключей в карте ${preview(data.source)} по значению.`
  ], { source });

  return buildGoTaskFromParts({
    category: 'maps',
    variationCategory: 'collections',
    difficulty,
    title: 'Top ключи',
    prompt,
    returnType: '[]string',
    argTypes: ['map[string]int'],
    argNames: ['source'],
    starterBody: ['return nil'],
    solutionBody: [
      `limit := ${shape.limit}`,
      'keys := make([]string, 0, len(source))',
      'for key := range source {',
      '  keys = append(keys, key)',
      '}',
      'result := make([]string, 0, limit)',
      'used := map[string]bool{}',
      'for len(result) < limit && len(used) < len(keys) {',
      '  bestKey := ""',
      '  bestValue := -1',
      '  for _, key := range keys {',
      '    if used[key] {',
      '      continue',
      '    }',
      '    value := source[key]',
      '    if value > bestValue || (value == bestValue && (bestKey == "" || key < bestKey)) {',
      '      bestKey = key',
      '      bestValue = value',
      '    }',
      '  }',
      '  if bestKey == "" {',
      '    break',
      '  }',
      '  used[bestKey] = true',
      '  result = append(result, bestKey)',
      '}',
      'return result'
    ],
    tests: makeMapTopTests(rng, shape),
    strategy: 'collections',
    family: 'maps',
    logicType: 'top',
    seed: `go-maps-top:${difficulty}:${Object.keys(source).join(',')}`,
    tags: ['maps', 'top', 'collections'],
    explanation: 'Выбирай максимальные значения вручную, если не хочешь тащить сортировку.'
  });
}

function buildRecursionFactorialTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const value = rng.int(2, shape.window + 4);
  const prompt = pickPrompt(rng, [
    (data) => `Вычисли факториал числа ${data.value}.`,
    (data) => `Найди factorial для ${data.value}.`,
    (data) => `Сделай рекурсивный factorial(${data.value}).`
  ], { value });

  return buildGoTaskFromParts({
    category: 'recursion',
    difficulty,
    title: 'Факториал',
    prompt,
    returnType: 'int',
    argTypes: ['int'],
    argNames: ['value'],
    starterBody: ['return 0'],
    solutionBody: [
      'if value <= 1 {',
      '  return 1',
      '}',
      'return value * solve(value-1)'
    ],
    tests: makeRecursionFactorialTests(rng, shape),
    strategy: 'recursion',
    family: 'recursion',
    logicType: 'factorial',
    seed: `go-recursion-factorial:${difficulty}:${value}`,
    tags: ['recursion', 'factorial'],
    explanation: 'Факториал удобно строится через рекурсивное уменьшение числа.'
  });
}

function buildRecursionDigitsTask(difficulty, rng) {
  const value = rng.int(100, 99999);
  const prompt = pickPrompt(rng, [
    (data) => `Найди сумму цифр числа ${data.value}.`,
    (data) => `Сложи все цифры числа ${data.value}.`,
    (data) => `Рекурсивно вычисли сумму цифр ${data.value}.`
  ], { value });

  return buildGoTaskFromParts({
    category: 'recursion',
    difficulty,
    title: 'Сумма цифр',
    prompt,
    returnType: 'int',
    argTypes: ['int'],
    argNames: ['value'],
    starterBody: ['return 0'],
    solutionBody: [
      'if value < 0 {',
      '  value = -value',
      '}',
      'if value < 10 {',
      '  return value',
      '}',
      'return (value % 10) + solve(value/10)'
    ],
    tests: makeRecursionSumDigitsTests(rng, shapeForDifficulty(difficulty)),
    strategy: 'recursion',
    family: 'recursion',
    logicType: 'digits',
    seed: `go-recursion-digits:${difficulty}:${value}`,
    tags: ['recursion', 'digits'],
    explanation: 'Каждый шаг забирает последнюю цифру и идёт к оставшейся части числа.'
  });
}

function buildRecursionPowerTask(difficulty, rng) {
  const base = rng.int(2, 6);
  const exp = rng.int(2, shapeForDifficulty(difficulty).window + 2);
  const prompt = pickPrompt(rng, [
    (data) => `Возведи ${data.base} в степень ${data.exp}.`,
    (data) => `Посчитай power(${data.base}, ${data.exp}) рекурсивно.`,
    (data) => `Найди ${data.base}^${data.exp} без циклов.`
  ], { base, exp });

  return buildGoTaskFromParts({
    category: 'recursion',
    difficulty,
    title: 'Степень',
    prompt,
    returnType: 'int',
    argTypes: ['int', 'int'],
    argNames: ['base', 'exp'],
    starterBody: ['return 0'],
    solutionBody: [
      'if exp <= 0 {',
      '  return 1',
      '}',
      'if exp == 1 {',
      '  return base',
      '}',
      'return base * solve(base, exp-1)'
    ],
    tests: makeRecursionPowerTests(rng, shapeForDifficulty(difficulty)),
    strategy: 'recursion',
    family: 'recursion',
    logicType: 'power',
    seed: `go-recursion-power:${difficulty}:${base}:${exp}`,
    tags: ['recursion', 'power'],
    explanation: 'Снижай степень на единицу и перемножай результат на base.'
  });
}

function buildRecursionFibTask(difficulty, rng) {
  const value = rng.int(4, shapeForDifficulty(difficulty).window + 7);
  const prompt = pickPrompt(rng, [
    (data) => `Верни ${data.value}-е число Фибоначчи.`,
    (data) => `Рекурсивно посчитай fib(${data.value}).`,
    (data) => `Найди Fibonacci(${data.value}) с кэшем.`
  ], { value });

  return buildGoTaskFromParts({
    category: 'recursion',
    difficulty,
    title: 'Фибоначчи',
    prompt,
    returnType: 'int',
    argTypes: ['int'],
    argNames: ['value'],
    starterBody: ['return 0'],
    solutionBody: [
      'memo := map[int]int{0: 0, 1: 1}',
      'var fib func(int) int',
      'fib = func(cursor int) int {',
      '  if cached, ok := memo[cursor]; ok {',
      '    return cached',
      '  }',
      '  memo[cursor] = fib(cursor-1) + fib(cursor-2)',
      '  return memo[cursor]',
      '}',
      'if value < 0 {',
      '  return 0',
      '}',
      'return fib(value)'
    ],
    tests: makeRecursionFibTests(rng, shapeForDifficulty(difficulty)),
    strategy: 'recursion',
    family: 'recursion',
    logicType: 'fib',
    seed: `go-recursion-fib:${difficulty}:${value}`,
    tags: ['recursion', 'fib'],
    explanation: 'Кэширование делает рекурсивный Фибоначчи нормальным по скорости.'
  });
}

function buildAlgorithmsBinaryTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const values = sampleDistinctNumbers(rng, shape.count + 1, -20, 40, true).sort((a, b) => a - b);
  const target = values[rng.int(0, values.length - 1)];
  const prompt = pickPrompt(rng, [
    (data) => `Найди индекс числа ${data.target} в отсортированном массиве ${preview(data.values)}.`,
    (data) => `Реализуй binary search для массива ${preview(data.values)} и цели ${data.target}.`,
    (data) => `Бинарным поиском верни позицию ${data.target} в ${preview(data.values)}.`
  ], { values, target });

  return buildGoTaskFromParts({
    category: 'algorithms',
    difficulty,
    title: 'Бинарный поиск',
    prompt,
    returnType: 'int',
    argTypes: ['[]int', 'int'],
    argNames: ['values', 'target'],
    starterBody: ['return -1'],
    solutionBody: [
      'left := 0',
      'right := len(values) - 1',
      'for left <= right {',
      '  mid := (left + right) / 2',
      '  if values[mid] == target {',
      '    return mid',
      '  }',
      '  if values[mid] < target {',
      '    left = mid + 1',
      '  } else {',
      '    right = mid - 1',
      '  }',
      '}',
      'return -1'
    ],
    tests: makeAlgorithmsBinaryTests(rng, shape),
    strategy: 'algorithms',
    family: 'algorithms',
    logicType: 'binary',
    seed: `go-algorithms-binary:${difficulty}:${values.join(',')}:${target}`,
    tags: ['algorithms', 'binary-search'],
    explanation: 'Сужай границы поиска пополам, пока не найдёшь цель.'
  });
}

function buildAlgorithmsTwoSumTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const values = sampleNumbers(rng, shape.count + 1, shape.min, shape.max, true);
  const left = values[rng.int(0, values.length - 1)];
  const right = values[rng.int(0, values.length - 1)];
  const target = left + right;
  const prompt = pickPrompt(rng, [
    (data) => `Есть массив ${preview(data.values)}. Проверь, можно ли собрать сумму ${data.target} из двух элементов.`,
    (data) => `Реализуй two-sum existence check для ${preview(data.values)} и target ${data.target}.`,
    (data) => `Найди, существует ли пара с суммой ${data.target} в массиве ${preview(data.values)}.`
  ], { values, target });

  return buildGoTaskFromParts({
    category: 'algorithms',
    difficulty,
    title: 'Two Sum',
    prompt,
    returnType: 'bool',
    argTypes: ['[]int', 'int'],
    argNames: ['values', 'target'],
    starterBody: ['return false'],
    solutionBody: [
      'seen := map[int]bool{}',
      'for _, value := range values {',
      '  if seen[target-value] {',
      '    return true',
      '  }',
      '  seen[value] = true',
      '}',
      'return false'
    ],
    tests: makeAlgorithmsTwoSumTests(rng, shape),
    strategy: 'algorithms',
    family: 'algorithms',
    logicType: 'two-sum',
    seed: `go-algorithms-two-sum:${difficulty}:${values.join(',')}:${target}`,
    tags: ['algorithms', 'two-sum'],
    explanation: 'Запоминай уже увиденные числа и проверяй, есть ли комплемент к target.'
  });
}

function buildAlgorithmsMaxSubarrayTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const values = sampleNumbers(rng, shape.count + 1, shape.min, shape.max, true);
  const prompt = pickPrompt(rng, [
    (data) => `Найди максимальную сумму подмассива для ${preview(data.values)}.`,
    (data) => `Реализуй Kadane для массива ${preview(data.values)}.`,
    (data) => `Верни max subarray sum для ${preview(data.values)}.`
  ], { values });

  return buildGoTaskFromParts({
    category: 'algorithms',
    difficulty,
    title: 'Максимальный подмассив',
    prompt,
    returnType: 'int',
    argTypes: ['[]int'],
    argNames: ['values'],
    starterBody: ['return 0'],
    solutionBody: [
      'best := values[0]',
      'current := values[0]',
      'for index := 1; index < len(values); index += 1 {',
      '  next := current + values[index]',
      '  if values[index] > next {',
      '    current = values[index]',
      '  } else {',
      '    current = next',
      '  }',
      '  if current > best {',
      '    best = current',
      '  }',
      '}',
      'return best'
    ],
    tests: makeAlgorithmsMaxSubarrayTests(rng, shape),
    strategy: 'algorithms',
    family: 'algorithms',
    logicType: 'max-subarray',
    seed: `go-algorithms-max-subarray:${difficulty}:${values.join(',')}`,
    tags: ['algorithms', 'kadane'],
    explanation: 'Держи текущий лучший отрезок и обновляй глобальный максимум.'
  });
}

function buildAlgorithmsWindowTask(difficulty, rng) {
  const shape = shapeForDifficulty(difficulty);
  const values = sampleNumbers(rng, shape.count + 2, shape.min, shape.max, true);
  const window = Math.min(values.length, Math.max(2, shape.window));
  const prompt = pickPrompt(rng, [
    (data) => `Для массива ${preview(data.values)} верни максимумы по окну ${data.window}.`,
    (data) => `Скользящее окно ${data.window}: найди максимум в каждом окне массива ${preview(data.values)}.`,
    (data) => `Просканируй ${preview(data.values)} окном размера ${data.window} и верни список максимумов.`
  ], { values, window });

  return buildGoTaskFromParts({
    category: 'algorithms',
    difficulty,
    title: 'Максимумы окна',
    prompt,
    returnType: '[]int',
    argTypes: ['[]int', 'int'],
    argNames: ['values', 'window'],
    starterBody: ['return nil'],
    solutionBody: [
      'if window <= 0 || len(values) == 0 || window > len(values) {',
      '  return nil',
      '}',
      'result := make([]int, 0, len(values)-window+1)',
      'for left := 0; left+window <= len(values); left += 1 {',
      '  best := values[left]',
      '  for right := left + 1; right < left+window; right += 1 {',
      '    if values[right] > best {',
      '      best = values[right]',
      '    }',
      '  }',
      '  result = append(result, best)',
      '}',
      'return result'
    ],
    tests: makeAlgorithmsWindowTests(rng, shape),
    strategy: 'algorithms',
    family: 'algorithms',
    logicType: 'window',
    seed: `go-algorithms-window:${difficulty}:${values.join(',')}:${window}`,
    tags: ['algorithms', 'window'],
    explanation: 'На каждом шаге расширяй окно и считай максимум внутри него.'
  });
}

function buildArraysTask(difficulty, rng) {
  switch (normalizeDifficulty(difficulty)) {
    case 'easy':
      return buildArraySumTask('easy', rng);
    case 'medium':
      return buildArrayFilterTask('medium', rng);
    case 'hard':
      return buildArrayDedupeTask('hard', rng);
    case 'expert':
      return buildArrayWindowTask('expert', rng);
    default:
      return buildArraySumTask('easy', rng);
  }
}

function buildStringsTask(difficulty, rng) {
  switch (normalizeDifficulty(difficulty)) {
    case 'easy':
      return buildStringNormalizeTask('easy', rng);
    case 'medium':
      return buildStringReverseTask('medium', rng);
    case 'hard':
      return buildStringPalindromeTask('hard', rng);
    case 'expert':
      return buildStringLongestTask('expert', rng);
    default:
      return buildStringNormalizeTask('easy', rng);
  }
}

function buildMapsTask(difficulty, rng) {
  switch (normalizeDifficulty(difficulty)) {
    case 'easy':
      return buildMapFrequencyTask('easy', rng);
    case 'medium':
      return buildMapMergeTask('medium', rng);
    case 'hard':
      return buildMapInvertTask('hard', rng);
    case 'expert':
      return buildMapTopTask('expert', rng);
    default:
      return buildMapFrequencyTask('easy', rng);
  }
}

function buildRecursionTask(difficulty, rng) {
  switch (normalizeDifficulty(difficulty)) {
    case 'easy':
      return buildRecursionFactorialTask('easy', rng);
    case 'medium':
      return buildRecursionDigitsTask('medium', rng);
    case 'hard':
      return buildRecursionPowerTask('hard', rng);
    case 'expert':
      return buildRecursionFibTask('expert', rng);
    default:
      return buildRecursionFactorialTask('easy', rng);
  }
}

function buildAlgorithmsTask(difficulty, rng) {
  switch (normalizeDifficulty(difficulty)) {
    case 'easy':
      return buildAlgorithmsBinaryTask('easy', rng);
    case 'medium':
      return buildAlgorithmsTwoSumTask('medium', rng);
    case 'hard':
      return buildAlgorithmsMaxSubarrayTask('hard', rng);
    case 'expert':
      return buildAlgorithmsWindowTask('expert', rng);
    default:
      return buildAlgorithmsBinaryTask('easy', rng);
  }
}

function resolveSeed(options = {}) {
  if (options.seed !== undefined && options.seed !== null && String(options.seed).trim()) {
    return String(options.seed);
  }
  seedCounter += 1;
  return `go:${seedCounter}`;
}

function chooseCategory(rng, options = {}) {
  const available = normalizeSelection(options.categories, Object.keys(CATEGORY_META));
  if (typeof options.focusCategory === 'string' && available.includes(options.focusCategory)) {
    return options.focusCategory;
  }
  if (options.randomMode === false && typeof options.category === 'string' && available.includes(options.category)) {
    return options.category;
  }
  return rng.pick(available) || 'arrays';
}

function chooseDifficulty(rng, options = {}) {
  const available = normalizeSelection(options.difficulties, DIFFICULTIES);
  if (typeof options.focusDifficulty === 'string' && available.includes(options.focusDifficulty)) {
    return options.focusDifficulty;
  }
  if (options.randomMode === false && typeof options.difficulty === 'string' && available.includes(options.difficulty)) {
    return options.difficulty;
  }
  return rng.pick(available) || 'easy';
}

function buildGeneratedTask(category, difficulty, rng) {
  switch (category) {
    case 'arrays':
      return buildArraysTask(difficulty, rng);
    case 'strings':
      return buildStringsTask(difficulty, rng);
    case 'maps':
      return buildMapsTask(difficulty, rng);
    case 'recursion':
      return buildRecursionTask(difficulty, rng);
    case 'algorithms':
      return buildAlgorithmsTask(difficulty, rng);
    default:
      throw new Error(`Unknown Go category: ${category}`);
  }
}

function generateTask(options = {}) {
  const seed = resolveSeed(options);
  const rng = createRng(seed);
  const category = chooseCategory(rng, options);
  const difficulty = chooseDifficulty(rng, options);
  const task = buildGeneratedTask(category, difficulty, rng);
  const challengeType = options.mode === 'daily' ? 'daily' : options.mode === 'boss' ? 'boss' : 'practice';
  task.challengeType = challengeType;
  task.seed = seed;
  task.id = makeTaskId(category, difficulty, task.title, seed, GO_KERNEL_META.id);
  task.meta = {
    ...task.meta,
    challengeType,
    randomMode: options.randomMode !== false,
    seed,
    kernelId: GO_KERNEL_META.id
  };

  const customs = (options.customTasks || [])
    .map(normalizeCustomTask)
    .filter(Boolean)
    .filter((custom) => custom.category === category && custom.difficulty === difficulty);

  const pool = [task, ...customs];
  if (pool.length === 1) {
    return task;
  }

  const chosen = rng.pick(pool);
  chosen.challengeType = challengeType;
  chosen.seed = seed;
  chosen.id = makeTaskId(chosen.category, chosen.difficulty, chosen.title, seed, GO_KERNEL_META.id);
  chosen.meta = {
    ...chosen.meta,
    challengeType,
    randomMode: options.randomMode !== false,
    seed,
    kernelId: GO_KERNEL_META.id
  };
  return chosen;
}

function getGoCandidates() {
  const candidates = [];
  const programFiles = process.env.ProgramFiles;
  const programFilesX86 = process.env['ProgramFiles(x86)'];
  const programW6432 = process.env.ProgramW6432;
  const localAppData = process.env.LOCALAPPDATA;

  if (programFiles) {
    candidates.push(path.join(programFiles, 'Go', 'bin', 'go.exe'));
  }
  if (programFilesX86) {
    candidates.push(path.join(programFilesX86, 'Go', 'bin', 'go.exe'));
  }
  if (programW6432) {
    candidates.push(path.join(programW6432, 'Go', 'bin', 'go.exe'));
  }
  if (localAppData) {
    candidates.push(path.join(localAppData, 'Programs', 'Go', 'bin', 'go.exe'));
  }
  candidates.push('C:\\Go\\bin\\go.exe');
  candidates.push('go');
  return unique(candidates);
}

function updateRuntimeAvailability() {
  if (cachedGoRuntime) {
    return cachedGoRuntime.available;
  }

  for (const candidate of getGoCandidates()) {
    const probe = spawnSync(candidate, ['version'], {
      encoding: 'utf8',
      windowsHide: true
    });
    if (probe.status === 0) {
      cachedGoRuntime = {
        available: true,
        go: candidate
      };
      GO_KERNEL_META.status = 'available';
      GO_KERNEL_META.available = true;
      return true;
    }
  }

  cachedGoRuntime = {
    available: false,
    go: null
  };
  GO_KERNEL_META.status = 'planned';
  GO_KERNEL_META.available = false;
  return false;
}

function getGoRuntime() {
  if (cachedGoRuntime) {
    return cachedGoRuntime;
  }
  updateRuntimeAvailability();
  return cachedGoRuntime;
}

function normalizeGoTests(tests, argTypes) {
  const normalized = [];
  for (let index = 0; index < (Array.isArray(tests) ? tests.length : 0); index += 1) {
    const raw = tests[index];
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const input = Array.isArray(raw.input)
      ? raw.input.slice()
      : Array.isArray(raw.args)
        ? raw.args.slice()
        : Array.isArray(raw.values)
          ? raw.values.slice()
          : [raw.input];
    const expected = raw.expected;
    if (input.length !== argTypes.length) {
      continue;
    }
    normalized.push({
      name: String(raw.name || `Case ${index + 1}`),
      input,
      expected
    });
  }
  return normalized;
}

function normalizeGoSignature(signature, returnType, argTypes, argNames) {
  if (typeof signature === 'string' && signature.includes('func')) {
    return signature.trim().replace(/\s+/g, ' ');
  }
  return buildGoSignature(returnType, argTypes, argNames);
}

function goLiteralForType(value, type) {
  const normalized = normalizeGoType(type);

  if (normalized === 'int') {
    return String(Math.trunc(Number(value) || 0));
  }
  if (normalized === 'bool') {
    return value ? 'true' : 'false';
  }
  if (normalized === 'string') {
    return JSON.stringify(String(value ?? ''));
  }
  if (normalized.startsWith('[]')) {
    const innerType = normalized.slice(2);
    const items = Array.isArray(value) ? value : [];
    return `${normalized}{${items.map((item) => goLiteralForType(item, innerType)).join(', ')}}`;
  }
  if (normalized.startsWith('map[')) {
    const match = /^map\[(.+?)\](.+)$/.exec(normalized);
    if (!match) {
      return 'nil';
    }
    const keyType = match[1];
    const valueType = match[2];
    const source = value && typeof value === 'object' ? value : {};
    const keys = Object.keys(source).sort();
    return `${normalized}{${keys.map((key) => `${goLiteralForType(key, keyType)}: ${goLiteralForType(source[key], valueType)}`).join(', ')}}`;
  }

  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[]any{${value.map((item) => goLiteralForType(item, 'string')).join(', ')}}`;
  }

  return 'nil';
}

function buildGoRunnerSource(task, returnType, argTypes) {
  const tests = normalizeGoTests(task.tests, argTypes);
  const blocks = tests.map((test, index) => {
    const callArgs = test.input.map((value, argIndex) => goLiteralForType(value, argTypes[argIndex] || 'int')).join(', ');
    const expectedLiteral = goLiteralForType(test.expected, returnType);
    const inputLiteral = `[]any{${test.input.map((value, argIndex) => goLiteralForType(value, argTypes[argIndex] || 'int')).join(', ')}}`;
    return [
      `  actual${index} := solve(${callArgs})`,
      `  expected${index} := ${expectedLiteral}`,
      `  passed${index} := reflect.DeepEqual(actual${index}, expected${index})`,
      '  results = append(results, testResult{',
      `    Name: ${JSON.stringify(test.name)},`,
      `    Passed: passed${index},`,
      `    Input: ${inputLiteral},`,
      `    Expected: expected${index},`,
      `    Actual: actual${index},`,
      '  })',
      `  if !passed${index} {`,
      '    emit(report{',
      '      Passed: false,',
      `      Error: fmt.Sprintf("test %d failed", ${index + 1}),`,
      '      Tests: results,',
      '      Logs: []string{},',
      '      DurationMs: time.Since(start).Milliseconds(),',
      '    })',
      '    return',
      '  }'
    ].join('\n');
  }).join('\n');

  return `package main

import (
  "encoding/json"
  "fmt"
  "os"
  "reflect"
  "time"
)

type testResult struct {
  Name string \`json:"name"\`
  Passed bool \`json:"passed"\`
  Input any \`json:"input"\`
  Expected any \`json:"expected"\`
  Actual any \`json:"actual"\`
}

type report struct {
  Passed bool \`json:"passed"\`
  Error string \`json:"error,omitempty"\`
  Tests []testResult \`json:"tests"\`
  Logs []string \`json:"logs"\`
  DurationMs int64 \`json:"durationMs"\`
}

func emit(value report) {
  encoder := json.NewEncoder(os.Stdout)
  encoder.SetEscapeHTML(false)
  _ = encoder.Encode(value)
}

func main() {
  start := time.Now()
  results := make([]testResult, 0, ${tests.length})
${blocks}
  emit(report{
    Passed: true,
    Tests: results,
    Logs: []string{},
    DurationMs: time.Since(start).Milliseconds(),
  })
}
`;
}

function normalizeCustomTask(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const category = normalizeCategory(raw.category);
  const difficulty = normalizeDifficulty(raw.difficulty);
  const variationFields = extractVariationFields(raw);
  const meta = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
  const goMeta = meta.go && typeof meta.go === 'object' ? meta.go : {};
  const argTypes = Array.isArray(goMeta.argTypes) && goMeta.argTypes.length > 0
    ? goMeta.argTypes.slice()
    : Array.isArray(raw.argTypes) && raw.argTypes.length > 0
      ? raw.argTypes.slice()
      : ['[]int'];
  const argNames = buildArgNames(argTypes, Array.isArray(goMeta.argNames) ? goMeta.argNames.slice() : Array.isArray(raw.argNames) ? raw.argNames.slice() : []);
  const returnType = normalizeGoType(goMeta.returnType || raw.returnType || 'int');
  const signature = normalizeGoSignature(raw.signature, returnType, argTypes, argNames);
  const starterCode = typeof raw.starterCode === 'string'
    ? raw.starterCode
    : goFileCode(signature, goDefaultReturnLines(returnType));
  const solution = typeof raw.solution === 'string'
    ? raw.solution
    : typeof raw.solutionCode === 'string'
      ? raw.solutionCode
      : starterCode;
  const tests = Array.isArray(raw.tests)
    ? cloneJson(raw.tests)
    : typeof raw.testsJson === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(raw.testsJson);
            return Array.isArray(parsed) ? cloneJson(parsed) : [];
          } catch (error) {
            return [];
          }
        })()
      : [];
  const hints = Array.isArray(raw.hints)
    ? raw.hints.slice()
    : typeof raw.hintsText === 'string'
      ? raw.hintsText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      : [];
  const createdAt = raw.createdAt || raw.importedAt || Date.now();
  const starter = makeTask({
    id: raw.id || `custom-${hashString(`${raw.title || raw.prompt || 'task'}:${createdAt}`)}`,
    seed: raw.seed || `${raw.title || raw.prompt || 'custom'}:${createdAt}`,
    source: 'custom',
    createdAt,
    kernelId: GO_KERNEL_META.id,
    category,
    difficulty,
    title: String(raw.title || 'Custom Go task'),
    prompt: String(raw.prompt || ''),
    signature,
    starterCode,
    solution,
    hints,
    explanation: String(raw.explanation || ''),
    strategy: normalizeStrategy(raw.strategy || 'arrays'),
    tests,
    xp: typeof raw.xp === 'number' ? raw.xp : xpForDifficulty(difficulty),
    tags: Array.isArray(raw.tags) ? raw.tags.slice() : [],
    meta: {
      ...cloneJson(meta),
      ...variationFields,
      go: {
        returnType,
        argTypes,
        argNames,
        signature,
        category,
        family: String(goMeta.family || raw.family || category),
        logicType: String(goMeta.logicType || raw.logicType || raw.strategy || category)
      }
    },
    challengeType: raw.challengeType || 'practice',
    family: String(goMeta.family || raw.family || category),
    logicType: String(goMeta.logicType || raw.logicType || raw.strategy || category),
    structureType: variationFields.structureType || '',
    answerFormat: variationFields.answerFormat || '',
    thinkingStyle: variationFields.thinkingStyle || '',
    contextType: variationFields.contextType || '',
    constraints: Array.isArray(variationFields.constraints) ? variationFields.constraints.slice() : [],
    variationNotes: Array.isArray(variationFields.variationNotes) ? variationFields.variationNotes.slice() : [],
    variantId: variationFields.variantId || '',
    returnType,
    argTypes,
    argNames
  });

  starter.kernelId = GO_KERNEL_META.id;
  starter.kernelTitle = GO_KERNEL_META.title;
  starter.editorLanguage = GO_KERNEL_META.editorLanguage;
  return starter;
}

function createCustomTaskTemplate() {
  const starter = buildGoTaskFromParts({
    category: 'arrays',
    difficulty: 'easy',
    title: 'Go задача',
    prompt: 'Опиши условие задачи здесь.',
    returnType: 'int',
    argTypes: ['[]int'],
    argNames: ['values'],
    starterBody: ['return 0'],
    solutionBody: [
      'total := 0',
      'for _, value := range values {',
      '  total += value',
      '}',
      'return total'
    ],
    tests: [
      {
        name: 'Sample',
        input: [[1, 2, 3]],
        expected: 6
      }
    ],
    strategy: 'arrays',
    family: 'arrays',
    logicType: 'sum',
    seed: `go-template:${Date.now()}`
  });

  starter.source = 'template';
  starter.createdAt = Date.now();
  starter.title = 'Go задача';
  starter.prompt = 'Опиши условие задачи здесь.';
  starter.meta = {
    ...starter.meta,
    source: 'template'
  };
  return starter;
}

async function runTaskTests(task, userCode) {
  const start = Date.now();
  const runtime = getGoRuntime();
  if (!runtime.available) {
    return {
      passed: false,
      error: 'Go SDK не найден. Для Go-ядра нужна команда `go`.',
      tests: [],
      logs: [],
      durationMs: 0
    };
  }

  const meta = extractVariationFields(task || {});
  const goMeta = task && task.meta && task.meta.go && typeof task.meta.go === 'object' ? task.meta.go : {};
  const returnType = normalizeGoType(goMeta.returnType || meta.returnType || 'int');
  const argTypes = Array.isArray(goMeta.argTypes) && goMeta.argTypes.length > 0
    ? goMeta.argTypes.map((type) => normalizeGoType(type))
    : Array.isArray(task.argTypes) && task.argTypes.length > 0
      ? task.argTypes.map((type) => normalizeGoType(type))
      : ['int'];
  const validationError = !Array.isArray(task.tests) || task.tests.length === 0
    ? 'Task has no tests'
    : normalizeGoTests(task.tests, argTypes).length === 0
      ? 'Task tests are invalid'
      : null;
  if (validationError) {
    return {
      passed: false,
      error: validationError,
      tests: [],
      logs: [],
      durationMs: Date.now() - start
    };
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'js-infinite-trainer-go-'));
  const solutionPath = path.join(workDir, 'Solution.go');
  const runnerPath = path.join(workDir, 'Runner.go');

  try {
    fs.writeFileSync(solutionPath, String(userCode || ''), 'utf8');
    fs.writeFileSync(runnerPath, buildGoRunnerSource(task, returnType, argTypes), 'utf8');

    const run = spawnSync(runtime.go, ['run', 'Runner.go', 'Solution.go'], {
      cwd: workDir,
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024
    });

    if (run.status !== 0) {
      const message = (run.stderr || run.stdout || '').trim() || 'Go execution failed';
      return {
        passed: false,
        error: message,
        tests: [],
        logs: [],
        durationMs: Date.now() - start
      };
    }

    const output = String(run.stdout || '').trim();
    if (!output) {
      return {
        passed: false,
        error: 'Go runner did not return a report.',
        tests: [],
        logs: [],
        durationMs: Date.now() - start
      };
    }

    const report = JSON.parse(output);
    return {
      passed: Boolean(report.passed),
      error: report.passed ? '' : String(report.error || 'Go tests failed'),
      tests: Array.isArray(report.tests) ? report.tests : [],
      logs: Array.isArray(report.logs) ? report.logs : [],
      durationMs: typeof report.durationMs === 'number' ? report.durationMs : Date.now() - start
    };
  } catch (error) {
    return {
      passed: false,
      error: error && error.message ? error.message : 'Go execution failed',
      tests: [],
      logs: [],
      durationMs: Date.now() - start
    };
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup failures.
    }
  }
}

function getProgressSummary(progress = {}) {
  return taskEngine.getProgressSummary(progress);
}

function buildAchievements(progress = {}) {
  return taskEngine.buildAchievements(progress);
}

function buildGeneratedTaskByCategory(category, difficulty, rng) {
  switch (category) {
    case 'arrays':
      return buildArraysTask(difficulty, rng);
    case 'strings':
      return buildStringsTask(difficulty, rng);
    case 'maps':
      return buildMapsTask(difficulty, rng);
    case 'recursion':
      return buildRecursionTask(difficulty, rng);
    case 'algorithms':
      return buildAlgorithmsTask(difficulty, rng);
    default:
      throw new Error(`Unknown Go category: ${category}`);
  }
}

function getCategories() {
  return CATEGORY_META;
}

function getDifficulties() {
  return DIFFICULTIES.slice();
}

function resolveGoCandidates() {
  return getGoCandidates();
}

updateRuntimeAvailability();

module.exports = {
  ...GO_KERNEL_META,
  available: GO_KERNEL_META.available,
  getCategories,
  getDifficulties,
  generateTask,
  runTaskTests,
  getProgressSummary,
  buildAchievements,
  createCustomTaskTemplate,
  normalizeCustomTask,
  updateRuntimeAvailability,
  resolveGoCandidates
};
