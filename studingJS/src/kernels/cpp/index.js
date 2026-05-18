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
    description: 'Разворот, сдвиг, уникализация и окна по числам.',
    accent: '#7dd3fc'
  },
  strings: {
    title: 'Строки',
    description: 'Нормализация текста, палиндромы, сжатие и разбор слов.',
    accent: '#34d399'
  },
  collections: {
    title: 'Коллекции',
    description: 'Частоты, сортировки и работа со списками слов.',
    accent: '#f59e0b'
  },
  recursion: {
    title: 'Рекурсия',
    description: 'Факториал, сумма цифр, степени и рекурсивная сортировка.',
    accent: '#a78bfa'
  },
  algorithms: {
    title: 'Алгоритмы',
    description: 'Kadane, two-sum, серии и префиксные суммы.',
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

const CPP_KERNEL_META = {
  id: 'cpp',
  title: 'C++',
  shortTitle: 'C++',
  family: 'native',
  editorLanguage: 'cpp',
  strategies: Object.keys(STRATEGY_META),
  strategyLabels: STRATEGY_META,
  description: 'Ядро C++ с локальной компиляцией через g++/clang++ и бесконечной генерацией задач.',
  status: 'planned',
  available: false,
  accent: '#38bdf8'
};

const THEORY_TOPIC_PRACTICE = {
  variables: {
    category: 'arrays',
    title: 'Variables and arithmetic state',
    note: 'Practice the variables topic by tracking a running numeric state while transforming the input.'
  },
  classes: {
    category: 'collections',
    title: 'Class-style data modeling',
    note: 'Practice the classes topic by thinking about each value as a small object with state and behavior before returning the summary.'
  },
  stl: {
    category: 'collections',
    title: 'STL containers',
    note: 'Practice the STL topic with vector/string containers and standard collection operations.'
  },
  templates: {
    category: 'algorithms',
    title: 'Generic algorithm shape',
    note: 'Practice the templates topic by writing logic that would naturally generalize across comparable values.'
  },
  memory: {
    category: 'arrays',
    title: 'Ownership-friendly data flow',
    note: 'Practice the memory topic by returning a new value without leaking ownership or mutating caller-owned input unexpectedly.'
  },
  'move-semantics': {
    category: 'strings',
    title: 'Move-aware string processing',
    note: 'Practice move semantics by building the result efficiently from local temporaries.'
  },
  exceptions: {
    category: 'algorithms',
    title: 'Guarded algorithm',
    note: 'Practice exceptions by handling edge cases explicitly before the main algorithm.'
  },
  lambdas: {
    category: 'collections',
    title: 'Lambda-ready filtering',
    note: 'Practice lambdas by expressing the core rule as a small predicate or comparator.'
  },
  'iterators-algorithms': {
    category: 'algorithms',
    title: 'Iterator and algorithm pass',
    note: 'Practice iterators and algorithms by solving the task with clear single-pass or sorted-pass traversal.'
  },
  'build-model': {
    category: 'arrays',
    title: 'Small buildable function',
    note: 'Practice the build model topic by keeping the solution as a portable function with predictable inputs and outputs.'
  },
  'strings-string-view': {
    category: 'strings',
    title: 'String and string_view thinking',
    note: 'Practice string/string_view by scanning text without unnecessary intermediate copies.'
  },
  'enum-class': {
    category: 'algorithms',
    title: 'Enum-like branching',
    note: 'Practice enum class thinking by making explicit, named decisions for each case in the algorithm.'
  },
  'concurrency-basics': {
    category: 'algorithms',
    title: 'Independent work chunks',
    note: 'Practice concurrency basics by keeping each step independent and avoiding shared mutable state.'
  }
};

const NAME_POOL = ['Ada', 'Mila', 'Nina', 'Oleg', 'Leo', 'Sara', 'Ilya', 'Zoe', 'Maks', 'Lina', 'Vera', 'Pavel', 'Rita', 'Artem', 'Noah', 'Iris'];
const WORD_POOL = ['alpha', 'beta', 'gamma', 'delta', 'omega', 'nova', 'pulse', 'vector', 'lumen', 'mint', 'orbit', 'spark', 'drift', 'tide', 'glow', 'zen', 'flux'];

let seedCounter = 0;
let cachedCppRuntime = null;

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
    }
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function preview(value) {
  return JSON.stringify(value, null, 2);
}

function sampleNumbers(rng, count, min, max, allowDuplicates = true) {
  const values = [];
  while (values.length < count) {
    const value = rng.int(min, max);
    if (allowDuplicates || !values.includes(value)) {
      values.push(value);
    }
  }
  return values;
}

function sampleWords(rng, count, allowDuplicates = true) {
  const pool = [...WORD_POOL, ...NAME_POOL.map((name) => name.toLowerCase())];
  const values = [];
  while (values.length < count) {
    const word = rng.pick(pool);
    if (allowDuplicates || !values.includes(word)) {
      values.push(word);
    }
  }
  return values;
}

function shuffleCopy(rng, list) {
  return rng.shuffle(list);
}

function reverseArray(values) {
  return values.slice().reverse();
}

function rotateLeft(values, shift) {
  if (values.length === 0) {
    return [];
  }
  const normalized = ((shift % values.length) + values.length) % values.length;
  return values.slice(normalized).concat(values.slice(0, normalized));
}

function uniquePreserveOrder(values) {
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
  for (let i = 0; i + windowSize <= values.length; i += 1) {
    let best = values[i];
    for (let j = 1; j < windowSize; j += 1) {
      best = Math.max(best, values[i + j]);
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

function normalizedPalindrome(text) {
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
  const half = recursivePower(base, Math.floor(exponent / 2));
  const squared = half * half;
  return exponent % 2 === 0 ? squared : squared * base;
}

function mergeSortNumbers(values) {
  if (values.length <= 1) {
    return values.slice();
  }
  const middle = Math.floor(values.length / 2);
  const left = mergeSortNumbers(values.slice(0, middle));
  const right = mergeSortNumbers(values.slice(middle));
  const merged = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length || rightIndex < right.length) {
    if (rightIndex >= right.length || (leftIndex < left.length && left[leftIndex] <= right[rightIndex])) {
      merged.push(left[leftIndex]);
      leftIndex += 1;
    } else {
      merged.push(right[rightIndex]);
      rightIndex += 1;
    }
  }
  return merged;
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
  return `cpp-${category}-${difficulty}-${hashString(`cpp:${title}:${seed}`)}`;
}

function deriveTaskSeed(data) {
  const testsSeed = Array.isArray(data.tests) ? JSON.stringify(data.tests) : '';
  const argTypesSeed = Array.isArray(data.meta?.cpp?.argTypes) ? data.meta.cpp.argTypes.join('|') : '';
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
    String(data.meta?.cpp?.returnType || ''),
    argTypesSeed
  ].join('::');
  return `cpp-task:${hashString(metaSeed)}`;
}

function makeTask(data) {
  const seed = data.seed !== undefined && data.seed !== null ? String(data.seed) : deriveTaskSeed(data);
  return {
    id: data.id || makeTaskId(data.category, data.difficulty, data.title, seed),
    seed,
    source: data.source || 'generated',
    createdAt: data.createdAt || null,
    kernelId: CPP_KERNEL_META.id,
    kernelTitle: CPP_KERNEL_META.title,
    kernelFamily: CPP_KERNEL_META.family,
    editorLanguage: CPP_KERNEL_META.editorLanguage,
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
    meta: data.meta || {},
    challengeType: data.challengeType || 'practice'
  };
}

function xpForDifficulty(difficulty) {
  switch (difficulty) {
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

function cppEscapeString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

function cppTypeDefaultExpression(type) {
  switch (type) {
    case 'int':
      return '0';
    case 'bool':
      return 'false';
    case 'string':
      return 'string()';
    case 'vector<int>':
      return 'vector<int>()';
    case 'vector<string>':
      return 'vector<string>()';
    default:
      return '0';
  }
}

function cppLiteral(value, type) {
  switch (type) {
    case 'int':
      return String(Number(value) | 0);
    case 'bool':
      return value ? 'true' : 'false';
    case 'string':
      return `"${cppEscapeString(value)}"`;
    case 'vector<int>':
      return `vector<int>{${(value || []).map((item) => String(Number(item) | 0)).join(', ')}}`;
    case 'vector<string>':
      return `vector<string>{${(value || []).map((item) => `"${cppEscapeString(item)}"`).join(', ')}}`;
    default:
      throw new Error(`Unsupported C++ literal type: ${type}`);
  }
}

function cppSignature(returnType, argTypes, argNames) {
  return `${returnType} solve(${argTypes.map((type, index) => `${type} ${argNames[index] || `arg${index + 1}`}`).join(', ')})`;
}

function cppCode(signature, bodyLines) {
  const lines = Array.isArray(bodyLines) ? bodyLines : String(bodyLines).split(/\r?\n/);
  return [
    '#include <bits/stdc++.h>',
    'using namespace std;',
    '',
    `${signature} {`,
    ...lines.map((line) => `  ${line}`),
    '}'
  ].join('\n');
}

function normalizeCppSignature(rawSignature, returnType, argTypes, argNames) {
  const cleaned = String(rawSignature || '').trim()
    .replace(/^static\s+/i, '')
    .replace(/^inline\s+/i, '')
    .replace(/^auto\s+/i, '');
  if (/^[\w:<>\s*&]+solve\s*\(/.test(cleaned)) {
    return cleaned;
  }
  return cppSignature(returnType, argTypes, argNames);
}

function buildCppCustomMeta(meta = {}) {
  const cppMeta = meta.cpp || {};
  const returnType = cppMeta.returnType || meta.returnType || 'vector<int>';
  const argTypes = Array.isArray(cppMeta.argTypes) && cppMeta.argTypes.length > 0
    ? cppMeta.argTypes.slice()
    : Array.isArray(meta.argTypes) && meta.argTypes.length > 0
      ? meta.argTypes.slice()
      : ['vector<int>'];
  return {
    returnType,
    argTypes
  };
}

function buildCppRunnerSource(task, returnType, argTypes) {
  const tests = Array.isArray(task.tests) ? task.tests : [];
  const testBlocks = tests.map((test, index) => {
    const argDecls = (test.args || []).map((arg, argIndex) => `        ${argTypes[argIndex]} arg${index}_${argIndex} = ${cppLiteral(arg, argTypes[argIndex])};`).join('\n');
    const expectedDecl = `        ${returnType} expected${index} = ${cppLiteral(test.expected, returnType)};`;
    const callArgs = argTypes.map((_, argIndex) => `arg${index}_${argIndex}`).join(', ');
    const actualDecl = `        ${returnType} actual${index} = solve(${callArgs});`;
    return [
      '      try {',
      argDecls,
      expectedDecl,
      actualDecl,
      `        const string expectedJson${index} = toJson(expected${index});`,
      `        const string actualJson${index} = toJson(actual${index});`,
      `        const bool passed${index} = actual${index} == expected${index};`,
      `        if (!passed${index} && firstError.empty()) {`,
      `          firstError = expectedActualMessage(expectedJson${index}, actualJson${index});`,
      '        }',
      `        passed = passed && passed${index};`,
      `        results.push_back(testResultJson(passed${index}, expectedJson${index}, actualJson${index}, passed${index} ? string() : expectedActualMessage(expectedJson${index}, actualJson${index})));`,
      '      } catch (const exception& error) {',
      '        passed = false;',
      '        const string message = formatThrowable(error);',
      '        if (firstError.empty()) {',
      '          firstError = message;',
      '        }',
      '        results.push_back(testResultJson(false, string("null"), string("null"), message));',
      '      }'
    ].join('\n');
  }).join('\n');
  const solveDeclaration = `${returnType} solve(${argTypes.map((type, index) => `${type} arg${index + 1}`).join(', ')});`;

  return String.raw`
#include <bits/stdc++.h>
using namespace std;

static string jsonEscape(const string& value) {
  string result;
  result.reserve(value.size() + 16);
  for (char ch : value) {
    switch (ch) {
      case '\\': result += "\\\\"; break;
      case '"': result += "\\\""; break;
      case '\b': result += "\\b"; break;
      case '\f': result += "\\f"; break;
      case '\n': result += "\\n"; break;
      case '\r': result += "\\r"; break;
      case '\t': result += "\\t"; break;
      default:
        if (static_cast<unsigned char>(ch) < 32) {
          char buffer[7];
          snprintf(buffer, sizeof(buffer), "\\u%04x", static_cast<unsigned char>(ch));
          result += buffer;
        } else {
          result += ch;
        }
    }
  }
  return result;
}

static string toJson(const string& value) {
  return "\"" + jsonEscape(value) + "\"";
}

static string toJson(const char* value) {
  return toJson(string(value));
}

static string toJson(int value) {
  return to_string(value);
}

static string toJson(bool value) {
  return value ? "true" : "false";
}

template <typename T>
static string toJson(const vector<T>& values) {
  vector<string> parts;
  parts.reserve(values.size());
  for (const auto& item : values) {
    parts.push_back(toJson(item));
  }
  string result = "[";
  for (size_t index = 0; index < parts.size(); index += 1) {
    if (index > 0) {
      result += ",";
    }
    result += parts[index];
  }
  result += "]";
  return result;
}

static string joinJsonArray(const vector<string>& values) {
  string result = "[";
  for (size_t index = 0; index < values.size(); index += 1) {
    if (index > 0) {
      result += ",";
    }
    result += values[index];
  }
  result += "]";
  return result;
}

static string testResultJson(bool passed, const string& expected, const string& actual, const string& error) {
  return string("{\"passed\":") + (passed ? "true" : "false")
    + ",\"expected\":" + expected
    + ",\"actual\":" + actual
    + ",\"error\":" + (error.empty() ? "null" : toJson(error))
    + "}";
}

static string logResultJson(const string& type, const string& text) {
  return string("{\"type\":") + toJson(type)
    + ",\"text\":" + toJson(text)
    + "}";
}

static string formatThrowable(const exception& error) {
  const char* what = error.what();
  if (what == nullptr || what[0] == '\0') {
    return string("C++ exception");
  }
  return string(what);
}

static string expectedActualMessage(const string& expected, const string& actual) {
  return string("expected ") + expected + ", got " + actual;
}

${solveDeclaration}

int main() {
  const auto start = chrono::steady_clock::now();
  streambuf* originalOut = cout.rdbuf();
  streambuf* originalErr = cerr.rdbuf();
  ostringstream stdoutBuffer;
  ostringstream stderrBuffer;
  vector<string> results;
  bool passed = true;
  string firstError;
  try {
    cout.rdbuf(stdoutBuffer.rdbuf());
    cerr.rdbuf(stderrBuffer.rdbuf());
${testBlocks}
  } catch (const exception& error) {
    passed = false;
    if (firstError.empty()) {
      firstError = formatThrowable(error);
    }
  } catch (...) {
    passed = false;
    if (firstError.empty()) {
      firstError = string("Unknown C++ exception");
    }
  }
  cout.rdbuf(originalOut);
  cerr.rdbuf(originalErr);
  vector<string> logs;
  const string stdoutText = stdoutBuffer.str();
  const string stderrText = stderrBuffer.str();
  if (!stdoutText.empty()) {
    logs.push_back(logResultJson("stdout", stdoutText));
  }
  if (!stderrText.empty()) {
    logs.push_back(logResultJson("stderr", stderrText));
  }
  const bool payloadPassed = passed;
  const auto durationMs = chrono::duration_cast<chrono::milliseconds>(chrono::steady_clock::now() - start).count();
  ostringstream payload;
  payload << "{"
          << "\"passed\":" << (payloadPassed ? "true" : "false") << ","
          << "\"error\":" << (payloadPassed ? "null" : toJson(firstError.empty() ? string("Тест не пройден") : firstError)) << ","
          << "\"tests\":" << joinJsonArray(results) << ","
          << "\"logs\":" << joinJsonArray(logs) << ","
          << "\"durationMs\":" << durationMs
          << "}";
  cout << payload.str();
  return 0;
}
`;
}

function findCompilerPath() {
  const candidates = [];
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const packagesDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
    if (fs.existsSync(packagesDir)) {
      for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) {
          continue;
        }
        if (!/^BrechtSanders\.WinLibs\./i.test(entry.name)) {
          continue;
        }
        const packageRoot = path.join(packagesDir, entry.name);
        candidates.push(
          path.join(packageRoot, 'mingw64', 'bin', 'g++.exe'),
          path.join(packageRoot, 'mingw64', 'bin', 'clang++.exe'),
          path.join(packageRoot, 'bin', 'g++.exe'),
          path.join(packageRoot, 'bin', 'clang++.exe')
        );
      }
    }
  }
  candidates.push('g++', 'clang++', 'c++');
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8', windowsHide: true });
    if (probe.status === 0) {
      const compilerPath = candidate;
      const binDir = path.isAbsolute(candidate) ? path.dirname(candidate) : '';
      return {
        compilerPath,
        binDir,
        kind: path.basename(candidate).toLowerCase().includes('clang') ? 'clang++' : 'g++'
      };
    }
  }
  return null;
}

function cppRuntimeAvailable() {
  if (cachedCppRuntime) {
    return cachedCppRuntime.available;
  }
  const runtime = findCompilerPath();
  if (runtime) {
    cachedCppRuntime = {
      available: true,
      ...runtime
    };
    return true;
  }
  cachedCppRuntime = {
    available: false,
    compilerPath: 'g++',
    binDir: process.env.PATH || '',
    kind: 'g++'
  };
  return false;
}

function getCppRuntime() {
  if (!cachedCppRuntime) {
    cppRuntimeAvailable();
  }
  return cachedCppRuntime;
}

function normalizeCategory(category, fallback = 'arrays') {
  return Object.prototype.hasOwnProperty.call(CATEGORY_META, category) ? category : fallback;
}

function normalizeDifficulty(difficulty, fallback = 'easy') {
  return DIFFICULTIES.includes(difficulty) ? difficulty : fallback;
}

function cppDefaultReturnLine(returnType) {
  return `return ${cppTypeDefaultExpression(returnType)};`;
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
  challengeType = 'practice',
  seed = title,
  createdAt = null
}) {
  const cppSignatureText = normalizeCppSignature(signature, returnType, argTypes, argNames);
  return makeTask({
    category,
    difficulty,
    title,
    prompt,
    signature: cppSignatureText,
    starterCode: cppCode(cppSignatureText, starterBody),
    solution: cppCode(cppSignatureText, solutionBody),
    hints,
    explanation,
    tests,
    strategy,
    tags,
    challengeType,
    seed,
    createdAt,
    meta: {
      cpp: {
        returnType,
        argTypes: argTypes.slice()
      }
    }
  });
}

function buildTask(options) {
  const signature = cppSignature(options.returnType, options.argTypes, options.argNames);
  return buildTaskFromParts({
    ...options,
    signature,
    createdAt: options.createdAt || null
  });
}

function buildArraysTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const values = sampleNumbers(rng, rng.int(5, 7), 0, 20);
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Разворот массива',
        prompt: `Дан массив values = ${JSON.stringify(values)}. Верни его в обратном порядке.`,
        returnType: 'vector<int>',
        argTypes: ['vector<int>'],
        argNames: ['values'],
        starterBody: [cppDefaultReturnLine('vector<int>')],
        solutionBody: ['return vector<int>(values.rbegin(), values.rend());'],
        hints: ['Проще всего создать новый вектор и пройти по входному с конца.', 'Удобно использовать reverse-итераторы.'],
        explanation: 'Базовая задача на работу с индексами и копирование данных.',
        tests: [{ args: [values], expected: reverseArray(values) }],
        strategy: 'arrays',
        tags: ['reverse', 'vector'],
        seed: `cpp-arrays-easy-reverse-${values.join(',')}`
      });
    }
    case 'medium': {
      const values = sampleNumbers(rng, rng.int(6, 8), -10, 20, true);
      const shift = rng.int(1, Math.max(1, values.length - 1));
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Циклический сдвиг',
        prompt: `Дан массив values = ${JSON.stringify(values)} и shift = ${shift}. Сдвинь массив влево на shift позиций.`,
        returnType: 'vector<int>',
        argTypes: ['vector<int>', 'int'],
        argNames: ['values', 'shift'],
        starterBody: [cppDefaultReturnLine('vector<int>')],
        solutionBody: [
          'if (values.empty()) {',
          `  ${cppDefaultReturnLine('vector<int>')}`,
          '}',
          'const int normalized = ((shift % static_cast<int>(values.size())) + static_cast<int>(values.size())) % static_cast<int>(values.size());',
          'vector<int> result(values.size());',
          'for (size_t index = 0; index < values.size(); index += 1) {',
          '  result[index] = values[(index + normalized) % values.size()];',
          '}',
          'return result;'
        ],
        hints: ['Нормализуй shift по длине массива.', 'Можно копировать элементы по формуле `(index + shift) % size`.'],
        explanation: 'Циклический сдвиг часто встречается в буферах и кольцевых структурах.',
        tests: [{ args: [values, shift], expected: rotateLeft(values, shift) }],
        strategy: 'arrays',
        tags: ['rotate', 'modulo'],
        seed: `cpp-arrays-medium-rotate-${values.join(',')}:${shift}`
      });
    }
    case 'hard': {
      const values = sampleNumbers(rng, rng.int(7, 10), 0, 30);
      const noisy = values.concat(values.slice(0, 2));
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Уникальные значения',
        prompt: `Дан массив values = ${JSON.stringify(noisy)}. Удали дубликаты, сохранив первый порядок появления.`,
        returnType: 'vector<int>',
        argTypes: ['vector<int>'],
        argNames: ['values'],
        starterBody: [cppDefaultReturnLine('vector<int>')],
        solutionBody: [
          'unordered_set<int> seen;',
          'vector<int> result;',
          'for (int value : values) {',
          '  if (seen.insert(value).second) {',
          '    result.push_back(value);',
          '  }',
          '}',
          'return result;'
        ],
        hints: ['Используй множество для проверки, видели ли значение.', 'Порядок нужно сохранять по первому появлению.'],
        explanation: 'Хорошая практика для комбинирования прохода по массиву и множества.',
        tests: [{ args: [values], expected: uniquePreserveOrder(values) }],
        strategy: 'arrays',
        tags: ['unique', 'set'],
        seed: `cpp-arrays-hard-unique-${noisy.join(',')}`
      });
    }
    default: {
      const values = sampleNumbers(rng, rng.int(8, 10), -10, 20, true);
      const window = rng.int(2, Math.min(4, values.length));
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Максимум окна',
        prompt: `Дан массив values = ${JSON.stringify(values)} и окно window = ${window}. Верни максимум каждого окна.`,
        returnType: 'vector<int>',
        argTypes: ['vector<int>', 'int'],
        argNames: ['values', 'window'],
        starterBody: [cppDefaultReturnLine('vector<int>')],
        solutionBody: [
          'if (values.empty() || window <= 0 || window > static_cast<int>(values.size())) {',
          `  ${cppDefaultReturnLine('vector<int>')}`,
          '}',
          'deque<int> indices;',
          'vector<int> result;',
          'for (int index = 0; index < static_cast<int>(values.size()); index += 1) {',
          '  while (!indices.empty() && indices.front() <= index - window) {',
          '    indices.pop_front();',
          '  }',
          '  while (!indices.empty() && values[indices.back()] <= values[index]) {',
          '    indices.pop_back();',
          '  }',
          '  indices.push_back(index);',
          '  if (index + 1 >= window) {',
          '    result.push_back(values[indices.front()]);',
          '  }',
          '}',
          'return result;'
        ],
        hints: ['Храни в деке индексы элементов, которые могут стать максимумом.', 'Удаляй из окна устаревшие индексы и элементы меньше текущего.'],
        explanation: 'Это классическая задача на монотонную очередь.',
        tests: [{ args: [values, window], expected: slidingWindowMaximum(values, window) }],
        strategy: 'algorithm',
        tags: ['window', 'deque'],
        seed: `cpp-arrays-expert-window-${values.join(',')}:${window}`
      });
    }
  }
}

function makePalindromeSource(rng) {
  const core = `${rng.pick(WORD_POOL)}${rng.int(10, 99)}`;
  const mirror = core.split('').reverse().join('');
  return rng.bool() ? `${core} :: ${mirror}` : `${core} -- ${mirror}`;
}

function makeRunLengthSource(rng) {
  const parts = [];
  const alphabet = 'aabbccddeeffgghhiijjkkllmmnnooppqqrrsstt';
  const count = rng.int(4, 7);
  for (let index = 0; index < count; index += 1) {
    const ch = alphabet[rng.int(0, alphabet.length - 1)];
    const repeat = rng.int(1, 4);
    parts.push(ch.repeat(repeat));
  }
  return parts.join('');
}

function buildStringsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const words = sampleWords(rng, rng.int(5, 7), true);
      const text = `  ${shuffleCopy(rng, words).join('   ')}  `;
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Нормализация пробелов',
        prompt: `Дан текст text = ${JSON.stringify(text)}. Убери лишние пробелы по краям и между словами.`,
        returnType: 'string',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['return string();'],
        solutionBody: [
          'istringstream input(text);',
          'string word;',
          'vector<string> words;',
          'while (input >> word) {',
          '  words.push_back(word);',
          '}',
          'string result;',
          'for (size_t index = 0; index < words.size(); index += 1) {',
          '  if (index > 0) {',
          '    result += " ";',
          '  }',
          '  result += words[index];',
          '}',
          'return result;'
        ],
        hints: ['`istringstream` помогает прочитать слова без лишних пробелов.', 'Собери результат заново через один пробел.'],
        explanation: 'Нормализация строки часто нужна перед сравнением и поиском.',
        tests: [{ args: [text], expected: normalizeSpaces(text) }],
        strategy: 'strings',
        tags: ['trim', 'split'],
        seed: `cpp-strings-easy-normalize-${text}`
      });
    }
    case 'medium': {
      const words = sampleWords(rng, rng.int(5, 7), true);
      const text = shuffleCopy(rng, words).join('   ');
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Обратные слова',
        prompt: `Дан текст text = ${JSON.stringify(text)}. Верни слова в обратном порядке.`,
        returnType: 'string',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['return string();'],
        solutionBody: [
          'istringstream input(text);',
          'string word;',
          'vector<string> words;',
          'while (input >> word) {',
          '  words.push_back(word);',
          '}',
          'reverse(words.begin(), words.end());',
          'string result;',
          'for (size_t index = 0; index < words.size(); index += 1) {',
          '  if (index > 0) {',
          '    result += " ";',
          '  }',
          '  result += words[index];',
          '}',
          'return result;'
        ],
        hints: ['Сначала разбей текст на слова.', 'Потом просто переверни порядок слов и собери строку обратно.'],
        explanation: 'Важный паттерн для работы со списком токенов.',
        tests: [{ args: [text], expected: reverseWords(text) }],
        strategy: 'strings',
        tags: ['reverse', 'words'],
        seed: `cpp-strings-medium-reverse-${text}`
      });
    }
    case 'hard': {
      const text = makePalindromeSource(rng);
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Проверка палиндрома',
        prompt: `Дан текст text = ${JSON.stringify(text)}. Игнорируй регистр и неалфанумерные символы, верни true если это палиндром.`,
        returnType: 'bool',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['return false;'],
        solutionBody: [
          'string cleaned;',
          'for (char ch : text) {',
          '  unsigned char uch = static_cast<unsigned char>(ch);',
          '  if (isalnum(uch)) {',
          '    cleaned.push_back(static_cast<char>(tolower(uch)));',
          '  }',
          '}',
          'string reversed = cleaned;',
          'reverse(reversed.begin(), reversed.end());',
          'return cleaned == reversed;'
        ],
        hints: ['Сначала убери всё лишнее: пробелы, символы и регистр.', 'Потом сравни строку с её обратной копией.'],
        explanation: 'Палиндромы проверяются через нормализацию и обратную строку.',
        tests: [{ args: [text], expected: normalizedPalindrome(text) }],
        strategy: 'strings',
        tags: ['palindrome', 'normalize'],
        seed: `cpp-strings-hard-palindrome-${text}`
      });
    }
    default: {
      const text = makeRunLengthSource(rng);
      return buildTask({
        category: 'strings',
        difficulty,
        title: 'Сжатие повторов',
        prompt: `Дана строка text = ${JSON.stringify(text)}. Верни строку в формате run-length encoding.`,
        returnType: 'string',
        argTypes: ['string'],
        argNames: ['text'],
        starterBody: ['return string();'],
        solutionBody: [
          'if (text.empty()) {',
          '  return string();',
          '}',
          'string result;',
          'char current = text[0];',
          'int count = 1;',
          'for (size_t index = 1; index < text.size(); index += 1) {',
          '  if (text[index] == current) {',
          '    count += 1;',
          '  } else {',
          '    result += current;',
          '    result += to_string(count);',
          '    current = text[index];',
          '    count = 1;',
          '  }',
          '}',
          'result += current;',
          'result += to_string(count);',
          'return result;'
        ],
        hints: ['Считай длину каждого подряд идущего блока одинаковых символов.', 'Когда символ меняется, дописывай блок в ответ.'],
        explanation: 'Сжатие повторов часто встречается в простых кодировках строк.',
        tests: [{ args: [text], expected: runLengthEncode(text) }],
        strategy: 'strings',
        tags: ['rle', 'compression'],
        seed: `cpp-strings-expert-rle-${text}`
      });
    }
  }
}

function buildCollectionsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const words = sampleWords(rng, rng.int(6, 8), true);
      const noisy = shuffleCopy(rng, words.concat(words.slice(0, 2)));
      return buildTask({
        category: 'collections',
        difficulty,
        title: 'Уникальные слова',
        prompt: `Дан список слов words = ${JSON.stringify(noisy)}. Верни уникальные слова в алфавитном порядке.`,
        returnType: 'vector<string>',
        argTypes: ['vector<string>'],
        argNames: ['words'],
        starterBody: [cppDefaultReturnLine('vector<string>')],
        solutionBody: [
          'set<string> unique(words.begin(), words.end());',
          'return vector<string>(unique.begin(), unique.end());'
        ],
        hints: ['`set` хранит элементы в отсортированном виде и убирает дубликаты.', 'Можно сразу построить новый вектор из `set`.'],
        explanation: 'Коллекции удобно использовать для дедупликации и сортировки одновременно.',
        tests: [{ args: [noisy], expected: uniqueSortedWords(noisy) }],
        strategy: 'collections',
        tags: ['set', 'unique'],
        seed: `cpp-collections-easy-unique-${noisy.join(',')}`
      });
    }
    case 'medium': {
      const words = sampleWords(rng, rng.int(7, 10), true);
      const k = rng.int(2, Math.min(4, words.length));
      return buildTask({
        category: 'collections',
        difficulty,
        title: 'Топ частот',
        prompt: `Дан список слов words = ${JSON.stringify(words)} и k = ${k}. Верни k самых частых слов.`,
        returnType: 'vector<string>',
        argTypes: ['vector<string>', 'int'],
        argNames: ['words', 'k'],
        starterBody: [cppDefaultReturnLine('vector<string>')],
        solutionBody: [
          'unordered_map<string, int> counts;',
          'for (const string& word : words) {',
          '  counts[word] += 1;',
          '}',
          'vector<pair<string, int>> entries(counts.begin(), counts.end());',
          'sort(entries.begin(), entries.end(), [](const auto& left, const auto& right) {',
          '  if (left.second != right.second) {',
          '    return left.second > right.second;',
          '  }',
          '  return left.first < right.first;',
          '});',
          'vector<string> result;',
          'for (int index = 0; index < k && index < static_cast<int>(entries.size()); index += 1) {',
          '  result.push_back(entries[index].first);',
          '}',
          'return result;'
        ],
        hints: ['Сначала посчитай частоты всех слов.', 'Потом отсортируй пары по частоте и имени.'],
        explanation: 'Типичная задача на частоты и сортировку по нескольким ключам.',
        tests: [{ args: [words, k], expected: topKWords(words, k) }],
        strategy: 'collections',
        tags: ['frequency', 'top-k'],
        seed: `cpp-collections-medium-topk-${words.join(',')}:${k}`
      });
    }
    case 'hard': {
      const words = sampleWords(rng, rng.int(7, 10), true);
      return buildTask({
        category: 'collections',
        difficulty,
        title: 'Сводка по инициалам',
        prompt: `Дан список слов words = ${JSON.stringify(words)}. Верни сводку вида A:2, B:1 ...`,
        returnType: 'vector<string>',
        argTypes: ['vector<string>'],
        argNames: ['words'],
        starterBody: [cppDefaultReturnLine('vector<string>')],
        solutionBody: [
          'map<char, int> counts;',
          'for (const string& word : words) {',
          '  counts[static_cast<char>(toupper(static_cast<unsigned char>(word[0])))] += 1;',
          '}',
          'vector<string> result;',
          'for (const auto& [initial, count] : counts) {',
          '  result.push_back(string(1, initial) + ":" + to_string(count));',
          '}',
          'return result;'
        ],
        hints: ['Используй `map<char, int>` для подсчёта.', 'В ответе удобно хранить строки с форматом `буква:количество`.'],
        explanation: 'Задача учит группировать элементы по ключу.',
        tests: [{ args: [words], expected: countByInitial(words) }],
        strategy: 'collections',
        tags: ['map', 'grouping'],
        seed: `cpp-collections-hard-initials-${words.join(',')}`
      });
    }
    default: {
      const words = sampleWords(rng, rng.int(6, 9), true);
      return buildTask({
        category: 'collections',
        difficulty,
        title: 'Сортировка по длине',
        prompt: `Дан список слов words = ${JSON.stringify(words)}. Отсортируй его по длине, а при равенстве - по алфавиту.`,
        returnType: 'vector<string>',
        argTypes: ['vector<string>'],
        argNames: ['words'],
        starterBody: [cppDefaultReturnLine('vector<string>')],
        solutionBody: [
          'vector<string> result = words;',
          'sort(result.begin(), result.end(), [](const string& left, const string& right) {',
          '  if (left.size() != right.size()) {',
          '    return left.size() < right.size();',
          '  }',
          '  return left < right;',
          '});',
          'return result;'
        ],
        hints: ['Сортируй по составному ключу: длина и потом строка.', '`std::sort` с лямбдой решает задачу напрямую.'],
        explanation: 'Это удобная практика для сортировки с пользовательским компаратором.',
        tests: [{ args: [words], expected: sortByLengthThenLex(words) }],
        strategy: 'collections',
        tags: ['sort', 'comparator'],
        seed: `cpp-collections-expert-sort-${words.join(',')}`
      });
    }
  }
}

function buildRecursionTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const value = rng.int(0, 8);
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Факториал',
        prompt: `Дан value = ${value}. Верни factorial(value) через рекурсию.`,
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
        hints: ['База рекурсии - 0 и 1.', 'Каждый следующий шаг уменьшает значение на 1.'],
        explanation: 'Факториал - классическая первая рекурсивная задача.',
        tests: [{ args: [value], expected: factorial(value) }],
        strategy: 'recursion',
        tags: ['factorial'],
        seed: `cpp-recursion-easy-factorial-${value}`
      });
    }
    case 'medium': {
      const value = rng.int(-9999, 9999);
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Сумма цифр',
        prompt: `Дан value = ${value}. Верни сумму цифр через рекурсию.`,
        returnType: 'int',
        argTypes: ['int'],
        argNames: ['value'],
        starterBody: ['return 0;'],
        solutionBody: [
          'int normalized = abs(value);',
          'if (normalized < 10) {',
          '  return normalized;',
          '}',
          'return (normalized % 10) + solve(normalized / 10);'
        ],
        hints: ['Сначала убери знак через `abs`.', 'Если число меньше 10, рекурсия останавливается.'],
        explanation: 'Сумма цифр хорошо иллюстрирует разбиение задачи на меньшие подзадачи.',
        tests: [{ args: [value], expected: sumDigits(value) }],
        strategy: 'recursion',
        tags: ['digits', 'sum'],
        seed: `cpp-recursion-medium-digits-${value}`
      });
    }
    case 'hard': {
      const base = rng.int(2, 5);
      const exponent = rng.int(3, 7);
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Быстрое возведение',
        prompt: `Даны base = ${base} и exponent = ${exponent}. Верни base^exponent через рекурсию.`,
        returnType: 'int',
        argTypes: ['int', 'int'],
        argNames: ['base', 'exponent'],
        starterBody: ['return 0;'],
        solutionBody: [
          'if (exponent == 0) {',
          '  return 1;',
          '}',
          'if (exponent == 1) {',
          '  return base;',
          '}',
          'const int half = solve(base, exponent / 2);',
          'const int squared = half * half;',
          'return exponent % 2 == 0 ? squared : squared * base;'
        ],
        hints: ['Раздели показатель на два, чтобы сократить глубину рекурсии.', 'Если показатель нечётный, домножь результат ещё на base.'],
        explanation: 'Быстрое возведение в степень работает за логарифмическое число шагов.',
        tests: [{ args: [base, exponent], expected: recursivePower(base, exponent) }],
        strategy: 'recursion',
        tags: ['power', 'fast-exponentiation'],
        seed: `cpp-recursion-hard-power-${base}:${exponent}`
      });
    }
    default: {
      const values = sampleNumbers(rng, rng.int(6, 10), -10, 20, true);
      return buildTask({
        category: 'recursion',
        difficulty,
        title: 'Рекурсивная сортировка',
        prompt: `Дан массив values = ${JSON.stringify(values)}. Верни его отсортированную копию через рекурсивное слияние.`,
        returnType: 'vector<int>',
        argTypes: ['vector<int>'],
        argNames: ['values'],
        starterBody: [cppDefaultReturnLine('vector<int>')],
        solutionBody: [
          'function<vector<int>(vector<int>)> mergeSort = [&](vector<int> current) -> vector<int> {',
          '  if (current.size() <= 1) {',
          '    return current;',
          '  }',
          '  const size_t middle = current.size() / 2;',
          '  vector<int> left(current.begin(), current.begin() + middle);',
          '  vector<int> right(current.begin() + middle, current.end());',
          '  left = mergeSort(left);',
          '  right = mergeSort(right);',
          '  vector<int> merged;',
          '  merged.reserve(current.size());',
          '  size_t leftIndex = 0;',
          '  size_t rightIndex = 0;',
          '  while (leftIndex < left.size() || rightIndex < right.size()) {',
          '    if (rightIndex >= right.size() || (leftIndex < left.size() && left[leftIndex] <= right[rightIndex])) {',
          '      merged.push_back(left[leftIndex]);',
          '      leftIndex += 1;',
          '    } else {',
          '      merged.push_back(right[rightIndex]);',
          '      rightIndex += 1;',
          '    }',
          '  }',
          '  return merged;',
          '};',
          'return mergeSort(values);'
        ],
        hints: ['Разделяй массив на две половины, сортируй их отдельно и затем сливай.', 'Для рекурсивного решения удобно использовать `std::function`.'],
        explanation: 'Сортировка слиянием - хороший пример рекурсивного разбиения.',
        tests: [{ args: [values], expected: mergeSortNumbers(values) }],
        strategy: 'recursion',
        tags: ['merge-sort', 'divide-and-conquer'],
        seed: `cpp-recursion-expert-merge-${values.join(',')}`
      });
    }
  }
}

function buildAlgorithmsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const values = sampleNumbers(rng, rng.int(6, 9), -10, 20, true);
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Максимальная сумма',
        prompt: `Дан массив values = ${JSON.stringify(values)}. Верни максимальную сумму подмассива.`,
        returnType: 'int',
        argTypes: ['vector<int>'],
        argNames: ['values'],
        starterBody: ['return 0;'],
        solutionBody: [
          'int best = values[0];',
          'int current = values[0];',
          'for (size_t index = 1; index < values.size(); index += 1) {',
          '  current = max(values[index], current + values[index]);',
          '  best = max(best, current);',
          '}',
          'return best;'
        ],
        hints: ['Сохраняй текущую лучшую сумму, которая заканчивается в текущей позиции.', 'Если продолжение стало хуже одного элемента, начинай заново.'],
        explanation: 'Это классический алгоритм Кадане.',
        tests: [{ args: [values], expected: maxSubarray(values) }],
        strategy: 'algorithm',
        tags: ['kadane', 'sum'],
        seed: `cpp-algorithms-easy-kadane-${values.join(',')}`
      });
    }
    case 'medium': {
      const values = sampleNumbers(rng, rng.int(6, 9), 0, 20, true);
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Длина возрастающей серии',
        prompt: `Дан массив values = ${JSON.stringify(values)}. Верни длину самой длинной возрастающей подряд серии.`,
        returnType: 'int',
        argTypes: ['vector<int>'],
        argNames: ['values'],
        starterBody: ['return 0;'],
        solutionBody: [
          'if (values.empty()) {',
          '  return 0;',
          '}',
          'int best = 1;',
          'int streak = 1;',
          'for (size_t index = 1; index < values.size(); index += 1) {',
          '  if (values[index] > values[index - 1]) {',
          '    streak += 1;',
          '  } else {',
          '    streak = 1;',
          '  }',
          '  best = max(best, streak);',
          '}',
          'return best;'
        ],
        hints: ['Сравни каждый элемент с предыдущим.', 'Если серия прервалась, сбрасывай счётчик.'],
        explanation: 'Подобные задачи часто встречаются в анализе временных рядов.',
        tests: [{ args: [values], expected: longestIncreasingStreak(values) }],
        strategy: 'algorithm',
        tags: ['streak', 'scan'],
        seed: `cpp-algorithms-medium-streak-${values.join(',')}`
      });
    }
    case 'hard': {
      const values = sampleNumbers(rng, rng.int(6, 9), 0, 20);
      const pairA = rng.int(0, values.length - 2);
      const pairB = rng.int(pairA + 1, values.length - 1);
      const target = values[pairA] + values[pairB];
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Два числа',
        prompt: `Дан массив values = ${JSON.stringify(values)} и target = ${target}. Верни индексы двух элементов с суммой target.`,
        returnType: 'vector<int>',
        argTypes: ['vector<int>', 'int'],
        argNames: ['values', 'target'],
        starterBody: [cppDefaultReturnLine('vector<int>')],
        solutionBody: [
          'unordered_map<int, int> seen;',
          'for (int index = 0; index < static_cast<int>(values.size()); index += 1) {',
          '  const int value = values[index];',
          '  const int complement = target - value;',
          '  if (seen.count(complement) > 0) {',
          '    return vector<int>{seen[complement], index};',
          '  }',
          '  if (seen.count(value) == 0) {',
          '    seen[value] = index;',
          '  }',
          '}',
          'return vector<int>{-1, -1};'
        ],
        hints: ['Храни уже встреченные числа вместе с их индексами.', 'Как только найдёшь дополнение к target, сразу возвращай пару.'],
        explanation: 'Two Sum - один из базовых алгоритмов на хеш-таблицу.',
        tests: [{ args: [values, target], expected: twoSumIndices(values, target) }],
        strategy: 'algorithm',
        tags: ['hashmap', 'two-sum'],
        seed: `cpp-algorithms-hard-two-sum-${values.join(',')}:${target}`
      });
    }
    default: {
      const values = sampleNumbers(rng, rng.int(5, 8), -5, 15, true);
      return buildTask({
        category: 'algorithms',
        difficulty,
        title: 'Префиксные суммы',
        prompt: `Дан массив values = ${JSON.stringify(values)}. Верни массив префиксных сумм.`,
        returnType: 'vector<int>',
        argTypes: ['vector<int>'],
        argNames: ['values'],
        starterBody: [cppDefaultReturnLine('vector<int>')],
        solutionBody: [
          'vector<int> result;',
          'result.reserve(values.size());',
          'int total = 0;',
          'for (int value : values) {',
          '  total += value;',
          '  result.push_back(total);',
          '}',
          'return result;'
        ],
        hints: ['Суммируй элементы слева направо и сохраняй накопленный итог.', 'Каждый следующий префикс - это предыдущий плюс текущий элемент.'],
        explanation: 'Префиксные суммы нужны почти в каждом алгоритмическом инструменте.',
        tests: [{ args: [values], expected: prefixSums(values) }],
        strategy: 'algorithm',
        tags: ['prefix-sums'],
        seed: `cpp-algorithms-expert-prefix-${values.join(',')}`
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
  return uniqueSortedWords(words)
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
      const values = sampleNumbers(rng, rng.int(5, 7), 0, 20);
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Prefix sums',
        prompt: `Given values = ${JSON.stringify(values)}, return the running prefix sums.`,
        returnType: 'vector<int>',
        argTypes: ['vector<int>'],
        argNames: ['values'],
        starterBody: [cppDefaultReturnLine('vector<int>')],
        solutionBody: [
          'vector<int> result;',
          'result.reserve(values.size());',
          'int total = 0;',
          'for (int value : values) {',
          '  total += value;',
          '  result.push_back(total);',
          '}',
          'return result;'
        ],
        hints: ['Keep a running total.', 'Store the accumulated value after each step.'],
        explanation: 'Prefix sums turn each position into the sum of everything before it.',
        tests: [{ args: [values], expected: prefixSums(values) }],
        strategy: 'arrays',
        tags: ['prefix-sums', 'running-total'],
        seed: `cpp-arrays-expanded-easy-prefix-${values.join(',')}`
      });
    }
    case 'medium': {
      const values = sampleNumbers(rng, rng.int(6, 8), -10, 20, true);
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Suffix sums',
        prompt: `Given values = ${JSON.stringify(values)}, return the suffix sums from right to left.`,
        returnType: 'vector<int>',
        argTypes: ['vector<int>'],
        argNames: ['values'],
        starterBody: [cppDefaultReturnLine('vector<int>')],
        solutionBody: [
          'vector<int> result(values.size());',
          'int total = 0;',
          'for (int index = static_cast<int>(values.size()) - 1; index >= 0; index -= 1) {',
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
        seed: `cpp-arrays-expanded-medium-suffix-${values.join(',')}`
      });
    }
    case 'hard': {
      const values = sampleNumbers(rng, rng.int(6, 9), -10, 20, true);
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Adjacent differences',
        prompt: `Given values = ${JSON.stringify(values)}, return the differences between neighboring elements.`,
        returnType: 'vector<int>',
        argTypes: ['vector<int>'],
        argNames: ['values'],
        starterBody: [cppDefaultReturnLine('vector<int>')],
        solutionBody: [
          'vector<int> result;',
          'if (values.size() < 2) {',
          '  return result;',
          '}',
          'result.reserve(values.size() - 1);',
          'for (size_t index = 1; index < values.size(); index += 1) {',
          '  result.push_back(values[index] - values[index - 1]);',
          '}',
          'return result;'
        ],
        hints: ['Every result element compares the current value with the previous one.', 'The output is one element shorter than the input.'],
        explanation: 'This pattern is useful for detecting changes and trends.',
        tests: [{ args: [values], expected: adjacentDifferences(values) }],
        strategy: 'arrays',
        tags: ['differences', 'scan'],
        seed: `cpp-arrays-expanded-hard-diff-${values.join(',')}`
      });
    }
    default: {
      const values = sampleNumbers(rng, rng.int(7, 10), -10, 25, true);
      return buildTask({
        category: 'arrays',
        difficulty,
        title: 'Parity partition',
        prompt: `Given values = ${JSON.stringify(values)}, place all even numbers before odd numbers while keeping each group stable.`,
        returnType: 'vector<int>',
        argTypes: ['vector<int>'],
        argNames: ['values'],
        starterBody: [cppDefaultReturnLine('vector<int>')],
        solutionBody: [
          'vector<int> evens;',
          'vector<int> odds;',
          'for (int value : values) {',
          '  if (value % 2 == 0) {',
          '    evens.push_back(value);',
          '  } else {',
          '    odds.push_back(value);',
          '  }',
          '}',
          'evens.insert(evens.end(), odds.begin(), odds.end());',
          'return evens;'
        ],
        hints: ['Split the input into two buckets.', 'Concatenate the even bucket with the odd bucket.'],
        explanation: 'Stable partitioning by parity is a nice exercise in array building.',
        tests: [{ args: [values], expected: partitionByParity(values) }],
        strategy: 'arrays',
        tags: ['parity', 'partition'],
        seed: `cpp-arrays-expanded-expert-parity-${values.join(',')}`
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
        starterBody: ['return string();'],
        solutionBody: [
          'istringstream input(text);',
          'string word;',
          'string result;',
          'bool first = true;',
          'while (input >> word) {',
          '  for (char& ch : word) {',
          '    ch = static_cast<char>(tolower(static_cast<unsigned char>(ch)));',
          '  }',
          '  if (!first) {',
          '    result += " ";',
          '  }',
          '  result += word;',
          '  first = false;',
          '}',
          'return result;'
        ],
        hints: ['Convert characters one by one.', 'Reuse the normalized whitespace helper.'],
        explanation: 'This is a practical preprocessing step before text analysis.',
        tests: [{ args: [text], expected: normalizeSpaces(text).toLowerCase() }],
        strategy: 'strings',
        tags: ['normalize', 'lowercase'],
        seed: `cpp-strings-expanded-easy-normalize-${text}`
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
        starterBody: ['return string();'],
        solutionBody: [
          'istringstream input(text);',
          'vector<string> words;',
          'string word;',
          'while (input >> word) {',
          '  words.push_back(word);',
          '}',
          'reverse(words.begin(), words.end());',
          'string result;',
          'for (size_t index = 0; index < words.size(); index += 1) {',
          '  if (index > 0) {',
          '    result += " ";',
          '  }',
          '  result += words[index];',
          '}',
          'return result;'
        ],
        hints: ['Split the text into words first.', 'Reverse the word list, not the characters.'],
        explanation: 'Word-order reversal is a common parsing and formatting exercise.',
        tests: [{ args: [text], expected: reverseWords(text) }],
        strategy: 'strings',
        tags: ['reverse', 'words'],
        seed: `cpp-strings-expanded-medium-reverse-${text}`
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
        starterBody: ['return string();'],
        solutionBody: [
          'unordered_set<char> seen;',
          'string result;',
          'for (char ch : text) {',
          '  if (seen.insert(ch).second) {',
          '    result.push_back(ch);',
          '  }',
          '}',
          'return result;'
        ],
        hints: ['Track characters you have already emitted.', 'Only append a character the first time you see it.'],
        explanation: 'This is a useful pattern when you need stable deduplication in text.',
        tests: [{ args: [text], expected: uniqueCharsPreserveOrder(text) }],
        strategy: 'strings',
        tags: ['unique', 'dedupe'],
        seed: `cpp-strings-expanded-hard-unique-${text}`
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
        starterBody: ['return string();'],
        solutionBody: [
          'istringstream input(text);',
          'string word;',
          'string result;',
          'while (input >> word) {',
          '  result.push_back(static_cast<char>(toupper(static_cast<unsigned char>(word[0]))));',
          '}',
          'return result;'
        ],
        hints: ['Read the words one by one.', 'Take the first character from each word and append it.'],
        explanation: 'Acronym-style extraction is a neat text-processing task.',
        tests: [{ args: [text], expected: wordInitials(text) }],
        strategy: 'strings',
        tags: ['initials', 'acronym'],
        seed: `cpp-strings-expanded-expert-initials-${text}`
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
        returnType: 'vector<string>',
        argTypes: ['vector<string>'],
        argNames: ['words'],
        starterBody: [cppDefaultReturnLine('vector<string>')],
        solutionBody: [
          'vector<string> result = words;',
          'sort(result.begin(), result.end(), [](const string& left, const string& right) {',
          '  const char leftLast = left.back();',
          '  const char rightLast = right.back();',
          '  if (leftLast != rightLast) {',
          '    return leftLast < rightLast;',
          '  }',
          '  return left < right;',
          '});',
          'return result;'
        ],
        hints: ['Use the last character as the main key.', 'Break ties with normal alphabetic order.'],
        explanation: 'This is a clean warm-up for custom comparators.',
        tests: [{ args: [words], expected: sortByLastThenLex(words) }],
        strategy: 'collections',
        tags: ['sorting', 'comparator'],
        seed: `cpp-collections-expanded-easy-last-${words.join(',')}`
      });
    }
    case 'medium': {
      const words = sampleWords(rng, rng.int(6, 8), true);
      return buildTask({
        category: 'collections',
        difficulty,
        title: 'Count by length',
        prompt: `Given words = ${JSON.stringify(words)}, return entries like "4:3" sorted by length.`,
        returnType: 'vector<string>',
        argTypes: ['vector<string>'],
        argNames: ['words'],
        starterBody: [cppDefaultReturnLine('vector<string>')],
        solutionBody: [
          'map<int, int> counts;',
          'for (const string& word : words) {',
          '  counts[static_cast<int>(word.size())] += 1;',
          '}',
          'vector<string> result;',
          'for (const auto& [length, count] : counts) {',
          '  result.push_back(to_string(length) + ":" + to_string(count));',
          '}',
          'return result;'
        ],
        hints: ['Group words by their length.', 'A sorted map keeps lengths in order automatically.'],
        explanation: 'Length-based summaries are a lightweight way to study distributions.',
        tests: [{ args: [words], expected: countByLengthSummary(words) }],
        strategy: 'collections',
        tags: ['grouping', 'summary'],
        seed: `cpp-collections-expanded-medium-length-${words.join(',')}`
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
        returnType: 'vector<string>',
        argTypes: ['vector<string>', 'int'],
        argNames: ['words', 'k'],
        starterBody: [cppDefaultReturnLine('vector<string>')],
        solutionBody: [
          'unordered_set<string> seen;',
          'vector<string> unique;',
          'for (const string& word : words) {',
          '  if (seen.insert(word).second) {',
          '    unique.push_back(word);',
          '  }',
          '}',
          'sort(unique.begin(), unique.end(), [](const string& left, const string& right) {',
          '  if (left.size() != right.size()) {',
          '    return left.size() > right.size();',
          '  }',
          '  return left < right;',
          '});',
          'if (unique.size() > static_cast<size_t>(k)) {',
          '  unique.resize(k);',
          '}',
          'return unique;'
        ],
        hints: ['Remove duplicates before sorting.', 'Sort by length descending and alphabetically for ties.'],
        explanation: 'This mixes deduplication, ordering and limiting the output size.',
        tests: [{ args: [words, k], expected: topLongestUniqueWords(words, k) }],
        strategy: 'collections',
        tags: ['dedupe', 'top-k'],
        seed: `cpp-collections-expanded-hard-top-${words.join(',')}:${k}`
      });
    }
    default: {
      const words = sampleWords(rng, rng.int(6, 9), true);
      return buildTask({
        category: 'collections',
        difficulty,
        title: 'Initial frequency ranking',
        prompt: `Given words = ${JSON.stringify(words)}, summarize initials by frequency, then by letter.`,
        returnType: 'vector<string>',
        argTypes: ['vector<string>'],
        argNames: ['words'],
        starterBody: [cppDefaultReturnLine('vector<string>')],
        solutionBody: [
          'map<char, int> counts;',
          'for (const string& word : words) {',
          '  counts[static_cast<char>(toupper(static_cast<unsigned char>(word[0])))] += 1;',
          '}',
          'vector<pair<char, int>> ordered(counts.begin(), counts.end());',
          'sort(ordered.begin(), ordered.end(), [](const auto& left, const auto& right) {',
          '  if (left.second != right.second) {',
          '    return left.second > right.second;',
          '  }',
          '  return left.first < right.first;',
          '});',
          'vector<string> result;',
          'for (const auto& [initial, count] : ordered) {',
          '  result.push_back(string(1, initial) + ":" + to_string(count));',
          '}',
          'return result;'
        ],
        hints: ['Count initials first.', 'Then sort by frequency descending and by letter ascending.'],
        explanation: 'This is a compact ranking exercise for map and sort usage.',
        tests: [{ args: [words], expected: countByInitialFrequency(words) }],
        strategy: 'collections',
        tags: ['frequency', 'ranking'],
        seed: `cpp-collections-expanded-expert-initials-${words.join(',')}`
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
        argTypes: ['vector<int>'],
        argNames: ['values'],
        starterBody: ['return 0;'],
        solutionBody: [
          'function<int(size_t)> sumFrom = [&](size_t index) -> int {',
          '  if (index >= values.size()) {',
          '    return 0;',
          '  }',
          '  return values[index] + sumFrom(index + 1);',
          '};',
          'return sumFrom(0);'
        ],
        hints: ['Make the index part of the recursive state.', 'Stop when the index reaches the end of the array.'],
        explanation: 'This is a good warm-up for recursive traversal of a sequence.',
        tests: [{ args: [values], expected: values.reduce((sum, value) => sum + value, 0) }],
        strategy: 'recursion',
        tags: ['recursion', 'sum'],
        seed: `cpp-recursion-expanded-easy-sum-${values.join(',')}`
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
        starterBody: ['return string();'],
        solutionBody: [
          'function<string(const string&)> reverseText = [&](const string& current) -> string {',
          '  if (current.size() <= 1) {',
          '    return current;',
          '  }',
          '  return reverseText(current.substr(1)) + current[0];',
          '};',
          'return reverseText(text);'
        ],
        hints: ['The first character moves to the end.', 'Recurse on the substring without the first character.'],
        explanation: 'Recursive string reversal is a classic way to practice divide-and-conquer thinking.',
        tests: [{ args: [text], expected: recursiveStringReverse(text) }],
        strategy: 'recursion',
        tags: ['recursion', 'string'],
        seed: `cpp-recursion-expanded-medium-reverse-${text}`
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
        starterBody: ['return 0;'],
        solutionBody: [
          'function<int(int, int)> gcd = [&](int a, int b) -> int {',
          '  a = abs(a);',
          '  b = abs(b);',
          '  if (b == 0) {',
          '    return a;',
          '  }',
          '  return gcd(b, a % b);',
          '};',
          'return gcd(left, right);'
        ],
        hints: ['Use the Euclidean algorithm.', 'Keep calling the function with the remainder.'],
        explanation: 'GCD is one of the cleanest examples of recursion with a mathematical loop.',
        tests: [{ args: [left, right], expected: recursiveGcd(left, right) }],
        strategy: 'recursion',
        tags: ['recursion', 'gcd'],
        seed: `cpp-recursion-expanded-hard-gcd-${left}:${right}`
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
        starterBody: ['return 0;'],
        solutionBody: [
          'function<int(int)> fib = [&](int value) -> int {',
          '  if (value <= 1) {',
          '    return value;',
          '  }',
          '  return fib(value - 1) + fib(value - 2);',
          '};',
          'return fib(n);'
        ],
        hints: ['The base cases are 0 and 1.', 'Each number is the sum of the previous two.'],
        explanation: 'Fibonacci is intentionally expensive in naive recursive form, which makes it a good expert exercise.',
        tests: [{ args: [n], expected: fibonacciValue(n) }],
        strategy: 'recursion',
        tags: ['recursion', 'fibonacci'],
        seed: `cpp-recursion-expanded-expert-fibonacci-${n}`
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
        argTypes: ['vector<int>', 'int'],
        argNames: ['sortedValues', 'target'],
        starterBody: ['return 0;'],
        solutionBody: [
          'int left = 0;',
          'int right = static_cast<int>(sortedValues.size());',
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
        seed: `cpp-algorithms-expanded-easy-insert-${values.join(',')}:${target}`
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
        argTypes: ['vector<int>', 'int'],
        argNames: ['values', 'target'],
        starterBody: ['return 0;'],
        solutionBody: [
          'unordered_map<int, int> counts;',
          'counts[0] = 1;',
          'int prefix = 0;',
          'int total = 0;',
          'for (int value : values) {',
          '  prefix += value;',
          '  if (counts.count(prefix - target) > 0) {',
          '    total += counts[prefix - target];',
          '  }',
          '  counts[prefix] += 1;',
          '}',
          'return total;'
        ],
        hints: ['Track how many times each prefix sum has appeared.', 'A matching subarray ends whenever the difference is target.'],
        explanation: 'Prefix-sum counting is the standard one-pass solution.',
        tests: [{ args: [values, target], expected: countSubarraysWithSum(values, target) }],
        strategy: 'algorithm',
        tags: ['prefix-sum', 'counting'],
        seed: `cpp-algorithms-expanded-medium-count-${values.join(',')}:${target}`
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
        argTypes: ['vector<int>'],
        argNames: ['values'],
        starterBody: ['return 0;'],
        solutionBody: [
          'unordered_map<int, int> lastSeen;',
          'int left = 0;',
          'int best = 0;',
          'for (int right = 0; right < static_cast<int>(values.size()); right += 1) {',
          '  int value = values[right];',
          '  if (lastSeen.count(value) > 0 && lastSeen[value] >= left) {',
          '    left = lastSeen[value] + 1;',
          '  }',
          '  lastSeen[value] = right;',
          '  best = max(best, right - left + 1);',
          '}',
          'return best;'
        ],
        hints: ['Move the left side of the window when you see a repeated value.', 'Store the last index where each value appeared.'],
        explanation: 'Sliding-window + last-seen indices is a powerful pattern for uniqueness constraints.',
        tests: [{ args: [values], expected: longestUniqueSubarrayLength(values) }],
        strategy: 'algorithm',
        tags: ['window', 'unique'],
        seed: `cpp-algorithms-expanded-hard-unique-${values.join(',')}`
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
        returnType: 'vector<int>',
        argTypes: ['vector<int>', 'int'],
        argNames: ['values', 'k'],
        starterBody: [cppDefaultReturnLine('vector<int>')],
        solutionBody: [
          'unordered_map<int, int> counts;',
          'for (int value : values) {',
          '  counts[value] += 1;',
          '}',
          'vector<pair<int, int>> ordered(counts.begin(), counts.end());',
          'sort(ordered.begin(), ordered.end(), [](const auto& left, const auto& right) {',
          '  if (left.second != right.second) {',
          '    return left.second > right.second;',
          '  }',
          '  return left.first < right.first;',
          '});',
          'vector<int> result;',
          'for (int index = 0; index < min(k, static_cast<int>(ordered.size())); index += 1) {',
          '  result.push_back(ordered[index].first);',
          '}',
          'return result;'
        ],
        hints: ['Count first, sort later.', 'Use frequency descending and value ascending to break ties.'],
        explanation: 'A frequency table turns this into a deterministic ranking problem.',
        tests: [{ args: [values, k], expected: topKFrequentNumbers(values, k) }],
        strategy: 'algorithm',
        tags: ['frequency', 'top-k'],
        seed: `cpp-algorithms-expanded-expert-topk-${values.join(',')}:${k}`
      });
    }
  }
}

function chooseCategory(options, rng) {
  if (options.category && Object.prototype.hasOwnProperty.call(CATEGORY_META, options.category)) {
    return options.category;
  }
  const pool = Array.isArray(options.categories) && options.categories.length > 0
    ? options.categories.filter((category) => Object.prototype.hasOwnProperty.call(CATEGORY_META, category))
    : Object.keys(CATEGORY_META);
  const validPool = pool.length > 0 ? pool : Object.keys(CATEGORY_META);
  if (options.focusCategory && validPool.includes(options.focusCategory) && options.randomMode === false) {
    return options.focusCategory;
  }
  return rng.pick(validPool);
}

function chooseDifficulty(options, rng) {
  if (options.difficulty && DIFFICULTIES.includes(options.difficulty)) {
    return options.difficulty;
  }
  const pool = Array.isArray(options.difficulties) && options.difficulties.length > 0
    ? options.difficulties.filter((difficulty) => DIFFICULTIES.includes(difficulty))
    : DIFFICULTIES;
  const validPool = pool.length > 0 ? pool : DIFFICULTIES;
  if (options.mode === 'boss') {
    return 'expert';
  }
  if (options.focusDifficulty && validPool.includes(options.focusDifficulty) && options.randomMode === false) {
    return options.focusDifficulty;
  }
  return rng.pick(validPool);
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
    default:
      return rng.bool(0.5) ? buildAlgorithmsTaskExpanded(difficulty, rng) : buildAlgorithmsTask(difficulty, rng);
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
  const category = topic ? topic.spec.category : normalizeCategory(chooseCategory(options, rng));
  const difficulty = normalizeDifficulty(chooseDifficulty(options, rng));
  const challengeType = options.mode === 'daily' ? 'daily' : options.mode === 'boss' ? 'boss' : 'practice';
  const task = buildGeneratedTask(category, difficulty, rng);
  task.seed = seed;
  task.category = category;
  task.difficulty = difficulty;
  task.challengeType = challengeType;
  task.kernelId = CPP_KERNEL_META.id;
  task.kernelTitle = CPP_KERNEL_META.title;
  task.editorLanguage = CPP_KERNEL_META.editorLanguage;
  return topic ? decoratePracticeTopicTask(task, topic) : task;
}

function createCustomTaskTemplate() {
  const signature = cppSignature('vector<int>', ['vector<int>'], ['values']);
  return makeTask({
    category: 'arrays',
    difficulty: 'easy',
    title: 'Пользовательская C++ задача',
    prompt: 'Опиши пользовательскую C++ задачу и заполни тесты.',
    signature,
    starterCode: cppCode(signature, [cppDefaultReturnLine('vector<int>')]),
    solution: cppCode(signature, [cppDefaultReturnLine('vector<int>')]),
    hints: ['Опиши ожидаемое поведение в prompt.', 'Заполни tests массивом входов и ожидаемых результатов.'],
    explanation: 'Шаблон для пользовательской C++ задачи.',
    tests: [],
    strategy: 'arrays',
    tags: ['custom'],
    meta: {
      cpp: {
        returnType: 'vector<int>',
        argTypes: ['vector<int>']
      }
    }
  });
}

function normalizeCustomTask(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const kernelId = typeof raw.kernelId === 'string' && raw.kernelId.trim() ? raw.kernelId.trim() : CPP_KERNEL_META.id;
  const strategy = Object.prototype.hasOwnProperty.call(STRATEGY_META, raw.strategy) ? raw.strategy : 'simple';
  const category = Object.prototype.hasOwnProperty.call(CATEGORY_META, raw.category) ? raw.category : 'arrays';
  const difficulty = DIFFICULTIES.includes(raw.difficulty) ? raw.difficulty : 'easy';
  const cppMeta = buildCppCustomMeta(raw.meta || raw);
  const argNames = Array.isArray(raw.argNames) && raw.argNames.length === cppMeta.argTypes.length
    ? raw.argNames.slice()
    : cppMeta.argTypes.map((_, index) => `arg${index + 1}`);
  const signature = normalizeCppSignature(raw.signature, cppMeta.returnType, cppMeta.argTypes, argNames);

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
      : cppCode(signature, [cppDefaultReturnLine(cppMeta.returnType)]);
  const solution = typeof raw.solution === 'string'
    ? raw.solution
    : typeof raw.solutionCode === 'string'
      ? raw.solutionCode
      : starterCode;
  const createdAt = raw.createdAt || raw.importedAt || Date.now();

  return makeTask({
    id: raw.id || `custom-${hashString(`${raw.title || raw.prompt || 'task'}:${createdAt}`)}`,
    source: 'custom',
    createdAt,
    kernelId,
    category,
    difficulty,
    title: String(raw.title || 'Пользовательская C++ задача'),
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
    meta: {
      cpp: cppMeta
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
  cachedCppRuntime = null;
  const available = cppRuntimeAvailable();
  CPP_KERNEL_META.available = available;
  CPP_KERNEL_META.status = available ? 'available' : 'planned';
  return available;
}

updateRuntimeAvailability();

function runTaskTests(task, userCode) {
  const start = Date.now();
  const runtime = getCppRuntime();
  if (!runtime.available) {
    return Promise.resolve({
      passed: false,
      error: 'Компилятор C++ не найден. Нужен g++ или clang++.',
      tests: [],
      logs: [],
      durationMs: 0
    });
  }

  const meta = buildCppCustomMeta(task.meta || {});
  const returnType = task.meta?.cpp?.returnType || meta.returnType || 'vector<int>';
  const argTypes = Array.isArray(task.meta?.cpp?.argTypes) && task.meta.cpp.argTypes.length > 0
    ? task.meta.cpp.argTypes.slice()
    : meta.argTypes.slice();

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'js-infinite-trainer-cpp-'));
  const solutionPath = path.join(workDir, 'Solution.cpp');
  const runnerPath = path.join(workDir, 'Runner.cpp');
  const outputPath = path.join(workDir, 'Runner.exe');
  const env = buildSafeProcessEnv(runtime.binDir && path.isAbsolute(runtime.binDir) ? runtime.binDir : null);

  try {
    fs.writeFileSync(solutionPath, String(userCode || ''), 'utf8');
    fs.writeFileSync(runnerPath, buildCppRunnerSource(task, returnType, argTypes), 'utf8');

    const compileArgs = runtime.kind === 'clang++'
      ? ['-std=c++17', '-O2', '-Wall', '-Wextra', '-static-libgcc', '-static-libstdc++', 'Solution.cpp', 'Runner.cpp', '-o', 'Runner.exe']
      : ['-std=c++17', '-O2', '-Wall', '-Wextra', '-static-libgcc', '-static-libstdc++', 'Solution.cpp', 'Runner.cpp', '-o', 'Runner.exe'];
    const compile = spawnSync(runtime.compilerPath, compileArgs, {
      cwd: workDir,
      encoding: 'utf8',
      windowsHide: true,
      timeout: NATIVE_COMPILE_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
      env
    });

    if (compile.status !== 0) {
      const message = (compile.stderr || compile.stdout || '').trim() || 'C++ compilation failed';
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

    const rawOutput = (exec.stdout || '').trim();
    if (!rawOutput) {
      const message = (exec.stderr || '').trim() || 'C++ runner returned no output';
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
        error: `Не удалось разобрать вывод C++-раннера: ${error.message || String(error)}`,
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

module.exports = {
  ...CPP_KERNEL_META,
  available: CPP_KERNEL_META.available,
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
