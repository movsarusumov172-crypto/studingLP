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
    title: 'Массивы',
    description: 'Реверс, сдвиги, уникализация, окна и другие базовые приёмы.',
    accent: '#7dd3fc'
  },
  strings: {
    title: 'Строки',
    description: 'Нормализация текста, палиндромы, сжатие и работа со словами.',
    accent: '#34d399'
  },
  collections: {
    title: 'Коллекции',
    description: 'Сортировка, частоты, top-K и компактные текстовые сводки.',
    accent: '#f59e0b'
  },
  recursion: {
    title: 'Рекурсия',
    description: 'Факториал, степени, суммы и сортировка через самовызов.',
    accent: '#a78bfa'
  },
  algorithms: {
    title: 'Алгоритмы',
    description: 'Поиск, окна, максимумы и частотные структуры.',
    accent: '#fb7185'
  }
};

const STRATEGY_META = {
  simple: 'Базовая',
  arrays: 'Массивы',
  strings: 'Строки',
  collections: 'Коллекции',
  recursion: 'Рекурсия',
  algorithm: 'Алгоритмы'
};

const JAVA_KERNEL_META = {
  id: 'java',
  title: 'Java',
  shortTitle: 'Java',
  family: 'jvm',
  editorLanguage: 'java',
  strategies: Object.keys(STRATEGY_META),
  strategyLabels: STRATEGY_META,
  description: 'Ядро Java с локальным запуском через javac/java и генерацией задач по массивам, строкам, коллекциям, рекурсии и алгоритмам.',
  status: 'planned',
  available: false,
  accent: '#f97316'
};

const THEORY_TOPIC_PRACTICE = {
  variables: {
    category: 'arrays',
    title: 'Variables and local state',
    note: 'Practice variables by keeping clear local state while computing the returned value.'
  },
  classes: {
    category: 'collections',
    title: 'Class-shaped data',
    note: 'Practice classes by modeling the input as small pieces of state with a clear responsibility.'
  },
  collections: {
    category: 'collections',
    title: 'Collections',
    note: 'Practice collections with arrays, lists, maps, sets, sorting, or grouping.'
  },
  streams: {
    category: 'collections',
    title: 'Stream pipeline',
    note: 'Practice streams by thinking in filter/map/sort/collect steps before writing the implementation.'
  },
  interfaces: {
    category: 'algorithms',
    title: 'Interface-shaped contract',
    note: 'Practice interfaces by keeping the solve method as a small contract with one clear behavior.'
  },
  exceptions: {
    category: 'algorithms',
    title: 'Exception-safe guards',
    note: 'Practice exceptions by handling invalid or edge inputs before the main algorithm.'
  },
  generics: {
    category: 'algorithms',
    title: 'Generic algorithm shape',
    note: 'Practice generics by writing logic that depends on order and structure rather than one literal case.'
  },
  'optional-null-safety': {
    category: 'strings',
    title: 'Optional and null-safety',
    note: 'Practice Optional/null-safety by guarding empty-like text cases and returning a predictable value.'
  },
  'concurrency-basics': {
    category: 'algorithms',
    title: 'Independent work chunks',
    note: 'Practice concurrency basics by avoiding shared mutable state and keeping each pass deterministic.'
  },
  'records-sealed': {
    category: 'collections',
    title: 'Record-style summary',
    note: 'Practice records and sealed models by producing a stable value-style summary from input data.'
  },
  'packages-build': {
    category: 'arrays',
    title: 'Buildable utility method',
    note: 'Practice packages/build by keeping the function self-contained and easy to compile in a utility class.'
  },
  annotations: {
    category: 'algorithms',
    title: 'Explicit contract annotations',
    note: 'Practice annotations by making assumptions and return behavior explicit in the code shape.'
  },
  'io-files': {
    category: 'strings',
    title: 'File-like text parsing',
    note: 'Practice IO/files by treating the string as file content that needs clean parsing.'
  }
};

const NAME_POOL = ['Ada', 'Mila', 'Nina', 'Oleg', 'Leo', 'Sara', 'Ilya', 'Zoe', 'Maks', 'Lina', 'Vera', 'Pavel', 'Rita', 'Artem', 'Noah', 'Iris'];
const WORD_POOL = ['alpha', 'beta', 'gamma', 'delta', 'omega', 'nova', 'pulse', 'vector', 'lumen', 'mint', 'orbit', 'spark', 'drift', 'tide', 'glow', 'zen', 'flux'];
const CITY_POOL = ['Berlin', 'Tokyo', 'Oslo', 'Lisbon', 'Prague', 'Riga', 'Milan', 'Helsinki', 'Athens', 'Seoul', 'Rome', 'Paris', 'Madrid', 'Dublin'];

let seedCounter = 0;
let cachedJavaRuntime = null;

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
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
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    sample(list, count) {
      return this.shuffle(list).slice(0, count);
    },
    weighted(items) {
      const total = items.reduce((sum, item) => sum + item.weight, 0);
      let cursor = next() * total;
      for (const item of items) {
        cursor -= item.weight;
        if (cursor <= 0) {
          return item.value;
        }
      }
      return items[items.length - 1].value;
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

function sampleNumbers(rng, count, min = 0, max = 50, allowNegative = false) {
  return Array.from({ length: count }, () => {
    const value = rng.int(min, max);
    if (allowNegative && rng.bool(0.35)) {
      return -value;
    }
    return value;
  });
}

function sampleWords(rng, count) {
  return Array.from({ length: count }, () => rng.pick(WORD_POOL));
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

function sampleNames(rng, count) {
  return rng.sample(NAME_POOL, count);
}

function sampleCities(rng, count) {
  return rng.sample(CITY_POOL, count);
}

function sampleText(rng, wordCount = 6) {
  const words = [];
  for (let i = 0; i < wordCount; i += 1) {
    const word = rng.pick(WORD_POOL);
    words.push(i % 3 === 0 ? word.toUpperCase() : word);
  }
  return `  ${words.join(rng.bool(0.5) ? '   ' : ' ')}  `;
}

function sampleDelimitedText(rng, count = 5) {
  const items = sampleWords(rng, count);
  return items.join(rng.bool(0.5) ? ' | ' : ', ');
}

function reverseArray(values) {
  return values.slice().reverse();
}

function rotateLeft(values, offset) {
  if (values.length === 0) {
    return [];
  }
  const shift = ((offset % values.length) + values.length) % values.length;
  return values.slice(shift).concat(values.slice(0, shift));
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

function slidingWindowMax(values, windowSize) {
  const result = [];
  for (let index = 0; index <= values.length - windowSize; index += 1) {
    result.push(Math.max(...values.slice(index, index + windowSize)));
  }
  return result;
}

function normalizeSpaces(text) {
  return text.trim().replace(/\s+/g, ' ');
}

function reverseWords(text) {
  return text.trim().split(/\s+/).reverse().join(' ');
}

function isPalindromeText(text) {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');
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
      continue;
    }
    result += `${current}${count}`;
    current = text[index];
    count = 1;
  }
  return `${result}${current}${count}`;
}

function uniqueSortedStrings(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function countByInitialSummary(values) {
  const counts = {};
  for (const word of values) {
    const key = word[0].toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => `${key}=${count}`);
}

function sortByLengthThenLex(values) {
  return values.slice().sort((left, right) => {
    const lengthDiff = left.length - right.length;
    return lengthDiff !== 0 ? lengthDiff : left.localeCompare(right);
  });
}

function topKFrequentWords(values, k) {
  const counts = new Map();
  for (const word of values) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((left, right) => {
      const freqDiff = right[1] - left[1];
      return freqDiff !== 0 ? freqDiff : left[0].localeCompare(right[0]);
    })
    .slice(0, k)
    .map(([word]) => word);
}

function factorial(value) {
  if (value <= 1) {
    return 1;
  }
  return value * factorial(value - 1);
}

function sumDigits(value) {
  const normalized = Math.abs(value);
  if (normalized < 10) {
    return normalized;
  }
  return (normalized % 10) + sumDigits(Math.floor(normalized / 10));
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

function mergeSort(values) {
  if (values.length <= 1) {
    return values.slice();
  }
  const middle = Math.floor(values.length / 2);
  const left = mergeSort(values.slice(0, middle));
  const right = mergeSort(values.slice(middle));
  const merged = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] <= right[rightIndex]) {
      merged.push(left[leftIndex]);
      leftIndex += 1;
    } else {
      merged.push(right[rightIndex]);
      rightIndex += 1;
    }
  }
  return merged.concat(left.slice(leftIndex), right.slice(rightIndex));
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

function prefixSums(values) {
  const result = [];
  let total = 0;
  for (const value of values) {
    total += value;
    result.push(total);
  }
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
  return `java-${category}-${difficulty}-${hashString(`java:${title}:${seed}`)}`;
}

function deriveTaskSeed(data) {
  const testsSeed = Array.isArray(data.tests) ? JSON.stringify(data.tests) : '';
  const argTypesSeed = Array.isArray(data.meta?.java?.argTypes) ? data.meta.java.argTypes.join('|') : '';
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
    String(data.meta?.java?.returnType || ''),
    argTypesSeed,
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
  return `java-task:${hashString(metaSeed)}`;
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
    kernelId: JAVA_KERNEL_META.id,
    kernelTitle: JAVA_KERNEL_META.title,
    kernelFamily: JAVA_KERNEL_META.family,
    editorLanguage: JAVA_KERNEL_META.editorLanguage,
    category: data.category,
    difficulty: data.difficulty,
    title: data.title,
    prompt: data.prompt,
    signature: data.signature || 'int solve(int value)',
    starterCode: data.starterCode,
    solution: data.solution,
    hints: Array.isArray(data.hints) ? data.hints : [],
    explanation: data.explanation || '',
    strategy: data.strategy || 'simple',
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

function normalizeJavaType(type) {
  const value = String(type || '').trim();
  if (value === 'string') return 'String';
  if (value === 'string[]') return 'String[]';
  if (value === 'bool') return 'boolean';
  return value;
}

function javaTypeDefaultExpression(type) {
  switch (normalizeJavaType(type)) {
    case 'int':
      return '0';
    case 'boolean':
      return 'false';
    case 'String':
      return '""';
    case 'int[]':
      return 'new int[0]';
    case 'String[]':
      return 'new String[0]';
    default:
      return 'null';
  }
}

function javaEscapeString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

function javaLiteral(value, type) {
  switch (normalizeJavaType(type)) {
    case 'int':
      return String(Number(value) | 0);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'String':
      return `"${javaEscapeString(value)}"`;
    case 'int[]':
      return `new int[]{${(value || []).map((item) => String(Number(item) | 0)).join(', ')}}`;
    case 'String[]':
      return `new String[]{${(value || []).map((item) => `"${javaEscapeString(item)}"`).join(', ')}}`;
    default:
      throw new Error(`Unsupported Java literal type: ${type}`);
  }
}

function javaCompareExpression(actualName, expectedName, type) {
  switch (normalizeJavaType(type)) {
    case 'int':
    case 'boolean':
      return `${actualName} == ${expectedName}`;
    case 'String':
      return `Objects.equals(${actualName}, ${expectedName})`;
    case 'int[]':
      return `Arrays.equals(${actualName}, ${expectedName})`;
    case 'String[]':
      return `Arrays.equals(${actualName}, ${expectedName})`;
    default:
      throw new Error(`Unsupported Java compare type: ${type}`);
  }
}

function javaClassCode(signature, bodyLines) {
  const lines = Array.isArray(bodyLines) ? bodyLines : String(bodyLines).split(/\r?\n/);
  return [
    'import java.util.*;',
    'import java.util.function.*;',
    '',
    'public class Solution {',
    `  public static ${signature} {`,
    ...lines.map((line) => `    ${line}`),
    '  }',
    '}'
  ].join('\n');
}

function buildJavaSignature(returnType, argTypes, argNames) {
  return `${normalizeJavaType(returnType)} solve(${argTypes.map((type, index) => `${normalizeJavaType(type)} ${argNames[index] || `arg${index + 1}`}`).join(', ')})`;
}

function buildJavaCustomMeta(meta = {}) {
  const javaMeta = meta.java || {};
  const returnType = javaMeta.returnType || meta.returnType || 'int[]';
  const argTypes = Array.isArray(javaMeta.argTypes) && javaMeta.argTypes.length > 0
    ? javaMeta.argTypes.slice()
    : Array.isArray(meta.argTypes) && meta.argTypes.length > 0
      ? meta.argTypes.slice()
      : ['int[]'];
  return {
    returnType,
    argTypes,
    sigil: 'java'
  };
}

function normalizeJavaSignature(rawSignature, returnType, argTypes, argNames) {
  const cleaned = String(rawSignature || '').trim().replace(/^public\s+static\s+/i, '').replace(/^static\s+/i, '');
  if (/^[\w\[\]<>?,\s]+solve\s*\(/.test(cleaned)) {
    return cleaned;
  }
  return buildJavaSignature(returnType, argTypes, argNames);
}

function buildTaskFromParts({
  category,
  difficulty,
  title,
  prompt,
  signature,
  argNames,
  returnType,
  argTypes,
  starterBody,
  solutionBody,
  hints,
  explanation,
  tests,
  strategy = 'simple',
  tags = [],
  family,
  logicType,
  structureType,
  answerFormat,
  thinkingStyle,
  context,
  contexts,
  constraints,
  variationNotes,
  challengeType = 'practice',
  seed = title,
  createdAt = null
}) {
  const normalizedReturnType = normalizeJavaType(returnType);
  const normalizedArgTypes = argTypes.map(normalizeJavaType);
  const javaSignature = normalizeJavaSignature(signature, normalizedReturnType, normalizedArgTypes, argNames);
  const variation = buildVariationProfile({
    kernelId: JAVA_KERNEL_META.id,
    category,
    difficulty,
    title,
    prompt,
    signature: javaSignature,
    returnType: normalizedReturnType,
    argTypes: normalizedArgTypes,
    argNames,
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
    signature: javaSignature,
    starterCode: javaClassCode(javaSignature, starterBody),
    solution: javaClassCode(javaSignature, solutionBody),
    hints,
    explanation,
    tests,
    strategy,
    tags: variation.tags,
    challengeType,
    seed: variation.seed,
    createdAt,
    meta: {
      java: {
        returnType: normalizedReturnType,
        argTypes: normalizedArgTypes.slice()
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

function javaRuntimeAvailable() {
  if (cachedJavaRuntime) {
    return cachedJavaRuntime.available;
  }

  const commands = [
    { java: 'java', javac: 'javac' }
  ];

  for (const candidate of commands) {
    const javaProbe = spawnSync(candidate.java, ['--version'], { encoding: 'utf8', windowsHide: true });
    const javacProbe = spawnSync(candidate.javac, ['--version'], { encoding: 'utf8', windowsHide: true });
    if (javaProbe.status === 0 && javacProbe.status === 0) {
      cachedJavaRuntime = {
        available: true,
        java: candidate.java,
        javac: candidate.javac
      };
      return true;
    }
  }

  cachedJavaRuntime = {
    available: false,
    java: 'java',
    javac: 'javac'
  };
  return false;
}

function getJavaRuntime() {
  if (!cachedJavaRuntime) {
    javaRuntimeAvailable();
  }
  return cachedJavaRuntime;
}

function buildJavaRunnerSource(task, returnType, argTypes) {
  const tests = Array.isArray(task.tests) ? task.tests : [];

  const testBlocks = tests.map((test, index) => {
    const argDecls = (test.args || []).map((arg, argIndex) => `        ${argTypes[argIndex]} arg${index}_${argIndex} = ${javaLiteral(arg, argTypes[argIndex])};`);
    const expectedDecl = `        ${returnType} expected${index} = ${javaLiteral(test.expected, returnType)};`;
    const callArgs = argTypes.map((_, argIndex) => `arg${index}_${argIndex}`).join(', ');
    const actualDecl = `        ${returnType} actual${index} = Solution.solve(${callArgs});`;
    const compareExpr = javaCompareExpression(`actual${index}`, `expected${index}`, returnType);
    return [
      '      {',
      ...argDecls,
      expectedDecl,
      '        try {',
      actualDecl,
      `          boolean passed${index} = ${compareExpr};`,
      `          if (!passed${index} && firstError == null) {`,
      `            firstError = expectedActualMessage(expected${index}, actual${index});`,
      '          }',
      `          passed = passed && passed${index};`,
      `          results.add(testResult(passed${index}, expected${index}, actual${index}, passed${index} ? null : expectedActualMessage(expected${index}, actual${index})));`,
      '        } catch (Throwable error) {',
      '          passed = false;',
      '          String message = formatThrowable(error);',
      '          if (firstError == null) {',
      '            firstError = message;',
      '          }',
      `          results.add(testResult(false, expected${index}, null, message));`,
      '        }',
      '      }'
    ].join('\n');
  }).join('\n');

  return [
    'import java.io.*;',
    'import java.nio.charset.StandardCharsets;',
    'import java.util.*;',
    '',
    'public class Runner {',
    '  private static String escapeJson(String value) {',
    '    return value',
    `        .replace(${JSON.stringify('\\')}, ${JSON.stringify('\\\\')})`,
    `        .replace(${JSON.stringify('"')}, ${JSON.stringify('\\"')})`,
    `        .replace(${JSON.stringify('\b')}, ${JSON.stringify('\\b')})`,
    `        .replace(${JSON.stringify('\f')}, ${JSON.stringify('\\f')})`,
    `        .replace(${JSON.stringify('\n')}, ${JSON.stringify('\\n')})`,
    `        .replace(${JSON.stringify('\r')}, ${JSON.stringify('\\r')})`,
    `        .replace(${JSON.stringify('\t')}, ${JSON.stringify('\\t')});`,
    '  }',
    '',
    '  private static String toJson(Object value) {',
    '    if (value == null) {',
    '      return "null";',
    '    }',
    '    if (value instanceof String) {',
    `      return ${JSON.stringify('"')} + escapeJson((String) value) + ${JSON.stringify('"')};`,
    '    }',
    '    if (value instanceof Number || value instanceof Boolean) {',
    '      return String.valueOf(value);',
    '    }',
    '    if (value.getClass().isArray()) {',
    '      int length = java.lang.reflect.Array.getLength(value);',
    '      List<String> items = new ArrayList<>(length);',
    '      for (int index = 0; index < length; index += 1) {',
    '        items.add(toJson(java.lang.reflect.Array.get(value, index)));',
    '      }',
    '      return "[" + String.join(",", items) + "]";',
    '    }',
    '    if (value instanceof Iterable) {',
    '      List<String> items = new ArrayList<>();',
    '      for (Object item : (Iterable<?>) value) {',
    '        items.add(toJson(item));',
    '      }',
    '      return "[" + String.join(",", items) + "]";',
    '    }',
    '    if (value instanceof Map) {',
    '      List<String> items = new ArrayList<>();',
    '      for (Map.Entry<?, ?> entry : ((Map<?, ?>) value).entrySet()) {',
    '        items.add(toJson(String.valueOf(entry.getKey())) + ":" + toJson(entry.getValue()));',
    '      }',
    '      return "{" + String.join(",", items) + "}";',
    '    }',
    `    return ${JSON.stringify('"')} + escapeJson(String.valueOf(value)) + ${JSON.stringify('"')};`,
    '  }',
    '',
    '  private static Map<String, Object> testResult(boolean passed, Object expected, Object actual, String error) {',
    '    Map<String, Object> result = new LinkedHashMap<>();',
    '    result.put("passed", passed);',
    '    result.put("expected", expected);',
    '    result.put("actual", actual);',
    '    result.put("error", error);',
    '    return result;',
    '  }',
    '',
    '  private static Map<String, Object> logResult(String type, String text) {',
    '    Map<String, Object> result = new LinkedHashMap<>();',
    '    result.put("type", type);',
    '    result.put("text", text);',
    '    return result;',
    '  }',
    '',
    '  private static String formatThrowable(Throwable error) {',
    '    String message = error.getMessage();',
    '    if (message == null || message.isBlank()) {',
    '      message = error.toString();',
    '    }',
    '    return message;',
    '  }',
    '',
    '  private static String expectedActualMessage(Object expected, Object actual) {',
    '    return "expected " + toJson(expected) + ", got " + toJson(actual);',
    '  }',
    '',
    '  public static void main(String[] args) {',
    '    long start = System.currentTimeMillis();',
    '    PrintStream originalOut = System.out;',
    '    PrintStream originalErr = System.err;',
    '    ByteArrayOutputStream stdoutBuffer = new ByteArrayOutputStream();',
    '    ByteArrayOutputStream stderrBuffer = new ByteArrayOutputStream();',
    '    List<Map<String, Object>> results = new ArrayList<>();',
    '    boolean passed = true;',
    '    String firstError = null;',
    '    try {',
    '      System.setOut(new PrintStream(stdoutBuffer, true, StandardCharsets.UTF_8));',
    '      System.setErr(new PrintStream(stderrBuffer, true, StandardCharsets.UTF_8));',
    testBlocks,
    '    } catch (Throwable error) {',
    '      passed = false;',
    '      if (firstError == null) {',
    '        firstError = formatThrowable(error);',
    '      }',
    '    } finally {',
    '      System.setOut(originalOut);',
    '      System.setErr(originalErr);',
    '    }',
    '    List<Map<String, Object>> logs = new ArrayList<>();',
    '    String stdoutText = stdoutBuffer.toString(StandardCharsets.UTF_8).trim();',
    '    String stderrText = stderrBuffer.toString(StandardCharsets.UTF_8).trim();',
    '    if (!stdoutText.isEmpty()) {',
    '      logs.add(logResult("stdout", stdoutText));',
    '    }',
    '    if (!stderrText.isEmpty()) {',
    '      logs.add(logResult("stderr", stderrText));',
    '    }',
    '    Map<String, Object> payload = new LinkedHashMap<>();',
    '    payload.put("passed", passed && results.stream().allMatch((item) -> Boolean.TRUE.equals(item.get("passed"))));',
    '    payload.put("error", (passed && results.stream().allMatch((item) -> Boolean.TRUE.equals(item.get("passed")))) ? null : (firstError == null ? "Тест не пройден" : firstError));',
    '    payload.put("tests", results);',
    '    payload.put("logs", logs);',
    '    payload.put("durationMs", System.currentTimeMillis() - start);',
    '    originalOut.println(toJson(payload));',
    '  }',
    '}'
  ].join('\n');
}

function runTaskTests(task, userCode) {
  const start = Date.now();
  const runtime = getJavaRuntime();
  if (!runtime.available) {
    return Promise.resolve({
      passed: false,
      error: 'JDK не найден. Для Java-ядра нужны команды `java` и `javac`.',
      tests: [],
      logs: [],
      durationMs: 0
    });
  }

  const meta = buildJavaCustomMeta(task.meta || {});
  const returnType = task.meta?.java?.returnType || meta.returnType || 'int[]';
  const argTypes = Array.isArray(task.meta?.java?.argTypes) && task.meta.java.argTypes.length > 0
    ? task.meta.java.argTypes.slice()
    : meta.argTypes.slice();

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'js-infinite-trainer-java-'));
  const solutionPath = path.join(workDir, 'Solution.java');
  const runnerPath = path.join(workDir, 'Runner.java');

  try {
    fs.writeFileSync(solutionPath, String(userCode || ''), 'utf8');
    fs.writeFileSync(runnerPath, buildJavaRunnerSource(task, returnType, argTypes), 'utf8');

    const compile = spawnSync(runtime.javac, ['-encoding', 'UTF-8', 'Solution.java', 'Runner.java'], {
      cwd: workDir,
      encoding: 'utf8',
      windowsHide: true,
      timeout: NATIVE_COMPILE_TIMEOUT_MS,
      env: buildSafeProcessEnv(),
      maxBuffer: 16 * 1024 * 1024
    });

    if (compile.status !== 0) {
      const message = (compile.stderr || compile.stdout || '').trim() || 'Java compilation failed';
      return Promise.resolve({
        passed: false,
        error: message,
        tests: [],
        logs: [],
        durationMs: Date.now() - start
      });
    }

    const exec = spawnSync(runtime.java, ['-Dfile.encoding=UTF-8', '-cp', workDir, 'Runner'], {
      cwd: workDir,
      encoding: 'utf8',
      windowsHide: true,
      timeout: NATIVE_RUN_TIMEOUT_MS,
      env: buildSafeProcessEnv(),
      maxBuffer: 16 * 1024 * 1024
    });

    const rawOutput = (exec.stdout || '').trim();
    if (!rawOutput) {
      const message = (exec.stderr || '').trim() || 'Java runner returned no output';
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
        error: `Не удалось разобрать вывод Java-раннера: ${error.message || String(error)}`,
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

function buildJavaSolutionCode(returnType, argTypes, argNames, bodyLines, extraImports = []) {
  const methodSignature = buildJavaSignature(returnType, argTypes, argNames);
  const imports = ['import java.util.*;', 'import java.util.function.*;'];
  for (const line of extraImports) {
    if (!imports.includes(line)) {
      imports.push(line);
    }
  }
  const lines = Array.isArray(bodyLines) ? bodyLines : String(bodyLines).split(/\r?\n/);
  return [
    ...imports,
    '',
    'public class Solution {',
    `  public static ${methodSignature} {`,
    ...lines.map((line) => `    ${line}`),
    '  }',
    '}'
  ].join('\n');
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
    extraImports = []
  } = options;

  const signature = buildJavaSignature(returnType, argTypes, argNames);
  return buildTaskFromParts({
    category,
    difficulty,
    title,
    prompt,
    signature,
    argNames,
    returnType,
    argTypes,
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
    createdAt: options.createdAt || null
  });
}

function buildArraysTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const values = sampleNumbers(rng, rng.int(5, 7), 0, 20);
      const title = 'Разворот массива';
      const prompt = `Дан массив values = ${JSON.stringify(values)}. Верни его в обратном порядке.`;
      return buildTask({
        category: 'arrays',
        difficulty,
        title,
        prompt,
        returnType: 'int[]',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['return new int[0];'],
        solutionBody: [
          'int[] result = new int[values.length];',
          'for (int index = 0; index < values.length; index += 1) {',
          '  result[index] = values[values.length - 1 - index];',
          '}',
          'return result;'
        ],
        hints: ['Пройди по массиву слева направо и заполняй новый массив с конца.', 'Можно использовать один цикл и индекс `values.length - 1 - index`.'],
        explanation: 'Базовая задача на индексы и создание нового массива.',
        tests: [{ args: [values], expected: reverseArray(values) }],
        strategy: 'arrays',
        tags: ['reverse', 'indexing'],
        challengeType: 'practice',
        seed: `arrays-easy-reverse-${values.join(',')}`
      });
    }
    case 'medium': {
      const values = sampleNumbers(rng, rng.int(6, 8), -10, 20, true);
      const shift = rng.int(1, Math.max(1, values.length - 1));
      const title = 'Циклический сдвиг';
      const prompt = `Дан массив values = ${JSON.stringify(values)} и shift = ${shift}. Сдвинь массив влево на shift позиций.`;
      return buildTask({
        category: 'arrays',
        difficulty,
        title,
        prompt,
        returnType: 'int[]',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'shift'],
        starterBody: ['return new int[0];'],
        solutionBody: [
          'if (values.length == 0) {',
          '  return new int[0];',
          '}',
          'int normalized = ((shift % values.length) + values.length) % values.length;',
          'int[] result = new int[values.length];',
          'for (int index = 0; index < values.length; index += 1) {',
          '  result[index] = values[(index + normalized) % values.length];',
          '}',
          'return result;'
        ],
        hints: ['Нормализуй shift по длине массива.', 'Элементы можно копировать по формуле `(index + shift) % length`.'],
        explanation: 'Сдвиги часто нужны в циклических буферах и слайдерах.',
        tests: [{ args: [values, shift], expected: rotateLeft(values, shift) }],
        strategy: 'arrays',
        tags: ['rotate', 'modulo'],
        challengeType: 'practice',
        seed: `arrays-medium-rotate-${values.join(',')}:${shift}`
      });
    }
    case 'hard': {
      const values = sampleNumbers(rng, rng.int(7, 10), 0, 30);
      const noisy = values.concat(values.slice(0, 2));
      const title = 'Уникальные значения';
      const prompt = `Дан массив values = ${JSON.stringify(noisy)}. Удали дубликаты, сохранив первый порядок появления.`;
      return buildTask({
        category: 'arrays',
        difficulty,
        title,
        prompt,
        returnType: 'int[]',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['return new int[0];'],
        solutionBody: [
          'Set<Integer> seen = new LinkedHashSet<>();',
          'for (int value : values) {',
          '  seen.add(value);',
          '}',
          'int[] result = new int[seen.size()];',
          'int index = 0;',
          'for (int value : seen) {',
          '  result[index++] = value;',
          '}',
          'return result;'
        ],
        hints: ['`LinkedHashSet` сохраняет порядок вставки.', 'Сначала собери уникальные значения, потом переложи их в массив.'],
        explanation: 'Задача проверяет работу с множествами и сохранением порядка.',
        tests: [{ args: [noisy], expected: dedupePreserveOrder(noisy) }],
        strategy: 'arrays',
        tags: ['unique', 'set'],
        challengeType: 'practice',
        seed: `arrays-hard-unique-${noisy.join(',')}`
      });
    }
    default: {
      const values = sampleNumbers(rng, rng.int(8, 10), -5, 20, true);
      const window = Math.min(rng.int(2, 4), values.length);
      const title = 'Максимум в окне';
      const prompt = `Дан массив values = ${JSON.stringify(values)} и window = ${window}. Верни массив максимумов для каждого окна размера window.`;
      return buildTask({
        category: 'arrays',
        difficulty,
        title,
        prompt,
        returnType: 'int[]',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'window'],
        starterBody: ['return new int[0];'],
        solutionBody: [
          'if (window <= 0 || values.length < window) {',
          '  return new int[0];',
          '}',
          'int[] result = new int[values.length - window + 1];',
          'for (int start = 0; start <= values.length - window; start += 1) {',
          '  int best = values[start];',
          '  for (int index = start + 1; index < start + window; index += 1) {',
          '    best = Math.max(best, values[index]);',
          '  }',
          '  result[start] = best;',
          '}',
          'return result;'
        ],
        hints: ['Для каждого окна находи максимум среди его элементов.', 'Сначала посмотри на простой двойной цикл, а потом можно думать об оптимизации.'],
        explanation: 'Это классическая задача на скользящее окно.',
        tests: [{ args: [values, window], expected: slidingWindowMax(values, window) }],
        strategy: 'arrays',
        tags: ['window', 'max'],
        challengeType: 'practice',
        seed: `arrays-expert-window-${values.join(',')}:${window}`
      });
    }
  }
}

function buildStringsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const text = sampleText(rng, rng.int(5, 7));
      const title = 'Нормализация пробелов';
      const prompt = `Дана строка text = ${JSON.stringify(text)}. Убери лишние пробелы по краям и внутри строки.`;
      return buildTask({
        category: 'strings',
        difficulty,
        title,
        prompt,
        returnType: 'String',
        argTypes: ['String'],
        argNames: ['text'],
        starterBody: ['return "";'],
        solutionBody: ['return text.trim().replaceAll("\\\\s+", " ");'],
        hints: ['`trim()` убирает пробелы по краям.', 'Для внутренних пробелов подойдёт `replaceAll("\\s+", " ")`.'],
        explanation: 'Строковая нормализация часто нужна перед анализом текста.',
        tests: [{ args: [text], expected: normalizeSpaces(text) }],
        strategy: 'strings',
        tags: ['trim', 'regex'],
        challengeType: 'practice',
        seed: `strings-easy-normalize-${text}`
      });
    }
    case 'medium': {
      const text = sampleDelimitedText(rng, rng.int(4, 6));
      const title = 'Перестановка слов';
      const prompt = `Дана строка text = ${JSON.stringify(text)}. Верни слова в обратном порядке.`;
      return buildTask({
        category: 'strings',
        difficulty,
        title,
        prompt,
        returnType: 'String',
        argTypes: ['String'],
        argNames: ['text'],
        starterBody: ['return "";'],
        solutionBody: [
          'String[] words = text.trim().split("\\\\s+");',
          'Collections.reverse(Arrays.asList(words));',
          'return String.join(" ", words);'
        ],
        hints: ['Сначала разбей строку на слова, потом разверни массив слов.', 'В Java удобно использовать `Collections.reverse(Arrays.asList(words))`.'],
        explanation: 'Обратный порядок слов часто нужен в обработке текста и парсерах.',
        tests: [{ args: [text], expected: reverseWords(text) }],
        strategy: 'strings',
        tags: ['reverse', 'split'],
        challengeType: 'practice',
        seed: `strings-medium-reverse-${text}`
      });
    }
    case 'hard': {
      const text = rng.bool(0.5) ? 'А роза упала на лапу Азора' : 'Never odd or even';
      const title = 'Палиндром';
      const prompt = `Дана строка text = ${JSON.stringify(text)}. Верни true, если это палиндром, иначе false. Игнорируй пробелы и знаки препинания.`;
      return buildTask({
        category: 'strings',
        difficulty,
        title,
        prompt,
        returnType: 'boolean',
        argTypes: ['String'],
        argNames: ['text'],
        starterBody: ['return false;'],
        solutionBody: [
          'String cleaned = text.toLowerCase().replaceAll("[^a-z0-9\\\\p{IsCyrillic}]", "");',
          'return cleaned.equals(new StringBuilder(cleaned).reverse().toString());'
        ],
        hints: ['Приведи строку к одному регистру и убери все лишние символы.', 'После очистки сравни строку с её обратной версией.'],
        explanation: 'Проверка на палиндром - базовая задача на работу со строками и регулярными выражениями.',
        tests: [{ args: [text], expected: isPalindromeText(text) }],
        strategy: 'strings',
        tags: ['palindrome', 'regex'],
        challengeType: 'practice',
        seed: `strings-hard-palindrome-${text}`
      });
    }
    default: {
      const text = sampleDelimitedText(rng, rng.int(5, 7));
      const title = 'RLE-сжатие';
      const prompt = `Дана строка text = ${JSON.stringify(text)}. Сожми её в формате символ+количество подряд идущих повторов.`;
      return buildTask({
        category: 'strings',
        difficulty,
        title,
        prompt,
        returnType: 'String',
        argTypes: ['String'],
        argNames: ['text'],
        starterBody: ['return "";'],
        solutionBody: [
          'if (text.isEmpty()) {',
          '  return "";',
          '}',
          'StringBuilder builder = new StringBuilder();',
          'char current = text.charAt(0);',
          'int count = 1;',
          'for (int index = 1; index < text.length(); index += 1) {',
          '  char ch = text.charAt(index);',
          '  if (ch == current) {',
          '    count += 1;',
          '    continue;',
          '  }',
          '  builder.append(current).append(count);',
          '  current = ch;',
          '  count = 1;',
          '}',
          'builder.append(current).append(count);',
          'return builder.toString();'
        ],
        hints: ['Собирай подряд идущие одинаковые символы в одну серию.', 'Подойдёт `StringBuilder` и счётчик повторов.'],
        explanation: 'Сжатие длинных повторов - полезная база для текстовых алгоритмов.',
        tests: [{ args: [text], expected: runLengthEncode(text) }],
        strategy: 'strings',
        tags: ['compression', 'rle'],
        challengeType: 'practice',
        seed: `strings-expert-rle-${text}`
      });
    }
  }
}

function buildCollectionsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const values = sampleWords(rng, rng.int(5, 7)).concat(sampleWords(rng, 2));
      const title = 'Уникальные слова';
      const prompt = `Дан массив слов values = ${JSON.stringify(values)}. Верни уникальные слова в алфавитном порядке.`;
      return buildTask({
        category: 'collections',
        difficulty,
        title,
        prompt,
        returnType: 'String[]',
        argTypes: ['String[]'],
        argNames: ['values'],
        starterBody: ['return new String[0];'],
        solutionBody: [
          'Set<String> unique = new TreeSet<>(Arrays.asList(values));',
          'return unique.toArray(new String[0]);'
        ],
        hints: ['`TreeSet` хранит элементы без дублей и сразу сортирует их.', 'Можно сначала собрать множество, а потом вернуть массив.'],
        explanation: 'Коллекции в Java часто решают задачу уникализации и сортировки одним выражением.',
        tests: [{ args: [values], expected: uniqueSortedStrings(values) }],
        strategy: 'collections',
        tags: ['set', 'sort'],
        challengeType: 'practice',
        seed: `collections-easy-unique-${values.join(',')}`
      });
    }
    case 'medium': {
      const values = sampleWords(rng, rng.int(6, 8));
      const title = 'Частоты по первой букве';
      const prompt = `Дан массив слов values = ${JSON.stringify(values)}. Верни массив строк вида "буква=количество" по алфавиту.`;
      return buildTask({
        category: 'collections',
        difficulty,
        title,
        prompt,
        returnType: 'String[]',
        argTypes: ['String[]'],
        argNames: ['values'],
        starterBody: ['return new String[0];'],
        solutionBody: [
          'Map<Character, Integer> counts = new TreeMap<>();',
          'for (String word : values) {',
          '  char key = Character.toLowerCase(word.charAt(0));',
          '  counts.put(key, counts.getOrDefault(key, 0) + 1);',
          '}',
          'String[] result = new String[counts.size()];',
          'int index = 0;',
          'for (Map.Entry<Character, Integer> entry : counts.entrySet()) {',
          '  result[index++] = entry.getKey() + "=" + entry.getValue();',
          '}',
          'return result;'
        ],
        hints: ['Сначала посчитай количество слов на каждую букву.', 'Удобно использовать `TreeMap`, чтобы ключи были в нужном порядке.'],
        explanation: 'Это хорошая практика для подсчёта частот и форматирования отчёта.',
        tests: [{ args: [values], expected: countByInitialSummary(values) }],
        strategy: 'collections',
        tags: ['map', 'frequency'],
        challengeType: 'practice',
        seed: `collections-medium-count-${values.join(',')}`
      });
    }
    case 'hard': {
      const values = sampleWords(rng, rng.int(6, 8)).concat(sampleWords(rng, 2));
      const title = 'Сортировка по длине';
      const prompt = `Дан массив values = ${JSON.stringify(values)}. Отсортируй слова по длине, а при равной длине - по алфавиту.`;
      return buildTask({
        category: 'collections',
        difficulty,
        title,
        prompt,
        returnType: 'String[]',
        argTypes: ['String[]'],
        argNames: ['values'],
        starterBody: ['return new String[0];'],
        solutionBody: [
          'String[] result = values.clone();',
          'Arrays.sort(result, (left, right) -> {',
          '  int lengthDiff = left.length() - right.length();',
          '  return lengthDiff != 0 ? lengthDiff : left.compareTo(right);',
          '});',
          'return result;'
        ],
        hints: ['`Arrays.sort` умеет сортировать массив строк с компаратором.', 'Сначала сравни длину, потом строки лексикографически.'],
        explanation: 'Компараторы - важнейший инструмент для коллекций в Java.',
        tests: [{ args: [values], expected: sortByLengthThenLex(values) }],
        strategy: 'collections',
        tags: ['sort', 'comparator'],
        challengeType: 'practice',
        seed: `collections-hard-sort-${values.join(',')}`
      });
    }
    default: {
      const values = sampleWords(rng, rng.int(7, 10));
      const k = rng.int(2, Math.min(4, values.length));
      const title = 'Top-K слов';
      const prompt = `Дан массив values = ${JSON.stringify(values)} и k = ${k}. Верни k самых частых слов, сортируя по частоте убыванию и алфавиту при равенстве.`;
      return buildTask({
        category: 'collections',
        difficulty,
        title,
        prompt,
        returnType: 'String[]',
        argTypes: ['String[]', 'int'],
        argNames: ['values', 'k'],
        starterBody: ['return new String[0];'],
        solutionBody: [
          'Map<String, Integer> counts = new HashMap<>();',
          'for (String word : values) {',
          '  counts.put(word, counts.getOrDefault(word, 0) + 1);',
          '}',
          'List<String> ordered = new ArrayList<>(counts.keySet());',
          'ordered.sort((left, right) -> {',
          '  int freqDiff = counts.get(right) - counts.get(left);',
          '  return freqDiff != 0 ? freqDiff : left.compareTo(right);',
          '});',
          'return ordered.subList(0, Math.min(k, ordered.size())).toArray(new String[0]);'
        ],
        hints: ['Сначала посчитай частоты, потом отсортируй ключи по правилу частоты и алфавита.', 'Если элементов меньше, чем k, верни все доступные.'],
        explanation: 'Top-K - очень частая задача на коллекции и карты.',
        tests: [{ args: [values, k], expected: topKFrequentWords(values, k) }],
        strategy: 'collections',
        tags: ['top-k', 'frequency'],
        challengeType: 'practice',
        seed: `collections-expert-topk-${values.join(',')}:${k}`
      });
    }
  }
}

function buildRecursionTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const value = rng.int(4, 7);
      const title = 'Факториал';
      const prompt = `Дано число value = ${value}. Верни его факториал с помощью рекурсии.`;
      return buildTask({
        category: 'recursion',
        difficulty,
        title,
        prompt,
        returnType: 'int',
        argTypes: ['int'],
        argNames: ['value'],
        starterBody: ['return 0;'],
        solutionBody: [
          'if (value <= 1) {',
          '  return 1;',
          '}',
          'return value * solve(value - 1);'
        ],
        hints: ['База рекурсии для факториала - 0 и 1.', 'Каждый шаг уменьшает число на 1.'],
        explanation: 'Факториал - классический пример рекурсии.',
        tests: [{ args: [value], expected: factorial(value) }],
        strategy: 'recursion',
        tags: ['factorial', 'recursion'],
        challengeType: 'practice',
        seed: `recursion-easy-factorial-${value}`
      });
    }
    case 'medium': {
      const value = rng.int(1000, 987654);
      const title = 'Сумма цифр';
      const prompt = `Дано число value = ${value}. Верни сумму его цифр рекурсивно.`;
      return buildTask({
        category: 'recursion',
        difficulty,
        title,
        prompt,
        returnType: 'int',
        argTypes: ['int'],
        argNames: ['value'],
        starterBody: ['return 0;'],
        solutionBody: [
          'int normalized = Math.abs(value);',
          'if (normalized < 10) {',
          '  return normalized;',
          '}',
          'return (normalized % 10) + solve(normalized / 10);'
        ],
        hints: ['Своди число к последней цифре и остатку без неё.', 'Не забудь обработать отрицательные числа через `Math.abs`.'],
        explanation: 'Сумма цифр - ещё одна базовая задача на рекурсию.',
        tests: [{ args: [value], expected: sumDigits(value) }],
        strategy: 'recursion',
        tags: ['digits', 'recursion'],
        challengeType: 'practice',
        seed: `recursion-medium-digits-${value}`
      });
    }
    case 'hard': {
      const base = rng.int(2, 5);
      const exponent = rng.int(3, 7);
      const title = 'Степень числа';
      const prompt = `Даны base = ${base} и exponent = ${exponent}. Верни base^exponent через рекурсию.`;
      return buildTask({
        category: 'recursion',
        difficulty,
        title,
        prompt,
        returnType: 'int',
        argTypes: ['int', 'int'],
        argNames: ['base', 'exponent'],
        starterBody: ['return 0;'],
        solutionBody: [
          'if (exponent < 0) {',
          '  throw new IllegalArgumentException("exponent must be non-negative");',
          '}',
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
        hints: ['Используй быстрое возведение в степень: дели показатель пополам.', 'Если показатель нечётный, домножай результат на base ещё раз.'],
        explanation: 'Быстрая рекурсия по степени даёт логарифмическую глубину стека.',
        tests: [{ args: [base, exponent], expected: recursivePower(base, exponent) }],
        strategy: 'recursion',
        tags: ['power', 'recursion'],
        challengeType: 'practice',
        seed: `recursion-hard-power-${base}:${exponent}`
      });
    }
    default: {
      const values = sampleNumbers(rng, rng.int(7, 10), -5, 30, true);
      const title = 'Рекурсивная сортировка';
      const prompt = `Дан массив values = ${JSON.stringify(values)}. Верни его отсортированную копию с помощью рекурсивного разбиения массива.`;
      return buildTask({
        category: 'recursion',
        difficulty,
        title,
        prompt,
        returnType: 'int[]',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['return values.clone();'],
        solutionBody: [
          'if (values.length <= 1) {',
          '  return values.clone();',
          '}',
          'int middle = values.length / 2;',
          'int[] left = solve(Arrays.copyOfRange(values, 0, middle));',
          'int[] right = solve(Arrays.copyOfRange(values, middle, values.length));',
          'int[] merged = new int[values.length];',
          'int leftIndex = 0;',
          'int rightIndex = 0;',
          'int mergedIndex = 0;',
          'while (leftIndex < left.length && rightIndex < right.length) {',
          '  if (left[leftIndex] <= right[rightIndex]) {',
          '    merged[mergedIndex++] = left[leftIndex++];',
          '  } else {',
          '    merged[mergedIndex++] = right[rightIndex++];',
          '  }',
          '}',
          'while (leftIndex < left.length) {',
          '  merged[mergedIndex++] = left[leftIndex++];',
          '}',
          'while (rightIndex < right.length) {',
          '  merged[mergedIndex++] = right[rightIndex++];',
          '}',
          'return merged;'
        ],
        hints: ['Разделяй массив на две части и рекурсивно сортируй каждую.', 'Потом аккуратно слей две отсортированные половины.'],
        explanation: 'Рекурсивная сортировка учит делить задачу на подзадачи одного типа.',
        tests: [{ args: [values], expected: mergeSort(values) }],
        strategy: 'recursion',
        tags: ['merge-sort', 'recursion'],
        challengeType: 'practice',
        seed: `recursion-expert-merge-${values.join(',')}`
      });
    }
  }
}

function buildAlgorithmsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const values = sampleNumbers(rng, rng.int(5, 7), -10, 20, true);
      const title = 'Максимальная сумма';
      const prompt = `Дан массив values = ${JSON.stringify(values)}. Верни максимальную сумму непрерывного подмассива.`;
      return buildTask({
        category: 'algorithms',
        difficulty,
        title,
        prompt,
        returnType: 'int',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['return 0;'],
        solutionBody: [
          'int best = values[0];',
          'int current = values[0];',
          'for (int index = 1; index < values.length; index += 1) {',
          '  current = Math.max(values[index], current + values[index]);',
          '  best = Math.max(best, current);',
          '}',
          'return best;'
        ],
        hints: ['Поддерживай текущую лучшую сумму, заканчивающуюся в текущей позиции.', 'Если текущая сумма стала хуже самого элемента, начни заново.'],
        explanation: 'Это классический алгоритм Кадане.',
        tests: [{ args: [values], expected: maxSubarray(values) }],
        strategy: 'algorithm',
        tags: ['kadane', 'sum'],
        challengeType: 'practice',
        seed: `algorithms-easy-maxsub-${values.join(',')}`
      });
    }
    case 'medium': {
      const values = sampleNumbers(rng, rng.int(6, 9), 0, 20);
      const title = 'Длина возрастающей серии';
      const prompt = `Дан массив values = ${JSON.stringify(values)}. Верни длину самой длинной возрастающей подряд серии.`;
      return buildTask({
        category: 'algorithms',
        difficulty,
        title,
        prompt,
        returnType: 'int',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['return 0;'],
        solutionBody: [
          'if (values.length == 0) {',
          '  return 0;',
          '}',
          'int best = 1;',
          'int streak = 1;',
          'for (int index = 1; index < values.length; index += 1) {',
          '  if (values[index] > values[index - 1]) {',
          '    streak += 1;',
          '  } else {',
          '    streak = 1;',
          '  }',
          '  best = Math.max(best, streak);',
          '}',
          'return best;'
        ],
        hints: ['Сравни каждый элемент с предыдущим.', 'Если серия прервалась, сбрасывай счётчик.'],
        explanation: 'Подобные задачи часто встречаются в анализе временных рядов.',
        tests: [{ args: [values], expected: longestIncreasingStreak(values) }],
        strategy: 'algorithm',
        tags: ['streak', 'scan'],
        challengeType: 'practice',
        seed: `algorithms-medium-streak-${values.join(',')}`
      });
    }
    case 'hard': {
      const values = sampleNumbers(rng, rng.int(6, 9), 0, 20);
      const pairA = rng.int(0, values.length - 2);
      const pairB = rng.int(pairA + 1, values.length - 1);
      const target = values[pairA] + values[pairB];
      const title = 'Два числа';
      const prompt = `Дан массив values = ${JSON.stringify(values)} и target = ${target}. Верни индексы двух чисел, сумма которых равна target.`;
      return buildTask({
        category: 'algorithms',
        difficulty,
        title,
        prompt,
        returnType: 'int[]',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'target'],
        starterBody: ['return new int[0];'],
        solutionBody: [
          'Map<Integer, Integer> seen = new HashMap<>();',
          'for (int index = 0; index < values.length; index += 1) {',
          '  int value = values[index];',
          '  int complement = target - value;',
          '  if (seen.containsKey(complement)) {',
          '    return new int[]{seen.get(complement), index};',
          '  }',
          '  seen.putIfAbsent(value, index);',
          '}',
          'return new int[]{-1, -1};'
        ],
        hints: ['Сохраняй уже увиденные числа в `HashMap`.', 'Если для текущего числа есть дополнение, сразу верни пару индексов.'],
        explanation: 'Two Sum - одна из самых известных задач на словарь и один проход.',
        tests: [{ args: [values, target], expected: twoSumIndices(values, target) }],
        strategy: 'algorithm',
        tags: ['hashmap', 'twosum'],
        challengeType: 'practice',
        seed: `algorithms-hard-two-sum-${values.join(',')}:${target}`
      });
    }
    default: {
      const values = sampleNumbers(rng, rng.int(6, 9), 0, 20);
      const title = 'Префиксные суммы';
      const prompt = `Дан массив values = ${JSON.stringify(values)}. Верни массив префиксных сумм.`;
      return buildTask({
        category: 'algorithms',
        difficulty,
        title,
        prompt,
        returnType: 'int[]',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['return new int[0];'],
        solutionBody: [
          'int[] result = new int[values.length];',
          'int total = 0;',
          'for (int index = 0; index < values.length; index += 1) {',
          '  total += values[index];',
          '  result[index] = total;',
          '}',
          'return result;'
        ],
        hints: ['Считай сумму слева направо и записывай её после каждого шага.', 'Каждый следующий элемент зависит от предыдущего.'],
        explanation: 'Префиксные суммы используются в очень многих быстрых алгоритмах.',
        tests: [{ args: [values], expected: prefixSums(values) }],
        strategy: 'algorithm',
        tags: ['prefix-sum', 'scan'],
        challengeType: 'practice',
        seed: `algorithms-expert-prefix-${values.join(',')}`
      });
    }
  }
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

function buildArraysTaskExpanded(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const values = sampleNumbers(rng, rng.int(4, 7), 0, 20);
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Prefix sums',
        prompt: `Given values = ${JSON.stringify(values)}, return the running prefix sums.`,
        returnType: 'int[]',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'int[] result = new int[values.length];',
          'int total = 0;',
          'for (int index = 0; index < values.length; index += 1) {',
          '  total += values[index];',
          '  result[index] = total;',
          '}',
          'return result;'
        ],
        hints: ['Keep a running total.', 'Store the accumulated value after each step.'],
        explanation: 'Prefix sums turn each position into the sum of everything before it.',
        tests: [{ args: [values], expected: prefixSums(values) }],
        strategy: 'arrays',
        tags: ['prefix-sums', 'running-total'],
        seed: `arrays-expanded-easy-prefix-${values.join(',')}`
      });
    }
    case 'medium': {
      const values = sampleNumbers(rng, rng.int(5, 8), -10, 20, true);
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Suffix sums',
        prompt: `Given values = ${JSON.stringify(values)}, return the suffix sums from right to left.`,
        returnType: 'int[]',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'int[] result = new int[values.length];',
          'int total = 0;',
          'for (int index = values.length - 1; index >= 0; index -= 1) {',
          '  total += values[index];',
          '  result[index] = total;',
          '}',
          'return result;'
        ],
        hints: ['Walk the array from the end.', 'Write the current total into the same index.'],
        explanation: 'Suffix sums are the mirrored version of prefix sums.',
        tests: [{ args: [values], expected: suffixSums(values) }],
        strategy: 'arrays',
        tags: ['suffix-sums', 'scan'],
        seed: `arrays-expanded-medium-suffix-${values.join(',')}`
      });
    }
    case 'hard': {
      const values = sampleNumbers(rng, rng.int(6, 9), -10, 20, true);
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Adjacent differences',
        prompt: `Given values = ${JSON.stringify(values)}, return the differences between neighboring elements.`,
        returnType: 'int[]',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'if (values.length < 2) {',
          '  return new int[0];',
          '}',
          'int[] result = new int[values.length - 1];',
          'for (int index = 1; index < values.length; index += 1) {',
          '  result[index - 1] = values[index] - values[index - 1];',
          '}',
          'return result;'
        ],
        hints: ['Every result element compares the current value with the previous one.', 'The output is one element shorter than the input.'],
        explanation: 'This pattern is useful for detecting changes and trends.',
        tests: [{ args: [values], expected: adjacentDifferences(values) }],
        strategy: 'arrays',
        tags: ['differences', 'scan'],
        seed: `arrays-expanded-hard-diff-${values.join(',')}`
      });
    }
    default: {
      const values = sampleNumbers(rng, rng.int(6, 10), -10, 25, true);
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Parity partition',
        prompt: `Given values = ${JSON.stringify(values)}, place all even numbers before odd numbers while keeping each group stable.`,
        returnType: 'int[]',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'List<Integer> evens = new ArrayList<>();',
          'List<Integer> odds = new ArrayList<>();',
          'for (int value : values) {',
          '  if (value % 2 == 0) {',
          '    evens.add(value);',
          '  } else {',
          '    odds.add(value);',
          '  }',
          '}',
          'int[] result = new int[values.length];',
          'int index = 0;',
          'for (int value : evens) {',
          '  result[index++] = value;',
          '}',
          'for (int value : odds) {',
          '  result[index++] = value;',
          '}',
          'return result;'
        ],
        hints: ['Split the input into two buckets.', 'Concatenate the even bucket with the odd bucket.'],
        explanation: 'Stable partitioning by parity is a nice exercise in array building.',
        tests: [{ args: [values], expected: partitionByParity(values) }],
        strategy: 'arrays',
        tags: ['parity', 'partition'],
        seed: `arrays-expanded-expert-parity-${values.join(',')}`
      });
    }
  }
}

function buildStringsTaskExpanded(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const text = `  ${sampleWords(rng, rng.int(4, 6)).join(rng.bool(0.5) ? '   ' : ' ')}  `;
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Normalize and lowercase',
        prompt: `Given text = ${JSON.stringify(text)}, trim it, collapse spaces, and lowercase everything.`,
        returnType: 'string',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: ['return text.trim().replaceAll("\\\\s+", " ").toLowerCase();'],
        hints: ['Trim first, then lowercase.', 'Collapse whitespace after normalization.'],
        explanation: 'This is a practical preprocessing step before text analysis.',
        tests: [{ args: [text], expected: normalizeSpaces(text).toLowerCase() }],
        strategy: 'strings',
        tags: ['normalize', 'lowercase'],
        seed: `strings-expanded-easy-normalize-${text}`
      });
    }
    case 'medium': {
      const text = `  ${shuffleCopy(rng, sampleWords(rng, rng.int(5, 7), true)).join('   ')}  `;
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Reverse words',
        prompt: `Given text = ${JSON.stringify(text)}, reverse the order of the words and normalize spaces.`,
        returnType: 'string',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'List<String> words = new ArrayList<>(Arrays.asList(text.trim().split("\\\\s+")));',
          'Collections.reverse(words);',
          'return String.join(" ", words);'
        ],
        hints: ['Split the text into words first.', 'Reverse the word list, not the characters.'],
        explanation: 'Word-order reversal is a common parsing and formatting exercise.',
        tests: [{ args: [text], expected: reverseWords(text) }],
        strategy: 'strings',
        tags: ['reverse', 'words'],
        seed: `strings-expanded-medium-reverse-${text}`
      });
    }
    case 'hard': {
      const text = sampleWords(rng, rng.int(5, 8), true).join('');
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Unique characters',
        prompt: `Given text = ${JSON.stringify(text)}, remove duplicate characters while keeping the first occurrence order.`,
        returnType: 'string',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'Set<Character> seen = new HashSet<>();',
          'StringBuilder result = new StringBuilder();',
          'for (char ch : text.toCharArray()) {',
          '  if (seen.add(ch)) {',
          '    result.append(ch);',
          '  }',
          '}',
          'return result.toString();'
        ],
        hints: ['Track characters you have already emitted.', 'Only append a character the first time you see it.'],
        explanation: 'This is a useful pattern when you need stable deduplication in text.',
        tests: [{ args: [text], expected: uniqueCharsPreserveOrder(text) }],
        strategy: 'strings',
        tags: ['unique', 'dedupe'],
        seed: `strings-expanded-hard-unique-${text}`
      });
    }
    default: {
      const text = `  ${sampleWords(rng, rng.int(5, 8)).join(rng.bool(0.5) ? '   ' : ' ')}  `;
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Word initials',
        prompt: `Given text = ${JSON.stringify(text)}, return the uppercase initials of all words.`,
        returnType: 'string',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'StringBuilder result = new StringBuilder();',
          'for (String word : text.trim().split("\\\\s+")) {',
          '  if (!word.isEmpty()) {',
          '    result.append(Character.toUpperCase(word.charAt(0)));',
          '  }',
          '}',
          'return result.toString();'
        ],
        hints: ['Read the words one by one.', 'Take the first character from each word and append it.'],
        explanation: 'Acronym-style extraction is a neat text-processing task.',
        tests: [{ args: [text], expected: wordInitials(text) }],
        strategy: 'strings',
        tags: ['initials', 'acronym'],
        seed: `strings-expanded-expert-initials-${text}`
      });
    }
  }
}

function buildCollectionsTaskExpanded(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const words = sampleWords(rng, rng.int(5, 7), true);
      return buildTask({
        category: 'collections',
        difficulty,
        title: 'Sort by last letter',
        prompt: `Given words = ${JSON.stringify(words)}, sort them by the last letter, then lexicographically.`,
        returnType: 'string[]',
        argTypes: ['string[]'],
        argNames: ['words'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'String[] result = words.clone();',
          'Arrays.sort(result, (left, right) -> {',
          '  int byLast = Character.compare(left.charAt(left.length() - 1), right.charAt(right.length() - 1));',
          '  return byLast != 0 ? byLast : left.compareTo(right);',
          '});',
          'return result;'
        ],
        hints: ['Use the last character as the main key.', 'Break ties with normal alphabetic order.'],
        explanation: 'This is a clean warm-up for custom comparators.',
        tests: [{ args: [words], expected: sortByLastThenLex(words) }],
        strategy: 'collections',
        tags: ['sorting', 'comparator'],
        seed: `collections-expanded-easy-last-${words.join(',')}`
      });
    }
    case 'medium': {
      const words = sampleWords(rng, rng.int(6, 8), true);
      return buildTask({
        category: 'collections',
        difficulty,
        title: 'Count by length',
        prompt: `Given words = ${JSON.stringify(words)}, return entries like "4:3" sorted by length.`,
        returnType: 'string[]',
        argTypes: ['string[]'],
        argNames: ['words'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'Map<Integer, Integer> counts = new TreeMap<>();',
          'for (String word : words) {',
          '  counts.put(word.length(), counts.getOrDefault(word.length(), 0) + 1);',
          '}',
          'String[] result = new String[counts.size()];',
          'int index = 0;',
          'for (Map.Entry<Integer, Integer> entry : counts.entrySet()) {',
          '  result[index++] = entry.getKey() + ":" + entry.getValue();',
          '}',
          'return result;'
        ],
        hints: ['Group words by their length.', 'A sorted dictionary keeps lengths in order automatically.'],
        explanation: 'Length-based summaries are a lightweight way to study distributions.',
        tests: [{ args: [words], expected: countByLengthSummary(words) }],
        strategy: 'collections',
        tags: ['grouping', 'summary'],
        seed: `collections-expanded-medium-length-${words.join(',')}`
      });
    }
    case 'hard': {
      const words = sampleWords(rng, rng.int(7, 10), true);
      const k = rng.int(2, Math.min(4, words.length));
      return buildTask({
        category: 'collections',
        difficulty,
        title: 'Top longest unique words',
        prompt: `Given words = ${JSON.stringify(words)} and k = ${k}, return the k longest unique words.`,
        returnType: 'string[]',
        argTypes: ['string[]', 'int'],
        argNames: ['words', 'k'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'LinkedHashSet<String> unique = new LinkedHashSet<>(Arrays.asList(words));',
          'List<String> ordered = new ArrayList<>(unique);',
          'ordered.sort((left, right) -> {',
          '  int byLength = Integer.compare(right.length(), left.length());',
          '  return byLength != 0 ? byLength : left.compareTo(right);',
          '});',
          'if (ordered.size() > k) {',
          '  ordered = ordered.subList(0, k);',
          '}',
          'return ordered.toArray(new String[0]);'
        ],
        hints: ['Remove duplicates before sorting.', 'Sort by length descending and alphabetically for ties.'],
        explanation: 'This mixes deduplication, ordering and limiting the output size.',
        tests: [{ args: [words, k], expected: topLongestUniqueWords(words, k) }],
        strategy: 'collections',
        tags: ['dedupe', 'top-k'],
        seed: `collections-expanded-hard-top-${words.join(',')}:${k}`
      });
    }
    default: {
      const words = sampleWords(rng, rng.int(6, 9), true);
      return buildTask({
        category: 'collections',
        difficulty,
        title: 'Initial frequency ranking',
        prompt: `Given words = ${JSON.stringify(words)}, summarize initials by frequency, then by letter.`,
        returnType: 'string[]',
        argTypes: ['string[]'],
        argNames: ['words'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'Map<Character, Integer> counts = new HashMap<>();',
          'for (String word : words) {',
          '  char initial = Character.toUpperCase(word.charAt(0));',
          '  counts.put(initial, counts.getOrDefault(initial, 0) + 1);',
          '}',
          'List<Map.Entry<Character, Integer>> ordered = new ArrayList<>(counts.entrySet());',
          'ordered.sort((left, right) -> {',
          '  int byCount = right.getValue().compareTo(left.getValue());',
          '  return byCount != 0 ? byCount : left.getKey().compareTo(right.getKey());',
          '});',
          'String[] result = new String[ordered.size()];',
          'int index = 0;',
          'for (Map.Entry<Character, Integer> entry : ordered) {',
          '  result[index++] = entry.getKey() + ":" + entry.getValue();',
          '}',
          'return result;'
        ],
        hints: ['Count initials first.', 'Then sort by frequency descending and by letter ascending.'],
        explanation: 'This is a compact ranking exercise for dictionary and sort usage.',
        tests: [{ args: [words], expected: countByInitialFrequency(words) }],
        strategy: 'collections',
        tags: ['frequency', 'ranking'],
        seed: `collections-expanded-expert-initials-${words.join(',')}`
      });
    }
  }
}

function buildRecursionTaskExpanded(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const values = sampleNumbers(rng, rng.int(5, 8), 0, 12, true);
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Recursive sum',
        prompt: `Given values = ${JSON.stringify(values)}, return the sum of all elements recursively.`,
        returnType: 'int',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'if (values.length == 0) {',
          '  return 0;',
          '}',
          'if (values.length == 1) {',
          '  return values[0];',
          '}',
          'return values[0] + solve(Arrays.copyOfRange(values, 1, values.length));'
        ],
        hints: ['Make the index part of the recursive state.', 'Stop when the index reaches the end of the array.'],
        explanation: 'This is a good warm-up for recursive traversal of a sequence.',
        tests: [{ args: [values], expected: values.reduce((sum, value) => sum + value, 0) }],
        strategy: 'recursion',
        tags: ['recursion', 'sum'],
        seed: `recursion-expanded-easy-sum-${values.join(',')}`
      });
    }
    case 'medium': {
      const text = sampleWords(rng, rng.int(5, 7), true).join(' ');
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Recursive reverse',
        prompt: `Given text = ${JSON.stringify(text)}, reverse the string recursively.`,
        returnType: 'string',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'if (text.length() <= 1) {',
          '  return text;',
          '}',
          'return solve(text.substring(1)) + text.charAt(0);'
        ],
        hints: ['The first character moves to the end.', 'Recurse on the substring without the first character.'],
        explanation: 'Recursive string reversal is a classic way to practice divide-and-conquer thinking.',
        tests: [{ args: [text], expected: recursiveStringReverse(text) }],
        strategy: 'recursion',
        tags: ['recursion', 'string'],
        seed: `recursion-expanded-medium-reverse-${text}`
      });
    }
    case 'hard': {
      const left = rng.int(12, 120);
      const right = rng.int(12, 120);
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Recursive gcd',
        prompt: `Given left = ${left} and right = ${right}, return their greatest common divisor recursively.`,
        returnType: 'int',
        argTypes: ['int', 'int'],
        argNames: ['left', 'right'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'if (right == 0) {',
          '  return Math.abs(left);',
          '}',
          'return solve(right, left % right);'
        ],
        hints: ['Use the Euclidean algorithm.', 'Keep calling the function with the remainder.'],
        explanation: 'GCD is one of the cleanest examples of recursion with a mathematical loop.',
        tests: [{ args: [left, right], expected: recursiveGcd(left, right) }],
        strategy: 'recursion',
        tags: ['recursion', 'gcd'],
        seed: `recursion-expanded-hard-gcd-${left}:${right}`
      });
    }
    default: {
      const n = rng.int(0, 10);
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Recursive fibonacci',
        prompt: `Given n = ${n}, return the nth Fibonacci number recursively.`,
        returnType: 'int',
        argTypes: ['int'],
        argNames: ['n'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'if (n <= 1) {',
          '  return n;',
          '}',
          'return solve(n - 1) + solve(n - 2);'
        ],
        hints: ['The base cases are 0 and 1.', 'Each number is the sum of the previous two.'],
        explanation: 'Fibonacci is intentionally expensive in naive recursive form, which makes it a good expert exercise.',
        tests: [{ args: [n], expected: fibonacciValue(n) }],
        strategy: 'recursion',
        tags: ['recursion', 'fibonacci'],
        seed: `recursion-expanded-expert-fibonacci-${n}`
      });
    }
  }
}

function buildAlgorithmsTaskExpanded(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const values = sampleNumbers(rng, rng.int(6, 9), -10, 20, true).sort((left, right) => left - right);
      const target = rng.bool(0.75)
        ? values[rng.int(0, values.length - 1)]
        : values[values.length - 1] + rng.int(1, 6);
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Insertion index',
        prompt: `Given sorted values = ${JSON.stringify(values)} and target = ${target}, return where target should be inserted.`,
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['sortedValues', 'target'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'int left = 0;',
          'int right = sortedValues.length;',
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
        tests: [{ args: [values, target], expected: binarySearchInsertionIndex(values, target) }],
        strategy: 'algorithm',
        tags: ['binary-search', 'insertion'],
        seed: `algorithms-expanded-easy-insert-${values.join(',')}:${target}`
      });
    }
    case 'medium': {
      const values = sampleNumbers(rng, rng.int(6, 9), -6, 8, true);
      const start = rng.int(0, values.length - 1);
      const end = rng.int(start, values.length - 1);
      const target = values.slice(start, end + 1).reduce((sum, value) => sum + value, 0);
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Count subarrays with sum',
        prompt: `Given values = ${JSON.stringify(values)} and target = ${target}, count the contiguous subarrays whose sum equals target.`,
        returnType: 'int',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'target'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'Map<Integer, Integer> counts = new HashMap<>();',
          'counts.put(0, 1);',
          'int prefix = 0;',
          'int total = 0;',
          'for (int value : values) {',
          '  prefix += value;',
          '  total += counts.getOrDefault(prefix - target, 0);',
          '  counts.put(prefix, counts.getOrDefault(prefix, 0) + 1);',
          '}',
          'return total;'
        ],
        hints: ['Track how many times each prefix sum has appeared.', 'A matching subarray ends whenever the difference is target.'],
        explanation: 'Prefix-sum counting is the standard one-pass solution.',
        tests: [{ args: [values, target], expected: countSubarraysWithSum(values, target) }],
        strategy: 'algorithm',
        tags: ['prefix-sum', 'counting'],
        seed: `algorithms-expanded-medium-count-${values.join(',')}:${target}`
      });
    }
    case 'hard': {
      const values = sampleNumbers(rng, rng.int(7, 10), 0, 18, true);
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Longest unique subarray',
        prompt: `Given values = ${JSON.stringify(values)}, return the length of the longest subarray with all unique numbers.`,
        returnType: 'int',
        argTypes: ['int[]'],
        argNames: ['values'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'Map<Integer, Integer> lastSeen = new HashMap<>();',
          'int left = 0;',
          'int best = 0;',
          'for (int right = 0; right < values.length; right += 1) {',
          '  int value = values[right];',
          '  if (lastSeen.containsKey(value) && lastSeen.get(value) >= left) {',
          '    left = lastSeen.get(value) + 1;',
          '  }',
          '  lastSeen.put(value, right);',
          '  best = Math.max(best, right - left + 1);',
          '}',
          'return best;'
        ],
        hints: ['Move the left side of the window when you see a repeated value.', 'Store the last index where each value appeared.'],
        explanation: 'Sliding-window + last-seen indices is a powerful pattern for uniqueness constraints.',
        tests: [{ args: [values], expected: longestUniqueSubarrayLength(values) }],
        strategy: 'algorithm',
        tags: ['window', 'unique'],
        seed: `algorithms-expanded-hard-unique-${values.join(',')}`
      });
    }
    default: {
      const values = sampleNumbers(rng, rng.int(6, 10), -8, 16, true);
      const k = rng.int(2, Math.min(4, values.length));
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Top frequent numbers',
        prompt: `Given values = ${JSON.stringify(values)} and k = ${k}, return the k most frequent numbers.`,
        returnType: 'int[]',
        argTypes: ['int[]', 'int'],
        argNames: ['values', 'k'],
        starterBody: ['throw new NotImplementedException();'],
        solutionBody: [
          'Map<Integer, Integer> counts = new HashMap<>();',
          'for (int value : values) {',
          '  counts.put(value, counts.getOrDefault(value, 0) + 1);',
          '}',
          'List<Integer> ordered = new ArrayList<>(counts.keySet());',
          'ordered.sort((left, right) -> {',
          '  int byCount = counts.get(right) - counts.get(left);',
          '  return byCount != 0 ? byCount : Integer.compare(left, right);',
          '});',
          'int limit = Math.min(k, ordered.size());',
          'int[] result = new int[limit];',
          'for (int index = 0; index < limit; index += 1) {',
          '  result[index] = ordered.get(index);',
          '}',
          'return result;'
        ],
        hints: ['Count first, sort later.', 'Use frequency descending and value ascending to break ties.'],
        explanation: 'A frequency table turns this into a deterministic ranking problem.',
        tests: [{ args: [values, k], expected: topKFrequentNumbers(values, k) }],
        strategy: 'algorithm',
        tags: ['frequency', 'top-k'],
        seed: `algorithms-expanded-expert-topk-${values.join(',')}:${k}`
      });
    }
  }
}

function buildGeneratedTask(category, difficulty, rng) {
  switch (category) {
    case 'arrays':
      return rng.bool(0.5) ? buildArraysTaskExpanded(difficulty, rng) : buildArraysTask(difficulty, rng);
    case 'strings':
      return rng.bool(0.5) ? buildStringsTaskExpanded(difficulty, rng) : buildStringsTask(difficulty, rng);
    case 'collections':
      return rng.bool(0.5) ? buildCollectionsTaskExpanded(difficulty, rng) : buildCollectionsTask(difficulty, rng);
    case 'recursion':
      return rng.bool(0.5) ? buildRecursionTaskExpanded(difficulty, rng) : buildRecursionTask(difficulty, rng);
    case 'algorithms':
      return rng.bool(0.5) ? buildAlgorithmsTaskExpanded(difficulty, rng) : buildAlgorithmsTask(difficulty, rng);
    default:
      return rng.bool(0.5) ? buildArraysTaskExpanded(difficulty, rng) : buildArraysTask(difficulty, rng);
  }
}

function chooseCategory(rng, options) {
  const pool = normalizeSelection(options.categories, Object.keys(CATEGORY_META));
  if (options.randomMode !== false) {
    return rng.pick(pool);
  }
  if (pool.includes(options.focusCategory)) {
    return options.focusCategory;
  }
  return pool[0];
}

function chooseDifficulty(rng, options) {
  const pool = normalizeSelection(options.difficulties, DIFFICULTIES);
  if (options.randomMode === false && pool.includes(options.focusDifficulty)) {
    return options.focusDifficulty;
  }
  if (options.mode === 'boss') {
    return rng.weighted(pool.map((value) => ({
      value,
      weight: ({ easy: 1, medium: 3, hard: 7, expert: 10 }[value] || 1)
    })));
  }
  if (options.mode === 'daily') {
    return rng.weighted(pool.map((value) => ({
      value,
      weight: ({ easy: 2, medium: 7, hard: 6, expert: 3 }[value] || 1)
    })));
  }
  return rng.pick(pool);
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
  const challengeType = options.mode === 'daily' ? 'daily' : options.mode === 'boss' ? 'boss' : 'practice';
  const standard = buildGeneratedTask(category, difficulty, rng);
  standard.challengeType = challengeType;
  standard.seed = seed;
  standard.id = makeTaskId(category, difficulty, standard.title, seed);
  standard.meta = {
    ...standard.meta,
    challengeType,
    randomMode: options.randomMode !== false,
    seed,
    kernelId: JAVA_KERNEL_META.id
  };

  const customs = (options.customTasks || [])
    .map(normalizeCustomTask)
    .filter(Boolean)
    .filter((task) => task.kernelId === JAVA_KERNEL_META.id && task.category === category && task.difficulty === difficulty);

  const pool = [standard, ...customs];
  if (pool.length === 1) {
    return topic ? decoratePracticeTopicTask(standard, topic) : standard;
  }

  const chosen = rng.pick(pool);
  chosen.meta = {
    ...chosen.meta,
    challengeType,
    randomMode: options.randomMode !== false,
    seed,
    kernelId: JAVA_KERNEL_META.id
  };
  chosen.seed = seed;
  chosen.kernelId = JAVA_KERNEL_META.id;
  chosen.kernelTitle = JAVA_KERNEL_META.title;
  chosen.editorLanguage = JAVA_KERNEL_META.editorLanguage;
  return topic ? decoratePracticeTopicTask(chosen, topic) : chosen;
}

function createCustomTaskTemplate() {
  const signature = buildJavaSignature('int[]', ['int[]'], ['values']);
  return makeTask({
    category: 'arrays',
    difficulty: 'easy',
    title: 'Пользовательская Java-задача',
    prompt: 'Опиши пользовательскую Java-задачу и заполни тесты.',
    signature,
    starterCode: javaClassCode(signature, ['return new int[0];']),
    solution: javaClassCode(signature, ['return new int[0];']),
    hints: ['Опиши ожидаемое поведение в prompt.', 'Заполни tests массивом входов и ожидаемых результатов.'],
    explanation: 'Шаблон для пользовательской Java-задачи.',
    tests: [],
    strategy: 'arrays',
    tags: ['custom'],
    meta: {
      java: {
        returnType: 'int[]',
        argTypes: ['int[]']
      }
    }
  });
}

function normalizeCustomTask(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const kernelId = typeof raw.kernelId === 'string' && raw.kernelId.trim() ? raw.kernelId.trim() : JAVA_KERNEL_META.id;
  const strategy = normalizeStrategy(raw.strategy);
  const category = normalizeCategory(raw.category);
  const difficulty = normalizeDifficulty(raw.difficulty);
  const javaMeta = buildJavaCustomMeta(raw.meta || raw);
  const argNames = Array.isArray(raw.argNames) && raw.argNames.length === javaMeta.argTypes.length
    ? raw.argNames.slice()
    : javaMeta.argTypes.map((type, index) => `arg${index + 1}`);
  const signature = normalizeJavaSignature(raw.signature, javaMeta.returnType, javaMeta.argTypes, argNames);

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
      ? raw.hintsText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      : [];
  const starterCode = typeof raw.starterCode === 'string'
    ? raw.starterCode
    : typeof raw.starter === 'string'
      ? raw.starter
      : javaClassCode(signature, [javaTypeDefaultExpression(javaMeta.returnType)]);
  const solution = typeof raw.solution === 'string'
    ? raw.solution
    : typeof raw.solutionCode === 'string'
      ? raw.solutionCode
      : starterCode;
  const createdAt = raw.createdAt || raw.importedAt || Date.now();
  const variation = extractVariationFields(raw);

  return makeTask({
    id: raw.id || `custom-${hashString(`${raw.title || raw.prompt || 'task'}:${createdAt}`)}`,
    source: 'custom',
    createdAt,
    kernelId,
    category,
    difficulty,
    title: String(raw.title || 'Пользовательская Java-задача'),
    prompt: String(raw.prompt || ''),
    signature,
    starterCode,
    solution,
    hints,
    explanation: String(raw.explanation || ''),
    strategy,
    tests,
    xp: Number(raw.xp) || xpForDifficulty(difficulty),
    tags: Array.isArray(raw.tags) ? raw.tags.slice() : ['custom'],
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
      java: javaMeta,
      ...variation
    }
  });
}

function getProgressSummary(progress = {}) {
  return taskEngine.getProgressSummary(progress);
}

function buildAchievements(progress = {}) {
  return taskEngine.buildAchievements(progress);
}

function updateRuntimeAvailability() {
  const available = javaRuntimeAvailable();
  JAVA_KERNEL_META.available = available;
  JAVA_KERNEL_META.status = available ? 'available' : 'planned';
  return available;
}

updateRuntimeAvailability();

module.exports = {
  ...JAVA_KERNEL_META,
  available: JAVA_KERNEL_META.available,
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
