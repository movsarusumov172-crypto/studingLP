const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  buildSafeProcessEnv,
  NATIVE_COMPILE_TIMEOUT_MS,
  NATIVE_RUN_TIMEOUT_MS,
} = require('../../runtime/childProcessSafety');

const taskEngine = require('../../generation');

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];

const CATEGORY_META = {
  arrays: {
    title: 'Массивы',
    description: 'Суммы, частоты, длины серий и аккуратная работа с индексами.',
    accent: '#7dd3fc'
  },
  strings: {
    title: 'Строки',
    description: 'Подсчёт символов, слов и анализ текста на C.',
    accent: '#34d399'
  },
  recursion: {
    title: 'Рекурсия',
    description: 'Факториал, сумма цифр, степени и Фибоначчи.',
    accent: '#a78bfa'
  },
  algorithms: {
    title: 'Алгоритмы',
    description: 'Бинарный поиск, пары, подмассивы и максимум на отрезке.',
    accent: '#fb7185'
  }
};

const STRATEGY_META = {
  simple: 'Базовая',
  arrays: 'Массивы',
  strings: 'Строки',
  recursion: 'Рекурсия',
  algorithm: 'Алгоритмы'
};

const C_KERNEL_META = {
  id: 'c',
  title: 'C',
  shortTitle: 'C',
  family: 'native',
  editorLanguage: 'cpp',
  strategies: Object.keys(STRATEGY_META),
  strategyLabels: STRATEGY_META,
  description: 'Ядро C с локальной компиляцией через gcc и бесконечной генерацией задач.',
  status: 'planned',
  available: false,
  accent: '#fb7185'
};

const WORD_POOL = [
  'alpha', 'beta', 'gamma', 'delta', 'omega', 'nova', 'pulse', 'vector',
  'lumen', 'mint', 'orbit', 'spark', 'drift', 'tide', 'glow', 'zen', 'flux'
];

let seedCounter = 0;
let cachedCRuntime = null;

function hashString(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seedInput) {
  let state = hashString(String(seedInput)) || 0x12345678;

  function next() {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    float() {
      return next();
    },
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    bool(chance = 0.5) {
      return next() < chance;
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    shuffle(list) {
      const copy = list.slice();
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(next() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
      }
      return copy;
    }
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function preview(value) {
  return JSON.stringify(value, null, 2);
}

function normalizeDifficulty(value) {
  return DIFFICULTIES.includes(value) ? value : 'easy';
}

function normalizeCategory(value) {
  return Object.prototype.hasOwnProperty.call(CATEGORY_META, value) ? value : 'arrays';
}

function normalizeStrategy(value) {
  return Object.prototype.hasOwnProperty.call(STRATEGY_META, value) ? value : 'simple';
}

function normalizeSelection(list, fallback) {
  const filtered = Array.isArray(list) ? list.filter((item) => fallback.includes(item)) : [];
  return filtered.length > 0 ? filtered : fallback.slice();
}

function xpForDifficulty(difficulty) {
  switch (normalizeDifficulty(difficulty)) {
    case 'easy':
      return 12;
    case 'medium':
      return 24;
    case 'hard':
      return 42;
    case 'expert':
      return 72;
    default:
      return 12;
  }
}

function testCountForDifficulty(difficulty) {
  switch (normalizeDifficulty(difficulty)) {
    case 'easy':
      return 3;
    case 'medium':
      return 4;
    case 'hard':
      return 5;
    case 'expert':
      return 6;
    default:
      return 3;
  }
}

function sampleNumbers(rng, count, min, max, allowNegative = false) {
  return Array.from({ length: count }, () => {
    const value = rng.int(min, max);
    if (allowNegative && rng.bool(0.35)) {
      return -value;
    }
    return value;
  });
}

function sampleDistinctNumbers(rng, count, min, max, allowNegative = false) {
  const values = [];
  const seen = new Set();
  let safety = count * 40;
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

function sampleWords(rng, count, allowDuplicates = true) {
  const values = [];
  while (values.length < count) {
    const word = rng.pick(WORD_POOL);
    if (allowDuplicates || !values.includes(word)) {
      values.push(word);
    }
  }
  return values;
}

function sampleText(rng, wordCount = 6) {
  const words = [];
  for (let index = 0; index < wordCount; index += 1) {
    const word = rng.pick(WORD_POOL);
    words.push(index % 3 === 0 ? word.toUpperCase() : word);
  }
  return `  ${words.join(rng.bool(0.5) ? '   ' : ' ')}  `;
}

function countVowels(text) {
  let count = 0;
  for (const ch of String(text)) {
    switch (ch.toLowerCase()) {
      case 'a':
      case 'e':
      case 'i':
      case 'o':
      case 'u':
        count += 1;
        break;
      default:
        break;
    }
  }
  return count;
}

function countWords(text) {
  const source = String(text).trim();
  if (!source) {
    return 0;
  }
  return source.split(/\s+/).filter(Boolean).length;
}

function longestWordLength(text) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  let best = 0;
  for (const word of words) {
    if (word.length > best) {
      best = word.length;
    }
  }
  return best;
}

function countDistinctLetters(text) {
  const seen = new Array(26).fill(false);
  let count = 0;
  for (const ch of String(text)) {
    if (!/[a-z]/i.test(ch)) {
      continue;
    }
    const index = ch.toLowerCase().charCodeAt(0) - 97;
    if (!seen[index]) {
      seen[index] = true;
      count += 1;
    }
  }
  return count;
}

function sumArray(values) {
  return values.reduce((total, value) => total + value, 0);
}

function countEvenNumbers(values) {
  return values.filter((value) => value % 2 === 0).length;
}

function longestIncreasingStreak(values) {
  if (values.length === 0) {
    return 0;
  }
  let best = 1;
  let streak = 1;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > values[index - 1]) {
      streak += 1;
    } else {
      streak = 1;
    }
    best = Math.max(best, streak);
  }
  return best;
}

function countGreaterThan(values, threshold) {
  let count = 0;
  for (const value of values) {
    if (value > threshold) {
      count += 1;
    }
  }
  return count;
}

function maxSubarraySum(values) {
  let best = values[0];
  let current = values[0];
  for (let index = 1; index < values.length; index += 1) {
    current = Math.max(values[index], current + values[index]);
    best = Math.max(best, current);
  }
  return best;
}

function binarySearchIndex(values, target) {
  let left = 0;
  let right = values.length - 1;
  while (left <= right) {
    const middle = left + Math.floor((right - left) / 2);
    if (values[middle] === target) {
      return middle;
    }
    if (values[middle] < target) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }
  return -1;
}

function countPairsWithSum(values, target) {
  let count = 0;
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      if (values[left] + values[right] === target) {
        count += 1;
      }
    }
  }
  return count;
}

function countSubarraysWithSum(values, target) {
  let count = 0;
  for (let start = 0; start < values.length; start += 1) {
    let total = 0;
    for (let end = start; end < values.length; end += 1) {
      total += values[end];
      if (total === target) {
        count += 1;
      }
    }
  }
  return count;
}

function factorial(value) {
  return value <= 1 ? 1 : value * factorial(value - 1);
}

function sumDigits(value) {
  const normalized = Math.abs(value);
  return normalized < 10 ? normalized : (normalized % 10) + sumDigits(Math.floor(normalized / 10));
}

function recursivePower(base, exponent) {
  if (exponent === 0) {
    return 1;
  }
  if (exponent === 1) {
    return base;
  }
  const half = recursivePower(base, Math.floor(exponent / 2));
  const squared = half * half;
  return exponent % 2 === 0 ? squared : squared * base;
}

function fibonacciValue(value) {
  if (value <= 1) {
    return value;
  }
  let previous = 0;
  let current = 1;
  for (let index = 2; index <= value; index += 1) {
    const next = previous + current;
    previous = current;
    current = next;
  }
  return current;
}

function normalizeSpaces(text) {
  return String(text).trim().replace(/\s+/g, ' ');
}

function reverseWords(text) {
  return normalizeSpaces(text).split(' ').reverse().join(' ');
}

function normalizedPalindrome(text) {
  const cleaned = String(text).toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === cleaned.split('').reverse().join('');
}

function runLengthEncode(text) {
  const value = String(text);
  if (value.length === 0) {
    return '';
  }
  let result = '';
  let current = value[0];
  let count = 1;
  for (let index = 1; index < value.length; index += 1) {
    if (value[index] === current) {
      count += 1;
    } else {
      result += `${current}${count}`;
      current = value[index];
      count = 1;
    }
  }
  result += `${current}${count}`;
  return result;
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

function makeTaskId(category, difficulty, title, seed) {
  return `c-${category}-${difficulty}-${hashString(`c:${title}:${seed}`)}`;
}

function deriveTaskSeed(data) {
  const testsSeed = Array.isArray(data.tests) ? JSON.stringify(data.tests) : '';
  const metaSeed = [
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
    String(data.meta?.c?.returnType || ''),
    Array.isArray(data.meta?.c?.argTypes) ? data.meta.c.argTypes.join('|') : '',
    Array.isArray(data.meta?.c?.argNames) ? data.meta.c.argNames.join('|') : ''
  ].join('::');
  return `c-task:${hashString(metaSeed)}`;
}

function makeTask(data) {
  const seed = data.seed !== undefined && data.seed !== null ? String(data.seed) : deriveTaskSeed(data);
  return {
    id: data.id || makeTaskId(data.category, data.difficulty, data.title, seed),
    seed,
    source: data.source || 'generated',
    createdAt: data.createdAt || null,
    kernelId: C_KERNEL_META.id,
    kernelTitle: C_KERNEL_META.title,
    kernelFamily: C_KERNEL_META.family,
    editorLanguage: C_KERNEL_META.editorLanguage,
    category: data.category,
    difficulty: data.difficulty,
    title: data.title,
    prompt: data.prompt,
    signature: data.signature || 'int solve(const int* values, int length)',
    starterCode: data.starterCode,
    solution: data.solution,
    hints: Array.isArray(data.hints) ? data.hints : [],
    explanation: data.explanation || '',
    strategy: normalizeStrategy(data.strategy || 'simple'),
    tests: cloneJson(data.tests || []),
    xp: data.xp || xpForDifficulty(data.difficulty),
    tags: Array.isArray(data.tags) ? data.tags : [],
    meta: data.meta || {},
    challengeType: data.challengeType || 'practice'
  };
}

function cTypeName(type, isReturn = false) {
  switch (type) {
    case 'int':
      return 'int';
    case 'bool':
      return 'bool';
    case 'string':
      return isReturn ? 'char*' : 'const char*';
    case 'int[]':
      return 'const int*';
    default:
      return 'int';
  }
}

function cLiteral(value, type) {
  switch (type) {
    case 'int':
      return String(Number(value) | 0);
    case 'bool':
      return value ? 'true' : 'false';
    case 'string':
      return `"${String(value)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t')}"`;
    case 'int[]':
      return `{ ${Array.isArray(value) ? value.map((item) => String(Number(item) | 0)).join(', ') : ''} }`;
    default:
      return '0';
  }
}

function cSignature(returnType, argTypes, argNames) {
  const normalizedArgNames = Array.isArray(argNames) ? argNames : [];
  return `${cTypeName(returnType, true)} solve(${argTypes.map((type, index) => `${cTypeName(type)} ${normalizedArgNames[index] || `arg${index + 1}`}`).join(', ')})`;
}

function normalizeCSignature(rawSignature, returnType, argTypes, argNames) {
  const cleaned = String(rawSignature || '')
    .trim()
    .replace(/^static\s+/i, '')
    .replace(/^inline\s+/i, '')
    .replace(/^extern\s+/i, '')
    .replace(/^const\s+/i, '');
  if (/^[\w\*\s]+solve\s*\(/i.test(cleaned)) {
    return cleaned;
  }
  return cSignature(returnType, argTypes, argNames);
}

function cCode(signature, bodyLines) {
  const lines = Array.isArray(bodyLines) ? bodyLines : String(bodyLines).split(/\r?\n/);
  return [
    '#include <ctype.h>',
    '#include <limits.h>',
    '#include <stdbool.h>',
    '#include <stdio.h>',
    '#include <stdlib.h>',
    '#include <string.h>',
    '',
    `${signature} {`,
    ...lines.map((line) => `  ${line}`),
    '}'
  ].join('\n');
}

function buildTask(options) {
  const {
    category,
    difficulty,
    title,
    prompt,
    returnType = 'int',
    argTypes = ['int[]', 'int'],
    argNames,
    starterBody,
    solutionBody,
    hints = [],
    explanation = '',
    tests = [],
    strategy = 'simple',
    tags = [],
    challengeType = 'practice',
    seed,
    createdAt = null,
    meta = {}
  } = options;

  const normalizedArgTypes = Array.isArray(argTypes) ? argTypes.slice() : ['int[]', 'int'];
  const normalizedArgNames = Array.isArray(argNames) && argNames.length === normalizedArgTypes.length
    ? argNames.slice()
    : normalizedArgTypes.map((type, index) => {
      if (type === 'int[]') {
        return index === 0 ? 'values' : `values${index + 1}`;
      }
      if (type === 'string') {
        return index === 0 ? 'text' : `text${index + 1}`;
      }
      return index === 0 ? 'value' : `value${index + 1}`;
    });
  const signature = normalizeCSignature(options.signature, returnType, normalizedArgTypes, normalizedArgNames);
  const starterLines = Array.isArray(starterBody) ? starterBody : ['return INT_MIN;'];
  const solutionLines = Array.isArray(solutionBody) ? solutionBody : starterLines;

  return makeTask({
    category,
    difficulty,
    title,
    prompt,
    signature,
    starterCode: cCode(signature, starterLines),
    solution: cCode(signature, solutionLines),
    hints,
    explanation,
    tests,
    strategy,
    tags,
    challengeType,
    seed,
    createdAt,
    meta: {
      ...cloneJson(meta),
      c: {
        returnType,
        argTypes: normalizedArgTypes.slice(),
        argNames: normalizedArgNames.slice()
      }
    }
  });
}

function buildArraysEasyTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('easy') }, () => {
    const values = sampleNumbers(rng, rng.int(4, 7), -8, 18, true);
    return { args: [values, values.length], expected: sumArray(values) };
  });

  return buildTask({
    category: 'arrays',
    difficulty: 'easy',
    title: 'Sum of array',
    prompt: 'Return the sum of all numbers in the array.',
    returnType: 'int',
    argTypes: ['int[]', 'int'],
    argNames: ['values', 'length'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'int total = 0;',
      'for (int index = 0; index < length; index += 1) {',
      '  total += values[index];',
      '}',
      'return total;'
    ],
    hints: ['Walk through the array once.', 'Keep a running total.'],
    explanation: 'Add every element and return the total.',
    tests,
    strategy: 'arrays',
    tags: ['arrays', 'sum'],
    seed: `${seed}:arrays-sum`
  });
}

function buildArraysMediumTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('medium') }, () => {
    const values = sampleNumbers(rng, rng.int(5, 8), -10, 20, true);
    return { args: [values, values.length], expected: countEvenNumbers(values) };
  });

  return buildTask({
    category: 'arrays',
    difficulty: 'medium',
    title: 'Count even numbers',
    prompt: 'Return how many elements are even.',
    returnType: 'int',
    argTypes: ['int[]', 'int'],
    argNames: ['values', 'length'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'int count = 0;',
      'for (int index = 0; index < length; index += 1) {',
      '  if (values[index] % 2 == 0) {',
      '    count += 1;',
      '  }',
      '}',
      'return count;'
    ],
    hints: ['Check each value with modulo 2.', 'Count only the even ones.'],
    explanation: 'Use one loop and count numbers divisible by 2.',
    tests,
    strategy: 'arrays',
    tags: ['arrays', 'parity'],
    seed: `${seed}:arrays-even`
  });
}

function buildArraysHardTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('hard') }, () => {
    const length = rng.int(6, 10);
    const values = sampleNumbers(rng, length, -6, 15, true);
    return { args: [values, values.length], expected: longestIncreasingStreak(values) };
  });

  return buildTask({
    category: 'arrays',
    difficulty: 'hard',
    title: 'Longest increasing streak',
    prompt: 'Return the length of the longest strictly increasing consecutive streak.',
    returnType: 'int',
    argTypes: ['int[]', 'int'],
    argNames: ['values', 'length'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'if (length <= 0) {',
      '  return 0;',
      '}',
      'int best = 1;',
      'int streak = 1;',
      'for (int index = 1; index < length; index += 1) {',
      '  if (values[index] > values[index - 1]) {',
      '    streak += 1;',
      '  } else {',
      '    streak = 1;',
      '  }',
      '  if (streak > best) {',
      '    best = streak;',
      '  }',
      '}',
      'return best;'
    ],
    hints: ['Compare with the previous value.', 'Reset the streak when the sequence breaks.'],
    explanation: 'Track the current streak and remember the maximum length.',
    tests,
    strategy: 'arrays',
    tags: ['arrays', 'streak'],
    seed: `${seed}:arrays-streak`
  });
}

function buildArraysExpertTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('expert') }, () => {
    const length = rng.int(6, 10);
    const values = sampleNumbers(rng, length, -12, 18, true);
    const threshold = rng.int(-5, 10);
    return { args: [values, values.length, threshold], expected: countGreaterThan(values, threshold) };
  });

  return buildTask({
    category: 'arrays',
    difficulty: 'expert',
    title: 'Count values above threshold',
    prompt: 'Return how many elements are greater than the threshold.',
    returnType: 'int',
    argTypes: ['int[]', 'int', 'int'],
    argNames: ['values', 'length', 'threshold'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'int count = 0;',
      'for (int index = 0; index < length; index += 1) {',
      '  if (values[index] > threshold) {',
      '    count += 1;',
      '  }',
      '}',
      'return count;'
    ],
    hints: ['Compare every element with the threshold.', 'Count only the values that are larger.'],
    explanation: 'Traverse the array and count numbers greater than the threshold.',
    tests,
    strategy: 'arrays',
    tags: ['arrays', 'threshold'],
    seed: `${seed}:arrays-threshold`
  });
}

function buildStringsEasyTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('easy') }, () => {
    const text = sampleText(rng, rng.int(4, 7));
    return { args: [text], expected: countVowels(text) };
  });

  return buildTask({
    category: 'strings',
    difficulty: 'easy',
    title: 'Count vowels',
    prompt: 'Return the number of vowels in the text.',
    returnType: 'int',
    argTypes: ['string'],
    argNames: ['text'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'int count = 0;',
      'for (const char* cursor = text; *cursor != \'\\0\'; cursor += 1) {',
      '  char ch = (char)tolower((unsigned char)*cursor);',
      '  if (ch == \'a\' || ch == \'e\' || ch == \'i\' || ch == \'o\' || ch == \'u\') {',
      '    count += 1;',
      '  }',
      '}',
      'return count;'
    ],
    hints: ['Lowercase every character.', 'Count only a, e, i, o and u.'],
    explanation: 'Iterate over the text and count each vowel.',
    tests,
    strategy: 'strings',
    tags: ['strings', 'vowels'],
    seed: `${seed}:strings-vowels`
  });
}

function buildStringsMediumTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('medium') }, () => {
    const text = sampleText(rng, rng.int(4, 7));
    return { args: [text], expected: countWords(text) };
  });

  return buildTask({
    category: 'strings',
    difficulty: 'medium',
    title: 'Count words',
    prompt: 'Return the number of words separated by whitespace.',
    returnType: 'int',
    argTypes: ['string'],
    argNames: ['text'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'int count = 0;',
      'bool inWord = false;',
      'for (const char* cursor = text; *cursor != \'\\0\'; cursor += 1) {',
      '  if (isspace((unsigned char)*cursor)) {',
      '    if (inWord) {',
      '      count += 1;',
      '      inWord = false;',
      '    }',
      '  } else {',
      '    inWord = true;',
      '  }',
      '}',
      'if (inWord) {',
      '  count += 1;',
      '}',
      'return count;'
    ],
    hints: ['Track whether you are inside a word.', 'Whitespace ends the current word.'],
    explanation: 'Count transitions from whitespace to text.',
    tests,
    strategy: 'strings',
    tags: ['strings', 'words'],
    seed: `${seed}:strings-words`
  });
}

function buildStringsHardTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('hard') }, () => {
    const text = sampleText(rng, rng.int(3, 7));
    return { args: [text], expected: longestWordLength(text) };
  });

  return buildTask({
    category: 'strings',
    difficulty: 'hard',
    title: 'Longest word length',
    prompt: 'Return the length of the longest word.',
    returnType: 'int',
    argTypes: ['string'],
    argNames: ['text'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'int best = 0;',
      'int current = 0;',
      'for (const char* cursor = text; *cursor != \'\\0\'; cursor += 1) {',
      '  if (isspace((unsigned char)*cursor)) {',
      '    if (current > best) {',
      '      best = current;',
      '    }',
      '    current = 0;',
      '  } else {',
      '    current += 1;',
      '  }',
      '}',
      'if (current > best) {',
      '  best = current;',
      '}',
      'return best;'
    ],
    hints: ['Count the current word length.', 'Remember the best length seen so far.'],
    explanation: 'Scan the text once and keep track of the longest current word.',
    tests,
    strategy: 'strings',
    tags: ['strings', 'length'],
    seed: `${seed}:strings-longest-word`
  });
}

function buildStringsExpertTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('expert') }, () => {
    const text = sampleText(rng, rng.int(4, 7));
    return { args: [text], expected: countDistinctLetters(text) };
  });

  return buildTask({
    category: 'strings',
    difficulty: 'expert',
    title: 'Count distinct letters',
    prompt: 'Return how many unique letters appear in the text, ignoring case.',
    returnType: 'int',
    argTypes: ['string'],
    argNames: ['text'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'bool seen[26] = { false };',
      'int count = 0;',
      'for (const char* cursor = text; *cursor != \'\\0\'; cursor += 1) {',
      '  if (isalpha((unsigned char)*cursor)) {',
      '    int index = tolower((unsigned char)*cursor) - \'a\';',
      '    if (!seen[index]) {',
      '      seen[index] = true;',
      '      count += 1;',
      '    }',
      '  }',
      '}',
      'return count;'
    ],
    hints: ['Ignore spaces and punctuation.', 'Use a 26-slot seen array for letters.'],
    explanation: 'Mark every seen letter once and count the unique ones.',
    tests,
    strategy: 'strings',
    tags: ['strings', 'distinct'],
    seed: `${seed}:strings-distinct`
  });
}

function buildRecursionEasyTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('easy') }, () => {
    const n = rng.int(1, 6);
    return { args: [n], expected: factorial(n) };
  });

  return buildTask({
    category: 'recursion',
    difficulty: 'easy',
    title: 'Factorial',
    prompt: 'Return n! using recursion.',
    returnType: 'int',
    argTypes: ['int'],
    argNames: ['n'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'if (n <= 1) {',
      '  return 1;',
      '}',
      'return n * solve(n - 1);'
    ],
    hints: ['The base case is 1.', 'Multiply n by the factorial of n - 1.'],
    explanation: 'The factorial definition is naturally recursive.',
    tests,
    strategy: 'recursion',
    tags: ['recursion', 'factorial'],
    seed: `${seed}:recursion-factorial`
  });
}

function buildRecursionMediumTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('medium') }, () => {
    const n = rng.int(10, 9999);
    return { args: [n], expected: sumDigits(n) };
  });

  return buildTask({
    category: 'recursion',
    difficulty: 'medium',
    title: 'Digit sum',
    prompt: 'Return the sum of decimal digits using recursion.',
    returnType: 'int',
    argTypes: ['int'],
    argNames: ['n'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'if (n < 10) {',
      '  return n;',
      '}',
      'return (n % 10) + solve(n / 10);'
    ],
    hints: ['Use the last digit.', 'Recurse on the remaining prefix.'],
    explanation: 'Split off one digit and recurse on the rest.',
    tests,
    strategy: 'recursion',
    tags: ['recursion', 'digits'],
    seed: `${seed}:recursion-digit-sum`
  });
}

function buildRecursionHardTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('hard') }, () => {
    const base = rng.int(2, 5);
    const exponent = rng.int(0, 7);
    return { args: [base, exponent], expected: recursivePower(base, exponent) };
  });

  return buildTask({
    category: 'recursion',
    difficulty: 'hard',
    title: 'Fast power',
    prompt: 'Return base raised to exponent using recursion.',
    returnType: 'int',
    argTypes: ['int', 'int'],
    argNames: ['base', 'exponent'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'if (exponent == 0) {',
      '  return 1;',
      '}',
      'if (exponent == 1) {',
      '  return base;',
      '}',
      'int half = solve(base, exponent / 2);',
      'int squared = half * half;',
      'return exponent % 2 == 0 ? squared : squared * base;'
    ],
    hints: ['Use exponentiation by squaring.', 'Split even exponents in half.'],
    explanation: 'Recursively square the half power to keep the depth small.',
    tests,
    strategy: 'recursion',
    tags: ['recursion', 'power'],
    seed: `${seed}:recursion-power`
  });
}

function buildRecursionExpertTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('expert') }, () => {
    const n = rng.int(0, 12);
    return { args: [n], expected: fibonacciValue(n) };
  });

  return buildTask({
    category: 'recursion',
    difficulty: 'expert',
    title: 'Fibonacci',
    prompt: 'Return the nth Fibonacci number using recursion.',
    returnType: 'int',
    argTypes: ['int'],
    argNames: ['n'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'if (n <= 1) {',
      '  return n;',
      '}',
      'return solve(n - 1) + solve(n - 2);'
    ],
    hints: ['The first two values are 0 and 1.', 'Every value is the sum of the previous two.'],
    explanation: 'Use the direct recursive definition on small inputs.',
    tests,
    strategy: 'recursion',
    tags: ['recursion', 'fibonacci'],
    seed: `${seed}:recursion-fibonacci`
  });
}

function buildAlgorithmsEasyTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('easy') }, () => {
    const values = sampleDistinctNumbers(rng, rng.int(6, 9), -10, 22, true).sort((left, right) => left - right);
    const target = rng.bool(0.75)
      ? values[rng.int(0, values.length - 1)]
      : values[values.length - 1] + rng.int(1, 6);
    return { args: [values, values.length, target], expected: binarySearchIndex(values, target) };
  });

  return buildTask({
    category: 'algorithms',
    difficulty: 'easy',
    title: 'Binary search',
    prompt: 'Return the index of target in the sorted array, or -1 if it is missing.',
    returnType: 'int',
    argTypes: ['int[]', 'int', 'int'],
    argNames: ['values', 'length', 'target'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'int left = 0;',
      'int right = length - 1;',
      'while (left <= right) {',
      '  int middle = left + (right - left) / 2;',
      '  if (values[middle] == target) {',
      '    return middle;',
      '  }',
      '  if (values[middle] < target) {',
      '    left = middle + 1;',
      '  } else {',
      '    right = middle - 1;',
      '  }',
      '}',
      'return -1;'
    ],
    hints: ['Keep left and right bounds.', 'Cut the search space in half each step.'],
    explanation: 'Classic binary search on a sorted array.',
    tests,
    strategy: 'algorithm',
    tags: ['algorithms', 'binary-search'],
    seed: `${seed}:algo-binary-search`
  });
}

function buildAlgorithmsMediumTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('medium') }, () => {
    const values = sampleNumbers(rng, rng.int(5, 8), -6, 16, true);
    const firstIndex = rng.int(0, values.length - 2);
    const secondIndex = rng.int(firstIndex + 1, values.length - 1);
    const target = values[firstIndex] + values[secondIndex];
    return { args: [values, values.length, target], expected: countPairsWithSum(values, target) };
  });

  return buildTask({
    category: 'algorithms',
    difficulty: 'medium',
    title: 'Count pairs with sum',
    prompt: 'Return how many pairs add up to the target.',
    returnType: 'int',
    argTypes: ['int[]', 'int', 'int'],
    argNames: ['values', 'length', 'target'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'int count = 0;',
      'for (int left = 0; left < length; left += 1) {',
      '  for (int right = left + 1; right < length; right += 1) {',
      '    if (values[left] + values[right] == target) {',
      '      count += 1;',
      '    }',
      '  }',
      '}',
      'return count;'
    ],
    hints: ['Check every pair of positions.', 'Only count pairs once.'],
    explanation: 'Use a simple nested loop to count all valid pairs.',
    tests,
    strategy: 'algorithm',
    tags: ['algorithms', 'pairs'],
    seed: `${seed}:algo-pairs`
  });
}

function buildAlgorithmsHardTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('hard') }, () => {
    const values = sampleNumbers(rng, rng.int(6, 10), -10, 15, true);
    const start = rng.int(0, values.length - 1);
    const end = rng.int(start, values.length - 1);
    const target = values.slice(start, end + 1).reduce((total, value) => total + value, 0);
    return { args: [values, values.length, target], expected: countSubarraysWithSum(values, target) };
  });

  return buildTask({
    category: 'algorithms',
    difficulty: 'hard',
    title: 'Count subarrays with sum',
    prompt: 'Return how many contiguous subarrays sum to the target.',
    returnType: 'int',
    argTypes: ['int[]', 'int', 'int'],
    argNames: ['values', 'length', 'target'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'int count = 0;',
      'for (int start = 0; start < length; start += 1) {',
      '  int total = 0;',
      '  for (int end = start; end < length; end += 1) {',
      '    total += values[end];',
      '    if (total == target) {',
      '      count += 1;',
      '    }',
      '  }',
      '}',
      'return count;'
    ],
    hints: ['Try every start index.', 'Extend the subarray one element at a time.'],
    explanation: 'Count every contiguous segment whose sum matches the target.',
    tests,
    strategy: 'algorithm',
    tags: ['algorithms', 'subarrays'],
    seed: `${seed}:algo-subarrays`
  });
}

function buildAlgorithmsExpertTask(rng, seed) {
  const tests = Array.from({ length: testCountForDifficulty('expert') }, () => {
    const length = rng.int(6, 10);
    const values = sampleNumbers(rng, length, -8, 12, true);
    return { args: [values, values.length], expected: maxSubarraySum(values) };
  });

  return buildTask({
    category: 'algorithms',
    difficulty: 'expert',
    title: 'Maximum subarray sum',
    prompt: 'Return the maximum sum over all contiguous subarrays.',
    returnType: 'int',
    argTypes: ['int[]', 'int'],
    argNames: ['values', 'length'],
    starterBody: ['return INT_MIN;'],
    solutionBody: [
      'int best = values[0];',
      'int current = values[0];',
      'for (int index = 1; index < length; index += 1) {',
      '  current = values[index] > current + values[index] ? values[index] : current + values[index];',
      '  if (current > best) {',
      '    best = current;',
      '  }',
      '}',
      'return best;'
    ],
    hints: ['Keep the best sum ending at the current position.', 'Either extend or restart each step.'],
    explanation: 'Kadane style maximum subarray tracking.',
    tests,
    strategy: 'algorithm',
    tags: ['algorithms', 'kadane'],
    seed: `${seed}:algo-max-subarray`
  });
}

function buildArraysTaskExpanded(difficulty, rng, seed) {
  switch (difficulty) {
    case 'easy': {
      const values = sampleNumbers(rng, rng.int(5, 8), -12, 24, true);
      const tests = Array.from({ length: testCountForDifficulty('easy') }, () => {
        const sample = sampleNumbers(rng, rng.int(5, 8), -12, 24, true);
        return { args: [sample, sample.length], expected: sample.filter((value) => value > 0).length };
      });
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Count positive numbers',
        prompt: `Return how many numbers in ${preview(values)} are greater than zero.`,
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'length'],
        starterBody: ['return INT_MIN;'],
        solutionBody: [
          'int count = 0;',
          'for (int index = 0; index < length; index += 1) {',
          '  if (values[index] > 0) {',
          '    count += 1;',
          '  }',
          '}',
          'return count;'
        ],
        hints: ['Check whether each value is positive.', 'Increment the counter only for values above zero.'],
        explanation: 'A warm-up array task that focuses on conditional counting.',
        tests,
        strategy: 'arrays',
        tags: ['arrays', 'positive'],
        seed: `${seed}:arrays-positive`
      });
    }
    case 'medium': {
      const values = sampleNumbers(rng, rng.int(5, 8), -10, 20, true);
      const tests = Array.from({ length: testCountForDifficulty('medium') }, () => {
        const sample = sampleNumbers(rng, rng.int(5, 8), -10, 20, true);
        return { args: [sample, sample.length], expected: Math.min(...sample) };
      });
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Minimum value',
        prompt: `Return the smallest number in ${preview(values)}.`,
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'length'],
        starterBody: ['return INT_MIN;'],
        solutionBody: [
          'int best = values[0];',
          'for (int index = 1; index < length; index += 1) {',
          '  if (values[index] < best) {',
          '    best = values[index];',
          '  }',
          '}',
          'return best;'
        ],
        hints: ['Start with the first element as the current best.', 'Replace it when you see a smaller value.'],
        explanation: 'This branch trains scanning an array for an extreme value.',
        tests,
        strategy: 'arrays',
        tags: ['arrays', 'min'],
        seed: `${seed}:arrays-min`
      });
    }
    case 'hard': {
      const values = sampleNumbers(rng, rng.int(6, 9), -10, 18, true);
      const tests = Array.from({ length: testCountForDifficulty('hard') }, () => {
        const sample = sampleNumbers(rng, rng.int(6, 9), -10, 18, true);
        const seen = new Set(sample);
        return { args: [sample, sample.length], expected: seen.size };
      });
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Count distinct values',
        prompt: `Return how many different numbers appear in ${preview(values)}.`,
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'length'],
        starterBody: ['return INT_MIN;'],
        solutionBody: [
          'bool seen[64] = { false };',
          'int count = 0;',
          'for (int index = 0; index < length; index += 1) {',
          '  int slot = values[index] + 32;',
          '  if (slot < 0) {',
          '    slot = 0;',
          '  }',
          '  if (slot > 63) {',
          '    slot = 63;',
          '  }',
          '  if (!seen[slot]) {',
          '    seen[slot] = true;',
          '    count += 1;',
          '  }',
          '}',
          'return count;'
        ],
        hints: ['Remember which values you have already seen.', 'You can map small integers into a fixed boolean array.'],
        explanation: 'Counting unique items is a useful intermediate array pattern.',
        tests,
        strategy: 'arrays',
        tags: ['arrays', 'unique'],
        seed: `${seed}:arrays-unique`
      });
    }
    case 'expert':
    default: {
      const values = sampleNumbers(rng, rng.int(6, 10), -6, 15, true);
      const tests = Array.from({ length: testCountForDifficulty('expert') }, () => {
        const sample = sampleNumbers(rng, rng.int(6, 10), -6, 15, true);
        return { args: [sample, sample.length], expected: longestIncreasingStreak(sample) };
      });
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Longest increasing streak',
        prompt: `Return the length of the longest strictly increasing consecutive streak in ${preview(values)}.`,
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'length'],
        starterBody: ['return INT_MIN;'],
        solutionBody: [
          'if (length <= 0) {',
          '  return 0;',
          '}',
          'int best = 1;',
          'int streak = 1;',
          'for (int index = 1; index < length; index += 1) {',
          '  if (values[index] > values[index - 1]) {',
          '    streak += 1;',
          '  } else {',
          '    streak = 1;',
          '  }',
          '  if (streak > best) {',
          '    best = streak;',
          '  }',
          '}',
          'return best;'
        ],
        hints: ['Compare with the previous value.', 'Reset the streak when the sequence breaks.'],
        explanation: 'This version pushes you to track a running series instead of a plain total.',
        tests,
        strategy: 'arrays',
        tags: ['arrays', 'streak'],
        seed: `${seed}:arrays-streak-alt`
      });
    }
  }
}

function buildStringsTaskExpanded(difficulty, rng, seed) {
  switch (difficulty) {
    case 'easy': {
      const text = sampleText(rng, rng.int(4, 7));
      const tests = Array.from({ length: testCountForDifficulty('easy') }, () => {
        const sample = sampleText(rng, rng.int(4, 7));
        return { args: [sample], expected: countWords(sample) };
      });
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Count words',
        prompt: `Return the number of words in ${preview(text)}.`,
        returnType: 'int',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['return INT_MIN;'],
        solutionBody: [
          'int count = 0;',
          'bool inWord = false;',
          'for (const char* cursor = text; *cursor != \'\\0\'; cursor += 1) {',
          '  if (isspace((unsigned char)*cursor)) {',
          '    if (inWord) {',
          '      count += 1;',
          '      inWord = false;',
          '    }',
          '  } else {',
          '    inWord = true;',
          '  }',
          '}',
          'if (inWord) {',
          '  count += 1;',
          '}',
          'return count;'
        ],
        hints: ['Track whether you are inside a word.', 'Whitespace ends the current word.'],
        explanation: 'This branch focuses on text tokenization instead of vowel counting.',
        tests,
        strategy: 'strings',
        tags: ['strings', 'words'],
        seed: `${seed}:strings-words`
      });
    }
    case 'medium': {
      const text = sampleText(rng, rng.int(4, 7));
      const tests = Array.from({ length: testCountForDifficulty('medium') }, () => {
        const sample = sampleText(rng, rng.int(4, 7));
        return { args: [sample], expected: countDistinctLetters(sample) };
      });
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Count distinct letters',
        prompt: `Return how many different letters appear in ${preview(text)}, ignoring case.`,
        returnType: 'int',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['return INT_MIN;'],
        solutionBody: [
          'bool seen[26] = { false };',
          'int count = 0;',
          'for (const char* cursor = text; *cursor != \'\\0\'; cursor += 1) {',
          '  if (isalpha((unsigned char)*cursor)) {',
          '    int index = tolower((unsigned char)*cursor) - \'a\';',
          '    if (!seen[index]) {',
          '      seen[index] = true;',
          '      count += 1;',
          '    }',
          '  }',
          '}',
          'return count;'
        ],
        hints: ['Ignore spaces and punctuation.', 'Use a boolean table for the alphabet.'],
        explanation: 'This task trains distinct-letter tracking and case normalization.',
        tests,
        strategy: 'strings',
        tags: ['strings', 'distinct'],
        seed: `${seed}:strings-distinct`
      });
    }
    case 'hard': {
      const text = sampleText(rng, rng.int(4, 7));
      const tests = Array.from({ length: testCountForDifficulty('hard') }, () => {
        const sample = sampleText(rng, rng.int(4, 7));
        return { args: [sample], expected: normalizedPalindrome(sample) };
      });
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Palindrome check',
        prompt: `Return whether ${preview(text)} is a palindrome after normalizing spaces and case.`,
        returnType: 'bool',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['return false;'],
        solutionBody: [
          'char buffer[256];',
          'int length = 0;',
          'for (const char* cursor = text; *cursor != \'\\0\'; cursor += 1) {',
          '  if (isalnum((unsigned char)*cursor)) {',
          '    buffer[length++] = (char)tolower((unsigned char)*cursor);',
          '  }',
          '}',
          'for (int index = 0; index < length / 2; index += 1) {',
          '  if (buffer[index] != buffer[length - 1 - index]) {',
          '    return false;',
          '  }',
          '}',
          'return true;'
        ],
        hints: ['Normalize the text before comparing.', 'Check the first half against the mirrored second half.'],
        explanation: 'A boolean task that checks whether text reads the same in both directions.',
        tests,
        strategy: 'strings',
        tags: ['strings', 'palindrome'],
        seed: `${seed}:strings-palindrome`
      });
    }
    case 'expert':
    default: {
      const text = sampleText(rng, rng.int(4, 7));
      const encoded = runLengthEncode(text);
      const tests = Array.from({ length: testCountForDifficulty('expert') }, () => {
        const sample = sampleText(rng, rng.int(4, 7));
        return { args: [sample], expected: runLengthEncode(sample).length };
      });
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Run-length encoded length',
        prompt: `Return the length of the run-length encoded form of ${preview(text)}.`,
        returnType: 'int',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['return INT_MIN;'],
        solutionBody: [
          'if (text[0] == \'\\0\') {',
          '  return 0;',
          '}',
          'int length = 0;',
          'char current = text[0];',
          'int count = 1;',
          'for (int index = 1; text[index] != \'\\0\'; index += 1) {',
          '  if (text[index] == current) {',
          '    count += 1;',
          '  } else {',
          '    length += 1 + (count >= 10 ? 2 : 1);',
          '    current = text[index];',
          '    count = 1;',
          '  }',
          '}',
          'length += 1 + (count >= 10 ? 2 : 1);',
          'return length;'
        ],
        hints: ['Count each run of repeated characters.', 'The encoded length grows with both the character and its count.'],
        explanation: 'This branch measures how much the string compresses under run-length encoding.',
        tests,
        strategy: 'strings',
        tags: ['strings', 'compression'],
        seed: `${seed}:strings-rle-length`
      });
    }
  }
}

function buildRecursionTaskExpanded(difficulty, rng, seed) {
  switch (difficulty) {
    case 'easy': {
      const n = rng.int(1, 8);
      const tests = Array.from({ length: testCountForDifficulty('easy') }, () => {
        const value = rng.int(1, 8);
        return { args: [value], expected: (value * (value + 1)) / 2 };
      });
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Triangular number',
        prompt: `Return 1 + 2 + ... + ${n} using recursion.`,
        returnType: 'int',
        argTypes: ['int'],
        argNames: ['n'],
        starterBody: ['return INT_MIN;'],
        solutionBody: [
          'if (n <= 0) {',
          '  return 0;',
          '}',
          'return n + solve(n - 1);'
        ],
        hints: ['Use the sum of the previous prefix.', 'The base case is 0.'],
        explanation: 'A recursion warm-up that turns a sum into a self-similar sequence.',
        tests,
        strategy: 'recursion',
        tags: ['recursion', 'sum'],
        seed: `${seed}:rec-triangular`
      });
    }
    case 'medium': {
      const n = rng.int(10, 9999);
      const tests = Array.from({ length: testCountForDifficulty('medium') }, () => {
        const value = rng.int(10, 9999);
        return { args: [value], expected: String(Math.abs(value)).length };
      });
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Digit count',
        prompt: `Return how many decimal digits are in ${n}, using recursion.`,
        returnType: 'int',
        argTypes: ['int'],
        argNames: ['n'],
        starterBody: ['return INT_MIN;'],
        solutionBody: [
          'if (n < 10) {',
          '  return 1;',
          '}',
          'return 1 + solve(n / 10);'
        ],
        hints: ['Drop the last digit each step.', 'Stop when the number becomes a single digit.'],
        explanation: 'This version trains you to shrink the input recursively until the base case.',
        tests,
        strategy: 'recursion',
        tags: ['recursion', 'digits'],
        seed: `${seed}:rec-digits`
      });
    }
    case 'hard': {
      const values = sampleNumbers(rng, rng.int(5, 8), -12, 18, true);
      const tests = Array.from({ length: testCountForDifficulty('hard') }, () => {
        const sample = sampleNumbers(rng, rng.int(5, 8), -12, 18, true);
        return { args: [sample, sample.length], expected: Math.max(...sample) };
      });
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Recursive maximum',
        prompt: `Return the largest number in ${preview(values)} using recursion.`,
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'length'],
        starterBody: ['return INT_MIN;'],
        solutionBody: [
          'if (length <= 1) {',
          '  return values[0];',
          '}',
          'int tail = solve(values + 1, length - 1);',
          'return values[0] > tail ? values[0] : tail;'
        ],
        hints: ['Compare the first value with the result of the tail.', 'Each recursive call should reduce the array length.'],
        explanation: 'This branch makes recursion work over arrays instead of numbers.',
        tests,
        strategy: 'recursion',
        tags: ['recursion', 'max'],
        seed: `${seed}:rec-max`
      });
    }
    case 'expert':
    default: {
      const values = sampleNumbers(rng, rng.int(5, 8), -10, 18, true);
      const tests = Array.from({ length: testCountForDifficulty('expert') }, () => {
        const sample = sampleNumbers(rng, rng.int(5, 8), -10, 18, true);
        return { args: [sample, sample.length], expected: sumArray(sample) };
      });
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Recursive sum',
        prompt: `Return the sum of ${preview(values)} using recursion over the array.`,
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'length'],
        starterBody: ['return INT_MIN;'],
        solutionBody: [
          'if (length <= 0) {',
          '  return 0;',
          '}',
          'return values[0] + solve(values + 1, length - 1);'
        ],
        hints: ['Treat the first element separately.', 'Call the function again on the remaining tail.'],
        explanation: 'The expert version uses recursion to reduce the array one element at a time.',
        tests,
        strategy: 'recursion',
        tags: ['recursion', 'sum'],
        seed: `${seed}:rec-sum`
      });
    }
  }
}

function buildAlgorithmsTaskExpanded(difficulty, rng, seed) {
  switch (difficulty) {
    case 'easy': {
      const values = sampleNumbers(rng, rng.int(5, 8), 1, 40, false);
      const isPrime = (value) => {
        if (value < 2) {
          return false;
        }
        for (let divider = 2; divider * divider <= value; divider += 1) {
          if (value % divider === 0) {
            return false;
          }
        }
        return true;
      };
      const tests = Array.from({ length: testCountForDifficulty('easy') }, () => {
        const sample = sampleNumbers(rng, rng.int(5, 8), 1, 40, false);
        return { args: [sample, sample.length], expected: sample.filter((value) => isPrime(value)).length };
      });
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Count primes',
        prompt: `Return how many prime numbers appear in ${preview(values)}.`,
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'length'],
        starterBody: ['return INT_MIN;'],
        solutionBody: [
          'int count = 0;',
          'for (int index = 0; index < length; index += 1) {',
          '  int value = values[index];',
          '  if (value < 2) {',
          '    continue;',
          '  }',
          '  bool prime = true;',
          '  for (int divider = 2; divider * divider <= value; divider += 1) {',
          '    if (value % divider == 0) {',
          '      prime = false;',
          '      break;',
          '    }',
          '  }',
          '  if (prime) {',
          '    count += 1;',
          '  }',
          '}',
          'return count;'
        ],
        hints: ['Only primes greater than 1 count.', 'Try dividing by all numbers up to the square root.'],
        explanation: 'A fresh warm-up task on primality testing.',
        tests,
        strategy: 'algorithm',
        tags: ['algorithms', 'prime'],
        seed: `${seed}:algo-primes`
      });
    }
    case 'medium': {
      const values = sampleNumbers(rng, rng.int(5, 8), -6, 16, true);
      const leftIndex = rng.int(0, values.length - 2);
      const rightIndex = rng.int(leftIndex + 1, values.length - 1);
      const target = values[leftIndex] + values[rightIndex];
      const hasPair = (source, wanted) => {
        const seen = new Set();
        for (const value of source) {
          if (seen.has(wanted - value)) {
            return true;
          }
          seen.add(value);
        }
        return false;
      };
      const tests = Array.from({ length: testCountForDifficulty('medium') }, () => {
        const sample = sampleNumbers(rng, rng.int(5, 8), -6, 16, true);
        const a = rng.int(0, sample.length - 2);
        const b = rng.int(a + 1, sample.length - 1);
        return { args: [sample, sample.length, sample[a] + sample[b]], expected: hasPair(sample, sample[a] + sample[b]) };
      });
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Two-sum exists',
        prompt: `Return whether there is a pair in ${preview(values)} whose sum is ${target}.`,
        returnType: 'bool',
        argTypes: ['int[]', 'int', 'int'],
        argNames: ['values', 'length', 'target'],
        starterBody: ['return false;'],
        solutionBody: [
          'for (int left = 0; left < length; left += 1) {',
          '  for (int right = left + 1; right < length; right += 1) {',
          '    if (values[left] + values[right] == target) {',
          '      return true;',
          '    }',
          '  }',
          '}',
          'return false;'
        ],
        hints: ['Scan every pair or use a lookup table.', 'Stop as soon as you find one valid pair.'],
        explanation: 'This branch switches the output from counting to a simple yes/no decision.',
        tests,
        strategy: 'algorithm',
        tags: ['algorithms', 'two-sum'],
        seed: `${seed}:algo-two-sum`
      });
    }
    case 'hard': {
      const values = sampleNumbers(rng, rng.int(6, 10), -10, 15, true);
      const tests = Array.from({ length: testCountForDifficulty('hard') }, () => {
        const sample = sampleNumbers(rng, rng.int(6, 10), -10, 15, true);
        return { args: [sample, sample.length], expected: longestIncreasingStreak(sample) };
      });
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Longest increasing streak',
        prompt: `Return the length of the longest strictly increasing consecutive streak in ${preview(values)}.`,
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'length'],
        starterBody: ['return INT_MIN;'],
        solutionBody: [
          'if (length <= 0) {',
          '  return 0;',
          '}',
          'int best = 1;',
          'int streak = 1;',
          'for (int index = 1; index < length; index += 1) {',
          '  if (values[index] > values[index - 1]) {',
          '    streak += 1;',
          '  } else {',
          '    streak = 1;',
          '  }',
          '  if (streak > best) {',
          '    best = streak;',
          '  }',
          '}',
          'return best;'
        ],
        hints: ['Compare each element with the previous one.', 'Reset the streak when the order breaks.'],
        explanation: 'The goal is to track runs, not totals.',
        tests,
        strategy: 'algorithm',
        tags: ['algorithms', 'streak'],
        seed: `${seed}:algo-streak`
      });
    }
    case 'expert':
    default: {
      const values = sampleNumbers(rng, rng.int(6, 10), -10, 15, true);
      const start = rng.int(0, values.length - 1);
      const end = rng.int(start, values.length - 1);
      const target = values.slice(start, end + 1).reduce((total, value) => total + value, 0);
      const tests = Array.from({ length: testCountForDifficulty('expert') }, () => {
        const sample = sampleNumbers(rng, rng.int(6, 10), -10, 15, true);
        const sampleStart = rng.int(0, sample.length - 1);
        const sampleEnd = rng.int(sampleStart, sample.length - 1);
        const sampleTarget = sample.slice(sampleStart, sampleEnd + 1).reduce((total, value) => total + value, 0);
        return { args: [sample, sample.length, sampleTarget], expected: countSubarraysWithSum(sample, sampleTarget) };
      });
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Count subarrays with sum',
        prompt: `Return how many contiguous subarrays in ${preview(values)} sum to ${target}.`,
        returnType: 'int',
        argTypes: ['int[]', 'int', 'int'],
        argNames: ['values', 'length', 'target'],
        starterBody: ['return INT_MIN;'],
        solutionBody: [
          'int count = 0;',
          'for (int start = 0; start < length; start += 1) {',
          '  int total = 0;',
          '  for (int end = start; end < length; end += 1) {',
          '    total += values[end];',
          '    if (total == target) {',
          '      count += 1;',
          '    }',
          '  }',
          '}',
          'return count;'
        ],
        hints: ['Extend every possible starting point.', 'Add one value at a time and compare with the target.'],
        explanation: 'This expert branch brings back prefix-sum style counting in a fresh form.',
        tests,
        strategy: 'algorithm',
        tags: ['algorithms', 'subarrays'],
        seed: `${seed}:algo-subarrays-alt`
      });
    }
  }
}

function chooseCategory(rng, options = {}) {
  if (options.focusCategory) {
    return normalizeCategory(options.focusCategory);
  }
  if (options.category) {
    return normalizeCategory(options.category);
  }
  const categories = normalizeSelection(options.categories, Object.keys(CATEGORY_META));
  return categories[rng.int(0, categories.length - 1)];
}

function chooseDifficulty(rng, options = {}) {
  if (options.focusDifficulty) {
    return normalizeDifficulty(options.focusDifficulty);
  }
  if (options.difficulty) {
    return normalizeDifficulty(options.difficulty);
  }
  const difficulties = normalizeSelection(options.difficulties, DIFFICULTIES);
  return difficulties[rng.int(0, difficulties.length - 1)];
}

function buildGeneratedTask(category, difficulty, rng, seed) {
  switch (category) {
    case 'arrays':
      return rng.bool(0.5) ? buildArraysTaskExpanded(difficulty, rng, seed) : (
        difficulty === 'easy'
          ? buildArraysEasyTask(rng, seed)
          : difficulty === 'medium'
            ? buildArraysMediumTask(rng, seed)
            : difficulty === 'hard'
              ? buildArraysHardTask(rng, seed)
              : buildArraysExpertTask(rng, seed)
      );
    case 'strings':
      return rng.bool(0.5) ? buildStringsTaskExpanded(difficulty, rng, seed) : (
        difficulty === 'easy'
          ? buildStringsEasyTask(rng, seed)
          : difficulty === 'medium'
            ? buildStringsMediumTask(rng, seed)
            : difficulty === 'hard'
              ? buildStringsHardTask(rng, seed)
              : buildStringsExpertTask(rng, seed)
      );
    case 'recursion':
      return rng.bool(0.5) ? buildRecursionTaskExpanded(difficulty, rng, seed) : (
        difficulty === 'easy'
          ? buildRecursionEasyTask(rng, seed)
          : difficulty === 'medium'
            ? buildRecursionMediumTask(rng, seed)
            : difficulty === 'hard'
              ? buildRecursionHardTask(rng, seed)
              : buildRecursionExpertTask(rng, seed)
      );
    case 'algorithms':
    default:
      return rng.bool(0.5) ? buildAlgorithmsTaskExpanded(difficulty, rng, seed) : (
        difficulty === 'easy'
          ? buildAlgorithmsEasyTask(rng, seed)
          : difficulty === 'medium'
            ? buildAlgorithmsMediumTask(rng, seed)
            : difficulty === 'hard'
              ? buildAlgorithmsHardTask(rng, seed)
              : buildAlgorithmsExpertTask(rng, seed)
      );
  }
}

function withPracticeTopic(task, topicId, topicTitle) {
  task.meta = {
    ...task.meta,
    practiceTopicId: topicId,
    practiceTopicTitle: topicTitle
  };
  task.tags = Array.from(new Set([...(Array.isArray(task.tags) ? task.tags : []), 'theory-practice', `topic:${topicId}`]));
  return task;
}

function buildCTopicTask(topicId, topicTitle, difficulty, rng, seed) {
  const title = topicTitle || topicId;
  const common = {
    difficulty: normalizeDifficulty(difficulty),
    seed: `${seed}:topic:${topicId}`,
    meta: {
      practiceTopicId: topicId,
      practiceTopicTitle: title
    },
    tags: ['theory-practice', `topic:${topicId}`]
  };

  switch (topicId) {
    case 'variables':
      return buildTask({
        ...common,
        category: 'arrays',
        title: 'Typed integer average',
        prompt: `Тема "${title}": используй int-переменные для суммы и длины, верни целочисленное среднее массива.`,
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'length'],
        starterBody: ['return INT_MIN;'],
        solutionBody: ['if (length == 0) {', '  return 0;', '}', 'int total = 0;', 'for (int index = 0; index < length; index += 1) {', '  total += values[index];', '}', 'return total / length;'],
        tests: [
          { args: [[2, 4, 6], 3], expected: 4 },
          { args: [[5, 6], 2], expected: 5 },
          { args: [[], 0], expected: 0 }
        ],
        strategy: 'arrays'
      });
    case 'pointers':
      return buildTask({
        ...common,
        category: 'arrays',
        title: 'Pointer walk sum',
        prompt: `Тема "${title}": пройди массив через указательную арифметику и верни сумму элементов.`,
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'length'],
        starterBody: ['return INT_MIN;'],
        solutionBody: ['int total = 0;', 'const int *cursor = values;', 'for (int index = 0; index < length; index += 1) {', '  total += *(cursor + index);', '}', 'return total;'],
        tests: [
          { args: [[1, 2, 3], 3], expected: 6 },
          { args: [[5, -2], 2], expected: 3 },
          { args: [[], 0], expected: 0 }
        ],
        strategy: 'arrays'
      });
    case 'arrays-strings':
      return buildTask({
        ...common,
        category: 'strings',
        title: 'String length before terminator',
        prompt: `Тема "${title}": посчитай символы C-строки до нулевого терминатора.`,
        returnType: 'int',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['return INT_MIN;'],
        solutionBody: ['int length = 0;', 'while (text[length] != \'\\0\') {', '  length += 1;', '}', 'return length;'],
        tests: [
          { args: ['hello'], expected: 5 },
          { args: [''], expected: 0 },
          { args: ['C strings'], expected: 9 }
        ],
        strategy: 'strings'
      });
    case 'functions':
      return buildTask({
        ...common,
        category: 'algorithms',
        title: 'Function-style clamp',
        prompt: `Тема "${title}": реализуй тело solve как чистую функцию clamp: верни value в границах min/max.`,
        returnType: 'int',
        argTypes: ['int', 'int', 'int'],
        argNames: ['value', 'minValue', 'maxValue'],
        starterBody: ['return INT_MIN;'],
        solutionBody: ['if (value < minValue) {', '  return minValue;', '}', 'if (value > maxValue) {', '  return maxValue;', '}', 'return value;'],
        tests: [
          { args: [5, 1, 10], expected: 5 },
          { args: [-2, 0, 10], expected: 0 },
          { args: [99, 0, 10], expected: 10 }
        ],
        strategy: 'simple'
      });
    case 'structs':
      return buildTask({
        ...common,
        category: 'algorithms',
        title: 'Struct point manhattan',
        prompt: `Тема "${title}": создай локальную struct Point и верни manhattan distance от (0,0).`,
        returnType: 'int',
        argTypes: ['int', 'int'],
        argNames: ['x', 'y'],
        starterBody: ['return INT_MIN;'],
        solutionBody: ['typedef struct { int x; int y; } Point;', 'Point point = { x, y };', 'int ax = point.x < 0 ? -point.x : point.x;', 'int ay = point.y < 0 ? -point.y : point.y;', 'return ax + ay;'],
        tests: [
          { args: [3, 4], expected: 7 },
          { args: [-2, 5], expected: 7 },
          { args: [0, 0], expected: 0 }
        ],
        strategy: 'simple'
      });
    case 'dynamic-memory':
      return buildTask({
        ...common,
        category: 'arrays',
        title: 'Heap copy positives',
        prompt: `Тема "${title}": выдели временный буфер через malloc, скопируй положительные числа, освободи память и верни их количество.`,
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'length'],
        starterBody: ['return INT_MIN;'],
        solutionBody: ['int *buffer = (int*)malloc((length > 0 ? length : 1) * sizeof(int));', 'if (buffer == NULL) {', '  return -1;', '}', 'int count = 0;', 'for (int index = 0; index < length; index += 1) {', '  if (values[index] > 0) {', '    buffer[count++] = values[index];', '  }', '}', 'free(buffer);', 'return count;'],
        tests: [
          { args: [[1, -2, 3], 3], expected: 2 },
          { args: [[0, -1], 2], expected: 0 },
          { args: [[4, 5], 2], expected: 2 }
        ],
        strategy: 'arrays'
      });
    case 'headers-preprocessor':
      return buildTask({
        ...common,
        category: 'algorithms',
        title: 'Macro square',
        prompt: `Тема "${title}": используй безопасный макрос SQUARE(x) со скобками и верни квадрат числа.`,
        returnType: 'int',
        argTypes: ['int'],
        argNames: ['value'],
        starterBody: ['return INT_MIN;'],
        solutionBody: ['#define SQUARE(x) ((x) * (x))', 'return SQUARE(value);'],
        tests: [
          { args: [3], expected: 9 },
          { args: [-4], expected: 16 },
          { args: [0], expected: 0 }
        ],
        strategy: 'simple'
      });
    case 'file-io':
      return buildTask({
        ...common,
        category: 'strings',
        title: 'Count file lines',
        prompt: `Тема "${title}": обработай строку как буфер, прочитанный fgets, и верни количество строк по символам '\\n'.`,
        returnType: 'int',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['return INT_MIN;'],
        solutionBody: ['if (text[0] == \'\\0\') {', '  return 0;', '}', 'int lines = 1;', 'for (int index = 0; text[index] != \'\\0\'; index += 1) {', '  if (text[index] == \'\\n\') {', '    lines += 1;', '  }', '}', 'return lines;'],
        tests: [
          { args: ['one'], expected: 1 },
          { args: ['one\ntwo'], expected: 2 },
          { args: [''], expected: 0 }
        ],
        strategy: 'strings'
      });
    case 'enums-unions-flags':
      return buildTask({
        ...common,
        category: 'algorithms',
        title: 'Permission flags',
        prompt: `Тема "${title}": проверь битовые флаги доступа: read=1, write=2, exec=4. Верни true, если есть все required bits.`,
        returnType: 'bool',
        argTypes: ['int', 'int'],
        argNames: ['flags', 'required'],
        starterBody: ['return false;'],
        solutionBody: ['return (flags & required) == required;'],
        tests: [
          { args: [3, 1], expected: true },
          { args: [3, 4], expected: false },
          { args: [7, 6], expected: true }
        ],
        strategy: 'algorithm'
      });
    case 'compilation-ub':
      return buildTask({
        ...common,
        category: 'arrays',
        title: 'Bounds-safe read',
        prompt: `Тема "${title}": избегай undefined behavior: верни values[index] только если индекс в границах, иначе -1.`,
        returnType: 'int',
        argTypes: ['int[]', 'int', 'int'],
        argNames: ['values', 'length', 'index'],
        starterBody: ['return INT_MIN;'],
        solutionBody: ['if (index < 0 || index >= length) {', '  return -1;', '}', 'return values[index];'],
        tests: [
          { args: [[5, 6, 7], 3, 1], expected: 6 },
          { args: [[5], 1, -1], expected: -1 },
          { args: [[5], 1, 2], expected: -1 }
        ],
        strategy: 'arrays'
      });
    default:
      return null;
  }
}

function generateTask(options = {}) {
  const seed = resolveSeed(options);
  const rng = createRng(seed);
  const category = chooseCategory(rng, options);
  const difficulty = chooseDifficulty(rng, options);
  const topicId = typeof options.practiceTopicId === 'string' ? options.practiceTopicId.trim() : '';
  const topicTitle = typeof options.practiceTopicTitle === 'string' ? options.practiceTopicTitle.trim() : '';
  const task = topicId
    ? buildCTopicTask(topicId, topicTitle, difficulty, rng, seed) || buildGeneratedTask(category, difficulty, rng, seed)
    : buildGeneratedTask(category, difficulty, rng, seed);
  task.seed = seed;
  if (topicId && task.meta?.practiceTopicId === topicId) {
    withPracticeTopic(task, topicId, topicTitle || task.meta.practiceTopicTitle || topicId);
  }
  return task;
}

function findCompilerPath() {
  const candidates = [];
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const packagesDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
    if (fs.existsSync(packagesDir)) {
      for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || !/^BrechtSanders\.WinLibs\./i.test(entry.name)) {
          continue;
        }
        const packageRoot = path.join(packagesDir, entry.name);
        candidates.push(
          path.join(packageRoot, 'mingw64', 'bin', 'gcc.exe'),
          path.join(packageRoot, 'mingw64', 'bin', 'clang.exe'),
          path.join(packageRoot, 'bin', 'gcc.exe'),
          path.join(packageRoot, 'bin', 'clang.exe')
        );
      }
    }
  }
  candidates.push('gcc', 'clang', 'cc');
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8', windowsHide: true });
    if (probe.status === 0) {
      return {
        compilerPath: candidate,
        binDir: path.isAbsolute(candidate) ? path.dirname(candidate) : '',
        kind: path.basename(candidate).toLowerCase().includes('clang') ? 'clang' : 'gcc'
      };
    }
  }
  return null;
}

function cRuntimeAvailable() {
  if (cachedCRuntime) {
    return cachedCRuntime.available;
  }

  const runtime = findCompilerPath();
  if (runtime) {
    cachedCRuntime = {
      available: true,
      ...runtime
    };
    return true;
  }

  cachedCRuntime = {
    available: false,
    compilerPath: 'gcc',
    binDir: process.env.PATH || '',
    kind: 'gcc'
  };
  return false;
}

function getCRuntime() {
  if (!cachedCRuntime) {
    cRuntimeAvailable();
  }
  return cachedCRuntime;
}

function buildCRunnerSource(task, returnType, argTypes) {
  const tests = Array.isArray(task.tests) ? task.tests : [];
  const testBlocks = tests.map((test, index) => {
    const args = Array.isArray(test.args) ? test.args : [];
    const declarations = [];
    const callArgs = [];
    for (let argIndex = 0; argIndex < argTypes.length; argIndex += 1) {
      const type = argTypes[argIndex];
      const value = args[argIndex];
      const varName = `arg${index}_${argIndex}`;
      switch (type) {
        case 'int[]':
          declarations.push(`        int ${varName}[] = ${cLiteral(value, 'int[]')};`);
          callArgs.push(varName);
          break;
        case 'string':
          declarations.push(`        const char* ${varName} = ${cLiteral(value, 'string')};`);
          callArgs.push(varName);
          break;
        case 'bool':
          declarations.push(`        bool ${varName} = ${cLiteral(value, 'bool')};`);
          callArgs.push(varName);
          break;
        case 'int':
        default:
          declarations.push(`        int ${varName} = ${cLiteral(value, 'int')};`);
          callArgs.push(varName);
          break;
      }
    }

    const expectedDecl = returnType === 'bool'
      ? `        bool expected${index} = ${cLiteral(test.expected, 'bool')};`
      : `        int expected${index} = ${cLiteral(test.expected, 'int')};`;
    const actualDecl = returnType === 'bool'
      ? `        bool actual${index} = solve(${callArgs.join(', ')});`
      : `        int actual${index} = solve(${callArgs.join(', ')});`;

    return [
      '      {',
      ...declarations,
      expectedDecl,
      actualDecl,
      `        bool passed${index} = actual${index} == expected${index};`,
      `        if (!passed${index} && firstError == NULL) {`,
      `          firstError = "Test failed";`,
      '        }',
      `        if (tests.length > 0) { sbAppendChar(&tests, ','); }`,
      `        sbAppend(&tests, "{\\"passed\\":");`,
      `        sbAppend(&tests, passed${index} ? "true" : "false");`,
      `        sbAppend(&tests, ",\\"expected\\":");`,
      returnType === 'bool'
        ? `        sbAppend(&tests, expected${index} ? "true" : "false");`
        : `        sbAppendInt(&tests, expected${index});`,
      `        sbAppend(&tests, ",\\"actual\\":");`,
      returnType === 'bool'
        ? `        sbAppend(&tests, actual${index} ? "true" : "false");`
        : `        sbAppendInt(&tests, actual${index});`,
      `        sbAppend(&tests, ",\\"error\\":");`,
      `        sbAppend(&tests, passed${index} ? "null" : "\\"Test failed\\"");`,
      `        sbAppendChar(&tests, '}');`,
      `        passed = passed && passed${index};`,
      '      }'
    ].join('\n');
  }).join('\n');

  return [
    '#include <ctype.h>',
    '#include <fcntl.h>',
    '#include <limits.h>',
    '#include <stdbool.h>',
    '#include <stdio.h>',
    '#include <stdlib.h>',
    '#include <string.h>',
    '#include <time.h>',
    '#include <io.h>',
    '',
    `extern ${cSignature(returnType, argTypes, argTypes.map((type, index) => `arg${index + 1}`))};`,
    '',
    'typedef struct {',
    '  char* data;',
    '  size_t length;',
    '  size_t capacity;',
    '} StringBuilder;',
    '',
    'static void sbInit(StringBuilder* sb) {',
    '  sb->capacity = 1024;',
    '  sb->length = 0;',
    '  sb->data = (char*)malloc(sb->capacity);',
    '  sb->data[0] = \'\\0\';',
    '}',
    '',
    'static void sbReserve(StringBuilder* sb, size_t extra) {',
    '  while (sb->length + extra + 1 > sb->capacity) {',
    '    sb->capacity *= 2;',
    '    sb->data = (char*)realloc(sb->data, sb->capacity);',
    '  }',
    '}',
    '',
    'static void sbAppend(StringBuilder* sb, const char* text) {',
    '  size_t len = strlen(text);',
    '  sbReserve(sb, len);',
    '  memcpy(sb->data + sb->length, text, len);',
    '  sb->length += len;',
    '  sb->data[sb->length] = \'\\0\';',
    '}',
    '',
    'static void sbAppendChar(StringBuilder* sb, char ch) {',
    '  sbReserve(sb, 1);',
    '  sb->data[sb->length++] = ch;',
    '  sb->data[sb->length] = \'\\0\';',
    '}',
    '',
    'static void sbAppendInt(StringBuilder* sb, int value) {',
    '  char buffer[32];',
    '  snprintf(buffer, sizeof(buffer), "%d", value);',
    '  sbAppend(sb, buffer);',
    '}',
    '',
    'static void sbAppendBool(StringBuilder* sb, bool value) {',
    '  sbAppend(sb, value ? "true" : "false");',
    '}',
    '',
    'static void sbFree(StringBuilder* sb) {',
    '  free(sb->data);',
    '  sb->data = NULL;',
    '  sb->length = 0;',
    '  sb->capacity = 0;',
    '}',
    '',
    'int main(void) {',
    '  int stdoutFd = _dup(_fileno(stdout));',
    '  int stderrFd = _dup(_fileno(stderr));',
    '  FILE* nullFile = fopen("NUL", "w");',
    '  if (nullFile != NULL) {',
    '    fflush(stdout);',
    '    fflush(stderr);',
    '    _dup2(_fileno(nullFile), _fileno(stdout));',
    '    _dup2(_fileno(nullFile), _fileno(stderr));',
    '  }',
    '  clock_t start = clock();',
    '  bool passed = true;',
    '  const char* firstError = NULL;',
    '  StringBuilder tests;',
    '  sbInit(&tests);',
    testBlocks,
    '  clock_t elapsed = clock() - start;',
    '  long long durationMs = (long long)((elapsed * 1000) / CLOCKS_PER_SEC);',
    '  if (nullFile != NULL) {',
    '    fflush(stdout);',
    '    fflush(stderr);',
    '    _dup2(stdoutFd, _fileno(stdout));',
    '    _dup2(stderrFd, _fileno(stderr));',
    '    fclose(nullFile);',
    '  }',
    '  _close(stdoutFd);',
    '  _close(stderrFd);',
    '  StringBuilder payload;',
    '  sbInit(&payload);',
    '  sbAppend(&payload, "{\\"passed\\":");',
    '  sbAppendBool(&payload, passed);',
    '  sbAppend(&payload, ",\\"error\\":");',
    '  sbAppend(&payload, passed ? "null" : "\\"Test failed\\"");',
    '  sbAppend(&payload, ",\\"tests\\":[");',
    '  sbAppend(&payload, tests.data);',
    '  sbAppend(&payload, "],\\"logs\\":[]");',
    '  sbAppend(&payload, ",\\"durationMs\\":");',
    '  char durationBuffer[32];',
    '  snprintf(durationBuffer, sizeof(durationBuffer), "%lld", durationMs);',
    '  sbAppend(&payload, durationBuffer);',
    '  sbAppendChar(&payload, \'}\');',
    '  printf("%s", payload.data);',
    '  sbFree(&tests);',
    '  sbFree(&payload);',
    '  return 0;',
    '}'
  ].join('\n');
}

function buildCCustomMeta(meta = {}) {
  const cMeta = meta.c || {};
  const returnType = cMeta.returnType === 'bool' ? 'bool' : 'int';
  const argTypes = Array.isArray(cMeta.argTypes) && cMeta.argTypes.length > 0
    ? cMeta.argTypes.slice()
    : Array.isArray(meta.argTypes) && meta.argTypes.length > 0
      ? meta.argTypes.slice()
      : ['int[]', 'int'];
  const argNames = Array.isArray(cMeta.argNames) && cMeta.argNames.length > 0
    ? cMeta.argNames.slice()
    : Array.isArray(meta.argNames) && meta.argNames.length > 0
      ? meta.argNames.slice()
      : argTypes.map((type, index) => {
          if (type === 'int[]') {
            return index === 0 ? 'values' : `values${index + 1}`;
          }
          if (type === 'string') {
            return index === 0 ? 'text' : `text${index + 1}`;
          }
          return index === 0 ? 'value' : `value${index + 1}`;
        });
  return {
    returnType,
    argTypes,
    argNames
  };
}

function buildCustomTaskTemplate() {
  const signature = cSignature('int', ['int[]', 'int'], ['values', 'length']);
  return {
    id: 'custom-c-template',
    source: 'template',
    createdAt: null,
    kernelId: C_KERNEL_META.id,
    kernelTitle: C_KERNEL_META.title,
    kernelFamily: C_KERNEL_META.family,
    editorLanguage: C_KERNEL_META.editorLanguage,
    category: 'arrays',
    difficulty: 'easy',
    title: 'C task',
    prompt: 'Write a C solution for the task.',
    signature,
    starterCode: cCode(signature, ['return INT_MIN;']),
    solution: cCode(signature, [
      'int total = 0;',
      'for (int index = 0; index < length; index += 1) {',
      '  total += values[index];',
      '}',
      'return total;'
    ]),
    hints: ['Fill in the body of solve.', 'Use the tests to validate your code.'],
    explanation: '',
    strategy: 'arrays',
    tests: [],
    xp: xpForDifficulty('easy'),
    tags: ['custom', 'c'],
    meta: {
      c: {
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'length']
      }
    },
    challengeType: 'practice'
  };
}

function normalizeCustomTask(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const category = normalizeCategory(raw.category);
  const difficulty = normalizeDifficulty(raw.difficulty);
  const strategy = normalizeStrategy(raw.strategy || 'simple');
  const cMeta = buildCCustomMeta(raw.meta || {});
  const signature = normalizeCSignature(raw.signature, cMeta.returnType, cMeta.argTypes, cMeta.argNames);
  const starterCode = typeof raw.starterCode === 'string'
    ? raw.starterCode
    : typeof raw.starter === 'string'
      ? raw.starter
      : cCode(signature, ['return INT_MIN;']);
  const solution = typeof raw.solution === 'string'
    ? raw.solution
    : typeof raw.solutionCode === 'string'
      ? raw.solutionCode
      : starterCode;
  const hints = Array.isArray(raw.hints)
    ? raw.hints.slice()
    : typeof raw.hintsText === 'string'
      ? raw.hintsText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      : [];
  const tests = Array.isArray(raw.tests) ? cloneJson(raw.tests) : [];
  const createdAt = raw.createdAt || raw.importedAt || Date.now();

  return makeTask({
    id: raw.id || `custom-${hashString(`${raw.title || raw.prompt || 'task'}:${createdAt}`)}`,
    source: 'custom',
    createdAt,
    kernelId: C_KERNEL_META.id,
    category,
    difficulty,
    title: String(raw.title || 'Пользовательская C-задача'),
    prompt: String(raw.prompt || ''),
    signature,
    starterCode,
    solution,
    hints,
    explanation: String(raw.explanation || ''),
    strategy,
    tests,
    xp: Number(raw.xp) || xpForDifficulty(difficulty),
    tags: Array.isArray(raw.tags) ? raw.tags.slice() : ['custom', 'c'],
    meta: {
      c: {
        returnType: cMeta.returnType,
        argTypes: cMeta.argTypes.slice(),
        argNames: cMeta.argNames.slice()
      }
    }
  });
}

function runTaskTests(task, userCode) {
  const start = Date.now();
  const runtime = getCRuntime();
  if (!runtime.available) {
    return Promise.resolve({
      passed: false,
      error: 'gcc не найден. Для C-ядра нужен локальный gcc или clang.',
      tests: [],
      logs: [],
      durationMs: 0
    });
  }

  const meta = buildCCustomMeta(task.meta || {});
  const returnType = task.meta?.c?.returnType === 'bool' ? 'bool' : meta.returnType;
  const argTypes = Array.isArray(task.meta?.c?.argTypes) && task.meta.c.argTypes.length > 0
    ? task.meta.c.argTypes.slice()
    : meta.argTypes.slice();

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'js-infinite-trainer-c-'));
  const solutionPath = path.join(workDir, 'Solution.c');
  const runnerPath = path.join(workDir, 'Runner.c');
  const outputPath = path.join(workDir, 'Runner.exe');
  const env = buildSafeProcessEnv(runtime.binDir && path.isAbsolute(runtime.binDir) ? runtime.binDir : null);

  try {
    fs.writeFileSync(solutionPath, String(userCode || ''), 'utf8');
    fs.writeFileSync(runnerPath, buildCRunnerSource(task, returnType, argTypes), 'utf8');

    const compileArgs = [
      '-std=c11',
      '-O2',
      '-Wall',
      '-Wextra',
      '-static-libgcc',
      'Solution.c',
      'Runner.c',
      '-o',
      'Runner.exe'
    ];

    const compile = spawnSync(runtime.compilerPath, compileArgs, {
      cwd: workDir,
      encoding: 'utf8',
      windowsHide: true,
      timeout: NATIVE_COMPILE_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
      env
    });

    if (compile.status !== 0) {
      const message = (compile.stderr || compile.stdout || '').trim() || 'C compilation failed';
      return Promise.resolve({
        passed: false,
        error: message,
        tests: [],
        logs: [],
        durationMs: Date.now() - start
      });
    }

    const exec = spawnSync(outputPath, [], {
      cwd: workDir,
      encoding: 'utf8',
      windowsHide: true,
      timeout: NATIVE_RUN_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
      env
    });

    if (exec.status !== 0) {
      const message = (exec.stderr || exec.stdout || '').trim() || 'C runner crashed';
      return Promise.resolve({
        passed: false,
        error: message,
        tests: [],
        logs: [],
        durationMs: Date.now() - start
      });
    }

    const rawOutput = (exec.stdout || '').trim();
    if (!rawOutput) {
      const message = (exec.stderr || '').trim() || 'C runner returned no output';
      return Promise.resolve({
        passed: false,
        error: message,
        tests: [],
        logs: [],
        durationMs: Date.now() - start
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawOutput);
    } catch (error) {
      return Promise.resolve({
        passed: false,
        error: `Could not parse C runner output: ${error.message || String(error)}`,
        tests: [],
        logs: [],
        durationMs: Date.now() - start
      });
    }

    return Promise.resolve({
      passed: Boolean(parsed.passed),
      error: parsed.error || null,
      tests: Array.isArray(parsed.tests) ? parsed.tests : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      durationMs: typeof parsed.durationMs === 'number' ? parsed.durationMs : Date.now() - start
    });
  } catch (error) {
    return Promise.resolve({
      passed: false,
      error: error.message || String(error),
      tests: [],
      logs: [],
      durationMs: Date.now() - start
    });
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

function updateRuntimeAvailability() {
  cachedCRuntime = null;
  const available = cRuntimeAvailable();
  C_KERNEL_META.available = available;
  C_KERNEL_META.status = available ? 'available' : 'planned';
  return available;
}

updateRuntimeAvailability();

module.exports = {
  ...C_KERNEL_META,
  available: C_KERNEL_META.available,
  getCategories() {
    return CATEGORY_META;
  },
  getDifficulties() {
    return DIFFICULTIES;
  },
  generateTask,
  runTaskTests,
  getProgressSummary,
  buildAchievements,
  createCustomTaskTemplate: buildCustomTaskTemplate,
  normalizeCustomTask,
  updateRuntimeAvailability
};
