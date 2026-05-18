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
const { buildVariationProfile, extractVariationFields } = require('../../engine/variationProfile');

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];

const CATEGORY_META = {
  arrays: {
    title: 'Arrays',
    description: 'Reverse order, running sums, rotation, dedupe, and sliding windows.',
    accent: '#7dd3fc'
  },
  strings: {
    title: 'Strings',
    description: 'Whitespace cleanup, word order, palindrome checks, and run-length encoding.',
    accent: '#34d399'
  },
  collections: {
    title: 'Collections',
    description: 'Word frequencies, sorting, grouping, and ordered summaries.',
    accent: '#f59e0b'
  },
  recursion: {
    title: 'Recursion',
    description: 'Factorial, digit sums, powers, and Fibonacci-style tasks.',
    accent: '#a78bfa'
  },
  algorithms: {
    title: 'Algorithms',
    description: 'Binary search, two-sum, Kadane, and prefix-sum counting.',
    accent: '#fb7185'
  }
};

const STRATEGY_META = {
  simple: 'Basic',
  arrays: 'Arrays',
  strings: 'Strings',
  collections: 'Collections',
  recursion: 'Recursion',
  algorithm: 'Algorithms'
};

const CSHARP_KERNEL_META = {
  id: 'csharp',
  title: 'C#',
  shortTitle: 'C#',
  family: 'dotnet',
  editorLanguage: 'csharp',
  strategies: Object.keys(STRATEGY_META),
  strategyLabels: STRATEGY_META,
  description: 'C# kernel with local dotnet execution and procedural task generation.',
  status: 'planned',
  available: false,
  accent: '#a78bfa'
};

const THEORY_TOPIC_PRACTICE = {
  variables: {
    category: 'arrays',
    title: 'Variables and numeric state',
    note: 'Practice the variables topic by keeping clear local state while transforming the input.'
  },
  classes: {
    category: 'collections',
    title: 'Class-shaped domain data',
    note: 'Practice classes by treating each input item as data that could live behind a small model type.'
  },
  collections: {
    category: 'collections',
    title: 'Collections',
    note: 'Practice collections with arrays, dictionaries, grouping, or sorted summaries.'
  },
  linq: {
    category: 'collections',
    title: 'LINQ-style projection',
    note: 'Practice LINQ by solving the task as a filter/map/group/order pipeline.'
  },
  async: {
    category: 'algorithms',
    title: 'Async result composition',
    note: 'Practice async thinking by isolating pure work that could safely run after awaited input arrives.'
  },
  'nullable-references': {
    category: 'strings',
    title: 'Nullable-safe string handling',
    note: 'Practice nullable references by guarding empty or missing-like text cases before processing.'
  },
  records: {
    category: 'collections',
    title: 'Record-like immutable summary',
    note: 'Practice records by building a stable value-style result from the input data.'
  },
  'pattern-matching': {
    category: 'algorithms',
    title: 'Pattern matching decisions',
    note: 'Practice pattern matching by making each branch explicit and easy to read.'
  },
  'delegates-events': {
    category: 'algorithms',
    title: 'Delegate-shaped rule',
    note: 'Practice delegates and events by expressing the core decision as a reusable rule.'
  },
  exceptions: {
    category: 'algorithms',
    title: 'Exception-safe guards',
    note: 'Practice exceptions by validating edge cases before the main algorithm.'
  },
  'di-async-streams': {
    category: 'collections',
    title: 'Stream-friendly processing',
    note: 'Practice DI and async streams by keeping the transformation incremental and dependency-light.'
  },
  generics: {
    category: 'algorithms',
    title: 'Generic method thinking',
    note: 'Practice generics by writing an algorithm that depends on structure rather than one hard-coded value.'
  },
  'files-disposable': {
    category: 'strings',
    title: 'Disposable resource parsing',
    note: 'Practice files and IDisposable by treating the string as file-like content that must be parsed cleanly.'
  }
};

const WORD_POOL = [
  'alpha', 'beta', 'gamma', 'delta', 'omega', 'nova', 'pulse', 'vector',
  'lumen', 'mint', 'orbit', 'spark', 'drift', 'tide', 'glow', 'zen', 'flux'
];

const RLE_POOL = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

let seedCounter = 0;
let cachedCsharpRuntime = null;

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

function defaultArgNameForType(type, index) {
  switch (type) {
    case 'int[]':
      return index === 0 ? 'values' : `values${index + 1}`;
    case 'string[]':
      return index === 0 ? 'words' : `words${index + 1}`;
    case 'string':
      return index === 0 ? 'text' : `text${index + 1}`;
    case 'bool':
      return index === 0 ? 'flag' : `flag${index + 1}`;
    case 'int':
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
    let unique = sanitized;
    let suffix = 2;
    while (used.has(unique)) {
      unique = `${sanitized}${suffix}`;
      suffix += 1;
    }
    used.add(unique);
    return unique;
  });
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
  let safety = count * 30;
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

function shuffleCopy(rng, values) {
  const copy = Array.isArray(values) ? values.slice() : [];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.int(0, index);
    if (swapIndex !== index) {
      const temp = copy[index];
      copy[index] = copy[swapIndex];
      copy[swapIndex] = temp;
    }
  }
  return copy;
}

function sampleText(rng, wordCount = 6) {
  const words = [];
  for (let index = 0; index < wordCount; index += 1) {
    const word = rng.pick(WORD_POOL);
    words.push(index % 3 === 0 ? word.toUpperCase() : word);
  }
  return `  ${words.join(rng.bool(0.5) ? '   ' : ' ')}  `;
}

function reverseString(text) {
  return text.split('').reverse().join('');
}

function makePalindromeSample(rng) {
  if (rng.bool(0.6)) {
    const core = rng.pick(WORD_POOL);
    const middle = rng.bool(0.5) ? rng.pick(['', 'x', 'z']) : '';
    return `${core}${middle}${reverseString(core)}`;
  }
  return sampleText(rng, rng.int(3, 6));
}

function makeRunLengthSample(rng) {
  const segments = rng.int(3, 6);
  let text = '';
  for (let index = 0; index < segments; index += 1) {
    const ch = rng.pick(RLE_POOL);
    const count = rng.int(1, index === 0 ? 3 : 4);
    text += ch.repeat(count);
  }
  return text;
}

function reverseArray(values) {
  return values.slice().reverse();
}

function prefixSums(values) {
  const result = [];
  let total = 0;
  for (const value of values) {
    total += value;
    result.push(total);
  }
  return result;
}

function rotateLeft(values, shift) {
  if (values.length === 0) {
    return [];
  }
  const normalized = ((shift % values.length) + values.length) % values.length;
  return values.slice(normalized).concat(values.slice(0, normalized));
}

function dedupePreserveOrder(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

function slidingWindowMaximum(values, windowSize) {
  const result = [];
  for (let index = 0; index + windowSize <= values.length; index += 1) {
    let best = values[index];
    for (let offset = 1; offset < windowSize; offset += 1) {
      best = Math.max(best, values[index + offset]);
    }
    result.push(best);
  }
  return result;
}

function normalizeSpaces(text) {
  return text.trim().replace(/\s+/g, ' ');
}

function reverseWords(text) {
  return normalizeSpaces(text).split(' ').reverse().join(' ');
}

function isPalindromeText(text) {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === cleaned.split('').reverse().join('');
}

function runLengthEncode(text) {
  if (text.length === 0) {
    return '';
  }
  let result = '';
  let current = text[0];
  let count = 1;
  for (let index = 1; index < text.length; index += 1) {
    if (text[index] === current) {
      count += 1;
    } else {
      result += `${current}${count}`;
      current = text[index];
      count = 1;
    }
  }
  result += `${current}${count}`;
  return result;
}

function uniqueSortedWords(words) {
  return Array.from(new Set(words)).sort((left, right) => left.localeCompare(right));
}

function uniqueSortedStrings(values) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function topKWords(words, k) {
  const counts = new Map();
  for (const word of words) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((left, right) => {
      const byCount = right[1] - left[1];
      return byCount !== 0 ? byCount : left[0].localeCompare(right[0]);
    })
    .slice(0, k)
    .map(([word]) => word);
}

function countByInitial(words) {
  const counts = new Map();
  for (const word of words) {
    if (!word) {
      continue;
    }
    const initial = word[0].toUpperCase();
    counts.set(initial, (counts.get(initial) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([initial, count]) => `${initial}:${count}`);
}

function sortByLengthThenLex(words) {
  return words.slice().sort((left, right) => {
    const byLength = left.length - right.length;
    return byLength !== 0 ? byLength : left.localeCompare(right);
  });
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
  if (exponent % 2 === 0) {
    const half = recursivePower(base, Math.floor(exponent / 2));
    return half * half;
  }
  return base * recursivePower(base, exponent - 1);
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

function maxSubarray(values) {
  let best = values[0];
  let current = values[0];
  for (let index = 1; index < values.length; index += 1) {
    current = Math.max(values[index], current + values[index]);
    best = Math.max(best, current);
  }
  return best;
}

function twoSumIndices(values, target) {
  const seen = new Map();
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const complement = target - value;
    if (seen.has(complement)) {
      return [seen.get(complement), index];
    }
    if (!seen.has(value)) {
      seen.set(value, index);
    }
  }
  return [-1, -1];
}

function countSubarraysWithSum(values, target) {
  const counts = new Map();
  counts.set(0, 1);
  let prefix = 0;
  let total = 0;
  for (const value of values) {
    prefix += value;
    total += counts.get(prefix - target) || 0;
    counts.set(prefix, (counts.get(prefix) || 0) + 1);
  }
  return total;
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
  return `csharp-${category}-${difficulty}-${hashString(`csharp:${title}:${seed}`)}`;
}

function deriveTaskSeed(data) {
  const testsSeed = Array.isArray(data.tests) ? JSON.stringify(data.tests) : '';
  const argTypesSeed = Array.isArray(data.meta?.csharp?.argTypes) ? data.meta.csharp.argTypes.join('|') : '';
  const argNamesSeed = Array.isArray(data.meta?.csharp?.argNames) ? data.meta.csharp.argNames.join('|') : '';
  const variation = extractVariationFields(data);
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
    String(data.meta?.csharp?.returnType || ''),
    argTypesSeed,
    argNamesSeed,
    variation.family || '',
    variation.logicType || '',
    variation.structureType || '',
    variation.answerFormat || '',
    variation.thinkingStyle || '',
    variation.contextType || '',
    variation.contextTitle || '',
    variation.contextSubject || '',
    variation.constraints.join('|'),
    variation.variationNotes.join('|'),
    variation.variantId || ''
  ].join('::');
  return `csharp-task:${hashString(metaSeed)}`;
}

function makeTask(data) {
  const variation = extractVariationFields(data);
  const seed = data.seed !== undefined && data.seed !== null ? String(data.seed) : deriveTaskSeed(data);
  const meta = data.meta && typeof data.meta === 'object' ? cloneJson(data.meta) : {};
  if (variation.family) {
    meta.family = variation.family;
  }
  if (variation.logicType) {
    meta.logicType = variation.logicType;
  }
  if (variation.structureType) {
    meta.structureType = variation.structureType;
  }
  if (variation.answerFormat) {
    meta.answerFormat = variation.answerFormat;
  }
  if (variation.thinkingStyle) {
    meta.thinkingStyle = variation.thinkingStyle;
  }
  if (variation.contextType) {
    meta.contextType = variation.contextType;
  }
  if (variation.contextTitle) {
    meta.contextTitle = variation.contextTitle;
  }
  if (variation.contextSubject) {
    meta.contextSubject = variation.contextSubject;
  }
  if (variation.constraints.length > 0) {
    meta.constraints = variation.constraints.slice();
  }
  if (variation.variationNotes.length > 0) {
    meta.variationNotes = variation.variationNotes.slice();
  }
  if (variation.variantId) {
    meta.variantId = variation.variantId;
  }
  return {
    id: data.id || makeTaskId(data.category, data.difficulty, data.title, seed),
    seed,
    source: data.source || 'generated',
    createdAt: data.createdAt || null,
    kernelId: CSHARP_KERNEL_META.id,
    kernelTitle: CSHARP_KERNEL_META.title,
    kernelFamily: CSHARP_KERNEL_META.family,
    editorLanguage: CSHARP_KERNEL_META.editorLanguage,
    category: data.category,
    difficulty: data.difficulty,
    title: data.title,
    prompt: data.prompt,
    signature: data.signature || 'int Solve(int value)',
    starterCode: data.starterCode,
    solution: data.solution,
    hints: Array.isArray(data.hints) ? data.hints : [],
    explanation: data.explanation || '',
    strategy: normalizeStrategy(data.strategy || 'simple'),
    tests: cloneJson(data.tests || []),
    xp: data.xp || xpForDifficulty(data.difficulty),
    tags: Array.isArray(data.tags) ? data.tags : [],
    meta,
    challengeType: data.challengeType || 'practice',
    family: variation.family || null,
    logicType: variation.logicType || null,
    structureType: variation.structureType || null,
    answerFormat: variation.answerFormat || null,
    thinkingStyle: variation.thinkingStyle || null,
    contextType: variation.contextType || null,
    contextTitle: variation.contextTitle || null,
    contextSubject: variation.contextSubject || null,
    constraints: variation.constraints.slice(),
    variationNotes: variation.variationNotes.slice(),
    variantId: variation.variantId || seed
  };
}

function normalizeBodyLines(lines, fallbackLines = ['throw new NotImplementedException();']) {
  if (Array.isArray(lines)) {
    return lines.slice();
  }
  if (typeof lines === 'string' && lines.trim()) {
    return lines.split(/\r?\n/);
  }
  return Array.isArray(fallbackLines) ? fallbackLines.slice() : String(fallbackLines || '').split(/\r?\n/);
}

function csharpEscapeString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\x08/g, '\\b')
    .replace(/\f/g, '\\f');
}

function csharpLiteral(value, type) {
  switch (type) {
    case 'int':
      return String(Number(value) | 0);
    case 'bool':
      return value ? 'true' : 'false';
    case 'string':
      return `"${csharpEscapeString(value)}"`;
    case 'int[]': {
      const values = Array.isArray(value) ? value : [];
      if (values.length === 0) {
        return 'Array.Empty<int>()';
      }
      return `new int[] { ${values.map((item) => String(Number(item) | 0)).join(', ')} }`;
    }
    case 'string[]': {
      const values = Array.isArray(value) ? value : [];
      if (values.length === 0) {
        return 'Array.Empty<string>()';
      }
      return `new string[] { ${values.map((item) => `"${csharpEscapeString(item)}"`).join(', ')} }`;
    }
    default:
      throw new Error(`Unsupported C# literal type: ${type}`);
  }
}

function csharpSignature(returnType, argTypes, argNames) {
  return `${returnType} Solve(${argTypes.map((type, index) => `${type} ${argNames[index] || `arg${index + 1}`}`).join(', ')})`;
}

function normalizeCSharpSignature(rawSignature, returnType, argTypes, argNames) {
  const cleaned = String(rawSignature || '')
    .trim()
    .replace(/^public\s+static\s+/i, '')
    .replace(/^static\s+/i, '')
    .replace(/^public\s+/i, '');
  if (/^[\w<>\[\],\s?]+\s+Solve\s*\(/.test(cleaned)) {
    return cleaned;
  }
  return csharpSignature(returnType, argTypes, argNames);
}

function csharpClassCode(signature, bodyLines) {
  const lines = normalizeBodyLines(bodyLines);
  return [
    'using System;',
    'using System.Collections.Generic;',
    'using System.Linq;',
    'using System.Text;',
    '',
    'public static class Solution',
    '{',
    `  public static ${signature}`,
    '  {',
    ...lines.map((line) => `    ${line}`),
    '  }',
    '}'
  ].join('\n');
}

function buildCSharpCustomMeta(meta = {}) {
  const csharpMeta = meta.csharp || {};
  const returnType = csharpMeta.returnType || meta.returnType || 'int[]';
  const argTypes = Array.isArray(csharpMeta.argTypes) && csharpMeta.argTypes.length > 0
    ? csharpMeta.argTypes.slice()
    : Array.isArray(meta.argTypes) && meta.argTypes.length > 0
      ? meta.argTypes.slice()
      : ['int[]'];
  const argNames = Array.isArray(csharpMeta.argNames) && csharpMeta.argNames.length > 0
    ? csharpMeta.argNames.slice()
    : Array.isArray(meta.argNames) && meta.argNames.length > 0
      ? meta.argNames.slice()
      : buildArgNames(argTypes);
  return {
    returnType,
    argTypes,
    argNames
  };
}

function buildTask(options) {
  const {
    category,
    difficulty,
    title,
    prompt,
    returnType,
    argTypes,
    argNames,
    starterBody,
    solutionBody,
    hints,
    explanation,
    tests,
    strategy,
    tags,
    family,
    logicType,
    structureType,
    answerFormat,
    thinkingStyle,
    context,
    contexts,
    constraints,
    variationNotes,
    challengeType,
    seed,
    createdAt = null
  } = options;

  const normalizedReturnType = returnType || 'int';
  const normalizedArgTypes = Array.isArray(argTypes) && argTypes.length > 0 ? argTypes.slice() : ['int'];
  const normalizedArgNames = buildArgNames(normalizedArgTypes, Array.isArray(argNames) ? argNames.slice() : []);
  const signature = csharpSignature(normalizedReturnType, normalizedArgTypes, normalizedArgNames);
  const starterLines = normalizeBodyLines(starterBody, ['throw new NotImplementedException();']);
  const solutionLines = normalizeBodyLines(solutionBody, starterLines);
  const variation = buildVariationProfile({
    kernelId: CSHARP_KERNEL_META.id,
    category,
    difficulty,
    title,
    prompt,
    returnType: normalizedReturnType,
    argTypes: normalizedArgTypes,
    argNames: normalizedArgNames,
    strategy,
    tags,
    family,
    logicType,
    structureType,
    answerFormat,
    thinkingStyle,
    context,
    contexts,
    constraints,
    variationNotes,
    challengeType,
    seed,
    createdAt
  });

  return makeTask({
    category,
    difficulty,
    title,
    prompt: variation.prompt,
    signature,
    starterCode: csharpClassCode(signature, starterLines),
    solution: csharpClassCode(signature, solutionLines),
    hints,
    explanation,
    tests,
    strategy,
    tags: variation.tags,
    challengeType,
    seed: variation.seed,
    createdAt,
    meta: {
      csharp: {
        returnType: normalizedReturnType,
        argTypes: normalizedArgTypes.slice(),
        argNames: normalizedArgNames.slice()
      },
      ...variation.meta
    }
    ,
    family: variation.family,
    logicType: variation.logicType,
    structureType: variation.structureType,
    answerFormat: variation.answerFormat,
    thinkingStyle: variation.thinkingStyle,
    contextType: variation.contextType,
    contextTitle: variation.contextTitle,
    contextSubject: variation.contextSubject,
    constraints: variation.constraints,
    variationNotes: variation.variationNotes,
    variantId: variation.variantId
  });
}

function buildArrayReverseTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const length = difficulty === 'easy'
      ? rng.int(4, 6)
      : difficulty === 'medium'
        ? rng.int(5, 8)
        : difficulty === 'hard'
          ? rng.int(6, 9)
          : rng.int(7, 10);
    const values = sampleNumbers(rng, length, -10, 25, difficulty !== 'easy');
    return {
      args: [values],
      expected: reverseArray(values)
    };
  });

  return buildTask({
    category: 'arrays',
    difficulty,
    title: 'Reverse the array',
    prompt: 'Return a new array with the numbers in reverse order.',
    returnType: 'int[]',
    argTypes: ['int[]'],
    argNames: ['values'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'var copy = (int[])values.Clone();',
      'Array.Reverse(copy);',
      'return copy;'
    ],
    hints: [
      'Clone the input before reversing it.',
      'Array.Reverse works in place.'
    ],
    explanation: 'Clone the array, reverse the copy, and return it.',
    tests,
    strategy: 'arrays',
    tags: ['arrays', 'reverse', 'int-array'],
    seed: `${seed}:reverse`
  });
}

function buildArrayPrefixSumsTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const length = difficulty === 'easy'
      ? rng.int(4, 6)
      : difficulty === 'medium'
        ? rng.int(5, 8)
        : difficulty === 'hard'
          ? rng.int(6, 9)
          : rng.int(7, 10);
    const values = sampleNumbers(rng, length, 0, 12, false);
    return {
      args: [values],
      expected: prefixSums(values)
    };
  });

  return buildTask({
    category: 'arrays',
    difficulty,
    title: 'Prefix sums',
    prompt: 'Return the running prefix sums of the array.',
    returnType: 'int[]',
    argTypes: ['int[]'],
    argNames: ['values'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'var result = new int[values.Length];',
      'int total = 0;',
      'for (int index = 0; index < values.Length; index += 1) {',
      '  total += values[index];',
      '  result[index] = total;',
      '}',
      'return result;'
    ],
    hints: [
      'Keep a running total.',
      'Store each cumulative sum in a new array.'
    ],
    explanation: 'Iterate once, accumulate a running total, and store each step.',
    tests,
    strategy: 'arrays',
    tags: ['arrays', 'prefix-sums'],
    seed: `${seed}:prefix-sums`
  });
}

function buildArrayRotateTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const length = rng.int(5, difficulty === 'easy' ? 7 : difficulty === 'medium' ? 8 : difficulty === 'hard' ? 9 : 11);
    const values = sampleNumbers(rng, length, -9, 18, difficulty !== 'easy');
    const shift = rng.int(1, Math.max(1, length - 1));
    return {
      args: [values, shift],
      expected: rotateLeft(values, shift)
    };
  });

  return buildTask({
    category: 'arrays',
    difficulty,
    title: 'Rotate left',
    prompt: 'Rotate the array to the left by shift positions.',
    returnType: 'int[]',
    argTypes: ['int[]', 'int'],
    argNames: ['values', 'shift'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'if (values.Length == 0) {',
      '  return Array.Empty<int>();',
      '}',
      'int normalized = ((shift % values.Length) + values.Length) % values.Length;',
      'var result = new int[values.Length];',
      'for (int index = 0; index < values.Length; index += 1) {',
      '  result[index] = values[(index + normalized) % values.Length];',
      '}',
      'return result;'
    ],
    hints: [
      'Normalize the shift with modulo.',
      'The result array can be filled in one pass.'
    ],
    explanation: 'Move the first shift elements to the end while preserving order.',
    tests,
    strategy: 'arrays',
    tags: ['arrays', 'rotation'],
    seed: `${seed}:rotate-left`
  });
}

function buildArrayUniqueTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const length = rng.int(6, difficulty === 'easy' ? 7 : difficulty === 'medium' ? 9 : difficulty === 'hard' ? 10 : 12);
    const values = sampleNumbers(rng, length, -6, 14, true);
    return {
      args: [values],
      expected: dedupePreserveOrder(values)
    };
  });

  return buildTask({
    category: 'arrays',
    difficulty,
    title: 'Remove duplicates',
    prompt: 'Return the array without duplicates, preserving the first occurrence order.',
    returnType: 'int[]',
    argTypes: ['int[]'],
    argNames: ['values'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'var seen = new HashSet<int>();',
      'var result = new List<int>();',
      'foreach (var value in values) {',
      '  if (seen.Add(value)) {',
      '    result.Add(value);',
      '  }',
      '}',
      'return result.ToArray();'
    ],
    hints: [
      'HashSet helps track values you already saw.',
      'Append only when you see a value for the first time.'
    ],
    explanation: 'Remember seen values and append only the first occurrence.',
    tests,
    strategy: 'arrays',
    tags: ['arrays', 'dedupe'],
    seed: `${seed}:unique-order`
  });
}

function buildArrayWindowMaxTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const length = rng.int(7, difficulty === 'easy' ? 8 : difficulty === 'medium' ? 9 : difficulty === 'hard' ? 10 : 12);
    const values = sampleNumbers(rng, length, -12, 20, true);
    const windowSize = rng.int(2, Math.min(5, length));
    return {
      args: [values, windowSize],
      expected: slidingWindowMaximum(values, windowSize)
    };
  });

  return buildTask({
    category: 'arrays',
    difficulty,
    title: 'Sliding window maximum',
    prompt: 'Return the maximum value for every contiguous window of size k.',
    returnType: 'int[]',
    argTypes: ['int[]', 'int'],
    argNames: ['values', 'windowSize'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'if (windowSize <= 0 || windowSize > values.Length) {',
      '  return Array.Empty<int>();',
      '}',
      'var result = new int[values.Length - windowSize + 1];',
      'for (int index = 0; index + windowSize <= values.Length; index += 1) {',
      '  int best = values[index];',
      '  for (int offset = 1; offset < windowSize; offset += 1) {',
      '    best = Math.Max(best, values[index + offset]);',
      '  }',
      '  result[index] = best;',
      '}',
      'return result;'
    ],
    hints: [
      'Check every valid window.',
      'Each window can be solved with a small inner loop.'
    ],
    explanation: 'Scan all windows and keep the maximum in each segment.',
    tests,
    strategy: 'arrays',
    tags: ['arrays', 'sliding-window'],
    seed: `${seed}:window-max`
  });
}

function buildStringsTask(rng, difficulty, seed) {
  switch (difficulty) {
    case 'easy':
      return buildStringNormalizeTask(rng, difficulty, seed);
    case 'medium':
      return buildStringReverseWordsTask(rng, difficulty, seed);
    case 'hard':
      return buildStringPalindromeTask(rng, difficulty, seed);
    case 'expert':
      return buildStringRunLengthTask(rng, difficulty, seed);
    default:
      return buildStringNormalizeTask(rng, 'easy', seed);
  }
}

function buildStringNormalizeTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const text = sampleText(rng, rng.int(4, 7));
    return {
      args: [text],
      expected: normalizeSpaces(text)
    };
  });

  return buildTask({
    category: 'strings',
    difficulty,
    title: 'Normalize spaces',
    prompt: 'Collapse repeated whitespace and return the cleaned string.',
    returnType: 'string',
    argTypes: ['string'],
    argNames: ['text'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'if (string.IsNullOrWhiteSpace(text)) {',
      '  return string.Empty;',
      '}',
      'var parts = text.Trim().Split(new[] { \' \', \'\\t\', \'\\n\', \'\\r\' }, StringSplitOptions.RemoveEmptyEntries);',
      'return string.Join(" ", parts);'
    ],
    hints: [
      'Trim the text first.',
      'Split on whitespace and join with a single space.'
    ],
    explanation: 'Normalize whitespace by splitting on it and joining the parts back.',
    tests,
    strategy: 'strings',
    tags: ['strings', 'normalize'],
    seed: `${seed}:normalize-spaces`
  });
}

function buildStringReverseWordsTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const text = sampleText(rng, rng.int(4, 7));
    return {
      args: [text],
      expected: reverseWords(text)
    };
  });

  return buildTask({
    category: 'strings',
    difficulty,
    title: 'Reverse words',
    prompt: 'Reverse the order of words while keeping one space between them.',
    returnType: 'string',
    argTypes: ['string'],
    argNames: ['text'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'if (string.IsNullOrWhiteSpace(text)) {',
      '  return string.Empty;',
      '}',
      'var parts = text.Trim().Split(new[] { \' \', \'\\t\', \'\\n\', \'\\r\' }, StringSplitOptions.RemoveEmptyEntries);',
      'Array.Reverse(parts);',
      'return string.Join(" ", parts);'
    ],
    hints: [
      'Normalize the whitespace first.',
      'Then reverse the word list.'
    ],
    explanation: 'Clean the spacing, reverse the words, and join them back.',
    tests,
    strategy: 'strings',
    tags: ['strings', 'reverse-words'],
    seed: `${seed}:reverse-words`
  });
}

function buildStringPalindromeTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const text = makePalindromeSample(rng);
    return {
      args: [text],
      expected: isPalindromeText(text)
    };
  });

  return buildTask({
    category: 'strings',
    difficulty,
    title: 'Palindrome check',
    prompt: 'Return true when the text is a palindrome after lowercasing and removing non-alphanumeric characters.',
    returnType: 'bool',
    argTypes: ['string'],
    argNames: ['text'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'var cleaned = new List<char>();',
      'foreach (var ch in text) {',
      '  if (char.IsLetterOrDigit(ch)) {',
      '    cleaned.Add(char.ToLowerInvariant(ch));',
      '  }',
      '}',
      'for (int left = 0, right = cleaned.Count - 1; left < right; left += 1, right -= 1) {',
      '  if (cleaned[left] != cleaned[right]) {',
      '    return false;',
      '  }',
      '}',
      'return true;'
    ],
    hints: [
      'Ignore spaces and punctuation.',
      'Compare characters from both ends.'
    ],
    explanation: 'Normalize the text and compare mirrored characters.',
    tests,
    strategy: 'strings',
    tags: ['strings', 'palindrome'],
    seed: `${seed}:palindrome`
  });
}

function buildStringRunLengthTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const text = makeRunLengthSample(rng);
    return {
      args: [text],
      expected: runLengthEncode(text)
    };
  });

  return buildTask({
    category: 'strings',
    difficulty,
    title: 'Run-length encode',
    prompt: 'Compress repeated characters as char+count.',
    returnType: 'string',
    argTypes: ['string'],
    argNames: ['text'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'if (text.Length == 0) {',
      '  return string.Empty;',
      '}',
      'string result = string.Empty;',
      'char current = text[0];',
      'int count = 1;',
      'for (int index = 1; index < text.Length; index += 1) {',
      '  if (text[index] == current) {',
      '    count += 1;',
      '  } else {',
      '    result += $"{current}{count}";',
      '    current = text[index];',
      '    count = 1;',
      '  }',
      '}',
      'result += $"{current}{count}";',
      'return result;'
    ],
    hints: [
      'Track the current run and its length.',
      'Append a segment whenever the character changes.'
    ],
    explanation: 'Walk through the text once and emit each run as character plus count.',
    tests,
    strategy: 'strings',
    tags: ['strings', 'run-length-encode'],
    seed: `${seed}:rle`
  });
}

function buildCollectionsTask(rng, difficulty, seed) {
  switch (difficulty) {
    case 'easy':
      return buildCollectionsUniqueSortedTask(rng, difficulty, seed);
    case 'medium':
      return buildCollectionsTopKTask(rng, difficulty, seed);
    case 'hard':
      return buildCollectionsCountInitialTask(rng, difficulty, seed);
    case 'expert':
      return buildCollectionsSortByLengthTask(rng, difficulty, seed);
    default:
      return buildCollectionsUniqueSortedTask(rng, 'easy', seed);
  }
}

function buildCollectionsUniqueSortedTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const words = sampleWords(rng, rng.int(5, 8), true);
    return {
      args: [words],
      expected: uniqueSortedWords(words)
    };
  });

  return buildTask({
    category: 'collections',
    difficulty,
    title: 'Unique sorted words',
    prompt: 'Return unique words sorted alphabetically.',
    returnType: 'string[]',
    argTypes: ['string[]'],
    argNames: ['words'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'var unique = new HashSet<string>(words, StringComparer.Ordinal);',
      'var result = new List<string>(unique);',
      'result.Sort(StringComparer.Ordinal);',
      'return result.ToArray();'
    ],
    hints: [
      'Use a set to remove duplicates.',
      'Sort the unique values at the end.'
    ],
    explanation: 'Deduplicate the words and sort the result with ordinal order.',
    tests,
    strategy: 'collections',
    tags: ['collections', 'unique', 'sort'],
    seed: `${seed}:unique-sorted-words`
  });
}

function buildCollectionsTopKTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const words = sampleWords(rng, rng.int(8, 12), true);
    const k = rng.int(1, Math.min(4, Math.max(1, new Set(words).size)));
    return {
      args: [words, k],
      expected: topKWords(words, k)
    };
  });

  return buildTask({
    category: 'collections',
    difficulty,
    title: 'Top K words',
    prompt: 'Return the k most frequent words, ordered by frequency desc and word asc.',
    returnType: 'string[]',
    argTypes: ['string[]', 'int'],
    argNames: ['words', 'k'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'var counts = new Dictionary<string, int>(StringComparer.Ordinal);',
      'foreach (var word in words) {',
      '  counts[word] = counts.TryGetValue(word, out var current) ? current + 1 : 1;',
      '}',
      'return counts',
      '  .OrderByDescending(pair => pair.Value)',
      '  .ThenBy(pair => pair.Key, StringComparer.Ordinal)',
      '  .Take(k)',
      '  .Select(pair => pair.Key)',
      '  .ToArray();'
    ],
    hints: [
      'Count words first.',
      'Then sort by frequency and alphabetically.'
    ],
    explanation: 'Build a frequency map and order it by count, then by word.',
    tests,
    strategy: 'collections',
    tags: ['collections', 'frequency', 'top-k'],
    seed: `${seed}:top-k-words`
  });
}

function buildCollectionsCountInitialTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const words = sampleWords(rng, rng.int(6, 10), true);
    return {
      args: [words],
      expected: countByInitial(words)
    };
  });

  return buildTask({
    category: 'collections',
    difficulty,
    title: 'Count by initial',
    prompt: 'Count words by first letter and return entries like A:3 sorted by letter.',
    returnType: 'string[]',
    argTypes: ['string[]'],
    argNames: ['words'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'var counts = new Dictionary<char, int>();',
      'foreach (var word in words) {',
      '  if (string.IsNullOrEmpty(word)) {',
      '    continue;',
      '  }',
      '  char initial = char.ToUpperInvariant(word[0]);',
      '  counts[initial] = counts.TryGetValue(initial, out var current) ? current + 1 : 1;',
      '}',
      'return counts',
      '  .OrderBy(pair => pair.Key)',
      '  .Select(pair => $"{pair.Key}:{pair.Value}")',
      '  .ToArray();'
    ],
    hints: [
      'Use a dictionary keyed by the first letter.',
      'Sort the output by the letter key.'
    ],
    explanation: 'Group words by their initial letter and render each bucket as a short summary.',
    tests,
    strategy: 'collections',
    tags: ['collections', 'grouping'],
    seed: `${seed}:count-initial`
  });
}

function buildCollectionsSortByLengthTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const words = sampleWords(rng, rng.int(6, 10), true);
    return {
      args: [words],
      expected: sortByLengthThenLex(words)
    };
  });

  return buildTask({
    category: 'collections',
    difficulty,
    title: 'Sort by length then lex',
    prompt: 'Sort words by length and then alphabetically.',
    returnType: 'string[]',
    argTypes: ['string[]'],
    argNames: ['words'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'var result = (string[])words.Clone();',
      'Array.Sort(result, (left, right) => {',
      '  int byLength = left.Length.CompareTo(right.Length);',
      '  return byLength != 0 ? byLength : StringComparer.Ordinal.Compare(left, right);',
      '});',
      'return result;'
    ],
    hints: [
      'Compare length first.',
      'Use alphabetic order as the tie-breaker.'
    ],
    explanation: 'Sort with a two-part comparison: length first, then lexical order.',
    tests,
    strategy: 'collections',
    tags: ['collections', 'sorting'],
    seed: `${seed}:sort-by-length`
  });
}

function buildRecursionTask(rng, difficulty, seed) {
  switch (difficulty) {
    case 'easy':
      return buildRecursionFactorialTask(rng, difficulty, seed);
    case 'medium':
      return buildRecursionDigitSumTask(rng, difficulty, seed);
    case 'hard':
      return buildRecursionPowerTask(rng, difficulty, seed);
    case 'expert':
      return buildRecursionFibonacciTask(rng, difficulty, seed);
    default:
      return buildRecursionFactorialTask(rng, 'easy', seed);
  }
}

function buildRecursionFactorialTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const n = rng.int(1, difficulty === 'easy' ? 6 : difficulty === 'medium' ? 7 : difficulty === 'hard' ? 8 : 9);
    return {
      args: [n],
      expected: factorial(n)
    };
  });

  return buildTask({
    category: 'recursion',
    difficulty,
    title: 'Factorial',
    prompt: 'Return n! using recursion.',
    returnType: 'int',
    argTypes: ['int'],
    argNames: ['n'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'if (n <= 1) {',
      '  return 1;',
      '}',
      'return n * Solve(n - 1);'
    ],
    hints: [
      'The base case is 1.',
      'Call the same method with n - 1.'
    ],
    explanation: 'Use the classic recursive factorial definition.',
    tests,
    strategy: 'recursion',
    tags: ['recursion', 'factorial'],
    seed: `${seed}:factorial`
  });
}

function buildRecursionDigitSumTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const value = rng.int(10, difficulty === 'easy' ? 99 : difficulty === 'medium' ? 999 : difficulty === 'hard' ? 9999 : 99999);
    return {
      args: [value],
      expected: sumDigits(value)
    };
  });

  return buildTask({
    category: 'recursion',
    difficulty,
    title: 'Digit sum',
    prompt: 'Return the sum of digits using recursion.',
    returnType: 'int',
    argTypes: ['int'],
    argNames: ['value'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'if (value < 10) {',
      '  return value;',
      '}',
      'return (value % 10) + Solve(value / 10);'
    ],
    hints: [
      'Use the last digit and recurse on the rest.',
      'Stop when the number is a single digit.'
    ],
    explanation: 'Peel off one digit at a time and recurse on the remaining prefix.',
    tests,
    strategy: 'recursion',
    tags: ['recursion', 'digits'],
    seed: `${seed}:digit-sum`
  });
}

function buildRecursionPowerTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const baseValue = rng.int(2, 5);
    const exponent = rng.int(0, difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : difficulty === 'hard' ? 6 : 7);
    return {
      args: [baseValue, exponent],
      expected: recursivePower(baseValue, exponent)
    };
  });

  return buildTask({
    category: 'recursion',
    difficulty,
    title: 'Fast power',
    prompt: 'Raise baseValue to exponent using recursion.',
    returnType: 'int',
    argTypes: ['int', 'int'],
    argNames: ['baseValue', 'exponent'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'if (exponent == 0) {',
      '  return 1;',
      '}',
      'if (exponent == 1) {',
      '  return baseValue;',
      '}',
      'if (exponent % 2 == 0) {',
      '  int half = Solve(baseValue, exponent / 2);',
      '  return half * half;',
      '}',
      'return baseValue * Solve(baseValue, exponent - 1);'
    ],
    hints: [
      'Handle the zero exponent first.',
      'You can split even exponents in half.'
    ],
    explanation: 'Use exponentiation by squaring to keep the recursion shallow.',
    tests,
    strategy: 'recursion',
    tags: ['recursion', 'power'],
    seed: `${seed}:power`
  });
}

function buildRecursionFibonacciTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const n = rng.int(0, difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : difficulty === 'hard' ? 10 : 12);
    return {
      args: [n],
      expected: fibonacciValue(n)
    };
  });

  return buildTask({
    category: 'recursion',
    difficulty,
    title: 'Fibonacci',
    prompt: 'Return the nth Fibonacci number using recursion.',
    returnType: 'int',
    argTypes: ['int'],
    argNames: ['n'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'if (n <= 1) {',
      '  return n;',
      '}',
      'return Solve(n - 1) + Solve(n - 2);'
    ],
    hints: [
      'The first two values are 0 and 1.',
      'Each value is the sum of the previous two.'
    ],
    explanation: 'Use the direct recursive Fibonacci definition on small inputs.',
    tests,
    strategy: 'recursion',
    tags: ['recursion', 'fibonacci'],
    seed: `${seed}:fibonacci`
  });
}

function buildAlgorithmsTask(rng, difficulty, seed) {
  switch (difficulty) {
    case 'easy':
      return buildAlgorithmBinarySearchTask(rng, difficulty, seed);
    case 'medium':
      return buildAlgorithmTwoSumTask(rng, difficulty, seed);
    case 'hard':
      return buildAlgorithmMaxSubarrayTask(rng, difficulty, seed);
    case 'expert':
      return buildAlgorithmCountSubarraysTask(rng, difficulty, seed);
    default:
      return buildAlgorithmBinarySearchTask(rng, 'easy', seed);
  }
}

function buildAlgorithmBinarySearchTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const values = sampleDistinctNumbers(rng, rng.int(6, 9), -10, 22, true).sort((left, right) => left - right);
    const present = rng.bool(0.75);
    const target = present
      ? values[rng.int(0, values.length - 1)]
      : values[values.length - 1] + rng.int(1, 6);
    return {
      args: [values, target],
      expected: binarySearchIndex(values, target)
    };
  });

  return buildTask({
    category: 'algorithms',
    difficulty,
    title: 'Binary search',
    prompt: 'Return the index of target in the sorted array, or -1 if it is missing.',
    returnType: 'int',
    argTypes: ['int[]', 'int'],
    argNames: ['sortedValues', 'target'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'int left = 0;',
      'int right = sortedValues.Length - 1;',
      'while (left <= right) {',
      '  int middle = left + (right - left) / 2;',
      '  if (sortedValues[middle] == target) {',
      '    return middle;',
      '  }',
      '  if (sortedValues[middle] < target) {',
      '    left = middle + 1;',
      '  } else {',
      '    right = middle - 1;',
      '  }',
      '}',
      'return -1;'
    ],
    hints: [
      'Keep left and right bounds.',
      'Shrink the search space by half each step.'
    ],
    explanation: 'Classic binary search on a sorted array.',
    tests,
    strategy: 'algorithm',
    tags: ['algorithms', 'binary-search'],
    seed: `${seed}:binary-search`
  });
}

function buildAlgorithmTwoSumTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const values = sampleNumbers(rng, rng.int(5, 8), -6, 16, true);
    const firstIndex = rng.int(0, values.length - 2);
    const secondIndex = rng.int(firstIndex + 1, values.length - 1);
    const target = values[firstIndex] + values[secondIndex];
    return {
      args: [values, target],
      expected: twoSumIndices(values, target)
    };
  });

  return buildTask({
    category: 'algorithms',
    difficulty,
    title: 'Two sum',
    prompt: 'Return the first pair of indices whose values add up to target.',
    returnType: 'int[]',
    argTypes: ['int[]', 'int'],
    argNames: ['values', 'target'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'var seen = new Dictionary<int, int>();',
      'for (int index = 0; index < values.Length; index += 1) {',
      '  int complement = target - values[index];',
      '  if (seen.TryGetValue(complement, out int pairIndex)) {',
      '    return new[] { pairIndex, index };',
      '  }',
      '  if (!seen.ContainsKey(values[index])) {',
      '    seen[values[index]] = index;',
      '  }',
      '}',
      'return new[] { -1, -1 };'
    ],
    hints: [
      'Remember the index of every value you have seen.',
      'Look up the complement before storing the current value.'
    ],
    explanation: 'Use a dictionary to remember earlier values and match complements in one pass.',
    tests,
    strategy: 'algorithm',
    tags: ['algorithms', 'two-sum'],
    seed: `${seed}:two-sum`
  });
}

function buildAlgorithmMaxSubarrayTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const length = rng.int(6, difficulty === 'easy' ? 7 : difficulty === 'medium' ? 8 : difficulty === 'hard' ? 10 : 12);
    const values = sampleNumbers(rng, length, 0, 12, true);
    return {
      args: [values],
      expected: maxSubarray(values)
    };
  });

  return buildTask({
    category: 'algorithms',
    difficulty,
    title: 'Maximum subarray',
    prompt: 'Return the maximum subarray sum.',
    returnType: 'int',
    argTypes: ['int[]'],
    argNames: ['values'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'int best = values[0];',
      'int current = values[0];',
      'for (int index = 1; index < values.Length; index += 1) {',
      '  current = Math.Max(values[index], current + values[index]);',
      '  best = Math.Max(best, current);',
      '}',
      'return best;'
    ],
    hints: [
      'Track the best subarray ending at the current position.',
      'The next step is either extend or restart.'
    ],
    explanation: 'Kadane style dynamic tracking of the best running sum.',
    tests,
    strategy: 'algorithm',
    tags: ['algorithms', 'kadane'],
    seed: `${seed}:max-subarray`
  });
}

function buildAlgorithmCountSubarraysTask(rng, difficulty, seed) {
  const count = testCountForDifficulty(difficulty);
  const tests = Array.from({ length: count }, () => {
    const length = rng.int(6, difficulty === 'easy' ? 7 : difficulty === 'medium' ? 8 : difficulty === 'hard' ? 9 : 11);
    const values = sampleNumbers(rng, length, 0, 6, true);
    const start = rng.int(0, values.length - 1);
    const end = rng.int(start, values.length - 1);
    const target = values.slice(start, end + 1).reduce((sum, value) => sum + value, 0);
    return {
      args: [values, target],
      expected: countSubarraysWithSum(values, target)
    };
  });

  return buildTask({
    category: 'algorithms',
    difficulty,
    title: 'Count subarrays with sum',
    prompt: 'Return how many contiguous subarrays sum to target.',
    returnType: 'int',
    argTypes: ['int[]', 'int'],
    argNames: ['values', 'target'],
    starterBody: ['throw new NotImplementedException();'],
    solutionBody: [
      'var counts = new Dictionary<int, int>();',
      'counts[0] = 1;',
      'int prefix = 0;',
      'int total = 0;',
      'foreach (var value in values) {',
      '  prefix += value;',
      '  if (counts.TryGetValue(prefix - target, out int seen)) {',
      '    total += seen;',
      '  }',
      '  counts[prefix] = counts.TryGetValue(prefix, out var current) ? current + 1 : 1;',
      '}',
      'return total;'
    ],
    hints: [
      'Use prefix sums.',
      'A dictionary can count how many previous prefixes you have seen.'
    ],
    explanation: 'Count matches by tracking prefix sums and how often each prefix appears.',
    tests,
    strategy: 'algorithm',
    tags: ['algorithms', 'prefix-sum'],
    seed: `${seed}:count-subarrays`
  });
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

function suffixSums(values) {
  const result = new Array(values.length);
  let total = 0;
  for (let index = values.length - 1; index >= 0; index -= 1) {
    total += values[index];
    result[index] = total;
  }
  return result;
}

function adjacentDifferences(values) {
  const result = [];
  for (let index = 1; index < values.length; index += 1) {
    result.push(values[index] - values[index - 1]);
  }
  return result;
}

function partitionByParity(values) {
  return values.filter((value) => value % 2 === 0).concat(values.filter((value) => value % 2 !== 0));
}

function uniqueCharsPreserveOrder(text) {
  const seen = new Set();
  let result = '';
  for (const ch of text) {
    if (!seen.has(ch)) {
      seen.add(ch);
      result += ch;
    }
  }
  return result;
}

function wordInitials(text) {
  return normalizeSpaces(text)
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function sortByLastThenLex(words) {
  return words.slice().sort((left, right) => {
    const byLast = left[left.length - 1].localeCompare(right[right.length - 1]);
    return byLast !== 0 ? byLast : left.localeCompare(right);
  });
}

function countByLengthSummary(values) {
  const counts = new Map();
  for (const word of values) {
    const key = String(word.length);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([length, count]) => `${length}:${count}`);
}

function topLongestUniqueWords(words, k) {
  return uniqueSortedStrings(words)
    .sort((left, right) => {
      const byLength = right.length - left.length;
      return byLength !== 0 ? byLength : left.localeCompare(right);
    })
    .slice(0, k);
}

function countByInitialFrequency(values) {
  const counts = new Map();
  for (const word of values) {
    const initial = word[0].toUpperCase();
    counts.set(initial, (counts.get(initial) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((left, right) => {
      const byCount = right[1] - left[1];
      return byCount !== 0 ? byCount : left[0].localeCompare(right[0]);
    })
    .map(([initial, count]) => `${initial}:${count}`);
}

function recursiveArraySum(values, index = 0) {
  return index >= values.length ? 0 : values[index] + recursiveArraySum(values, index + 1);
}

function recursiveStringReverse(text) {
  return text.length <= 1 ? text : recursiveStringReverse(text.slice(1)) + text[0];
}

function recursiveGcd(left, right) {
  const a = Math.abs(left);
  const b = Math.abs(right);
  return b === 0 ? a : recursiveGcd(b, a % b);
}

function fibonacciValue(n) {
  return n <= 1 ? n : fibonacciValue(n - 1) + fibonacciValue(n - 2);
}

function binarySearchInsertionIndex(values, target) {
  let left = 0;
  let right = values.length;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (values[middle] < target) {
      left = middle + 1;
    } else {
      right = middle;
    }
  }
  return left;
}

function countSubarraysWithSum(values, target) {
  const counts = new Map([[0, 1]]);
  let prefix = 0;
  let total = 0;
  for (const value of values) {
    prefix += value;
    total += counts.get(prefix - target) || 0;
    counts.set(prefix, (counts.get(prefix) || 0) + 1);
  }
  return total;
}

function longestUniqueSubarrayLength(values) {
  const lastSeen = new Map();
  let left = 0;
  let best = 0;
  for (let right = 0; right < values.length; right += 1) {
    const value = values[right];
    if (lastSeen.has(value) && lastSeen.get(value) >= left) {
      left = lastSeen.get(value) + 1;
    }
    lastSeen.set(value, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}

function topKFrequentNumbers(values, k) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((left, right) => {
      const byCount = right[1] - left[1];
      return byCount !== 0 ? byCount : left[0] - right[0];
    })
    .slice(0, k)
    .map(([value]) => value);
}

function buildArraysTaskExpanded(rng, difficulty, seed) {
  switch (difficulty) {
    case 'easy': {
      const values = sampleNumbers(rng, rng.int(4, 7), 0, 20);
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [values], expected: prefixSums(values) }));
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Prefix sums',
        prompt: 'Return the running prefix sums of the array.',
        returnType: 'int[]',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'var result = new int[values.Length];',
          'int total = 0;',
          'for (int index = 0; index < values.Length; index += 1) {',
          '  total += values[index];',
          '  result[index] = total;',
          '}',
          'return result;'
        ],
        hints: ['Keep a running total.', 'Store the accumulated value after each step.'],
        explanation: 'Prefix sums turn each position into the sum of everything before it.',
        tests,
        strategy: 'arrays',
        tags: ['prefix-sums', 'running-total'],
        seed: `${seed}:arrays-expanded-easy-prefix`
      });
    }
    case 'medium': {
      const values = sampleNumbers(rng, rng.int(5, 8), -10, 20, true);
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [values], expected: suffixSums(values) }));
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Suffix sums',
        prompt: 'Return the suffix sums from right to left.',
        returnType: 'int[]',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'var result = new int[values.Length];',
          'int total = 0;',
          'for (int index = values.Length - 1; index >= 0; index -= 1) {',
          '  total += values[index];',
          '  result[index] = total;',
          '}',
          'return result;'
        ],
        hints: ['Walk the array from the end.', 'Write the current total into the same index.'],
        explanation: 'Suffix sums are the mirrored version of prefix sums.',
        tests,
        strategy: 'arrays',
        tags: ['suffix-sums', 'scan'],
        seed: `${seed}:arrays-expanded-medium-suffix`
      });
    }
    case 'hard': {
      const values = sampleNumbers(rng, rng.int(6, 9), -10, 20, true);
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [values], expected: adjacentDifferences(values) }));
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Adjacent differences',
        prompt: 'Return the differences between neighboring elements.',
        returnType: 'int[]',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'if (values.Length < 2) {',
          '  return Array.Empty<int>();',
          '}',
          'var result = new int[values.Length - 1];',
          'for (int index = 1; index < values.Length; index += 1) {',
          '  result[index - 1] = values[index] - values[index - 1];',
          '}',
          'return result;'
        ],
        hints: ['Every result element compares the current value with the previous one.', 'The output is one element shorter than the input.'],
        explanation: 'This pattern is useful for detecting changes and trends.',
        tests,
        strategy: 'arrays',
        tags: ['differences', 'scan'],
        seed: `${seed}:arrays-expanded-hard-diff`
      });
    }
    default: {
      const values = sampleNumbers(rng, rng.int(6, 10), -10, 25, true);
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [values], expected: partitionByParity(values) }));
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Parity partition',
        prompt: 'Place all even numbers before odd numbers while keeping each group stable.',
        returnType: 'int[]',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'var evens = new List<int>();',
          'var odds = new List<int>();',
          'foreach (var value in values) {',
          '  if (value % 2 == 0) {',
          '    evens.Add(value);',
          '  } else {',
          '    odds.Add(value);',
          '  }',
          '}',
          'evens.AddRange(odds);',
          'return evens.ToArray();'
        ],
        hints: ['Split the input into two buckets.', 'Concatenate the even bucket with the odd bucket.'],
        explanation: 'Stable partitioning by parity is a nice exercise in array building.',
        tests,
        strategy: 'arrays',
        tags: ['parity', 'partition'],
        seed: `${seed}:arrays-expanded-expert-parity`
      });
    }
  }
}

function buildStringsTaskExpanded(rng, difficulty, seed) {
  switch (difficulty) {
    case 'easy': {
      const text = `  ${sampleWords(rng, rng.int(4, 6)).join(rng.bool(0.5) ? '   ' : ' ')}  `;
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [text], expected: normalizeSpaces(text).toLowerCase() }));
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Normalize and lowercase',
        prompt: 'Trim the text, collapse spaces, and lowercase everything.',
        returnType: 'string',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: ['return string.Join(" ", text.Trim().Split((char[])null, StringSplitOptions.RemoveEmptyEntries)).ToLowerInvariant();'],
        hints: ['Trim first, then lowercase.', 'Collapse whitespace after normalization.'],
        explanation: 'This is a practical preprocessing step before text analysis.',
        tests,
        strategy: 'strings',
        tags: ['normalize', 'lowercase'],
        seed: `${seed}:strings-expanded-easy-normalize`
      });
    }
    case 'medium': {
      const text = `  ${shuffleCopy(rng, sampleWords(rng, rng.int(5, 7), true)).join('   ')}  `;
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [text], expected: reverseWords(text) }));
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Reverse words',
        prompt: 'Reverse the order of the words and normalize spaces.',
        returnType: 'string',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'var words = text.Trim().Split((char[])null, StringSplitOptions.RemoveEmptyEntries).ToList();',
          'words.Reverse();',
          'return string.Join(" ", words);'
        ],
        hints: ['Split the text into words first.', 'Reverse the word list, not the characters.'],
        explanation: 'Word-order reversal is a common parsing and formatting exercise.',
        tests,
        strategy: 'strings',
        tags: ['reverse', 'words'],
        seed: `${seed}:strings-expanded-medium-reverse`
      });
    }
    case 'hard': {
      const text = sampleWords(rng, rng.int(5, 8), true).join('');
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [text], expected: uniqueCharsPreserveOrder(text) }));
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Unique characters',
        prompt: 'Remove duplicate characters while keeping the first occurrence order.',
        returnType: 'string',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'var seen = new HashSet<char>();',
          'var result = new StringBuilder();',
          'foreach (var ch in text) {',
          '  if (seen.Add(ch)) {',
          '    result.Append(ch);',
          '  }',
          '}',
          'return result.ToString();'
        ],
        hints: ['Track characters you have already emitted.', 'Only append a character the first time you see it.'],
        explanation: 'This is a useful pattern when you need stable deduplication in text.',
        tests,
        strategy: 'strings',
        tags: ['unique', 'dedupe'],
        seed: `${seed}:strings-expanded-hard-unique`
      });
    }
    default: {
      const text = `  ${sampleWords(rng, rng.int(5, 8)).join(rng.bool(0.5) ? '   ' : ' ')}  `;
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [text], expected: wordInitials(text) }));
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Word initials',
        prompt: 'Return the uppercase initials of all words.',
        returnType: 'string',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'var words = text.Trim().Split((char[])null, StringSplitOptions.RemoveEmptyEntries);',
          'var result = new StringBuilder();',
          'foreach (var word in words) {',
          '  result.Append(char.ToUpperInvariant(word[0]));',
          '}',
          'return result.ToString();'
        ],
        hints: ['Read the words one by one.', 'Take the first character from each word and append it.'],
        explanation: 'Acronym-style extraction is a neat text-processing task.',
        tests,
        strategy: 'strings',
        tags: ['initials', 'acronym'],
        seed: `${seed}:strings-expanded-expert-initials`
      });
    }
  }
}

function buildCollectionsTaskExpanded(rng, difficulty, seed) {
  switch (difficulty) {
    case 'easy': {
      const words = sampleWords(rng, rng.int(5, 7), true);
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [words], expected: sortByLastThenLex(words) }));
      return buildTask({
        category: 'collections',
        difficulty,
        title: 'Sort by last letter',
        prompt: 'Sort words by the last letter, then lexicographically.',
        returnType: 'string[]',
        argTypes: ['string[]'],
        argNames: ['words'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'var result = (string[])words.Clone();',
          'Array.Sort(result, (left, right) => {',
          '  int byLast = left[left.Length - 1].CompareTo(right[right.Length - 1]);',
          '  return byLast != 0 ? byLast : StringComparer.Ordinal.Compare(left, right);',
          '});',
          'return result;'
        ],
        hints: ['Use the last character as the main key.', 'Break ties with normal alphabetic order.'],
        explanation: 'This is a clean warm-up for custom comparators.',
        tests,
        strategy: 'collections',
        tags: ['sorting', 'comparator'],
        seed: `${seed}:collections-expanded-easy-last`
      });
    }
    case 'medium': {
      const words = sampleWords(rng, rng.int(6, 8), true);
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [words], expected: countByLengthSummary(words) }));
      return buildTask({
        category: 'collections',
        difficulty,
        title: 'Count by length',
        prompt: 'Return entries like "4:3" sorted by length.',
        returnType: 'string[]',
        argTypes: ['string[]'],
        argNames: ['words'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'var counts = new SortedDictionary<int, int>();',
          'foreach (var word in words) {',
          '  counts[word.Length] = counts.TryGetValue(word.Length, out var current) ? current + 1 : 1;',
          '}',
          'return counts.Select(pair => $"{pair.Key}:{pair.Value}").ToArray();'
        ],
        hints: ['Group words by their length.', 'A sorted dictionary keeps lengths in order automatically.'],
        explanation: 'Length-based summaries are a lightweight way to study distributions.',
        tests,
        strategy: 'collections',
        tags: ['grouping', 'summary'],
        seed: `${seed}:collections-expanded-medium-length`
      });
    }
    case 'hard': {
      const words = sampleWords(rng, rng.int(7, 10), true);
      const k = rng.int(2, Math.min(4, words.length));
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [words, k], expected: topLongestUniqueWords(words, k) }));
      return buildTask({
        category: 'collections',
        difficulty,
        title: 'Top longest unique words',
        prompt: 'Return the k longest unique words.',
        returnType: 'string[]',
        argTypes: ['string[]', 'int'],
        argNames: ['words', 'k'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'var unique = new HashSet<string>();',
          'var ordered = new List<string>();',
          'foreach (var word in words) {',
          '  if (unique.Add(word)) {',
          '    ordered.Add(word);',
          '  }',
          '}',
          'ordered.Sort((left, right) => {',
          '  int byLength = right.Length.CompareTo(left.Length);',
          '  return byLength != 0 ? byLength : StringComparer.Ordinal.Compare(left, right);',
          '});',
          'if (ordered.Count > k) {',
          '  ordered.RemoveRange(k, ordered.Count - k);',
          '}',
          'return ordered.ToArray();'
        ],
        hints: ['Remove duplicates before sorting.', 'Sort by length descending and alphabetically for ties.'],
        explanation: 'This mixes deduplication, ordering and limiting the output size.',
        tests,
        strategy: 'collections',
        tags: ['dedupe', 'top-k'],
        seed: `${seed}:collections-expanded-hard-top`
      });
    }
    default: {
      const words = sampleWords(rng, rng.int(6, 9), true);
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [words], expected: countByInitialFrequency(words) }));
      return buildTask({
        category: 'collections',
        difficulty,
        title: 'Initial frequency ranking',
        prompt: 'Summarize initials by frequency, then by letter.',
        returnType: 'string[]',
        argTypes: ['string[]'],
        argNames: ['words'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'var counts = new Dictionary<char, int>();',
          'foreach (var word in words) {',
          '  char initial = char.ToUpperInvariant(word[0]);',
          '  counts[initial] = counts.TryGetValue(initial, out var current) ? current + 1 : 1;',
          '}',
          'return counts',
          '  .OrderByDescending(pair => pair.Value)',
          '  .ThenBy(pair => pair.Key)',
          '  .Select(pair => $"{pair.Key}:{pair.Value}")',
          '  .ToArray();'
        ],
        hints: ['Count initials first.', 'Then sort by frequency descending and by letter ascending.'],
        explanation: 'This is a compact ranking exercise for dictionary and sort usage.',
        tests,
        strategy: 'collections',
        tags: ['frequency', 'ranking'],
        seed: `${seed}:collections-expanded-expert-initials`
      });
    }
  }
}

function buildRecursionTaskExpanded(rng, difficulty, seed) {
  switch (difficulty) {
    case 'easy': {
      const values = sampleNumbers(rng, rng.int(5, 8), 0, 12, true);
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [values], expected: values.reduce((sum, value) => sum + value, 0) }));
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Recursive sum',
        prompt: 'Return the sum of all elements recursively.',
        returnType: 'int',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'int SumFrom(int index) {',
          '  if (index >= values.Length) {',
          '    return 0;',
          '  }',
          '  return values[index] + SumFrom(index + 1);',
          '}',
          'return SumFrom(0);'
        ],
        hints: ['Make the index part of the recursive state.', 'Stop when the index reaches the end of the array.'],
        explanation: 'This is a good warm-up for recursive traversal of a sequence.',
        tests,
        strategy: 'recursion',
        tags: ['recursion', 'sum'],
        seed: `${seed}:recursion-expanded-easy-sum`
      });
    }
    case 'medium': {
      const text = sampleWords(rng, rng.int(5, 7), true).join(' ');
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [text], expected: reverseString(text) }));
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Recursive reverse',
        prompt: 'Reverse the string recursively.',
        returnType: 'string',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'string ReverseText(string current) {',
          '  if (current.Length <= 1) {',
          '    return current;',
          '  }',
          '  return ReverseText(current[1..]) + current[0];',
          '}',
          'return ReverseText(text);'
        ],
        hints: ['The first character moves to the end.', 'Recurse on the substring without the first character.'],
        explanation: 'Recursive string reversal is a classic way to practice divide-and-conquer thinking.',
        tests,
        strategy: 'recursion',
        tags: ['recursion', 'string'],
        seed: `${seed}:recursion-expanded-medium-reverse`
      });
    }
    case 'hard': {
      const left = rng.int(12, 120);
      const right = rng.int(12, 120);
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [left, right], expected: recursiveGcd(left, right) }));
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Recursive gcd',
        prompt: 'Return the greatest common divisor recursively.',
        returnType: 'int',
        argTypes: ['int', 'int'],
        argNames: ['left', 'right'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'int Gcd(int a, int b) {',
          '  a = Math.Abs(a);',
          '  b = Math.Abs(b);',
          '  if (b == 0) {',
          '    return a;',
          '  }',
          '  return Gcd(b, a % b);',
          '}',
          'return Gcd(left, right);'
        ],
        hints: ['Use the Euclidean algorithm.', 'Keep calling the function with the remainder.'],
        explanation: 'GCD is one of the cleanest examples of recursion with a mathematical loop.',
        tests,
        strategy: 'recursion',
        tags: ['recursion', 'gcd'],
        seed: `${seed}:recursion-expanded-hard-gcd`
      });
    }
    default: {
      const n = rng.int(0, 10);
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [n], expected: fibonacciValue(n) }));
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Recursive fibonacci',
        prompt: 'Return the nth Fibonacci number recursively.',
        returnType: 'int',
        argTypes: ['int'],
        argNames: ['n'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'int Fib(int value) {',
          '  if (value <= 1) {',
          '    return value;',
          '  }',
          '  return Fib(value - 1) + Fib(value - 2);',
          '}',
          'return Fib(n);'
        ],
        hints: ['The base cases are 0 and 1.', 'Each number is the sum of the previous two.'],
        explanation: 'Fibonacci is intentionally expensive in naive recursive form, which makes it a good expert exercise.',
        tests,
        strategy: 'recursion',
        tags: ['recursion', 'fibonacci'],
        seed: `${seed}:recursion-expanded-expert-fibonacci`
      });
    }
  }
}

function buildAlgorithmsTaskExpanded(rng, difficulty, seed) {
  switch (difficulty) {
    case 'easy': {
      const values = sampleNumbers(rng, rng.int(6, 9), -10, 20, true).sort((left, right) => left - right);
      const target = rng.bool(0.75)
        ? values[rng.int(0, values.length - 1)]
        : values[values.length - 1] + rng.int(1, 6);
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [values, target], expected: binarySearchInsertionIndex(values, target) }));
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Insertion index',
        prompt: 'Return where target should be inserted into the sorted array.',
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['sortedValues', 'target'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'int left = 0;',
          'int right = sortedValues.Length;',
          'while (left < right) {',
          '  int middle = left + (right - left) / 2;',
          '  if (sortedValues[middle] < target) {',
          '    left = middle + 1;',
          '  } else {',
          '    right = middle;',
          '  }',
          '}',
          'return left;'
        ],
        hints: ['Binary search can return an insertion position, not just an existing index.', 'Keep the interval half-open on the right side.'],
        explanation: 'This is the lower-bound variant of binary search.',
        tests,
        strategy: 'algorithm',
        tags: ['binary-search', 'insertion'],
        seed: `${seed}:algorithms-expanded-easy-insert`
      });
    }
    case 'medium': {
      const values = sampleNumbers(rng, rng.int(6, 9), -6, 8, true);
      const start = rng.int(0, values.length - 1);
      const end = rng.int(start, values.length - 1);
      const target = values.slice(start, end + 1).reduce((sum, value) => sum + value, 0);
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [values, target], expected: countSubarraysWithSum(values, target) }));
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Count subarrays with sum',
        prompt: 'Count the contiguous subarrays whose sum equals target.',
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'target'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'var counts = new Dictionary<int, int>();',
          'counts[0] = 1;',
          'int prefix = 0;',
          'int total = 0;',
          'foreach (var value in values) {',
          '  prefix += value;',
          '  if (counts.TryGetValue(prefix - target, out var seen)) {',
          '    total += seen;',
          '  }',
          '  counts[prefix] = counts.TryGetValue(prefix, out var current) ? current + 1 : 1;',
          '}',
          'return total;'
        ],
        hints: ['Track how many times each prefix sum has appeared.', 'A matching subarray ends whenever the difference is target.'],
        explanation: 'Prefix-sum counting is the standard one-pass solution.',
        tests,
        strategy: 'algorithm',
        tags: ['prefix-sum', 'counting'],
        seed: `${seed}:algorithms-expanded-medium-count`
      });
    }
    case 'hard': {
      const values = sampleNumbers(rng, rng.int(7, 10), 0, 18, true);
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [values], expected: longestUniqueSubarrayLength(values) }));
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Longest unique subarray',
        prompt: 'Return the length of the longest subarray with all unique numbers.',
        returnType: 'int',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'var lastSeen = new Dictionary<int, int>();',
          'int left = 0;',
          'int best = 0;',
          'for (int right = 0; right < values.Length; right += 1) {',
          '  int value = values[right];',
          '  if (lastSeen.TryGetValue(value, out var previous) && previous >= left) {',
          '    left = previous + 1;',
          '  }',
          '  lastSeen[value] = right;',
          '  best = Math.Max(best, right - left + 1);',
          '}',
          'return best;'
        ],
        hints: ['Move the left side of the window when you see a repeated value.', 'Store the last index where each value appeared.'],
        explanation: 'Sliding-window + last-seen indices is a powerful pattern for uniqueness constraints.',
        tests,
        strategy: 'algorithm',
        tags: ['window', 'unique'],
        seed: `${seed}:algorithms-expanded-hard-unique`
      });
    }
    default: {
      const values = sampleNumbers(rng, rng.int(6, 10), -8, 16, true);
      const k = rng.int(2, Math.min(4, values.length));
      const tests = Array.from({ length: testCountForDifficulty(difficulty) }, () => ({ args: [values, k], expected: topKFrequentNumbers(values, k) }));
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Top frequent numbers',
        prompt: 'Return the k most frequent numbers.',
        returnType: 'int[]',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'k'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'var counts = new Dictionary<int, int>();',
          'foreach (var value in values) {',
          '  counts[value] = counts.TryGetValue(value, out var current) ? current + 1 : 1;',
          '}',
          'return counts',
          '  .OrderByDescending(pair => pair.Value)',
          '  .ThenBy(pair => pair.Key)',
          '  .Take(k)',
          '  .Select(pair => pair.Key)',
          '  .ToArray();'
        ],
        hints: ['Count first, sort later.', 'Use frequency descending and value ascending to break ties.'],
        explanation: 'A frequency table turns this into a deterministic ranking problem.',
        tests,
        strategy: 'algorithm',
        tags: ['frequency', 'top-k'],
        seed: `${seed}:algorithms-expanded-expert-topk`
      });
    }
  }
}

function buildGeneratedTask(rng, category, difficulty, seed) {
  switch (category) {
    case 'arrays': {
      if (rng.bool(0.5)) {
        return buildArraysTaskExpanded(rng, difficulty, seed);
      }
      if (difficulty === 'easy' && rng.bool(0.5)) {
        return buildArrayReverseTask(rng, difficulty, seed);
      }
      if (difficulty === 'easy') {
        return buildArrayPrefixSumsTask(rng, difficulty, seed);
      }
      if (difficulty === 'medium') {
        return buildArrayRotateTask(rng, difficulty, seed);
      }
      if (difficulty === 'hard') {
        return buildArrayUniqueTask(rng, difficulty, seed);
      }
      return buildArrayWindowMaxTask(rng, difficulty, seed);
    }
    case 'strings':
      return rng.bool(0.5) ? buildStringsTaskExpanded(rng, difficulty, seed) : buildStringsTask(rng, difficulty, seed);
    case 'collections':
      return rng.bool(0.5) ? buildCollectionsTaskExpanded(rng, difficulty, seed) : buildCollectionsTask(rng, difficulty, seed);
    case 'recursion':
      return rng.bool(0.5) ? buildRecursionTaskExpanded(rng, difficulty, seed) : buildRecursionTask(rng, difficulty, seed);
    case 'algorithms':
      return rng.bool(0.5) ? buildAlgorithmsTaskExpanded(rng, difficulty, seed) : buildAlgorithmsTask(rng, difficulty, seed);
    default:
      return rng.bool(0.5) ? buildArraysTaskExpanded(rng, difficulty, seed) : buildArrayReverseTask(rng, difficulty, seed);
  }
}

function getKnownPracticeTopic(options = {}) {
  const topicId = typeof options.practiceTopicId === 'string' ? options.practiceTopicId.trim() : '';
  if (!topicId || !Object.prototype.hasOwnProperty.call(THEORY_TOPIC_PRACTICE, topicId)) {
    return null;
  }
  return {
    id: topicId,
    title: typeof options.practiceTopicTitle === 'string' && options.practiceTopicTitle.trim()
      ? options.practiceTopicTitle.trim()
      : THEORY_TOPIC_PRACTICE[topicId].title,
    spec: THEORY_TOPIC_PRACTICE[topicId]
  };
}

function decoratePracticeTopicTask(task, topic) {
  const meta = task.meta && typeof task.meta === 'object' ? task.meta : {};
  task.practiceTopicId = topic.id;
  task.practiceTopicTitle = topic.title;
  task.title = `${topic.spec.title}: ${task.title}`;
  task.prompt = `${topic.spec.note}\n\n${task.prompt}`;
  task.tags = Array.from(new Set([...(Array.isArray(task.tags) ? task.tags : []), 'theory-practice', topic.id]));
  task.meta = {
    ...meta,
    practiceTopicId: topic.id,
    practiceTopicTitle: topic.title
  };
  return task;
}

function generateTask(options = {}) {
  const seed = resolveSeed(options);
  const rng = createRng(seed);
  const topic = getKnownPracticeTopic(options);
  const category = topic ? topic.spec.category : chooseCategory(rng, options);
  const difficulty = chooseDifficulty(rng, options);
  const task = buildGeneratedTask(rng, category, difficulty, seed);
  return topic ? decoratePracticeTopicTask(task, topic) : task;
}

function getDotnetCandidates() {
  const candidates = [];
  const programFiles = process.env.ProgramFiles;
  const programFilesX86 = process.env['ProgramFiles(x86)'];
  if (programFiles) {
    candidates.push(path.join(programFiles, 'dotnet', 'dotnet.exe'));
  }
  if (programFilesX86) {
    candidates.push(path.join(programFilesX86, 'dotnet', 'dotnet.exe'));
  }
  candidates.push('dotnet');
  return Array.from(new Set(candidates));
}

function dotnetRuntimeAvailable() {
  if (cachedCsharpRuntime) {
    return cachedCsharpRuntime.available;
  }

  for (const candidate of getDotnetCandidates()) {
    const probe = spawnSync(candidate, ['--version'], {
      encoding: 'utf8',
      windowsHide: true
    });
    if (probe.status === 0) {
      cachedCsharpRuntime = {
        available: true,
        dotnet: candidate
      };
      return true;
    }
  }

  cachedCsharpRuntime = {
    available: false,
    dotnet: 'dotnet'
  };
  return false;
}

function getCsharpRuntime() {
  if (!cachedCsharpRuntime) {
    dotnetRuntimeAvailable();
  }
  return cachedCsharpRuntime;
}

function buildCSharpRunnerSource(task, returnType, argTypes) {
  const tests = Array.isArray(task.tests) ? task.tests : [];
  const testBlocks = tests.map((test, index) => {
    const args = Array.isArray(test.args) ? test.args : [];
    const argDecls = args.map((arg, argIndex) => `        ${argTypes[argIndex]} arg${index}_${argIndex} = ${csharpLiteral(arg, argTypes[argIndex])};`).join('\n');
    const expectedDecl = `        ${returnType} expected${index} = ${csharpLiteral(test.expected, returnType)};`;
    const callArgs = argTypes.map((_, argIndex) => `arg${index}_${argIndex}`).join(', ');
    const expectedJsonVar = `expectedJson${index}`;
    const actualJsonVar = `actualJson${index}`;
    return [
      '      try {',
      argDecls,
      expectedDecl,
      `        ${returnType} actual${index} = Solution.Solve(${callArgs});`,
      `        string ${expectedJsonVar} = JsonSerializer.Serialize(expected${index});`,
      `        string ${actualJsonVar} = JsonSerializer.Serialize(actual${index});`,
      `        bool passed${index} = ${expectedJsonVar} == ${actualJsonVar};`,
      `        if (!passed${index} && firstError == null) {`,
      `          firstError = "Expected " + ${expectedJsonVar} + ", got " + ${actualJsonVar};`,
      '        }',
      `        tests.Add(new TestResult { passed = passed${index}, expected = ${expectedJsonVar}, actual = ${actualJsonVar}, error = passed${index} ? null : "Expected " + ${expectedJsonVar} + ", got " + ${actualJsonVar} });`,
      `        passed = passed && passed${index};`,
      '      } catch (Exception error) {',
      '        passed = false;',
      '        var message = error.GetType().Name + ": " + error.Message;',
      '        if (firstError == null) {',
      '          firstError = message;',
      '        }',
      '        tests.Add(new TestResult { passed = false, expected = string.Empty, actual = null, error = message });',
      '      }'
    ].join('\n');
  }).join('\n');

  return [
    'using System;',
    'using System.Collections.Generic;',
    'using System.Diagnostics;',
    'using System.Text.Json;',
    '',
    'public sealed class TestResult',
    '{',
    '  public bool passed { get; set; }',
    '  public string expected { get; set; } = string.Empty;',
    '  public string? actual { get; set; }',
    '  public string? error { get; set; }',
    '}',
    '',
    'public sealed class RunResult',
    '{',
    '  public bool passed { get; set; }',
    '  public string? error { get; set; }',
    '  public List<TestResult> tests { get; set; } = new();',
    '  public List<string> logs { get; set; } = new();',
    '  public long durationMs { get; set; }',
    '}',
    '',
    'public static class Runner',
    '{',
    '  public static int Main()',
    '  {',
    '    var stopwatch = Stopwatch.StartNew();',
    '    try {',
    '      bool passed = true;',
    '      string? firstError = null;',
    '      var tests = new List<TestResult>();',
    ...testBlocks.split('\n').map((line) => `      ${line}`),
    '      var result = new RunResult { passed = passed, error = firstError, tests = tests, logs = new List<string>(), durationMs = stopwatch.ElapsedMilliseconds };',
    '      Console.WriteLine(JsonSerializer.Serialize(result));',
    '      return 0;',
    '    } catch (Exception error) {',
    '      var fallback = new RunResult { passed = false, error = error.GetType().Name + ": " + error.Message, tests = new List<TestResult>(), logs = new List<string>(), durationMs = stopwatch.ElapsedMilliseconds };',
    '      Console.WriteLine(JsonSerializer.Serialize(fallback));',
    '      return 0;',
    '    }',
    '  }',
    '}'
  ].join('\n');
}

function buildCSharpCustomTaskTemplate() {
  const returnType = 'int[]';
  const argTypes = ['int[]'];
  const argNames = ['values'];
  const signature = csharpSignature(returnType, argTypes, argNames);
  return {
    id: 'custom-csharp-template',
    source: 'template',
    createdAt: null,
    kernelId: CSHARP_KERNEL_META.id,
    kernelTitle: CSHARP_KERNEL_META.title,
    kernelFamily: CSHARP_KERNEL_META.family,
    editorLanguage: CSHARP_KERNEL_META.editorLanguage,
    category: 'arrays',
    difficulty: 'easy',
    title: 'C# task',
    prompt: 'Write a C# solution for the task.',
    signature,
    starterCode: csharpClassCode(signature, ['throw new NotImplementedException();']),
    solution: csharpClassCode(signature, [
      'var copy = (int[])values.Clone();',
      'Array.Reverse(copy);',
      'return copy;'
    ]),
    hints: ['Implement the body of Solve.', 'Use the tests to validate your code.'],
    explanation: '',
    strategy: 'arrays',
    tests: [],
    xp: xpForDifficulty('easy'),
    tags: ['custom', 'csharp'],
    meta: {
      csharp: {
        returnType,
        argTypes: argTypes.slice(),
        argNames: argNames.slice()
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
  const csharpMeta = buildCSharpCustomMeta(raw.meta || {});
  const signature = normalizeCSharpSignature(raw.signature, csharpMeta.returnType, csharpMeta.argTypes, csharpMeta.argNames);
  const starterCode = typeof raw.starterCode === 'string'
    ? raw.starterCode
    : typeof raw.starter === 'string'
      ? raw.starter
      : csharpClassCode(signature, ['throw new NotImplementedException();']);
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
  const variation = extractVariationFields(raw);

  return makeTask({
    id: raw.id || `custom-${hashString(`${raw.title || raw.prompt || 'task'}:${createdAt}`)}`,
    source: 'custom',
    createdAt,
    kernelId: CSHARP_KERNEL_META.id,
    category,
    difficulty,
    title: String(raw.title || 'Custom C# task'),
    prompt: String(raw.prompt || ''),
    signature,
    starterCode,
    solution,
    hints,
    explanation: String(raw.explanation || ''),
    strategy,
    tests,
    xp: Number(raw.xp) || xpForDifficulty(difficulty),
    tags: Array.isArray(raw.tags) ? raw.tags.slice() : ['custom', 'csharp'],
    family: variation.family,
    logicType: variation.logicType,
    structureType: variation.structureType,
    answerFormat: variation.answerFormat,
    thinkingStyle: variation.thinkingStyle,
    contextType: variation.contextType,
    contextTitle: variation.contextTitle,
    contextSubject: variation.contextSubject,
    constraints: variation.constraints,
    variationNotes: variation.variationNotes,
    variantId: variation.variantId,
    meta: {
      csharp: {
        returnType: csharpMeta.returnType,
        argTypes: csharpMeta.argTypes.slice(),
        argNames: csharpMeta.argNames.slice()
      },
      ...variation
    }
  });
}

function validateTests(task, argTypes) {
  const tests = Array.isArray(task.tests) ? task.tests : [];
  for (let index = 0; index < tests.length; index += 1) {
    const test = tests[index];
    if (!test || typeof test !== 'object') {
      return `Invalid test case at index ${index}`;
    }
    if (!Array.isArray(test.args) || test.args.length !== argTypes.length) {
      return `Invalid test args at index ${index}`;
    }
    if (!Object.prototype.hasOwnProperty.call(test, 'expected')) {
      return `Missing expected value at index ${index}`;
    }
  }
  return null;
}

function runTaskTests(task, userCode) {
  const start = Date.now();
  const runtime = getCsharpRuntime();
  if (!runtime.available) {
    return Promise.resolve({
      passed: false,
      error: 'dotnet was not found. The C# kernel needs the .NET SDK installed locally.',
      tests: [],
      logs: [],
      durationMs: 0
    });
  }

  const meta = buildCSharpCustomMeta(task.meta || {});
  const returnType = task.meta?.csharp?.returnType || meta.returnType || 'int[]';
  const argTypes = Array.isArray(task.meta?.csharp?.argTypes) && task.meta.csharp.argTypes.length > 0
    ? task.meta.csharp.argTypes.slice()
    : meta.argTypes.slice();
  const validationError = validateTests(task, argTypes);
  if (validationError) {
    return Promise.resolve({
      passed: false,
      error: validationError,
      tests: [],
      logs: [],
      durationMs: Date.now() - start
    });
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'js-infinite-trainer-csharp-'));
  const solutionPath = path.join(workDir, 'Solution.cs');
  const runnerPath = path.join(workDir, 'Runner.cs');
  const projectPath = path.join(workDir, 'Runner.csproj');
  const outDir = path.join(workDir, 'out');

  const projectSource = [
    '<Project Sdk="Microsoft.NET.Sdk">',
    '  <PropertyGroup>',
    '    <OutputType>Exe</OutputType>',
    '    <TargetFramework>net10.0</TargetFramework>',
    '    <ImplicitUsings>disable</ImplicitUsings>',
    '    <Nullable>enable</Nullable>',
    '    <EnableDefaultCompileItems>false</EnableDefaultCompileItems>',
    '    <UseAppHost>false</UseAppHost>',
    '  </PropertyGroup>',
    '  <ItemGroup>',
    '    <Compile Include="Solution.cs" />',
    '    <Compile Include="Runner.cs" />',
    '  </ItemGroup>',
    '</Project>'
  ].join('\n');

  try {
    fs.writeFileSync(solutionPath, String(userCode || ''), 'utf8');
    fs.writeFileSync(runnerPath, buildCSharpRunnerSource(task, returnType, argTypes), 'utf8');
    fs.writeFileSync(projectPath, projectSource, 'utf8');

    const compile = spawnSync(runtime.dotnet, ['build', 'Runner.csproj', '-c', 'Release', '-o', 'out', '--nologo', '-v', 'q'], {
      cwd: workDir,
      encoding: 'utf8',
      windowsHide: true,
      timeout: NATIVE_COMPILE_TIMEOUT_MS,
      env: buildSafeProcessEnv(),
      maxBuffer: 16 * 1024 * 1024
    });

    if (compile.status !== 0) {
      const message = ((compile.stdout || '') + '\n' + (compile.stderr || '')).trim() || 'C# compilation failed';
      return Promise.resolve({
        passed: false,
        error: message,
        tests: [],
        logs: [],
        durationMs: Date.now() - start
      });
    }

    const exec = spawnSync(runtime.dotnet, [path.join('out', 'Runner.dll')], {
      cwd: workDir,
      encoding: 'utf8',
      windowsHide: true,
      timeout: NATIVE_RUN_TIMEOUT_MS,
      env: buildSafeProcessEnv(),
      maxBuffer: 16 * 1024 * 1024
    });

    const rawOutput = (exec.stdout || '').trim();
    if (!rawOutput) {
      const message = (exec.stderr || '').trim() || 'C# runner returned no output';
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
        error: `Could not parse C# runner output: ${error.message || String(error)}`,
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

function createCustomTaskTemplate() {
  return buildCSharpCustomTaskTemplate();
}

function getProgressSummary(progress = {}) {
  return taskEngine.getProgressSummary(progress);
}

function buildAchievements(progress = {}) {
  return taskEngine.buildAchievements(progress);
}

function updateRuntimeAvailability() {
  const available = dotnetRuntimeAvailable();
  CSHARP_KERNEL_META.available = available;
  CSHARP_KERNEL_META.status = available ? 'available' : 'planned';
  return available;
}

updateRuntimeAvailability();

module.exports = {
  ...CSHARP_KERNEL_META,
  available: CSHARP_KERNEL_META.available,
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
  createCustomTaskTemplate,
  normalizeCustomTask,
  updateRuntimeAvailability
};
