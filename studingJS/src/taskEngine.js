const vm = require('node:vm');
const { inspect, isDeepStrictEqual } = require('node:util');

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
    description: 'Параметры, колбэки, композиция и универсальные утилиты',
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

const FIRST_NAMES = [
  'Ada', 'Mila', 'Nina', 'Oleg', 'Leo', 'Sara', 'Ilya', 'Zoe', 'Maks', 'Lina',
  'Vera', 'Pavel', 'Rita', 'Artem', 'Noah', 'Iris', 'Dina', 'Roman'
];

const WORD_POOL = [
  'alpha', 'beta', 'gamma', 'delta', 'omega', 'nova', 'pulse', 'vector',
  'lumen', 'mint', 'orbit', 'cinder', 'azure', 'pixel', 'vivid', 'spark',
  'drift', 'tide', 'echo', 'frost', 'ember', 'quartz'
];

const CITY_POOL = [
  'Berlin', 'Tokyo', 'Oslo', 'Lisbon', 'Prague', 'Riga', 'Milan', 'Helsinki',
  'Athens', 'Seoul', 'Rome', 'Paris', 'Madrid', 'Dublin'
];

const EMAIL_DOMAINS = ['example.com', 'mail.dev', 'train.local', 'code.run'];
let seedCounter = 0;

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
  return inspect(value, {
    depth: 2,
    maxArrayLength: 8,
    breakLength: 90,
    compact: true
  }).replace(/\n/g, ' ');
}

function quote(value) {
  return JSON.stringify(value);
}

function capitalize(value) {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function unique(list) {
  return Array.from(new Set(list));
}

function sum(list) {
  return list.reduce((acc, item) => acc + item, 0);
}

function sampleWord(rng) {
  return rng.pick(WORD_POOL);
}

function sampleName(rng) {
  return rng.pick(FIRST_NAMES);
}

function sampleCity(rng) {
  return rng.pick(CITY_POOL);
}

function sampleEmail(rng, name) {
  const local = String(name || sampleName(rng)).toLowerCase();
  return `${local}.${rng.pick(['dev', 'js', 'code', 'lab'])}@${rng.pick(EMAIL_DOMAINS)}`;
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
  return Array.from({ length: count }, () => sampleWord(rng));
}

function samplePersons(rng, count) {
  const used = new Set();
  return Array.from({ length: count }, () => {
    let name = sampleName(rng);
    while (used.has(name)) {
      name = sampleName(rng);
    }
    used.add(name);
    return {
      name,
      score: rng.int(40, 100),
      city: sampleCity(rng)
    };
  });
}

function sampleIntervals(rng, count) {
  const intervals = [];
  let current = rng.int(0, 5);
  for (let i = 0; i < count; i += 1) {
    const start = current + rng.int(0, 4);
    const end = start + rng.int(1, 5);
    intervals.push([start, end]);
    current = start;
  }
  return intervals;
}

function sampleText(rng, length) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += alphabet[rng.int(0, alphabet.length - 1)];
  }
  return result;
}

function indentLines(lines, spaces = 2) {
  const prefix = ' '.repeat(spaces);
  return lines.map((line) => `${prefix}${line}`).join('\n');
}

function codeBlock(signature, bodyLines, options = {}) {
  const isAsync = options.async === true;
  const lines = Array.isArray(bodyLines) ? bodyLines : String(bodyLines).split(/\r?\n/);
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
    hints: Array.isArray(data.hints) ? data.hints : [],
    explanation: data.explanation || '',
    strategy: data.strategy || 'simple',
    tests: cloneJson(data.tests || []),
    xp: data.xp || (DIFFICULTY_META[data.difficulty] ? DIFFICULTY_META[data.difficulty].xp : 0),
    tags: Array.isArray(data.tags) ? data.tags : [],
    meta: data.meta || {},
    challengeType: data.challengeType || 'practice'
  };
}

function normalizeDifficulty(value) {
  if (DIFFICULTIES.includes(value)) {
    return value;
  }
  return 'easy';
}

function normalizeCategory(value) {
  if (CATEGORY_ORDER.includes(value)) {
    return value;
  }
  return 'arrays';
}

function normalizeCustomTask(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const kernelId = typeof raw.kernelId === 'string' && raw.kernelId.trim() ? raw.kernelId.trim() : 'js';
  const strategy = ['simple', 'closure', 'async', 'dom'].includes(raw.strategy) ? raw.strategy : 'simple';
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
      ? raw.hintsText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      : [];
  const starterCode = typeof raw.starterCode === 'string'
    ? raw.starterCode
    : typeof raw.starter === 'string'
      ? raw.starter
      : codeBlock('solve(input)', ['// TODO']);
  const solution = typeof raw.solution === 'string'
    ? raw.solution
    : typeof raw.solutionCode === 'string'
      ? raw.solutionCode
      : starterCode;
  const createdAt = raw.createdAt || raw.importedAt || Date.now();

  return makeTask({
    id: raw.id || `custom-${hashString(`${raw.title || raw.prompt || 'task'}:${raw.createdAt || Date.now()}`)}`,
    source: 'custom',
    createdAt,
    kernelId,
    category,
    difficulty,
    title: String(raw.title || 'Пользовательская задача'),
    prompt: String(raw.prompt || ''),
    signature: String(raw.signature || 'solve(input)'),
    starterCode,
    solution,
    hints,
    explanation: String(raw.explanation || ''),
    strategy,
    tests,
    xp: Number(raw.xp) || DIFFICULTY_META[difficulty].xp,
    tags: Array.isArray(raw.tags) ? raw.tags.slice() : ['custom']
  });
}

function getTaskSignatureFromArgs(args) {
  return `solve(${args.join(', ')})`;
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
  kernelId = 'js'
}) {
  return makeTask({
    kernelId,
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
    seed
  });
}

function createBasicConsoleBuffer() {
  const logs = [];
  const push = (type, args) => {
    logs.push({
      type,
      text: args.map((arg) => (typeof arg === 'string' ? arg : preview(arg))).join(' ')
    });
  };

  return {
    logs,
    console: {
      log: (...args) => push('log', args),
      info: (...args) => push('info', args),
      warn: (...args) => push('warn', args),
      error: (...args) => push('error', args)
    }
  };
}

function createTestState() {
  return {
    callCounts: Object.create(null),
    collected: Object.create(null),
    functions: Object.create(null)
  };
}

function buildCallableFromSpec(spec, state) {
  const kind = spec.__fn;
  const key = spec.key || spec.name || kind;

  if (state.functions[key]) {
    return state.functions[key];
  }

  const bump = () => {
    state.callCounts[key] = (state.callCounts[key] || 0) + 1;
  };

  switch (kind) {
    case 'constant':
      state.functions[key] = () => spec.value;
      return state.functions[key];
    case 'add':
      state.functions[key] = (value) => value + spec.value;
      return state.functions[key];
    case 'subtract':
      state.functions[key] = (value) => value - spec.value;
      return state.functions[key];
    case 'multiply':
      state.functions[key] = (value) => value * spec.value;
      return state.functions[key];
    case 'divide':
      state.functions[key] = (value) => value / spec.value;
      return state.functions[key];
    case 'predicateGreaterThan':
      state.functions[key] = (value) => value > spec.value;
      return state.functions[key];
    case 'predicateLessThan':
      state.functions[key] = (value) => value < spec.value;
      return state.functions[key];
    case 'predicateNotMultipleOf':
      state.functions[key] = (value) => value % spec.divisor !== 0;
      return state.functions[key];
    case 'predicateModuloEquals':
      state.functions[key] = (value) => value % spec.divisor === spec.remainder;
      return state.functions[key];
    case 'toUpperCase':
      state.functions[key] = (value) => String(value).toUpperCase();
      return state.functions[key];
    case 'appendSuffix':
      state.functions[key] = (value) => `${String(value)}${spec.suffix ?? ''}`;
      return state.functions[key];
    case 'formatUserScore':
      state.functions[key] = (user) => `${user.name}:${user.score}`;
      return state.functions[key];
    case 'weightedAdd':
      state.functions[key] = (value, index = 0) => value * (index + 1);
      return state.functions[key];
    case 'methodProduct':
      state.functions[key] = function (a, b) {
        return Number(this && this.factor ? this.factor : 1) * a * b;
      };
      return state.functions[key];
    case 'spyMultiply':
      state.functions[key] = (value) => {
        bump();
        return value * spec.value;
      };
      return state.functions[key];
    case 'spyAdd':
      state.functions[key] = (value) => {
        bump();
        return value + spec.value;
      };
      return state.functions[key];
    case 'collector':
      state.functions[key] = (payload) => {
        bump();
        if (!state.collected[key]) {
          state.collected[key] = [];
        }
        state.collected[key].push(payload);
      };
      return state.functions[key];
    case 'asyncValue':
      state.functions[key] = async () => spec.value;
      return state.functions[key];
    case 'asyncAdd':
      state.functions[key] = async (value) => value + spec.value;
      return state.functions[key];
    case 'asyncMultiply':
      state.functions[key] = async (value) => value * spec.value;
      return state.functions[key];
    case 'asyncReject':
      state.functions[key] = async () => {
        throw new Error(spec.error || 'boom');
      };
      return state.functions[key];
    case 'delayedValue':
      state.functions[key] = () => new Promise((resolve) => setTimeout(() => resolve(spec.value), spec.delay || 0));
      return state.functions[key];
    case 'flakyAsync':
      state.functions[key] = async () => {
        bump();
        const failTimes = Number(spec.failTimes) || 0;
        if (state.callCounts[key] <= failTimes) {
          throw new Error(spec.error || 'boom');
        }
        return spec.value;
      };
      return state.functions[key];
    default:
      state.functions[key] = () => spec.value;
      return state.functions[key];
  }
}

function materializeTestValue(value, state) {
  if (Array.isArray(value)) {
    return value.map((item) => materializeTestValue(item, state));
  }
  if (value && typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, '__fn')) {
      return buildCallableFromSpec(value, state);
    }
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = materializeTestValue(child, state);
    }
    return result;
  }
  return value;
}

function normalizeComparisonValue(value) {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (error) {
      // Fall through to JSON clone.
    }
  }
  try {
    return cloneJson(value);
  } catch (error) {
    return value;
  }
}

function resolveExportedFunction(sandbox) {
  const direct = sandbox.solve;
  if (typeof direct === 'function') {
    return direct;
  }

  const candidates = [sandbox.module && sandbox.module.exports, sandbox.exports];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    if (typeof candidate === 'function') {
      return candidate;
    }
    if (typeof candidate.solve === 'function') {
      return candidate.solve;
    }
    if (typeof candidate.default === 'function') {
      return candidate.default;
    }
  }

  return null;
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

function normalizeSelection(list, fallback) {
  const filtered = Array.isArray(list) ? list.filter((item) => fallback.includes(item)) : [];
  return filtered.length > 0 ? filtered : fallback.slice();
}

function chooseCategory(rng, options) {
  const pool = normalizeSelection(options.categories, CATEGORY_ORDER);
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
  if (options.mode === 'boss') {
    const weights = {
      easy: 1,
      medium: 3,
      hard: 7,
      expert: 10
    };
    return rng.weighted(pool.map((value) => ({ value, weight: weights[value] || 1 })));
  }

  if (options.mode === 'daily') {
    const weights = {
      easy: 2,
      medium: 7,
      hard: 6,
      expert: 3
    };
    return rng.weighted(pool.map((value) => ({ value, weight: weights[value] || 1 })));
  }

  if (options.randomMode !== false) {
    return rng.pick(pool);
  }

  if (pool.includes(options.focusDifficulty)) {
    return options.focusDifficulty;
  }

  return pool[0];
}

function xpForDifficulty(difficulty) {
  return DIFFICULTY_META[difficulty] ? DIFFICULTY_META[difficulty].xp : 0;
}

function buildArraysTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const variant = rng.int(0, 4);
      if (variant === 0) {
        const parity = rng.bool() ? 'even' : 'odd';
        const numbers = sampleNumbers(rng, rng.int(7, 10), 1, 40);
        const keepEven = parity === 'even';
        const title = parity === 'even' ? 'Фильтр чётных чисел' : 'Фильтр нечётных чисел';
        const prompt = `Дан массив чисел numbers = ${preview(numbers)}. Верни только ${parity === 'even' ? 'чётные' : 'нечётные'} числа в исходном порядке.`;
        const signature = 'solve(numbers)';
        const solutionBody = [`return numbers.filter((n) => ${keepEven ? 'n % 2 === 0' : 'n % 2 !== 0'});`];
        const tests = [
          { args: [numbers], expected: numbers.filter((n) => (keepEven ? n % 2 === 0 : n % 2 !== 0)) },
          { args: [[1, 2, 3, 4, 5, 6]], expected: keepEven ? [2, 4, 6] : [1, 3, 5] }
        ];
        return buildTaskFromParts({
          category: 'arrays',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['// Верни отфильтрованный массив'],
          solutionBody,
          hints: ['Подумай о методе `filter`.', 'Для чётных чисел проверь `n % 2 === 0`.'],
          explanation: 'Логика задачи сводится к фильтрации массива по простому условию. Мы оставляем только элементы, которые проходят проверку чётности.',
          tests,
          tags: ['filter', parity]
        });
      }

      if (variant === 1) {
        const values = unique(sampleWords(rng, rng.int(8, 11)).concat(sampleWords(rng, 3)));
        const title = 'Удаление дублей';
        const prompt = `Дан массив строк values = ${preview(values)}. Верни массив без повторов, сохранив первое вхождение каждого элемента.`;
        const signature = 'solve(values)';
        const solutionBody = ['return Array.from(new Set(values));'];
        const tests = [
          { args: [values], expected: Array.from(new Set(values)) },
          { args: [['a', 'a', 'b', 'c', 'c', 'd']], expected: ['a', 'b', 'c', 'd'] }
        ];
        return buildTaskFromParts({
          category: 'arrays',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['// Удали повторяющиеся элементы'],
          solutionBody,
          hints: ['`Set` автоматически хранит только уникальные значения.', 'Можно просто преобразовать `Set` обратно в массив.'],
          explanation: 'Здесь важно сохранить порядок первого появления элементов. В JavaScript это удобно делать через `Set`.',
          tests,
          tags: ['dedupe', 'set']
        });
      }

      if (variant === 2) {
        const numbers = sampleNumbers(rng, rng.int(6, 9), 1, 12);
        const title = 'РљРІР°РґСЂР°С‚С‹ С‡РёСЃРµР»';
        const prompt = `Р”Р°РЅ РјР°СЃСЃРёРІ numbers = ${preview(numbers)}. Р’РµСЂРЅРё РЅРѕРІС‹Р№ РјР°СЃСЃРёРІ СЃ РєРІР°РґСЂР°С‚Р°РјРё РІ С‚РѕРј Р¶Рµ РїРѕСЂСЏРґРєРµ.`;
        const signature = 'solve(numbers)';
        const solutionBody = ['return numbers.map((n) => n * n);'];
        const expected = numbers.map((n) => n * n);
        const tests = [
          { args: [numbers], expected },
          { args: [[2, 3, 4]], expected: [4, 9, 16] }
        ];
        return buildTaskFromParts({
          category: 'arrays',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['// Р’РѕР·РІСЂР°С‚Рё РєРІР°РґСЂР°С‚С‹ С‡РёСЃРµР» РІ С‚РѕРј Р¶Рµ РїРѕСЂСЏРґРєРµ'],
          solutionBody,
          hints: ['РњРѕР¶РЅРѕ СЃРѕР·РґР°С‚СЊ РЅРѕРІС‹Р№ РјР°СЃСЃРёРІ С‡РµСЂРµР· `map`.', 'РСЃРїРѕР»СЊР·СѓР№ СѓРјРЅРѕР¶РµРЅРёРµ С‡РёСЃР»Р° РЅР° СЃР°РјРѕ СЃРµР±СЏ.'],
          explanation: 'This branch drills arrays and mappings: we do not mutate the input array, we only transform each element.',
          tests,
          tags: ['map', 'square']
        });
      }

      if (variant === 3) {
        const values = sampleWords(rng, rng.int(5, 8));
        const title = 'РћР±СЂР°С‚РЅС‹Р№ РїРѕСЂСЏРґРѕРє';
        const prompt = `Р”Р°РЅ РјР°СЃСЃРёРІ values = ${preview(values)}. Р’РµСЂРЅРё РЅРѕРІС‹Р№ РјР°СЃСЃРёРІ РІ РѕР±СЂР°С‚РЅРѕРј РїРѕСЂСЏРґРєРµ, РЅРµ РјСѓС‚РёСЂСѓСЏ РёСЃС…РѕРґРЅС‹Р№.`;
        const signature = 'solve(values)';
        const solutionBody = ['return values.slice().reverse();'];
        const expected = values.slice().reverse();
        const tests = [
          { args: [values], expected },
          { args: [['a', 'b', 'c']], expected: ['c', 'b', 'a'] }
        ];
        return buildTaskFromParts({
          category: 'arrays',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['// Р’РѕР·РІСЂР°С‚Рё РєРѕРїРёСЋ РІ РѕР±СЂР°С‚РЅРѕРј РїРѕСЂСЏРґРєРµ'],
          solutionBody,
          hints: ['РЎРЅР°С‡Р°Р»Р° СЃРґРµР»Р°Р№ РєРѕРїРёСЋ, С‡С‚РѕР±С‹ РЅРµ РјРµРЅСЏС‚СЊ РѕСЃРЅРѕРІРЅРѕР№ РјР°СЃСЃРёРІ.', 'РњРµС‚РѕРґ `reverse` РІРѕР·РІСЂР°С‰Р°РµС‚ С‚Рµ Р¶Рµ РґР°РЅРЅС‹Рµ, РїРѕСЌС‚РѕРјСѓ РєРѕРїРёСЏ РІР°Р¶РЅР°.'],
          explanation: 'Р—РґРµСЃСЊ РІР°Р¶РЅРѕ РЅРµ РґРѕРїСѓСЃС‚РёС‚СЊ РјСѓС‚Р°С†РёРё РёСЃС…РѕРґРЅРѕРіРѕ РјР°СЃСЃРёРІР°. ',
          tests,
          tags: ['reverse', 'copy']
        });
      }

      const numbers = sampleNumbers(rng, rng.int(7, 10), 1, 50);
      const threshold = rng.int(10, 35);
      const title = 'Фильтрация по порогу';
      const prompt = `Дан массив numbers = ${preview(numbers)} и порог threshold = ${threshold}. Верни только числа, которые больше threshold.`;
      const signature = 'solve(numbers, threshold)';
      const solutionBody = ['return numbers.filter((n) => n > threshold);'];
      const tests = [
        { args: [numbers, threshold], expected: numbers.filter((n) => n > threshold) },
        { args: [[3, 9, 12, 18, 21], 10], expected: [12, 18, 21] }
      ];
      return buildTaskFromParts({
        category: 'arrays',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['// Отфильтруй числа по порогу'],
        solutionBody,
        hints: ['Проверь условие `n > threshold`.', 'Метод `filter` подойдёт идеально.'],
        explanation: 'Мы проходим по массиву и оставляем только элементы, которые больше указанного порога.',
        tests,
        tags: ['filter', 'threshold']
      });
    }
    case 'medium': {
      const variant = rng.int(0, 4);
      if (variant === 0) {
        const people = samplePersons(rng, rng.int(5, 7)).map((person) => ({ name: person.name, score: person.score }));
        const title = 'Сортировка по баллам';
        const prompt = `Дан массив объектов people = ${preview(people)}. Верни массив имён, отсортированный по score по убыванию. При равных score сортируй по имени по возрастанию.`;
        const signature = 'solve(people)';
        const solutionBody = [
          'return people',
          '  .slice()',
          '  .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))',
          '  .map((person) => person.name);'
        ];
        const expected = people
          .slice()
          .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
          .map((person) => person.name);
        const tests = [
          { args: [people], expected },
          {
            args: [[{ name: 'Mila', score: 50 }, { name: 'Ada', score: 80 }, { name: 'Leo', score: 80 }]],
            expected: ['Ada', 'Leo', 'Mila']
          }
        ];
        return buildTaskFromParts({
          category: 'arrays',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['// Отсортируй копию массива и верни имена'],
          solutionBody,
          hints: ['Сначала сделай копию массива через `slice()`.', 'Сортировку можно сделать через `sort` и `localeCompare`.'],
          explanation: 'Нужно упорядочить объекты по двум критериям и затем извлечь только имена. Это типичный паттерн для работы с массивами объектов.',
          tests,
          tags: ['sort', 'objects']
        });
      }

      if (variant === 2) {
        const numbers = sampleNumbers(rng, rng.int(7, 10), 1, 25);
        const size = rng.int(2, 4);
        const title = 'Р Р°Р·Р±РёРµРЅРёРµ РЅР° С‡Р°РЅРєРё';
        const prompt = `Р”Р°РЅ РјР°СЃСЃРёРІ numbers = ${preview(numbers)} Рё СЂР°Р·РјРµСЂ С‡Р°РЅРєР° size = ${size}. Р’РµСЂРЅРё РЅРѕРІС‹Р№ РјР°СЃСЃРёРІ, РіРґРµ СЌР»РµРјРµРЅС‚С‹ СЂР°Р·Р±РёС‚С‹ РЅР° РїРѕРґРјР°СЃСЃРёРІС‹ РґР»РёРЅРѕР№ РЅРµ Р±РѕР»РµРµ size.`;
        const signature = 'solve(numbers, size)';
        const solutionBody = [
          'const result = [];',
          'for (let i = 0; i < numbers.length; i += size) {',
          '  result.push(numbers.slice(i, i + size));',
          '}',
          'return result;'
        ];
        const chunk = (list, chunkSize) => {
          const result = [];
          for (let i = 0; i < list.length; i += chunkSize) {
            result.push(list.slice(i, i + chunkSize));
          }
          return result;
        };
        const expected = chunk(numbers, size);
        const tests = [
          { args: [numbers, size], expected },
          { args: [[1, 2, 3, 4, 5], 2], expected: [[1, 2], [3, 4], [5]] }
        ];
        return buildTaskFromParts({
          category: 'arrays',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['// Р Р°Р·РѕР±СЊРё РјР°СЃСЃРёРІ РЅР° РїРѕРґРјР°СЃСЃРёРІС‹'],
          solutionBody,
          hints: ['Р”РІРёР¶СЃСЏ РїРѕ РјР°СЃСЃРёРІСѓ С€Р°РіРѕРј `size`.', 'РЎР°Рј РІС‹СЂРµР·Р°РµРјС‹Р№ СѓС‡Р°СЃС‚РѕРє РјРѕР¶РЅРѕ Р±СЂР°С‚СЊ С‡РµСЂРµР· `slice`.'],
          explanation: 'РЁР°Р±Р»РѕРЅ РґР»СЏ chunking РїРѕРјРѕРіР°РµС‚ СѓС‡РёС‚СЊСЃСЏ СЂР°Р±РѕС‚Р°С‚СЊ СЃ РїСЂРѕРёР·РІРѕР»СЊРЅС‹Рј Р±Р»РѕРєРёСЂРѕРІР°РЅРёРµРј РјР°СЃСЃРёРІР°.',
          tests,
          tags: ['chunk', 'slice']
        });
      }

      if (variant === 3) {
        const numbers = sampleNumbers(rng, rng.int(6, 10), 1, 30);
        const shift = rng.int(1, Math.max(1, numbers.length - 1));
        const title = 'РЎРјРµС‰РµРЅРёРµ РјР°СЃСЃРёРІР°';
        const prompt = `Р”Р°РЅ РјР°СЃСЃРёРІ numbers = ${preview(numbers)}. РЎРјРµСЃС‚Рё РµРіРѕ РІР»РµРІРѕ РЅР° ${shift} РїРѕР·РёС†РёР№: РїРµСЂРІС‹Рµ СЌР»РµРјРµРЅС‚С‹ РґРѕР»Р¶РЅС‹ РѕРєР°Р·Р°С‚СЊСЃСЏ РІ РєРѕРЅС†Рµ.`;
        const signature = 'solve(numbers, shift)';
        const solutionBody = [
          'const offset = shift % numbers.length;',
          'return numbers.slice(offset).concat(numbers.slice(0, offset));'
        ];
        const rotateLeft = (list, amount) => {
          const offset = amount % list.length;
          return list.slice(offset).concat(list.slice(0, offset));
        };
        const expected = rotateLeft(numbers, shift);
        const tests = [
          { args: [numbers, shift], expected },
          { args: [[1, 2, 3, 4, 5], 2], expected: [3, 4, 5, 1, 2] }
        ];
        return buildTaskFromParts({
          category: 'arrays',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['// РЎРґРІРёРЅСЊ РјР°СЃСЃРёРІ РЅР° Р·Р°РґР°РЅРЅРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ РїРѕР·РёС†РёР№'],
          solutionBody,
          hints: ['РЎРЅР°С‡Р°Р»Р° СЂР°Р·РґРµР»Рё РјР°СЃСЃРёРІ РЅР° РґРІРµ С‡Р°СЃС‚Рё.', 'РџРѕС‚РѕРј СЃРєР»РµР№ РёС… РІ РѕР±СЂР°С‚РЅРѕРј РїРѕСЂСЏРґРєРµ.'],
          explanation: 'РЎРјРµС‰РµРЅРёРµ РјР°СЃСЃРёРІР° РґРµР»Р°РµС‚СЃСЏ С‡РµСЂРµР· РґРІР° СЃСЂРµР·Р° Рё СЃРєР»РµРёРІР°РЅРёРµ, С‚Р°Рє РјС‹ СЃРѕС…СЂР°РЅСЏРµРј РїРѕСЂСЏРґРѕРє Р±РµР· РјСѓС‚Р°С†РёРё.',
          tests,
          tags: ['rotate', 'slice']
        });
      }

      const numbers = sampleNumbers(rng, rng.int(7, 9), 1, 30);
      const windowSize = rng.int(2, Math.min(4, numbers.length - 1));
      const title = 'Скользящие суммы';
      const prompt = `Дан массив numbers = ${preview(numbers)} и размер окна k = ${windowSize}. Верни массив сумм для каждого подряд идущего окна длины k.`;
      const signature = 'solve(numbers, k)';
      const solutionBody = [
        'const result = [];',
        'for (let i = 0; i <= numbers.length - k; i += 1) {',
        '  let windowSum = 0;',
        '  for (let j = i; j < i + k; j += 1) {',
        '    windowSum += numbers[j];',
        '  }',
        '  result.push(windowSum);',
        '}',
        'return result;'
      ];
      const expected = [];
      for (let i = 0; i <= numbers.length - windowSize; i += 1) {
        expected.push(sum(numbers.slice(i, i + windowSize)));
      }
      const tests = [
        { args: [numbers, windowSize], expected },
        { args: [[1, 2, 3, 4, 5], 3], expected: [6, 9, 12] }
      ];
      return buildTaskFromParts({
        category: 'arrays',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['// Посчитай сумму для каждого окна'],
        solutionBody,
        hints: ['Внутри внешнего цикла считай сумму очередного окна.', 'Сдвигай окно на один элемент вправо.'],
        explanation: 'Скользящее окно помогает эффективно считать локальные суммы без создания лишних промежуточных структур.',
        tests,
        tags: ['window', 'sum']
      });
    }
    case 'hard': {
      const variant = rng.int(0, 5);
      if (variant === 0) {
        const words = sampleWords(rng, rng.int(8, 12));
        const counts = new Map();
        for (const word of words) {
          counts.set(word, (counts.get(word) || 0) + 1);
        }
        const title = 'Топ частых слов';
        const k = rng.int(2, 4);
        const prompt = `Дан массив слов words = ${preview(words)}. Верни ${k} самых частых слова. При равной частоте сортируй по алфавиту.`;
        const signature = 'solve(words, k)';
        const solutionBody = [
          'const frequency = new Map();',
          'for (const word of words) {',
          '  frequency.set(word, (frequency.get(word) || 0) + 1);',
          '}',
          'return Array.from(frequency.entries())',
          '  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))',
          '  .slice(0, k)',
          '  .map(([word]) => word);'
        ];
        const expected = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, k)
          .map(([word]) => word);
        const tests = [
          { args: [words, k], expected },
          { args: [['a', 'b', 'a', 'c', 'b', 'a'], 2], expected: ['a', 'b'] }
        ];
        return buildTaskFromParts({
          category: 'arrays',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['// Посчитай частоты и отсортируй результат'],
          solutionBody,
          hints: ['Сначала посчитай частоты в `Map`.', 'Потом отсортируй пары `[value, count]`.'],
          explanation: 'Эта задача требует объединить частотный подсчёт, сортировку и срез по размеру результата.',
          tests,
          tags: ['frequency', 'sort']
        });
      }

      if (variant === 2) {
        const numbers = sampleNumbers(rng, rng.int(5, 8), 2, 9);
        const title = 'РџСЂРѕРёР·РІРµРґРµРЅРёРµ Р±РµР· С‚РµРєСѓС‰РµРіРѕ';
        const prompt = `Р”Р°РЅ РјР°СЃСЃРёРІ numbers = ${preview(numbers)}. Р’РµСЂРЅРё РЅРѕРІС‹Р№ РјР°СЃСЃРёРІ, РіРґРµ РЅР° РєР°Р¶РґРѕР№ РїРѕР·РёС†РёРё СЃС‚РѕРёС‚ РїСЂРѕРёР·РІРµРґРµРЅРёРµ РІСЃРµС… С‡РёСЃРµР», РєСЂРѕРјРµ С‚РµРєСѓС‰РµРіРѕ.`;
        const signature = 'solve(numbers)';
        const solutionBody = [
          'const left = new Array(numbers.length).fill(1);',
          'const right = new Array(numbers.length).fill(1);',
          'for (let i = 1; i < numbers.length; i += 1) {',
          '  left[i] = left[i - 1] * numbers[i - 1];',
          '}',
          'for (let i = numbers.length - 2; i >= 0; i -= 1) {',
          '  right[i] = right[i + 1] * numbers[i + 1];',
          '}',
          'return numbers.map((_, index) => left[index] * right[index]);'
        ];
        const expected = numbers.map((_, index) => {
          let product = 1;
          numbers.forEach((value, valueIndex) => {
            if (valueIndex !== index) {
              product *= value;
            }
          });
          return product;
        });
        const tests = [
          { args: [numbers], expected },
          { args: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] }
        ];
        return buildTaskFromParts({
          category: 'arrays',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['// Р’РµСЂРЅРё РјР°СЃСЃРёРІ РїСЂРѕРёР·РІРµРґРµРЅРёР№ Р±РµР· С‚РµРєСѓС‰РµРіРѕ СЌР»РµРјРµРЅС‚Р°'],
          solutionBody,
          hints: ['Р›РµРІС‹Р№ Рё РїСЂР°РІС‹Р№ РїСЂРѕРёР·РІРµРґРµРЅРёСЏ РїРѕРјРѕРіСѓС‚ СЂР°Р·Р»РѕР¶РёС‚СЊ Р·Р°РґР°С‡Сѓ.', 'РЎРіРѕСЂР°РЅРё Рё РїСЂРѕР№РґРё РјР°СЃСЃРёРІ РґРІР°Р¶РґС‹ Р±РµР· РґРµР»РµРЅРёСЏ.'],
          explanation: 'РљР»Р°СЃСЃРёС‡РµСЃРєР°СЏ С‚СЂРµРЅРёСЂРѕРІРєР° РЅР° РїСЂРѕРёР·РІРµРґРµРЅРёРµ Р±РµР· С‚РµРєСѓС‰РµРіРѕ РєР°Р¶РґРѕРіРѕ СЌР»РµРјРµРЅС‚Р°.',
          tests,
          tags: ['product', 'prefix']
        });
      }

      if (variant === 3) {
        const baseValues = rng.sample(Array.from({ length: 9 }, (_, index) => index + 1), rng.int(4, 6));
        const values = [];
        const expected = [];
        for (const value of baseValues) {
          const count = rng.int(1, 3);
          for (let index = 0; index < count; index += 1) {
            values.push(value);
          }
          expected.push([value, count]);
        }
        const title = 'РЎР¶Р°С‚РёРµ РїРѕС‚РѕРєР°';
        const prompt = `Р”Р°РЅ РјР°СЃСЃРёРІ numbers = ${preview(values)}. Р’РµСЂРЅРё РјР°СЃСЃРёРІ РїР°СЂ [value, count] РґР»СЏ РєР°Р¶РґРѕР№ РіСЂСѓРїРїС‹ РїРѕРґСЂСЏРґ РёРґСѓС‰РёС… РѕРґРёРЅР°РєРѕРІС‹С… С‡РёСЃРµР».`;
        const signature = 'solve(numbers)';
        const solutionBody = [
          'const result = [];',
          'for (let i = 0; i < numbers.length; ) {',
          '  let count = 1;',
          '  while (i + count < numbers.length && numbers[i + count] === numbers[i]) {',
          '    count += 1;',
          '  }',
          '  result.push([numbers[i], count]);',
          '  i += count;',
          '}',
          'return result;'
        ];
        const tests = [
          { args: [values], expected },
          { args: [[1, 1, 2, 2, 2, 3]], expected: [[1, 2], [2, 3], [3, 1]] }
        ];
        return buildTaskFromParts({
          category: 'arrays',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['// РЎР¶РёРјР°Р№ РїРѕСЃР»РµРґРѕРІР°С‚РµР»СЊРЅС‹Рµ РґСѓР±Р»РёРєР°С‚С‹ РІ [value, count]'],
          solutionBody,
          hints: ['РџСЂРѕС…РѕРґРё РїРѕ РјР°СЃСЃРёРІСѓ Рё СЃС‡РёС‚Р°Р№, СЃРєРѕР»СЊРєРѕ СЂР°Р· РїРѕРґСЂСЏРґ РІСЃС‚СЂРµС‡Р°РµС‚СЃСЏ С‚РµРєСѓС‰РµРµ Р·РЅР°С‡РµРЅРёРµ.', 'РљР°Р¶РґС‹Р№ СЂР°Р· РґРѕР±Р°РІР»СЏР№ РїР°СЂСѓ РёР· Р·РЅР°С‡РµРЅРёСЏ Рё РµРіРѕ РґР»РёРЅС‹.'],
          explanation: 'Р—РґРµСЃСЊ СѓС‡РёС‚С‹РІР°РµС‚СЃСЏ РЅРµ С‚РѕР»СЊРєРѕ РІС‹СЏРІР»РµРЅРёРµ РіСЂСѓРїРї, РЅРѕ Рё СЃР±РѕСЂ РІ Р±Р°Р·РѕРІС‹Р№ RLE-РІРёРґ.',
          tests,
          tags: ['rle', 'compression']
        });
      }

      const left = sampleWords(rng, rng.int(5, 7));
      const right = unique(sampleWords(rng, rng.int(6, 8)).concat(left.slice(0, 2)));
      const title = 'Пересечение массивов';
      const prompt = `Даны два массива left = ${preview(left)} и right = ${preview(right)}. Верни уникальные общие элементы в порядке первого массива.`;
      const signature = 'solve(left, right)';
      const solutionBody = [
        'const rightSet = new Set(right);',
        'const seen = new Set();',
        'const result = [];',
        'for (const value of left) {',
        '  if (rightSet.has(value) && !seen.has(value)) {',
        '    seen.add(value);',
        '    result.push(value);',
        '  }',
        '}',
        'return result;'
      ];
      const expected = [];
      const rightSet = new Set(right);
      const seen = new Set();
      for (const value of left) {
        if (rightSet.has(value) && !seen.has(value)) {
          seen.add(value);
          expected.push(value);
        }
      }
      const tests = [
        { args: [left, right], expected },
        { args: [[1, 2, 2, 3, 4], [2, 4, 6, 2]], expected: [2, 4] }
      ];
      return buildTaskFromParts({
        category: 'arrays',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['// Найди общие элементы без повторов'],
        solutionBody,
        hints: ['Используй `Set` для быстрого поиска.', 'Сохраняй уже добавленные значения отдельно, чтобы убрать дубликаты.'],
        explanation: 'Задача сочетает поиск пересечения и сохранение порядка из первого массива. Это требует аккуратной дедупликации.',
        tests,
        tags: ['intersection', 'set']
      });
    }
    case 'expert': {
      const variant = rng.int(0, 1);
      if (variant === 0) {
      const numbers = sampleNumbers(rng, rng.int(8, 12), 1, 25, true);
      const windowSize = rng.int(3, Math.min(5, numbers.length - 1));
      const title = 'Лучшее окно';
      const prompt = `Дан массив numbers = ${preview(numbers)} и окно k = ${windowSize}. Верни объект с максимальной суммой окна: { sum, startIndex, values }. При равенстве бери самое раннее окно.`;
      const signature = 'solve(numbers, k)';
      const solutionBody = [
        'let bestSum = -Infinity;',
        'let bestStart = 0;',
        'let currentSum = 0;',
        'for (let i = 0; i < numbers.length; i += 1) {',
        '  currentSum += numbers[i];',
        '  if (i >= k) {',
        '    currentSum -= numbers[i - k];',
        '  }',
        '  if (i >= k - 1) {',
        '    const start = i - k + 1;',
        '    if (currentSum > bestSum) {',
        '      bestSum = currentSum;',
        '      bestStart = start;',
        '    }',
        '  }',
        '}',
        'return {',
        '  sum: bestSum,',
        '  startIndex: bestStart,',
        '  values: numbers.slice(bestStart, bestStart + k)',
        '};'
      ];
      const expected = (() => {
        let bestSum = -Infinity;
        let bestStart = 0;
        for (let i = 0; i <= numbers.length - windowSize; i += 1) {
          const current = sum(numbers.slice(i, i + windowSize));
          if (current > bestSum) {
            bestSum = current;
            bestStart = i;
          }
        }
        return {
          sum: bestSum,
          startIndex: bestStart,
          values: numbers.slice(bestStart, bestStart + windowSize)
        };
      })();
      const tests = [
        { args: [numbers, windowSize], expected },
        { args: [[5, -2, 7, 4, -1, 3], 3], expected: { sum: 10, startIndex: 0, values: [5, -2, 7] } }
      ];
      return buildTaskFromParts({
        category: 'arrays',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['// Отслеживай текущее и лучшее окно'],
        solutionBody,
        hints: ['Используй скользящее окно.', 'Храни лучшую сумму и старт окна.', 'Не забывай про правило раннего окна при равенстве.'],
        explanation: 'Экспертная версия требует не только посчитать сумму, но и вернуть метаданные окна с лучшим результатом.',
        tests,
        tags: ['window', 'expert']
      });
      } else {
        const numbers = sampleNumbers(rng, rng.int(8, 12), 1, 15);
        const start = rng.int(0, numbers.length - 3);
        const windowLength = rng.int(2, Math.min(4, numbers.length - start));
        const target = sum(numbers.slice(start, start + windowLength));
        const title = 'РљРѕСЂРѕС‚РєРѕРµ РѕРєРЅРѕ';
        const prompt = `Р”Р°РЅ РјР°СЃСЃРёРІ numbers = ${preview(numbers)} Рё target = ${target}. Р’РµСЂРЅРё СЃР°РјС‹Р№ РєРѕСЂРѕС‚РєРёР№ РїРѕРґРјР°СЃСЃРёРІ, СЃСѓРјРјР° РєРѕС‚РѕСЂРѕРіРѕ РЅРµ РјРµРЅСЊС€Рµ target. Р’РµСЂРЅРё РѕР±СЉРµРєС‚ { length, startIndex, endIndex, values }.`;
        const signature = 'solve(numbers, target)';
        const solutionBody = [
          'let bestLength = Infinity;',
          'let bestStart = -1;',
          'let currentSum = 0;',
          'let left = 0;',
          'for (let right = 0; right < numbers.length; right += 1) {',
          '  currentSum += numbers[right];',
          '  while (currentSum >= target && left <= right) {',
          '    const length = right - left + 1;',
          '    if (length < bestLength) {',
          '      bestLength = length;',
          '      bestStart = left;',
          '    }',
          '    currentSum -= numbers[left];',
          '    left += 1;',
          '  }',
          '}',
          'return bestStart === -1 ? null : {',
          '  length: bestLength,',
          '  startIndex: bestStart,',
          '  endIndex: bestStart + bestLength - 1,',
          '  values: numbers.slice(bestStart, bestStart + bestLength)',
          '};'
        ];
        const expected = (() => {
          let bestLength = Infinity;
          let bestStart = -1;
          let currentSum = 0;
          let left = 0;
          for (let right = 0; right < numbers.length; right += 1) {
            currentSum += numbers[right];
            while (currentSum >= target && left <= right) {
              const length = right - left + 1;
              if (length < bestLength) {
                bestLength = length;
                bestStart = left;
              }
              currentSum -= numbers[left];
              left += 1;
            }
          }
          return bestStart === -1 ? null : {
            length: bestLength,
            startIndex: bestStart,
            endIndex: bestStart + bestLength - 1,
            values: numbers.slice(bestStart, bestStart + bestLength)
          };
        })();
        const tests = [
          { args: [numbers, target], expected },
          { args: [[2, 1, 5, 2, 3, 2], 7], expected: { length: 2, startIndex: 2, endIndex: 3, values: [5, 2] } }
        ];
        return buildTaskFromParts({
          category: 'arrays',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['// РќР°Р№РґРё СЃР°РјРѕРµ РєРѕСЂРѕС‚РєРѕРµ РѕРєРЅРѕ СЃ СЃСѓРјРјРѕР№ РЅРµ РјРµРЅСЊС€Рµ target'],
          solutionBody,
          hints: ['Р”Р»СЏ РїРѕР»РѕР¶РёС‚РµР»СЊРЅС‹С… С‡РёСЃРµР» С…РѕСЂРѕС€Рѕ РїРѕРґС…РѕРґРёС‚ РѕРєРЅРѕ РґРІСѓРјСЏ СѓРєР°Р·Р°С‚РµР»СЏРјРё.', 'РЎРѕС…СЂР°РЅСЏР№ Р»СѓС‡С€СѓСЋ РґР»РёРЅСѓ Рё РЅР°С‡Р°Р»Рѕ РѕРєРЅР°, РєРѕРіРґР° СЃСѓРјРјР° СѓР¶Рµ РґРѕСЃС‚Р°С‚РѕС‡РЅР°.'],
          explanation: 'Р­С‚Р° Р·Р°РґР°С‡Р° С‚СЂРµРЅРёСЂСѓРµС‚ СѓРјРµРЅРёРµ РЅР°С…РѕРґРёС‚СЊ Р»СѓС‡С€РёР№ РїРѕРґРѕС‚СЂРµР·РѕРє СЃ РїРѕРјРѕС‰СЊСЋ РґРІСѓС… СѓРєР°Р·Р°С‚РµР»РµР№ Рё РїРѕСЃС‚РѕСЏРЅРЅРѕР№ СЃР±РѕСЂРєРё СЃСѓРјРјС‹.',
          tests,
          tags: ['window', 'target-sum']
        });
      }
    }
    default:
      return buildArraysTask('easy', rng);
  }
}

function buildObjectsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const variant = rng.int(0, 1);
      if (variant === 0) {
        const profile = {
          name: sampleName(rng),
          city: sampleCity(rng),
          role: rng.pick(['developer', 'designer', 'analyst']),
          active: rng.bool()
        };
        const keys = rng.sample(['name', 'city', 'role', 'active'], rng.int(2, 3));
        const title = 'Выбор полей';
        const prompt = `Дан объект profile = ${preview(profile)} и список keys = ${preview(keys)}. Верни новый объект только с указанными полями.`;
        const signature = 'solve(profile, keys)';
        const solutionBody = [
          'const result = {};',
          'for (const key of keys) {',
          '  if (Object.prototype.hasOwnProperty.call(profile, key)) {',
          '    result[key] = profile[key];',
          '  }',
          '}',
          'return result;'
        ];
        const expected = keys.reduce((acc, key) => {
          if (Object.prototype.hasOwnProperty.call(profile, key)) {
            acc[key] = profile[key];
          }
          return acc;
        }, {});
        const tests = [
          { args: [profile, keys], expected },
          { args: [{ a: 1, b: 2, c: 3 }, ['a', 'c']], expected: { a: 1, c: 3 } }
        ];
        return buildTaskFromParts({
          category: 'objects',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['// Скопируй только нужные поля'],
          solutionBody,
          hints: ['Проверь наличие ключа через `hasOwnProperty`.', 'Создай новый объект и заполни его по списку ключей.'],
          explanation: 'Нужно не мутировать исходный объект, а собрать новый только с нужными свойствами.',
          tests,
          tags: ['pick', 'object']
        });
      }

      const user = {
        name: sampleName(rng),
        city: sampleCity(rng)
      };
      const defaults = {
        city: 'Unknown',
        role: 'guest',
        active: true
      };
      const title = 'Заполнение значений по умолчанию';
      const prompt = `Дан объект user = ${preview(user)} и defaults = ${preview(defaults)}. Верни новый объект, где отсутствующие поля из user берутся из defaults.`;
      const signature = 'solve(user, defaults)';
      const solutionBody = ['return { ...defaults, ...user };'];
      const expected = { ...defaults, ...user };
      const tests = [
        { args: [user, defaults], expected },
        { args: [{ name: 'Ada' }, { name: 'Unknown', role: 'student' }], expected: { name: 'Ada', role: 'student' } }
      ];
      return buildTaskFromParts({
        category: 'objects',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['// Объедини данные без мутаций'],
        solutionBody,
        hints: ['Операторы spread работают хорошо для плоских объектов.', 'Порядок важен: `user` должен перекрывать `defaults`.'],
        explanation: 'Это базовая операция с объектами: взять значения по умолчанию и переопределить их данными пользователя.',
        tests,
        tags: ['defaults', 'spread']
      });
    }
    case 'medium': {
      const profile = {
        firstName: sampleName(rng),
        lastName: sampleName(rng),
        age: rng.int(18, 42),
        points: rng.int(10, 90),
        city: sampleCity(rng)
      };
      const factor = rng.int(2, 5);
      const title = 'Нормализация объекта';
      const prompt = `Дан объект profile = ${preview(profile)}. Верни новый объект, где числовые поля умножены на factor = ${factor}, а строковые остаются как есть.`;
      const signature = 'solve(profile, factor)';
      const solutionBody = [
        'const result = {};',
        'for (const [key, value] of Object.entries(profile)) {',
        '  result[key] = typeof value === "number" ? value * factor : value;',
        '}',
        'return result;'
      ];
      const expected = Object.fromEntries(
        Object.entries(profile).map(([key, value]) => [key, typeof value === 'number' ? value * factor : value])
      );
      const tests = [
        { args: [profile, factor], expected },
        {
          args: [{ title: 'dev', score: 12, active: false }, 3],
          expected: { title: 'dev', score: 36, active: false }
        }
      ];
      return buildTaskFromParts({
        category: 'objects',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['// Пройди по полям объекта и преобразуй значения'],
        solutionBody,
        hints: ['Используй `Object.entries` для удобного обхода.', 'Проверь тип значения перед умножением.'],
        explanation: 'Нужно пройти по всем свойствам объекта и преобразовать только числа, не затрагивая строки и булевы значения.',
        tests,
        tags: ['entries', 'transform']
      });
    }
    case 'hard': {
      const nested = {
        user: {
          name: sampleName(rng),
          contact: {
            city: sampleCity(rng),
            email: sampleEmail(rng, sampleName(rng))
          }
        },
        stats: {
          score: rng.int(10, 100),
          level: rng.int(1, 9)
        }
      };
      const title = 'Сведение вложенного объекта';
      const prompt = `Дан вложенный объект data = ${preview(nested)}. Верни плоский объект, где ключи записаны через точку, например \`user.contact.city\`.`;
      const signature = 'solve(data)';
      const solutionBody = [
        'const result = {};',
        'const walk = (value, path) => {',
        '  for (const [key, child] of Object.entries(value)) {',
        '    const nextPath = path ? `${path}.${key}` : key;',
        '    if (child !== null && typeof child === "object" && !Array.isArray(child)) {',
        '      walk(child, nextPath);',
        '    } else {',
        '      result[nextPath] = child;',
        '    }',
        '  }',
        '};',
        'walk(data, "");',
        'return result;'
      ];
      const flatten = (value, path = '', out = {}) => {
        for (const [key, child] of Object.entries(value)) {
          const nextPath = path ? `${path}.${key}` : key;
          if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
            flatten(child, nextPath, out);
          } else {
            out[nextPath] = child;
          }
        }
        return out;
      };
      const expected = flatten(nested);
      const tests = [
        { args: [nested], expected },
        {
          args: [{ a: { b: 1, c: { d: 2 } }, e: 3 }],
          expected: { 'a.b': 1, 'a.c.d': 2, e: 3 }
        }
      ];
      return buildTaskFromParts({
        category: 'objects',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['// Рекурсивно обойди вложенные объекты'],
        solutionBody,
        hints: ['Рекурсия хорошо подходит для вложенных структур.', 'Когда встречаешь объект, спускайся глубже и дописывай путь к ключу.'],
        explanation: 'Эта задача проверяет умение обходить вложенные структуры и аккуратно собирать новый объект с путями к каждому листовому значению.',
        tests,
        tags: ['flatten', 'recursion']
      });
    }
    case 'expert': {
      const before = {
        user: {
          name: sampleName(rng),
          city: sampleCity(rng),
          score: rng.int(20, 60)
        },
        flags: {
          beta: rng.bool(),
          admin: rng.bool()
        }
      };
      const after = {
        user: {
          name: before.user.name,
          city: rng.bool() ? before.user.city : sampleCity(rng),
          score: before.user.score + rng.int(5, 20)
        },
        flags: {
          beta: !before.flags.beta,
          admin: before.flags.admin
        },
        meta: {
          updatedAt: '2026-04-19'
        }
      };
      const title = 'Глубокий diff объектов';
      const prompt = `Даны объекты before = ${preview(before)} и after = ${preview(after)}. Верни объект вида { added, removed, changed }, где changed хранит пары { from, to } по плоским путям.`;
      const signature = 'solve(before, after)';
      const flatten = (value, path = '', out = {}) => {
        for (const [key, child] of Object.entries(value)) {
          const nextPath = path ? `${path}.${key}` : key;
          if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
            flatten(child, nextPath, out);
          } else {
            out[nextPath] = child;
          }
        }
        return out;
      };
      const buildDiff = (a, b) => {
        const flatA = flatten(a);
        const flatB = flatten(b);
        const added = {};
        const removed = {};
        const changed = {};
        for (const [key, value] of Object.entries(flatB)) {
          if (!(key in flatA)) {
            added[key] = value;
          } else if (!isDeepStrictEqual(flatA[key], value)) {
            changed[key] = { from: flatA[key], to: value };
          }
        }
        for (const [key, value] of Object.entries(flatA)) {
          if (!(key in flatB)) {
            removed[key] = value;
          }
        }
        return { added, removed, changed };
      };
      const expected = buildDiff(before, after);
      const tests = [
        { args: [before, after], expected },
        {
          args: [{ a: { x: 1 }, z: 2 }, { a: { x: 2, y: 3 } }],
          expected: {
            added: { 'a.y': 3 },
            removed: { z: 2 },
            changed: { 'a.x': { from: 1, to: 2 } }
          }
        }
      ];
      const solutionBody = [
        'const flatten = (value, path = "", out = {}) => {',
        '  for (const [key, child] of Object.entries(value)) {',
        '    const nextPath = path ? `${path}.${key}` : key;',
        '    if (child !== null && typeof child === "object" && !Array.isArray(child)) {',
        '      flatten(child, nextPath, out);',
        '    } else {',
        '      out[nextPath] = child;',
        '    }',
        '  }',
        '  return out;',
        '};',
        'const flatBefore = flatten(before);',
        'const flatAfter = flatten(after);',
        'const added = {};',
        'const removed = {};',
        'const changed = {};',
        'for (const [key, value] of Object.entries(flatAfter)) {',
        '  if (!(key in flatBefore)) {',
        '    added[key] = value;',
        '  } else if (!Object.is(flatBefore[key], value)) {',
        '    changed[key] = { from: flatBefore[key], to: value };',
        '  }',
        '}',
        'for (const [key, value] of Object.entries(flatBefore)) {',
        '  if (!(key in flatAfter)) {',
        '    removed[key] = value;',
        '  }',
        '}',
        'return { added, removed, changed };'
      ];
      return buildTaskFromParts({
        category: 'objects',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['// Сравни плоские представления объектов'],
        solutionBody,
        hints: ['Сначала удобно "расплющить" объекты.', 'Потом сравни два набора ключей и значения по каждому пути.'],
        explanation: 'Экспертная задача на diff объектов: требуется выявить добавленные, удалённые и изменённые поля на глубоком уровне.',
        tests,
        tags: ['diff', 'deep']
      });
    }
    default:
      return buildObjectsTask('easy', rng);
  }
}

function buildFunctionsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const variant = rng.int(0, 1);
      if (variant === 0) {
        const value = rng.int(-10, 30);
        const min = rng.int(-10, 0);
        const max = rng.int(10, 40);
        const title = 'Ограничение диапазона';
        const prompt = `Верни число value = ${value}, зажатое в диапазоне [${min}, ${max}].`;
        const signature = 'solve(value, min, max)';
        const solutionBody = ['return Math.min(max, Math.max(min, value));'];
        const expected = Math.min(max, Math.max(min, value));
        const tests = [
          { args: [value, min, max], expected },
          { args: [100, 0, 25], expected: 25 },
          { args: [-5, 0, 25], expected: 0 }
        ];
        return buildTaskFromParts({
          category: 'functions',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['// Сожми значение в заданный диапазон'],
          solutionBody,
          hints: ['Комбинация `Math.min` и `Math.max` решает задачу.', 'Сначала подними число до нижней границы, потом ограничь сверху.'],
          explanation: 'Это простая чистая функция: она не меняет состояние и только приводит число к нужному диапазону.',
          tests,
          tags: ['clamp', 'math']
        });
      }

      const text = `${sampleWord(rng)}   ${sampleWord(rng)}  ${sampleWord(rng)}`;
      const title = 'Очистка строки';
      const prompt = `Дана строка text = ${quote(text)}. Убери лишние пробелы между словами и сделай первую букву заглавной.`;
      const signature = 'solve(text)';
      const solutionBody = [
        'const cleaned = text.trim().replace(/\\s+/g, " ");',
        'return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);'
      ];
      const expected = text.trim().replace(/\s+/g, ' ');
      const output = expected.charAt(0).toUpperCase() + expected.slice(1);
      const tests = [
        { args: [text], expected: output },
        { args: ['   hello   world '], expected: 'Hello world' }
      ];
      return buildTaskFromParts({
        category: 'functions',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['// Отчисти строку и заглавную букву'],
        solutionBody,
        hints: ['Сначала используй `trim`.', 'Потом замени повторяющиеся пробелы и капитализируй первый символ.'],
        explanation: 'Эта задача учит работать со строками внутри функции и комбинировать несколько преобразований подряд.',
        tests,
        tags: ['strings', 'format']
      });
    }
    case 'medium': {
      const numbers = sampleNumbers(rng, rng.int(6, 8), 1, 20);
      const title = 'Карта и фильтрация';
      const prompt = `Дан массив numbers = ${preview(numbers)} и две функции mapper и predicate. Верни массив: сначала примени mapper к каждому числу, затем оставь только значения, которые проходят predicate.`;
      const signature = 'solve(numbers, mapper, predicate)';
      const solutionBody = [
        'return numbers',
        '  .map((value, index) => mapper(value, index))',
        '  .filter((value, index) => predicate(value, index));'
      ];
      const mapper = { __fn: 'add', value: 1, key: 'mapper-add-1' };
      const predicate = { __fn: 'predicateNotMultipleOf', divisor: 3, key: 'predicate-not-multiple-3' };
      const expected = numbers.map((value) => value + 1).filter((value) => value % 3 !== 0);
      const tests = [
        { args: [numbers, mapper, predicate], expected },
        {
          args: [
            [1, 2, 3],
            { __fn: 'multiply', value: 10, key: 'mapper-times-10' },
            { __fn: 'predicateGreaterThan', value: 19, key: 'predicate-at-least-20' }
          ],
          expected: [20, 30]
        }
      ];
      return buildTaskFromParts({
        category: 'functions',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['// Используй переданные функции как инструменты'],
        solutionBody,
        hints: ['Удобно сделать это через цепочку `map` и `filter`.', 'Функции-аргументы можно вызывать как обычные переменные.'],
        explanation: 'Здесь функция выступает как универсальный инструмент, который комбинирует работу с массивом и колбэками.',
        tests,
        tags: ['callbacks', 'array']
      });
    }
    case 'hard': {
      const funcs = [
        (value) => value + 2,
        (value) => value * 3,
        (value) => value - 5
      ];
      const title = 'Композиция функций';
      const prompt = 'Дан массив функций functions. Верни новую функцию, которая применяет их справа налево: последняя функция массива вызывается первой.';
      const signature = 'solve(functions)';
      const solutionBody = [
        'return function composed(initialValue) {',
        '  return functions.reduceRight((value, fn) => fn(value), initialValue);',
        '};'
      ];
      const composedExpected = funcs.reduceRight((value, fn) => fn(value), 4);
      const tests = [
        { args: [funcs], expected: undefined, run: async () => undefined }
      ];
      const starterBody = [
        '// Верни функцию, которая применяет массив функций справа налево',
        '// Подсказка: reduceRight'
      ];
      return buildTaskFromParts({
        category: 'functions',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Справа налево удобнее идти через `reduceRight`.', 'Внутри возвращаемой функции обработай начальное значение.'],
        explanation: 'Это классическая композиция функций: одна функция строится на основе набора более простых.',
        tests: [
          {
            args: [funcs],
            expected: 19,
            sequence: [{ input: 4, expected: composedExpected }]
          },
          {
            args: [[(v) => v + 1, (v) => v * 2]],
            expected: 8,
            sequence: [{ input: 3, expected: 7 }]
          }
        ],
        tags: ['compose', 'higher-order']
      });
    }
    case 'expert': {
      const title = 'Асинхронный pipeline';
      const prompt = 'Дан массив функций functions. Верни асинхронную функцию, которая применяет их слева направо и ждёт Promise на каждом шаге.';
      const signature = 'solve(functions)';
      const starterBody = [
        '// Верни async-функцию pipeline',
        '// Она должна поддерживать как sync, так и async колбэки'
      ];
      const solutionBody = [
        'return async function pipeline(initialValue) {',
        '  let value = initialValue;',
        '  for (const fn of functions) {',
        '    value = await fn(value);',
        '  }',
        '  return value;',
        '};'
      ];
      const pipelineA = [
        (value) => value + 1,
        async (value) => value * 2,
        (value) => Promise.resolve(value - 3)
      ];
      const pipelineB = [
        async (value) => value + 5,
        (value) => value * 4
      ];
      const tests = [
        { args: [pipelineA], sequence: [{ input: 10, expected: 19 }] },
        { args: [pipelineB], sequence: [{ input: 2, expected: 28 }] }
      ];
      return buildTaskFromParts({
        category: 'functions',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Обрабатывай функции в исходном порядке.', 'Используй `await` для каждого шага, даже если функция синхронная.'],
        explanation: 'Экспертная задача расширяет композицию на случай Promise. Такой pipeline пригодится в реальных приложениях.',
        tests,
        strategy: 'closure',
        async: false,
        tags: ['async', 'pipeline']
      });
    }
    default:
      return buildFunctionsTask('easy', rng);
  }
}

function buildClosuresTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const start = rng.int(0, 10);
      const step = rng.int(1, 4);
      const title = 'Счётчик';
      const prompt = `Верни функцию-счётчик, которая начинает с ${start} и на каждом вызове прибавляет ${step}. Первый вызов должен вернуть текущее значение, а затем увеличить его.`;
      const signature = 'solve(start, step)';
      const starterBody = [
        'let current = start;',
        'return function next() {',
        '  // TODO',
        '};'
      ];
      const solutionBody = [
        'let current = start;',
        'return function next() {',
        '  const value = current;',
        '  current += step;',
        '  return value;',
        '};'
      ];
      const tests = [
        {
          args: [start, step],
          sequence: [
            { input: [], expected: start },
            { input: [], expected: start + step },
            { input: [], expected: start + step * 2 }
          ]
        },
        {
          args: [2, 3],
          sequence: [
            { input: [], expected: 2 },
            { input: [], expected: 5 }
          ]
        }
      ];
      return buildTaskFromParts({
        category: 'closures',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Нужна переменная во внешней области видимости.', 'Возвращаемая функция должна менять и читать это состояние.'],
        explanation: 'Замыкание позволяет внутренней функции помнить значение между вызовами, не вынося его наружу.',
        tests,
        strategy: 'closure',
        tags: ['counter', 'state']
      });
    }
    case 'medium': {
      const title = 'Мемоизация';
      const prompt = 'Дана функция fn. Верни обёртку, которая кэширует результат по набору аргументов и не вызывает fn повторно для одинакового вызова.';
      const signature = 'solve(fn)';
      const starterBody = [
        'const cache = new Map();',
        'return function memoized(...args) {',
        '  // TODO',
        '};'
      ];
      const solutionBody = [
        'const cache = new Map();',
        'return function memoized(...args) {',
        '  const key = JSON.stringify(args);',
        '  if (cache.has(key)) {',
        '    return cache.get(key);',
        '  }',
        '  const result = fn(...args);',
        '  cache.set(key, result);',
        '  return result;',
        '};'
      ];
      let calls = 0;
      const spy = (value) => {
        calls += 1;
        return value * 10;
      };
      const tests = [
        {
          args: [spy],
          sequence: [
            { input: [2], expected: 20 },
            { input: [2], expected: 20 },
            { input: [3], expected: 30 }
          ],
          expectCalls: 2
        },
        {
          args: [(a, b) => `${a}:${b}`],
          sequence: [
            { input: ['x', 'y'], expected: 'x:y' },
            { input: ['x', 'y'], expected: 'x:y' }
          ]
        }
      ];
      return buildTaskFromParts({
        category: 'closures',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Нужен словарь для результатов.', 'Ключ можно собрать из `JSON.stringify(args)`.'],
        explanation: 'Кэширование через замыкание позволяет хранить состояние без глобальных переменных.',
        tests,
        strategy: 'closure',
        tags: ['cache', 'memoize']
      });
    }
    case 'hard': {
      const title = 'Фабрика стека';
      const initial = sampleWords(rng, 3);
      const prompt = `Верни объект-стек на основе начального массива initial = ${preview(initial)}. Объект должен иметь методы push(value), pop(), peek(), size() и reset().`;
      const signature = 'solve(initial)';
      const starterBody = [
        'let stack = Array.isArray(initial) ? initial.slice() : [];',
        'return {',
        '  push(value) {',
        '    // TODO',
        '  },',
        '  pop() {',
        '    // TODO',
        '  },',
        '  peek() {',
        '    // TODO',
        '  },',
        '  size() {',
        '    // TODO',
        '  },',
        '  reset() {',
        '    // TODO',
        '  }',
        '};'
      ];
      const solutionBody = [
        'let stack = Array.isArray(initial) ? initial.slice() : [];',
        'return {',
        '  push(value) {',
        '    stack.push(value);',
        '    return stack.length;',
        '  },',
        '  pop() {',
        '    return stack.pop() ?? null;',
        '  },',
        '  peek() {',
        '    return stack.length > 0 ? stack[stack.length - 1] : null;',
        '  },',
        '  size() {',
        '    return stack.length;',
        '  },',
        '  reset() {',
        '    stack = [];',
        '    return stack.length;',
        '  }',
        '};'
      ];
      const tests = [
        {
          args: [initial],
          sequence: [
            { method: 'size', expected: initial.length },
            { method: 'peek', expected: initial[initial.length - 1] },
            { method: 'push', input: 'extra', expected: initial.length + 1 },
            { method: 'pop', expected: 'extra' },
            { method: 'reset', expected: 0 }
          ]
        },
        {
          args: [[1, 2]],
          sequence: [
            { method: 'push', input: 3, expected: 3 },
            { method: 'peek', expected: 3 },
            { method: 'size', expected: 3 }
          ]
        }
      ];
      return buildTaskFromParts({
        category: 'closures',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Состояние стека должно жить в замыкании.', 'Методы объекта будут работать с одной и той же скрытой переменной.'],
        explanation: 'Тут замыкание используется для хранения структуры данных, недоступной снаружи напрямую.',
        tests,
        strategy: 'closure',
        tags: ['stack', 'methods']
      });
    }
    case 'expert': {
      const title = 'Event bus';
      const prompt = 'Верни объект event bus с методами on(event, handler), off(event, handler) и emit(event, payload). Подписчики одного события должны вызываться в порядке регистрации.';
      const signature = 'solve()';
      const starterBody = [
        'const listeners = new Map();',
        'return {',
        '  on(event, handler) {',
        '    // TODO',
        '  },',
        '  off(event, handler) {',
        '    // TODO',
        '  },',
        '  emit(event, payload) {',
        '    // TODO',
        '  }',
        '};'
      ];
      const solutionBody = [
        'const listeners = new Map();',
        'return {',
        '  on(event, handler) {',
        '    if (!listeners.has(event)) {',
        '      listeners.set(event, []);',
        '    }',
        '    listeners.get(event).push(handler);',
        '  },',
        '  off(event, handler) {',
        '    const list = listeners.get(event);',
        '    if (!list) {',
        '      return;',
        '    }',
        '    const index = list.indexOf(handler);',
        '    if (index >= 0) {',
        '      list.splice(index, 1);',
        '    }',
        '  },',
        '  emit(event, payload) {',
        '    const list = listeners.get(event) || [];',
        '    for (const handler of list.slice()) {',
        '      handler(payload);',
        '    }',
        '    return list.length;',
        '  }',
        '};'
      ];
      const tests = [
        {
          args: [],
          sequence: [
            {
              method: 'on',
              input: ['ping', (payload) => payloads.push(`A:${payload}`)],
              expected: undefined
            },
            {
              method: 'on',
              input: ['ping', (payload) => payloads.push(`B:${payload}`)],
              expected: undefined
            }
          ]
        }
      ];
      return buildTaskFromParts({
        category: 'closures',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Используй `Map` для списка слушателей.', 'Не забывай копировать массив обработчиков перед обходом, если возможны изменения в процессе emit.'],
        explanation: 'Это полноценное применение замыкания: объект event bus хранит список подписчиков внутри скрытого состояния.',
        tests: [
          {
            args: [],
            sequence: [
              { method: 'on', input: ['ping', (payload) => payloads.push(`A:${payload}`)] },
              { method: 'on', input: ['ping', (payload) => payloads.push(`B:${payload}`)] }
            ]
          }
        ],
        strategy: 'closure',
        tags: ['event-bus', 'pubsub']
      });
    }
    default:
      return buildClosuresTask('easy', rng);
  }
}

function buildAsyncTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const bonus = rng.int(3, 12);
      const title = 'Дождаться результата';
      const prompt = `Дана async-функция loadScore(). Дождись её и верни результат + ${bonus}.`;
      const signature = 'solve(loadScore)';
      const starterBody = [
        'const score = await loadScore();',
        `return score; // TODO: add the bonus`
      ];
      const solutionBody = [
        'const score = await loadScore();',
        `return score + ${bonus};`
      ];
      const tests = [
        {
          args: [async () => 10],
          expected: 10 + bonus
        },
        {
          args: [async () => 25],
          expected: 25 + bonus
        }
      ];
      return buildTaskFromParts({
        category: 'async',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Нужно использовать `await`.', 'Сначала дождись `loadScore`, затем прибавь бонус.'],
        explanation: 'Это базовый сценарий для async/await: получить Promise и продолжить вычисление после его разрешения.',
        tests,
        strategy: 'async',
        async: true,
        tags: ['await', 'promise']
      });
    }
    case 'medium': {
      const title = 'Параллельная загрузка';
      const prompt = 'Даны две async-функции loadName и loadBonus. Выполни их параллельно и верни объект { name, bonus }.';
      const signature = 'solve(loadName, loadBonus)';
      const starterBody = [
        'const [name, bonus] = await Promise.all([loadName(), loadBonus()]);',
        'return { name, bonus: 0 }; // TODO: return the real bonus'
      ];
      const solutionBody = [
        'const [name, bonus] = await Promise.all([loadName(), loadBonus()]);',
        'return { name, bonus };'
      ];
      const tests = [
        {
          args: [async () => 'Ada', async () => 7],
          expected: { name: 'Ada', bonus: 7 }
        },
        {
          args: [async () => 'Leo', async () => 12],
          expected: { name: 'Leo', bonus: 12 }
        }
      ];
      return buildTaskFromParts({
        category: 'async',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['`Promise.all` запускает задачи одновременно.', 'После ожидания просто собери объект.'],
        explanation: 'Средний уровень показывает, как объединять несколько Promise и собирать результаты без лишних задержек.',
        tests,
        strategy: 'async',
        async: true,
        tags: ['promise.all', 'parallel']
      });
    }
    case 'hard': {
      const retries = rng.int(2, 4);
      const title = 'Retry helper';
      const prompt = `Дана async-функция fetcher. Попробуй вызвать её до ${retries + 1} раз, пока она не вернёт успех. Если все попытки провалились, пробрось последнюю ошибку.`;
      const signature = 'solve(fetcher, retries)';
      const starterBody = [
        'let lastError = null;',
        'for (let attempt = 0; attempt <= retries; attempt += 1) {',
        '  try {',
        '    // TODO: call fetcher(attempt) and return the first successful result',
        '  } catch (error) {',
        '    lastError = error;',
        '  }',
        '}',
        'throw lastError;'
      ];
      const solutionBody = [
        'let lastError = null;',
        'for (let attempt = 0; attempt <= retries; attempt += 1) {',
        '  try {',
        '    return await fetcher(attempt);',
        '  } catch (error) {',
        '    lastError = error;',
        '  }',
        '}',
        'throw lastError;'
      ];
      let attempts = 0;
      const flaky = async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error(`fail-${attempts}`);
        }
        return `ok-${attempts}`;
      };
      const failer = async () => {
        throw new Error('boom');
      };
      const tests = [
        {
          args: [flaky, 4],
          expected: 'ok-3'
        },
        {
          args: [failer, 1],
          expectedError: 'boom'
        }
      ];
      return buildTaskFromParts({
        category: 'async',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Сделай цикл по попыткам.', 'Ошибку последней неудачи нужно сохранить и бросить после всех попыток.'],
        explanation: 'Задача учит строить устойчивую асинхронную логику с повторными попытками и корректной обработкой ошибок.',
        tests,
        strategy: 'async',
        async: true,
        tags: ['retry', 'error-handling']
      });
    }
    case 'expert': {
      const limit = rng.int(2, 3);
      const title = 'Ограничение concurrency';
      const prompt = `Дан массив async-джобов jobs. Верни Promise с результатами в исходном порядке, но одновременно должно выполняться не больше ${limit} задач.`;
      const signature = 'solve(jobs, limit)';
      const starterBody = [
        'return null; // TODO: enforce the concurrency limit'
      ];
      const solutionBody = [
        'return new Promise((resolve, reject) => {',
        '  const results = new Array(jobs.length);',
        '  let nextIndex = 0;',
        '  let active = 0;',
        '  const launch = () => {',
        '    if (nextIndex >= jobs.length && active === 0) {',
        '      resolve(results);',
        '      return;',
        '    }',
        '    while (active < limit && nextIndex < jobs.length) {',
        '      const index = nextIndex;',
        '      nextIndex += 1;',
        '      active += 1;',
        '      Promise.resolve()',
        '        .then(() => jobs[index]())',
        '        .then((value) => {',
        '          results[index] = value;',
        '          active -= 1;',
        '          launch();',
        '        }, reject);',
        '    }',
        '  };',
        '  launch();',
        '});'
      ];
      const jobsA = [
        () => Promise.resolve('A'),
        () => new Promise((resolve) => setTimeout(() => resolve('B'), 2)),
        () => Promise.resolve('C')
      ];
      const jobsB = [
        () => Promise.resolve(1),
        () => Promise.resolve(2),
        () => Promise.resolve(3),
        () => Promise.resolve(4)
      ];
      const tests = [
        { args: [jobsA, limit], expected: ['A', 'B', 'C'] },
        { args: [jobsB, 2], expected: [1, 2, 3, 4] }
      ];
      return buildTaskFromParts({
        category: 'async',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Храни очередь индексов и число активных задач.', 'Когда задача завершается, запускай следующую.', 'Порядок результатов должен совпадать с исходным массивом.'],
        explanation: 'Экспертная задача проверяет умение управлять очередью Promise и сохранять порядок результатов при ограниченной параллельности.',
        tests,
        strategy: 'async',
        async: true,
        tags: ['concurrency', 'queue']
      });
    }
    default:
      return buildAsyncTask('easy', rng);
  }
}

function buildAlgorithmsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const numbers = sampleNumbers(rng, rng.int(6, 10), 1, 40);
      const threshold = rng.int(10, 30);
      const title = 'Подсчёт значений';
      const prompt = `Дан массив numbers = ${preview(numbers)} и threshold = ${threshold}. Верни количество чисел, которые строго больше threshold.`;
      const signature = 'solve(numbers, threshold)';
      const solutionBody = ['return numbers.filter((n) => n > threshold).length;'];
      const expected = numbers.filter((n) => n > threshold).length;
      const tests = [
        { args: [numbers, threshold], expected },
        { args: [[1, 2, 3, 4, 5], 3], expected: 2 }
      ];
      return buildTaskFromParts({
        category: 'algorithms',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['// Посчитай подходящие элементы'],
        solutionBody,
        hints: ['Можно сначала отфильтровать, а потом посчитать длину.', 'Условие: `n > threshold`.'],
        explanation: 'Это простая задача на перебор и фильтрацию, полезная как старт перед более сложными алгоритмами.',
        tests,
        tags: ['count', 'filter']
      });
    }
    case 'medium': {
      const numbers = sampleNumbers(rng, rng.int(6, 8), 1, 30);
      const target = numbers[0] + numbers[numbers.length - 1];
      const title = 'Two Sum';
      const prompt = `Дан массив numbers = ${preview(numbers)} и target = ${target}. Верни индексы двух чисел, сумма которых равна target. Если решения нет, верни null.`;
      const signature = 'solve(numbers, target)';
      const solutionBody = [
        'const seen = new Map();',
        'for (let i = 0; i < numbers.length; i += 1) {',
        '  const need = target - numbers[i];',
        '  if (seen.has(need)) {',
        '    return [seen.get(need), i];',
        '  }',
        '  if (!seen.has(numbers[i])) {',
        '    seen.set(numbers[i], i);',
        '  }',
        '}',
        'return null;'
      ];
      const twoSum = (arr, goal) => {
        const seen = new Map();
        for (let i = 0; i < arr.length; i += 1) {
          const need = goal - arr[i];
          if (seen.has(need)) {
            return [seen.get(need), i];
          }
          if (!seen.has(arr[i])) {
            seen.set(arr[i], i);
          }
        }
        return null;
      };
      const tests = [
        { args: [numbers, target], expected: twoSum(numbers, target) },
        { args: [[2, 7, 11, 15], 9], expected: [0, 1] }
      ];
      return buildTaskFromParts({
        category: 'algorithms',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['// Найди пару через словарь уже увиденных значений'],
        solutionBody,
        hints: ['Сохраняй уже встреченные числа в `Map`.', 'Для каждого элемента ищи второй компонент суммы.'],
        explanation: 'Классический алгоритм Two Sum решается за линейное время с помощью словаря.',
        tests,
        tags: ['hash-map', 'two-sum']
      });
    }
    case 'hard': {
      const intervals = sampleIntervals(rng, rng.int(4, 6));
      const title = 'Слияние интервалов';
      const prompt = `Дан массив интервалов intervals = ${preview(intervals)}. Отсортируй их и объедини пересекающиеся интервалы.`;
      const signature = 'solve(intervals)';
      const solutionBody = [
        'if (intervals.length === 0) {',
        '  return [];',
        '}',
        'const sorted = intervals',
        '  .map(([start, end]) => [Math.min(start, end), Math.max(start, end)])',
        '  .sort((a, b) => a[0] - b[0] || a[1] - b[1]);',
        'const merged = [sorted[0].slice()];',
        'for (let i = 1; i < sorted.length; i += 1) {',
        '  const [start, end] = sorted[i];',
        '  const last = merged[merged.length - 1];',
        '  if (start <= last[1]) {',
        '    last[1] = Math.max(last[1], end);',
        '  } else {',
        '    merged.push([start, end]);',
        '  }',
        '}',
        'return merged;'
      ];
      const merge = (list) => {
        if (list.length === 0) {
          return [];
        }
        const sorted = list
          .map(([start, end]) => [Math.min(start, end), Math.max(start, end)])
          .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const merged = [sorted[0].slice()];
        for (let i = 1; i < sorted.length; i += 1) {
          const [start, end] = sorted[i];
          const last = merged[merged.length - 1];
          if (start <= last[1]) {
            last[1] = Math.max(last[1], end);
          } else {
            merged.push([start, end]);
          }
        }
        return merged;
      };
      const tests = [
        { args: [intervals], expected: merge(intervals) },
        { args: [[[1, 3], [2, 6], [8, 10], [9, 12]]], expected: [[1, 6], [8, 12]] }
      ];
      return buildTaskFromParts({
        category: 'algorithms',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['// Отсортируй интервалы и склей пересечения'],
        solutionBody,
        hints: ['Сначала нормализуй интервалы и отсортируй их.', 'Если новый интервал пересекается с последним результатом, расширь границу.'],
        explanation: 'Слияние интервалов требует сортировки и линейного прохода по уже отсортированным данным.',
        tests,
        tags: ['intervals', 'merge']
      });
    }
    case 'expert': {
      const text = sampleText(rng, rng.int(10, 16));
      const title = 'Самая длинная уникальная подстрока';
      const prompt = `Дана строка text = ${quote(text)}. Верни самую длинную подстроку без повторяющихся символов. Если таких несколько, верни первую из них.`;
      const signature = 'solve(text)';
      const solutionBody = [
        'let bestStart = 0;',
        'let bestLength = 0;',
        'let left = 0;',
        'const lastSeen = new Map();',
        'for (let right = 0; right < text.length; right += 1) {',
        '  const char = text[right];',
        '  if (lastSeen.has(char) && lastSeen.get(char) >= left) {',
        '    left = lastSeen.get(char) + 1;',
        '  }',
        '  lastSeen.set(char, right);',
        '  const length = right - left + 1;',
        '  if (length > bestLength) {',
        '    bestLength = length;',
        '    bestStart = left;',
        '  }',
        '}',
        'return text.slice(bestStart, bestStart + bestLength);'
      ];
      const longestUnique = (value) => {
        let bestStart = 0;
        let bestLength = 0;
        let left = 0;
        const lastSeen = new Map();
        for (let right = 0; right < value.length; right += 1) {
          const char = value[right];
          if (lastSeen.has(char) && lastSeen.get(char) >= left) {
            left = lastSeen.get(char) + 1;
          }
          lastSeen.set(char, right);
          const length = right - left + 1;
          if (length > bestLength) {
            bestLength = length;
            bestStart = left;
          }
        }
        return value.slice(bestStart, bestStart + bestLength);
      };
      const tests = [
        { args: [text], expected: longestUnique(text) },
        { args: ['abcabcbb'], expected: 'abc' }
      ];
      return buildTaskFromParts({
        category: 'algorithms',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['// Используй скользящее окно и Map для последней позиции символа'],
        solutionBody,
        hints: ['Держи левую границу окна и память о последнем индексе каждого символа.', 'Обновляй лучший ответ, когда окно становится длиннее.'],
        explanation: 'Это классическая задача на скользящее окно и индекс последнего вхождения символа.',
        tests,
        tags: ['string', 'window']
      });
    }
    default:
      return buildAlgorithmsTask('easy', rng);
  }
}

function createDomFixtureBase() {
  return {
    body: []
  };
}

function makeElement(def) {
  return {
    tag: def.tag || 'div',
    id: def.id || null,
    className: def.className || '',
    text: def.text || '',
    value: def.value || '',
    attrs: { ...(def.attrs || {}) },
    children: Array.isArray(def.children) ? def.children.map(makeElement) : [],
    listeners: {},
    type: def.type || null
  };
}

function createMockDocument(fixture = createDomFixtureBase()) {
  const root = makeElement({ tag: 'body', id: 'body', children: fixture.body || [] });
  const allNodes = [];

  function register(node, parent = null) {
    node.parentNode = parent;
    node.ownerDocument = document;
    node.childNodes = node.children;
    const classSet = new Set(String(node.className || '').split(/\s+/).filter(Boolean));
    node.classList = {
      add(...classes) {
        for (const className of classes) {
          classSet.add(className);
        }
        node.className = Array.from(classSet).join(' ');
      },
      remove(...classes) {
        for (const className of classes) {
          classSet.delete(className);
        }
        node.className = Array.from(classSet).join(' ');
      },
      toggle(className, force) {
        const shouldAdd = force === undefined ? !classSet.has(className) : Boolean(force);
        if (shouldAdd) {
          classSet.add(className);
        } else {
          classSet.delete(className);
        }
        node.className = Array.from(classSet).join(' ');
        return shouldAdd;
      },
      contains(className) {
        return classSet.has(className);
      },
      toString() {
        return Array.from(classSet).join(' ');
      }
    };
    node.dataset = new Proxy({}, {
      get(_, key) {
        return node.attrs[`data-${String(key)}`];
      },
      set(_, key, value) {
        node.attrs[`data-${String(key)}`] = String(value);
        return true;
      }
    });
    node.appendChild = (child) => {
      child.parentNode = node;
      child.ownerDocument = document;
      node.children.push(child);
      registerTree(child, node);
      return child;
    };
    node.removeChild = (child) => {
      const index = node.children.indexOf(child);
      if (index >= 0) {
        node.children.splice(index, 1);
        child.parentNode = null;
      }
      return child;
    };
    node.setAttribute = (name, value) => {
      if (name === 'class') {
        node.className = String(value);
        return;
      }
      if (name === 'id') {
        node.id = String(value);
        return;
      }
      if (name === 'value') {
        node.value = String(value);
        return;
      }
      node.attrs[name] = String(value);
    };
    node.getAttribute = (name) => {
      if (name === 'class') {
        return node.className;
      }
      if (name === 'id') {
        return node.id;
      }
      if (name === 'value') {
        return node.value;
      }
      return node.attrs[name];
    };
    node.addEventListener = (type, handler) => {
      if (!node.listeners[type]) {
        node.listeners[type] = [];
      }
      node.listeners[type].push(handler);
    };
    node.removeEventListener = (type, handler) => {
      const list = node.listeners[type];
      if (!list) {
        return;
      }
      const index = list.indexOf(handler);
      if (index >= 0) {
        list.splice(index, 1);
      }
    };
    node.dispatchEvent = (event) => {
      const list = node.listeners[event.type] || [];
      for (const handler of list.slice()) {
        handler.call(node, event);
      }
    };
    node.click = () => {
      node.dispatchEvent({ type: 'click', target: node });
    };
    Object.defineProperty(node, 'childElementCount', {
      get() {
        return node.children.length;
      }
    });
    Object.defineProperty(node, 'textContent', {
      get() {
        return node.text;
      },
      set(value) {
        node.text = String(value);
      }
    });
    allNodes.push(node);
  }

  function registerTree(node, parent = null) {
    register(node, parent);
    for (const child of node.children) {
      registerTree(child, node);
    }
  }

  const document = {
    body: root,
    createElement(tag) {
      return makeElement({ tag });
    },
    getElementById(id) {
      return allNodes.find((node) => node.id === id) || null;
    },
    querySelector(selector) {
      return document.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      const normalized = String(selector).trim();
      if (!normalized) {
        return [];
      }
      if (normalized.startsWith('#')) {
        const target = document.getElementById(normalized.slice(1));
        return target ? [target] : [];
      }
      if (normalized.startsWith('.')) {
        const className = normalized.slice(1);
        return allNodes.filter((node) => String(node.className).split(/\s+/).includes(className));
      }
      return allNodes.filter((node) => node.tag === normalized.toLowerCase());
    }
  };

  registerTree(root, null);
  return document;
}

function runDomActions(document, actions = []) {
  for (const action of actions) {
    if (!action || typeof action !== 'object') {
      continue;
    }
    const target = action.target ? (action.target.startsWith('#') || action.target.startsWith('.') ? document.querySelector(action.target) : document.getElementById(action.target) || document.querySelector(action.target)) : null;
    if (!target) {
      continue;
    }
    switch (action.type) {
      case 'click':
        target.click();
        break;
      case 'setValue':
        target.value = action.value;
        break;
      case 'input':
        target.value = action.value;
        target.dispatchEvent({ type: 'input', target });
        break;
      case 'setText':
        target.textContent = action.value;
        break;
      default:
        break;
    }
  }
}

function getDomAssertionTarget(document, assertion) {
  if (assertion.selector) {
    return document.querySelector(assertion.selector);
  }
  if (assertion.target) {
    if (assertion.target.startsWith('#') || assertion.target.startsWith('.')) {
      return document.querySelector(assertion.target);
    }
    return document.getElementById(assertion.target) || document.querySelector(assertion.target);
  }
  return null;
}

function evaluateDomAssertions(document, assertions = []) {
  const results = [];
  for (const assertion of assertions) {
    const target = getDomAssertionTarget(document, assertion);
    let actual;
    let passed = false;
    switch (assertion.type) {
      case 'exists':
        actual = Boolean(target);
        passed = actual === Boolean(assertion.equals);
        break;
      case 'text':
        actual = target ? target.textContent : undefined;
        passed = actual === assertion.equals;
        break;
      case 'value':
        actual = target ? target.value : undefined;
        passed = actual === assertion.equals;
        break;
      case 'classContains':
        actual = target ? target.classList.contains(assertion.value) : false;
        passed = actual === true;
        break;
      case 'classNotContains':
        actual = target ? target.classList.contains(assertion.value) : false;
        passed = actual === false;
        break;
      case 'count':
        actual = target ? target.childElementCount : undefined;
        passed = actual === assertion.equals;
        break;
      case 'attr':
        actual = target ? target.getAttribute(assertion.name) : undefined;
        passed = actual === assertion.equals;
        break;
      default:
        actual = undefined;
        passed = false;
        break;
    }
    results.push({
      label: assertion.label || assertion.type,
      passed,
      expected: assertion.equals ?? assertion.value,
      actual
    });
  }
  return results;
}

async function executeTaskTests(task, solve, sandbox) {
  const results = [];
  const strategy = task.strategy || 'simple';
  const tests = Array.isArray(task.tests) ? task.tests : [];

  for (const test of tests) {
    const state = createTestState();
    let args = [];
    try {
      args = materializeTestValue(test.args || [], state);

      if (strategy === 'closure') {
        const returned = await Promise.resolve(solve(...args));
        if (Array.isArray(test.sequence)) {
          let current = returned;
          for (const step of test.sequence) {
            const methodName = step.method || 'call';
            const stepArgs = materializeTestValue(step.input || [], state);
            if (typeof current === 'function' && methodName === 'call') {
              const actual = normalizeComparisonValue(await Promise.resolve(current(...stepArgs)));
              if (!isDeepStrictEqual(actual, step.expected)) {
                throw new Error(`expected ${preview(step.expected)}, got ${preview(actual)}`);
              }
            } else if (current && typeof current[methodName] === 'function') {
              const actual = normalizeComparisonValue(await Promise.resolve(current[methodName](...stepArgs)));
              if (!isDeepStrictEqual(actual, step.expected)) {
                throw new Error(`expected ${preview(step.expected)}, got ${preview(actual)}`);
              }
            } else {
              throw new Error(`method ${methodName} is not available`);
            }
          }
        } else if (Object.prototype.hasOwnProperty.call(test, 'expected')) {
          if (!isDeepStrictEqual(returned, test.expected)) {
            throw new Error(`expected ${preview(test.expected)}, got ${preview(returned)}`);
          }
        }
        if (test.expectCalls) {
          for (const [key, expected] of Object.entries(test.expectCalls)) {
            const actual = state.callCounts[key] || 0;
            if (actual !== expected) {
              throw new Error(`call count for ${key} expected ${expected}, got ${actual}`);
            }
          }
        }
        if (test.expectCollected) {
          for (const [key, expected] of Object.entries(test.expectCollected)) {
            const actual = state.collected[key] || [];
            if (!isDeepStrictEqual(actual, expected)) {
              throw new Error(`collected values for ${key} expected ${preview(expected)}, got ${preview(actual)}`);
            }
          }
        }
        results.push({
          passed: true,
          input: args,
          expected: test.expected,
          actual: test.expected
        });
        continue;
      }

      if (strategy === 'dom') {
        const document = createMockDocument(test.fixture || createDomFixtureBase());
        const localArgs = [document].concat(args);
        await Promise.resolve(solve(...localArgs));
        if (Array.isArray(test.actions)) {
          runDomActions(document, materializeTestValue(test.actions, state));
        }
        const assertions = evaluateDomAssertions(document, test.assertions || []);
        const failed = assertions.find((item) => !item.passed);
        if (failed) {
          throw new Error(`${failed.label}: expected ${preview(failed.expected)}, got ${preview(failed.actual)}`);
        }
        if (test.expectCalls) {
          for (const [key, expected] of Object.entries(test.expectCalls)) {
            const actual = state.callCounts[key] || 0;
            if (actual !== expected) {
              throw new Error(`call count for ${key} expected ${expected}, got ${actual}`);
            }
          }
        }
        if (test.expectCollected) {
          for (const [key, expected] of Object.entries(test.expectCollected)) {
            const actual = state.collected[key] || [];
            if (!isDeepStrictEqual(actual, expected)) {
              throw new Error(`collected values for ${key} expected ${preview(expected)}, got ${preview(actual)}`);
            }
          }
        }
        results.push({
          passed: true,
          input: args,
          expected: test.assertions,
          actual: assertions
        });
        continue;
      }

      const actual = normalizeComparisonValue(await Promise.resolve(solve(...args)));
      if (Object.prototype.hasOwnProperty.call(test, 'expectedError')) {
        throw new Error('Expected the test to fail, but it succeeded.');
      }
      if (!isDeepStrictEqual(actual, test.expected)) {
        throw new Error(`expected ${preview(test.expected)}, got ${preview(actual)}`);
      }
      if (test.expectCalls) {
        for (const [key, expected] of Object.entries(test.expectCalls)) {
          const actualCount = state.callCounts[key] || 0;
          if (actualCount !== expected) {
            throw new Error(`call count for ${key} expected ${expected}, got ${actualCount}`);
          }
        }
      }
      if (test.expectCollected) {
        for (const [key, expected] of Object.entries(test.expectCollected)) {
          const actualValues = state.collected[key] || [];
          if (!isDeepStrictEqual(actualValues, expected)) {
            throw new Error(`collected values for ${key} expected ${preview(expected)}, got ${preview(actualValues)}`);
          }
        }
      }
      results.push({
        passed: true,
        input: args,
        expected: test.expected,
        actual
      });
    } catch (error) {
      if (Object.prototype.hasOwnProperty.call(test, 'expectedError')) {
        if (String(error.message || error).includes(String(test.expectedError))) {
          results.push({
            passed: true,
            input: args,
            expected: test.expectedError,
            actual: error.message || String(error)
          });
          continue;
        }
      }
      results.push({
        passed: false,
        input: test.args,
        expected: test.expected,
        actual: error.message || String(error),
        error: error.message || String(error)
      });
    }
  }

  return results;
}

async function runTaskTests(task, userCode) {
  const start = Date.now();
  const { logs, console } = createBasicConsoleBuffer();
  const sandbox = {
    console,
    module: { exports: {} },
    exports: {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Promise,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Date,
    JSON,
    RegExp,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    BigInt,
    Intl,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    queueMicrotask,
    structuredClone,
    performance: globalThis.performance,
    Error,
    TypeError,
    RangeError,
    ReferenceError,
    SyntaxError,
    URIError,
    eval: undefined,
    require: undefined,
    process: undefined
  };

  let solve;

  try {
    const context = vm.createContext(sandbox);
    const script = new vm.Script(String(userCode), { filename: 'user-code.js', displayErrors: true });
    script.runInContext(context, { timeout: 1000 });
    solve = resolveExportedFunction(sandbox);
    if (typeof solve !== 'function') {
      return {
        passed: false,
        error: 'Нужно определить функцию `solve(...)` или экспортировать её через `module.exports`.',
        tests: [],
        logs,
        durationMs: Date.now() - start
      };
    }
  } catch (error) {
    return {
      passed: false,
      error: error.message || String(error),
      tests: [],
      logs,
      durationMs: Date.now() - start
    };
  }

  try {
    const tests = await executeTaskTests(task, solve, sandbox);
    const passed = tests.every((item) => item.passed);
    const failedTest = tests.find((item) => !item.passed);
    return {
      passed,
      error: passed ? null : (failedTest ? failedTest.error || 'Тест не пройден' : 'Тест не пройден'),
      tests,
      logs,
      durationMs: Date.now() - start
    };
  } catch (error) {
    return {
      passed: false,
      error: error.message || String(error),
      tests: [],
      logs,
      durationMs: Date.now() - start
    };
  }
}

function generateTask(options = {}) {
  const seed = resolveSeed(options);
  const rng = createRng(seed);
  const kernelId = typeof options.kernelId === 'string' && options.kernelId.trim() ? options.kernelId.trim() : 'js';
  const categories = normalizeSelection(options.categories, CATEGORY_ORDER);
  const difficulties = normalizeSelection(options.difficulties, DIFFICULTIES);
  const category = chooseCategory(rng, {
    ...options,
    categories
  });
  const difficulty = chooseDifficulty(rng, {
    ...options,
    difficulties
  });

  const challengeType = options.mode === 'daily' ? 'daily' : options.mode === 'boss' ? 'boss' : 'practice';
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
    return standard;
  }

  const chosen = rng.pick(pool);
  chosen.meta = {
    ...chosen.meta,
    challengeType,
    randomMode: options.randomMode !== false,
    seed,
    kernelId
  };
  chosen.kernelId = kernelId;
  chosen.seed = seed;
  return chosen;
}

function buildGeneratedTask(category, difficulty, rng) {
  switch (category) {
    case 'arrays':
      return buildArraysTask(difficulty, rng);
    case 'objects':
      return buildObjectsTask(difficulty, rng);
    case 'functions':
      return buildFunctionsTask(difficulty, rng);
    case 'closures':
      return buildClosuresTask(difficulty, rng);
    case 'async':
      return buildAsyncTask(difficulty, rng);
    case 'dom':
      return buildDomTask(difficulty, rng);
    case 'algorithms':
      return buildAlgorithmsTask(difficulty, rng);
    default:
      return buildArraysTask(difficulty, rng);
  }
}

function buildDomTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const title = 'Изменение текста';
      const prompt = 'На странице есть элемент #status. Измени его текст на "Готово" и добавь класс is-ready.';
      const signature = 'solve(document)';
      const starterBody = [
        'const status = document.getElementById("status");',
        'status.textContent = "Черновик"; // TODO: set the final text',
        '// TODO: add the is-ready class'
      ];
      const solutionBody = [
        'const status = document.getElementById("status");',
        'status.textContent = "Готово";',
        'status.classList.add("is-ready");'
      ];
      const fixture = {
        body: [
          {
            tag: 'div',
            id: 'status',
            className: 'status',
            text: 'Черновик'
          }
        ]
      };
      const tests = [
        {
          fixture,
          assertions: [
            { target: 'status', type: 'text', equals: 'Готово' },
            { target: 'status', type: 'classContains', value: 'is-ready' }
          ]
        }
      ];
      return buildTaskFromParts({
        category: 'dom',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Сначала найди элемент через `getElementById`.', 'Измени `textContent` и добавь класс через `classList.add`.'],
        explanation: 'Базовая DOM-задача: найти нужный элемент и обновить текст с классом состояния.',
        tests,
        strategy: 'dom',
        tags: ['text', 'class']
      });
    }
    case 'medium': {
      const items = sampleWords(rng, rng.int(3, 5));
      const title = 'Рендер списка';
      const prompt = `На странице есть контейнер #list. Верни туда список элементов из массива items = ${preview(items)}.`;
      const signature = 'solve(document, items)';
      const starterBody = [
        'const list = document.getElementById("list");',
        '// TODO: create list items and append them to #list'
      ];
      const solutionBody = [
        'const list = document.getElementById("list");',
        'for (const item of items) {',
        '  const li = document.createElement("li");',
        '  li.textContent = item;',
        '  list.appendChild(li);',
        '}'
      ];
      const fixture = {
        body: [
          {
            tag: 'ul',
            id: 'list',
            className: 'items'
          }
        ]
      };
      const tests = [
        {
          fixture,
          args: [items],
          assertions: [
            { target: 'list', type: 'count', equals: items.length },
            { target: 'list', type: 'exists', equals: true }
          ]
        }
      ];
      return buildTaskFromParts({
        category: 'dom',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Создай `li` через `document.createElement`.', 'Меняй `textContent` и добавляй элементы в список.'],
        explanation: 'Задача учит базовому рендерингу списка элементов на странице.',
        tests,
        strategy: 'dom',
        tags: ['render', 'list']
      });
    }
    case 'hard': {
      const threshold = rng.int(40, 70);
      const cards = Array.from({ length: rng.int(4, 6) }, (_, index) => {
        const isHot = index % 2 === 1;
        const score = isHot
          ? threshold + rng.int(1, 20)
          : Math.max(0, threshold - rng.int(5, 20));
        return {
          id: `card-${index + 1}`,
          score
        };
      });
      const title = 'Разметка карточек';
      const prompt = `На странице есть элементы .card с data-score. Добавь класс is-hot всем карточкам, у которых score >= ${threshold}, и убери его у остальных.`;
      const signature = 'solve(document, threshold)';
      const starterBody = [
        'const cards = document.querySelectorAll(".card");',
        '// TODO: toggle the is-hot class based on data-score'
      ];
      const solutionBody = [
        'const cards = document.querySelectorAll(".card");',
        'for (const card of cards) {',
        '  const score = Number(card.dataset.score || 0);',
        '  card.classList.toggle("is-hot", score >= threshold);',
        '}'
      ];
      const fixture = {
        body: cards.map((card) => ({
          tag: 'div',
          id: card.id,
          className: 'card',
          attrs: { 'data-score': String(card.score) },
          text: `score:${card.score}`
        }))
      };
      const assertions = cards.map((card) => ({
        target: card.id,
        type: card.score >= threshold ? 'classContains' : 'classNotContains',
        value: 'is-hot'
      }));
      const tests = [
        {
          fixture,
          args: [threshold],
          assertions
        }
      ];
      return buildTaskFromParts({
        category: 'dom',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Используй `querySelectorAll(".card")`.', 'Сравни `data-score` с порогом и переключай класс.'],
        explanation: 'Задача проверяет умение работать с коллекциями DOM-элементов, data-атрибутами и классами.',
        tests,
        strategy: 'dom',
        tags: ['dataset', 'classList']
      });
    }
    case 'expert': {
      const title = 'Счётчик кликов';
      const prompt = 'На странице есть кнопка #add, счётчик #count и список #log. Подпишись на клик так, чтобы счётчик увеличивался, а в список добавлялся новый элемент с номером клика.';
      const signature = 'solve(document)';
      const starterBody = [
        'const button = document.getElementById("add");',
        'const count = document.getElementById("count");',
        'const log = document.getElementById("log");',
        'let total = Number(count.textContent || 0);',
        '// TODO: update the counter and append a new <li> on each click'
      ];
      const solutionBody = [
        'const button = document.getElementById("add");',
        'const count = document.getElementById("count");',
        'const log = document.getElementById("log");',
        'let total = Number(count.textContent || 0);',
        'button.addEventListener("click", () => {',
        '  total += 1;',
        '  count.textContent = String(total);',
        '  const item = document.createElement("li");',
        '  item.textContent = `Клик ${total}`;',
        '  log.appendChild(item);',
        '});'
      ];
      const fixture = {
        body: [
          { tag: 'button', id: 'add', className: 'button', text: 'Add' },
          { tag: 'span', id: 'count', className: 'count', text: '0' },
          { tag: 'ul', id: 'log', className: 'log' }
        ]
      };
      const tests = [
        {
          fixture,
          actions: [
            { type: 'click', target: 'add' },
            { type: 'click', target: 'add' }
          ],
          assertions: [
            { target: 'count', type: 'text', equals: '2' },
            { target: 'log', type: 'count', equals: 2 },
            { target: 'log', type: 'exists', equals: true }
          ]
        }
      ];
      return buildTaskFromParts({
        category: 'dom',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Сохрани счётчик в замыкании или в локальной переменной.', 'После каждого клика обновляй текст и добавляй новый элемент в список.'],
        explanation: 'Экспертная DOM-задача показывает, как подписываться на события и синхронно обновлять несколько частей интерфейса.',
        tests,
        strategy: 'dom',
        tags: ['events', 'counter']
      });
    }
    default:
      return buildDomTask('easy', rng);
  }
}

function getProgressSummary(progress = {}) {
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
  const summary = getProgressSummary(progress);
  const unlockedCategories = Object.values(summary.solvedByCategory).filter((count) => count > 0).length;
  const unlockedDifficulties = Object.values(summary.solvedByDifficulty).filter((count) => count > 0).length;

  const definitions = [
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
      id: 'daily',
      title: 'Ежедневный',
      description: 'Завершить ежедневный челлендж',
      unlocked: summary.dailySolved >= 1
    },
    {
      id: 'builder',
      title: 'Автор',
      description: 'Добавь собственную задачу',
      unlocked: summary.customTasksCreated >= 1
    },
    {
      id: 'boss',
      title: 'Босс',
      description: 'Победи хотя бы одно сложное испытание',
      unlocked: summary.bossCleared >= 1
    },
    {
      id: 'all-difficulties',
      title: 'Уровни',
      description: 'Открой все 4 уровня сложности',
      unlocked: unlockedDifficulties === DIFFICULTIES.length
    }
  ];

  return definitions.map((item) => ({ ...item }));
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

function buildFunctionsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      if (rng.bool()) {
        const value = rng.int(-10, 30);
        const min = rng.int(-10, 0);
        const max = rng.int(10, 40);
        const expected = Math.min(max, Math.max(min, value));
        return buildTaskFromParts({
          category: 'functions',
          difficulty,
          title: 'Ограничение диапазона',
          prompt: `Верни число value = ${value}, зажатое в диапазоне [${min}, ${max}].`,
          signature: 'solve(value, min, max)',
          starterBody: ['// Сожми значение в заданный диапазон'],
          solutionBody: ['return Math.min(max, Math.max(min, value));'],
          hints: ['Комбинация `Math.min` и `Math.max` решает задачу.', 'Сначала подними число до нижней границы, потом ограничь сверху.'],
          explanation: 'Это простая чистая функция: она не меняет состояние и только приводит число к нужному диапазону.',
          tests: [
            { args: [value, min, max], expected },
            { args: [100, 0, 25], expected: 25 },
            { args: [-5, 0, 25], expected: 0 }
          ],
          tags: ['clamp', 'math']
        });
      }

      const text = `${sampleWord(rng)}   ${sampleWord(rng)}  ${sampleWord(rng)}`;
      const expected = text.trim().replace(/\s+/g, ' ');
      const output = expected.charAt(0).toUpperCase() + expected.slice(1);
      return buildTaskFromParts({
        category: 'functions',
        difficulty,
        title: 'Очистка строки',
        prompt: `Дана строка text = ${quote(text)}. Убери лишние пробелы между словами и сделай первую букву заглавной.`,
        signature: 'solve(text)',
        starterBody: ['// Отчисти строку и заглавную букву'],
        solutionBody: [
          'const cleaned = text.trim().replace(/\\s+/g, " ");',
          'return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);'
        ],
        hints: ['Сначала используй `trim`.', 'Потом замени повторяющиеся пробелы и капитализируй первый символ.'],
        explanation: 'Эта задача учит работать со строками внутри функции и комбинировать несколько преобразований подряд.',
        tests: [
          { args: [text], expected: output },
          { args: ['   hello   world '], expected: 'Hello world' }
        ],
        tags: ['strings', 'format']
      });
    }
    case 'medium': {
      const numbers = sampleNumbers(rng, rng.int(6, 8), 1, 20);
      const expected = numbers.map((value) => value + 1).filter((value) => value % 3 !== 0);
      return buildTaskFromParts({
        category: 'functions',
        difficulty,
        title: 'Карта и фильтрация',
        prompt: `Дан массив numbers = ${preview(numbers)} и две функции mapper и predicate. Верни массив: сначала примени mapper к каждому числу, затем оставь только значения, которые проходят predicate.`,
        signature: 'solve(numbers, mapper, predicate)',
        starterBody: ['// Используй переданные функции как инструменты'],
        solutionBody: [
          'return numbers',
          '  .map((value, index) => mapper(value, index))',
          '  .filter((value, index) => predicate(value, index));'
        ],
        hints: ['Удобно сделать это через цепочку `map` и `filter`.', 'Функции-аргументы можно вызывать как обычные переменные.'],
        explanation: 'Здесь функция выступает как универсальный инструмент, который комбинирует работу с массивом и колбэками.',
        tests: [
          {
            args: [
              numbers,
              { __fn: 'add', value: 1, key: 'mapper-add-1' },
              { __fn: 'predicateNotMultipleOf', divisor: 3, key: 'predicate-not-multiple-3' }
            ],
            expected
          },
          {
            args: [
              [1, 2, 3],
              { __fn: 'multiply', value: 10, key: 'mapper-times-10' },
              { __fn: 'predicateGreaterThan', value: 19, key: 'predicate-at-least-20' }
            ],
            expected: [20, 30]
          }
        ],
        tags: ['callbacks', 'array']
      });
    }
    case 'hard': {
      const funcs = [
        { __fn: 'add', value: 2, key: 'compose-add-2' },
        { __fn: 'multiply', value: 3, key: 'compose-multiply-3' },
        { __fn: 'subtract', value: 5, key: 'compose-subtract-5' }
      ];
      const composedExpected = funcs.reduceRight((value, fn) => {
        if (fn.__fn === 'add') {
          return value + fn.value;
        }
        if (fn.__fn === 'subtract') {
          return value - fn.value;
        }
        return value * fn.value;
      }, 4);
      return buildTaskFromParts({
        category: 'functions',
        difficulty,
        title: 'Композиция функций',
        prompt: 'Дан массив функций functions. Верни новую функцию, которая применяет их справа налево: последняя функция массива вызывается первой.',
        signature: 'solve(functions)',
        starterBody: [
          '// Верни функцию, которая применяет массив функций справа налево',
          '// Подсказка: reduceRight'
        ],
        solutionBody: [
          'return function composed(initialValue) {',
          '  return functions.reduceRight((value, fn) => fn(value), initialValue);',
          '};'
        ],
        hints: ['Справа налево удобнее идти через `reduceRight`.', 'Внутри возвращаемой функции обработай начальное значение.'],
        explanation: 'Это классическая композиция функций: одна функция строится на основе набора более простых.',
        strategy: 'closure',
        tests: [
          {
            args: [funcs],
            sequence: [{ input: [4], expected: composedExpected }]
          },
          {
            args: [[
              { __fn: 'add', value: 1, key: 'compose-add-1' },
              { __fn: 'multiply', value: 2, key: 'compose-multiply-2' }
            ]],
            sequence: [{ input: [3], expected: 7 }]
          }
        ],
        tags: ['compose', 'higher-order']
      });
    }
    case 'expert': {
      const pipelineA = [
        { __fn: 'add', value: 1, key: 'pipeline-a-add-1' },
        { __fn: 'asyncMultiply', value: 2, key: 'pipeline-a-async-mul-2' },
        { __fn: 'subtract', value: 3, key: 'pipeline-a-sub-3' }
      ];
      const pipelineB = [
        { __fn: 'asyncAdd', value: 5, key: 'pipeline-b-async-add-5' },
        { __fn: 'multiply', value: 4, key: 'pipeline-b-mul-4' }
      ];
      return buildTaskFromParts({
        category: 'functions',
        difficulty,
        title: 'Асинхронный pipeline',
        prompt: 'Дан массив функций functions. Верни асинхронную функцию, которая применяет их слева направо и ждёт Promise на каждом шаге.',
        signature: 'solve(functions)',
        starterBody: [
          '// Верни async-функцию pipeline',
          '// Она должна поддерживать как sync, так и async колбэки'
        ],
        solutionBody: [
          'return async function pipeline(initialValue) {',
          '  let value = initialValue;',
          '  for (const fn of functions) {',
          '    value = await fn(value);',
          '  }',
          '  return value;',
          '};'
        ],
        hints: ['Обрабатывай функции в исходном порядке.', 'Используй `await` для каждого шага, даже если функция синхронная.'],
        explanation: 'Экспертная задача расширяет композицию на случай Promise. Такой pipeline пригодится в реальных приложениях.',
        strategy: 'closure',
        tests: [
          { args: [pipelineA], sequence: [{ input: [10], expected: 19 }] },
          { args: [pipelineB], sequence: [{ input: [2], expected: 28 }] }
        ],
        tags: ['async', 'pipeline']
      });
    }
    default:
      return buildFunctionsTask('easy', rng);
  }
}

function buildClosuresTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const start = rng.int(0, 10);
      const step = rng.int(1, 4);
      return buildTaskFromParts({
        category: 'closures',
        difficulty,
        title: 'Счётчик',
        prompt: `Верни функцию-счётчик, которая начинает с ${start} и на каждом вызове прибавляет ${step}. Первый вызов должен вернуть текущее значение, а затем увеличить его.`,
        signature: 'solve(start, step)',
        starterBody: [
          'let current = start;',
          'return function next() {',
          '  // TODO',
          '};'
        ],
        solutionBody: [
          'let current = start;',
          'return function next() {',
          '  const value = current;',
          '  current += step;',
          '  return value;',
          '};'
        ],
        hints: ['Нужна переменная во внешней области видимости.', 'Возвращаемая функция должна менять и читать это состояние.'],
        explanation: 'Замыкание позволяет внутренней функции помнить значение между вызовами, не вынося его наружу.',
        strategy: 'closure',
        tests: [
          {
            args: [start, step],
            sequence: [
              { input: [], expected: start },
              { input: [], expected: start + step },
              { input: [], expected: start + step * 2 }
            ]
          },
          {
            args: [2, 3],
            sequence: [
              { input: [], expected: 2 },
              { input: [], expected: 5 }
            ]
          }
        ],
        tags: ['counter', 'state']
      });
    }
    case 'medium': {
      return buildTaskFromParts({
        category: 'closures',
        difficulty,
        title: 'Мемоизация',
        prompt: 'Дана функция fn. Верни обёртку, которая кэширует результат по набору аргументов и не вызывает fn повторно для одинакового вызова.',
        signature: 'solve(fn)',
        starterBody: [
          'const cache = new Map();',
          'return function memoized(...args) {',
          '  // TODO',
          '};'
        ],
        solutionBody: [
          'const cache = new Map();',
          'return function memoized(...args) {',
          '  const key = JSON.stringify(args);',
          '  if (cache.has(key)) {',
          '    return cache.get(key);',
          '  }',
          '  const result = fn(...args);',
          '  cache.set(key, result);',
          '  return result;',
          '};'
        ],
        hints: ['Нужен словарь для результатов.', 'Ключ можно собрать из `JSON.stringify(args)`.'],
        explanation: 'Кэширование через замыкание позволяет хранить состояние без глобальных переменных.',
        strategy: 'closure',
        tests: [
          {
            args: [{ __fn: 'spyMultiply', value: 10, key: 'memo-spy' }],
            sequence: [
              { input: [2], expected: 20 },
              { input: [2], expected: 20 },
              { input: [3], expected: 30 }
            ],
            expectCalls: { 'memo-spy': 2 }
          },
          {
            args: [{ __fn: 'collector', key: 'memo-collect' }],
            sequence: [
              { input: ['x'], expected: undefined },
              { input: ['x'], expected: undefined }
            ],
            expectCalls: { 'memo-collect': 1 }
          }
        ],
        tags: ['cache', 'memoize']
      });
    }
    case 'hard': {
      const initial = sampleWords(rng, 3);
      return buildTaskFromParts({
        category: 'closures',
        difficulty,
        title: 'Фабрика стека',
        prompt: `Верни объект-стек на основе начального массива initial = ${preview(initial)}. Объект должен иметь методы push(value), pop(), peek(), size() и reset().`,
        signature: 'solve(initial)',
        starterBody: [
          'let stack = Array.isArray(initial) ? initial.slice() : [];',
          'return {',
          '  push(value) {',
          '    // TODO',
          '  },',
          '  pop() {',
          '    // TODO',
          '  },',
          '  peek() {',
          '    // TODO',
          '  },',
          '  size() {',
          '    // TODO',
          '  },',
          '  reset() {',
          '    // TODO',
          '  }',
          '};'
        ],
        solutionBody: [
          'let stack = Array.isArray(initial) ? initial.slice() : [];',
          'return {',
          '  push(value) {',
          '    stack.push(value);',
          '    return stack.length;',
          '  },',
          '  pop() {',
          '    return stack.pop() ?? null;',
          '  },',
          '  peek() {',
          '    return stack.length > 0 ? stack[stack.length - 1] : null;',
          '  },',
          '  size() {',
          '    return stack.length;',
          '  },',
          '  reset() {',
          '    stack = [];',
          '    return stack.length;',
          '  }',
          '};'
        ],
        hints: ['Состояние стека должно жить в замыкании.', 'Методы объекта будут работать с одной и той же скрытой переменной.'],
        explanation: 'Тут замыкание используется для хранения структуры данных, недоступной снаружи напрямую.',
        strategy: 'closure',
        tests: [
          {
            args: [initial],
            sequence: [
              { method: 'size', expected: initial.length },
              { method: 'peek', expected: initial[initial.length - 1] },
              { method: 'push', input: ['extra'], expected: initial.length + 1 },
              { method: 'pop', expected: 'extra' },
              { method: 'reset', expected: 0 }
            ]
          },
          {
            args: [[1, 2]],
            sequence: [
              { method: 'push', input: [3], expected: 3 },
              { method: 'peek', expected: 3 },
              { method: 'size', expected: 3 }
            ]
          }
        ],
        tags: ['stack', 'methods']
      });
    }
    case 'expert': {
      return buildTaskFromParts({
        category: 'closures',
        difficulty,
        title: 'Event bus',
        prompt: 'Верни объект event bus с методами on(event, handler), off(event, handler) и emit(event, payload). Подписчики одного события должны вызываться в порядке регистрации.',
        signature: 'solve()',
        starterBody: [
          'const listeners = new Map();',
          'return {',
          '  on(event, handler) {',
          '    // TODO',
          '  },',
          '  off(event, handler) {',
          '    // TODO',
          '  },',
          '  emit(event, payload) {',
          '    // TODO',
          '  }',
          '};'
        ],
        solutionBody: [
          'const listeners = new Map();',
          'return {',
          '  on(event, handler) {',
          '    if (!listeners.has(event)) {',
          '      listeners.set(event, []);',
          '    }',
          '    listeners.get(event).push(handler);',
          '  },',
          '  off(event, handler) {',
          '    const list = listeners.get(event);',
          '    if (!list) {',
          '      return;',
          '    }',
          '    const index = list.indexOf(handler);',
          '    if (index >= 0) {',
          '      list.splice(index, 1);',
          '    }',
          '  },',
          '  emit(event, payload) {',
          '    const list = listeners.get(event) || [];',
          '    for (const handler of list.slice()) {',
          '      handler(payload);',
          '    }',
          '    return list.length;',
          '  }',
          '};'
        ],
        hints: ['Используй `Map` для списка слушателей.', 'Не забывай копировать массив обработчиков перед обходом, если возможны изменения в процессе emit.'],
        explanation: 'Это полноценное применение замыкания: объект event bus хранит список подписчиков внутри скрытого состояния.',
        strategy: 'closure',
        tests: [
          {
            args: [],
            sequence: [
              { method: 'on', input: ['ping', { __fn: 'collector', key: 'bus-a' }] },
              { method: 'on', input: ['ping', { __fn: 'collector', key: 'bus-b' }] },
              { method: 'emit', input: ['ping', 'hello'], expected: 2 },
              { method: 'off', input: ['ping', { __fn: 'collector', key: 'bus-a' }] },
              { method: 'emit', input: ['ping', 'bye'], expected: 1 }
            ],
            expectCollected: {
              'bus-a': ['hello'],
              'bus-b': ['hello', 'bye']
            }
          }
        ],
        tags: ['event-bus', 'pubsub']
      });
    }
    default:
      return buildClosuresTask('easy', rng);
  }
}

function buildAsyncTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const bonus = rng.int(3, 12);
      return buildTaskFromParts({
        category: 'async',
        difficulty,
        title: 'Дождаться результата',
        prompt: `Дана async-функция loadScore(). Дождись её и верни результат + ${bonus}.`,
        signature: 'solve(loadScore)',
        starterBody: [
          'const score = await loadScore();',
          `return score; // TODO: add the bonus`
        ],
        solutionBody: [
          'const score = await loadScore();',
          `return score + ${bonus};`
        ],
        hints: ['Нужно использовать `await`.', 'Сначала дождись `loadScore`, затем прибавь бонус.'],
        explanation: 'Это базовый сценарий для async/await: получить Promise и продолжить вычисление после его разрешения.',
        tests: [
          { args: [{ __fn: 'asyncValue', value: 10, key: 'load-score-a' }], expected: 10 + bonus },
          { args: [{ __fn: 'asyncValue', value: 25, key: 'load-score-b' }], expected: 25 + bonus }
        ],
        strategy: 'async',
        async: true,
        tags: ['await', 'promise']
      });
    }
    case 'medium': {
      return buildTaskFromParts({
        category: 'async',
        difficulty,
        title: 'Параллельная загрузка',
        prompt: 'Даны две async-функции loadName и loadBonus. Выполни их параллельно и верни объект { name, bonus }.',
        signature: 'solve(loadName, loadBonus)',
        starterBody: [
          'const [name, bonus] = await Promise.all([loadName(), loadBonus()]);',
          'return { name, bonus: 0 }; // TODO: return the real bonus'
        ],
        solutionBody: [
          'const [name, bonus] = await Promise.all([loadName(), loadBonus()]);',
          'return { name, bonus };'
        ],
        hints: ['`Promise.all` запускает задачи одновременно.', 'После ожидания просто собери объект.'],
        explanation: 'Средний уровень показывает, как объединять несколько Promise и собирать результаты без лишних задержек.',
        tests: [
          {
            args: [
              { __fn: 'asyncValue', value: 'Ada', key: 'load-name-a' },
              { __fn: 'asyncValue', value: 7, key: 'load-bonus-a' }
            ],
            expected: { name: 'Ada', bonus: 7 }
          },
          {
            args: [
              { __fn: 'asyncValue', value: 'Leo', key: 'load-name-b' },
              { __fn: 'asyncValue', value: 12, key: 'load-bonus-b' }
            ],
            expected: { name: 'Leo', bonus: 12 }
          }
        ],
        strategy: 'async',
        async: true,
        tags: ['promise.all', 'parallel']
      });
    }
    case 'hard': {
      const retries = rng.int(2, 4);
      return buildTaskFromParts({
        category: 'async',
        difficulty,
        title: 'Retry helper',
        prompt: `Дана async-функция fetcher. Попробуй вызвать её до ${retries + 1} раз, пока она не вернёт успех. Если все попытки провалились, пробрось последнюю ошибку.`,
        signature: 'solve(fetcher, retries)',
        starterBody: [
          'let lastError = null;',
          'for (let attempt = 0; attempt <= retries; attempt += 1) {',
          '  try {',
          '    // TODO: call fetcher(attempt) and return the first successful result',
          '  } catch (error) {',
          '    lastError = error;',
          '  }',
          '}',
          'throw lastError;'
        ],
        solutionBody: [
          'let lastError = null;',
          'for (let attempt = 0; attempt <= retries; attempt += 1) {',
          '  try {',
          '    return await fetcher(attempt);',
          '  } catch (error) {',
          '    lastError = error;',
          '  }',
          '}',
          'throw lastError;'
        ],
        hints: ['Сделай цикл по попыткам.', 'Ошибку последней неудачи нужно сохранить и бросить после всех попыток.'],
        explanation: 'Задача учит строить устойчивую асинхронную логику с повторными попытками и корректной обработкой ошибок.',
        tests: [
          {
            args: [{ __fn: 'flakyAsync', failTimes: 2, value: 'ok-3', error: 'fail', key: 'retry-flaky' }, 4],
            expected: 'ok-3'
          },
          {
            args: [{ __fn: 'flakyAsync', failTimes: 99, value: 'never', error: 'boom', key: 'retry-fail' }, 1],
            expectedError: 'boom'
          }
        ],
        strategy: 'async',
        async: true,
        tags: ['retry', 'error-handling']
      });
    }
    case 'expert': {
      const limit = rng.int(2, 3);
      return buildTaskFromParts({
        category: 'async',
        difficulty,
        title: 'Ограничение concurrency',
        prompt: `Дан массив async-джобов jobs. Верни Promise с результатами в исходном порядке, но одновременно должно выполняться не больше ${limit} задач.`,
        signature: 'solve(jobs, limit)',
        starterBody: [
        'return null; // TODO: enforce the concurrency limit'
        ],
        solutionBody: [
          'return new Promise((resolve, reject) => {',
          '  const results = new Array(jobs.length);',
          '  let nextIndex = 0;',
          '  let active = 0;',
          '  const launch = () => {',
          '    if (nextIndex >= jobs.length && active === 0) {',
          '      resolve(results);',
          '      return;',
          '    }',
          '    while (active < limit && nextIndex < jobs.length) {',
          '      const index = nextIndex;',
          '      nextIndex += 1;',
          '      active += 1;',
          '      Promise.resolve()',
          '        .then(() => jobs[index]())',
          '        .then((value) => {',
          '          results[index] = value;',
          '          active -= 1;',
          '          launch();',
          '        }, reject);',
          '    }',
          '  };',
          '  launch();',
          '});'
        ],
        hints: ['Храни очередь индексов и число активных задач.', 'Когда задача завершается, запускай следующую.', 'Порядок результатов должен совпадать с исходным массивом.'],
        explanation: 'Экспертная задача проверяет умение управлять очередью Promise и сохранять порядок результатов при ограниченной параллельности.',
        tests: [
          {
            args: [
              [
                { __fn: 'delayedValue', value: 'A', delay: 2, key: 'job-a' },
                { __fn: 'delayedValue', value: 'B', delay: 1, key: 'job-b' },
                { __fn: 'asyncValue', value: 'C', key: 'job-c' }
              ],
              limit
            ],
            expected: ['A', 'B', 'C']
          },
          {
            args: [
              [
                { __fn: 'asyncValue', value: 1, key: 'job-1' },
                { __fn: 'asyncValue', value: 2, key: 'job-2' },
                { __fn: 'asyncValue', value: 3, key: 'job-3' },
                { __fn: 'asyncValue', value: 4, key: 'job-4' }
              ],
              2
            ],
            expected: [1, 2, 3, 4]
          }
        ],
        strategy: 'async',
        async: true,
        tags: ['concurrency', 'queue']
      });
    }
    default:
      return buildAsyncTask('easy', rng);
  }
}

function buildFunctionsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const variant = rng.int(0, 3);
      if (variant === 0) {
        const value = rng.int(-10, 30);
        const min = rng.int(-10, 0);
        const max = rng.int(10, 40);
        const expected = Math.min(max, Math.max(min, value));
        return buildTaskFromParts({
          category: 'functions',
          difficulty,
          title: 'Ограничение диапазона',
          prompt: `Верни число value = ${value}, зажатое в диапазоне [${min}, ${max}].`,
          signature: 'solve(value, min, max)',
          starterBody: ['// Сожми значение в заданный диапазон'],
          solutionBody: ['return Math.min(max, Math.max(min, value));'],
          hints: ['Комбинация `Math.min` и `Math.max` решает задачу.', 'Сначала подними число до нижней границы, потом ограничь сверху.'],
          explanation: 'Это простая чистая функция: она не меняет состояние и только приводит число к нужному диапазону.',
          tests: [
            { args: [value, min, max], expected },
            { args: [100, 0, 25], expected: 25 },
            { args: [-5, 0, 25], expected: 0 }
          ],
          tags: ['clamp', 'math']
        });
      }

      if (variant === 1) {
        const text = `${sampleWord(rng)}   ${sampleWord(rng)}  ${sampleWord(rng)}`;
        const expected = text.trim().replace(/\s+/g, ' ');
        const output = expected
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        return buildTaskFromParts({
          category: 'functions',
          difficulty,
          title: 'Титульный текст',
          prompt: `Дана строка text = ${quote(text)}. Убери лишние пробелы между словами и сделай каждое слово с заглавной буквы.`,
          signature: 'solve(text)',
          starterBody: ['// Очисти строку и преобразуй каждое слово'],
          solutionBody: [
            'const cleaned = text.trim().replace(/\\s+/g, " ");',
            'return cleaned',
            '  .split(" ")',
            '  .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())',
            '  .join(" ");'
          ],
          hints: ['Сначала используй `trim`.', 'Потом замени повторяющиеся пробелы и преобразуй каждое слово отдельно.'],
          explanation: 'Эта задача учит сочетать строковые преобразования и работу с массивом слов внутри одной функции.',
          tests: [
            { args: [text], expected: output },
            { args: ['   hello   wORld '], expected: 'Hello World' }
          ],
          tags: ['strings', 'format']
        });
      }

      if (variant === 2) {
        const phrase = `${sampleWord(rng)} ${sampleWord(rng)} ${sampleWord(rng)}`;
        const expected = phrase
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        return buildTaskFromParts({
          category: 'functions',
          difficulty,
          title: 'Slug из заголовка',
          prompt: `Дана строка title = ${quote(phrase)}. Преобразуй её в slug: только строчные латинские буквы, цифры и дефисы.`,
          signature: 'solve(title)',
          starterBody: ['// Преобразуй заголовок в slug'],
          solutionBody: [
            'return title',
            '  .toLowerCase()',
            '  .replace(/[^a-z0-9]+/g, "-")',
            '  .replace(/^-+|-+$/g, "");'
          ],
          hints: ['Сначала приведи строку к нижнему регистру.', 'Потом замени все лишние символы на дефисы и убери дефисы по краям.'],
          explanation: 'Slug нужен для URL и файловых имен. Задача учит чистить строку регулярными выражениями.',
          tests: [
            { args: [phrase], expected },
            { args: ['JS  Infinite   Trainer!'], expected: 'js-infinite-trainer' }
          ],
          tags: ['strings', 'slug']
        });
      }

      if (variant === 3) {
        const a = rng.int(2, 20);
        const b = rng.int(1, 12);
        const op = rng.pick(['+', '-', '*']);
        const expected = op === '+' ? a + b : op === '-' ? a - b : a * b;
        return buildTaskFromParts({
          category: 'functions',
          difficulty,
          title: 'Базовый калькулятор',
          prompt: `Даны a = ${a}, b = ${b} и op = ${quote(op)}. Верни результат операции. Поддержи только +, -, *.`,
          signature: 'solve(a, b, op)',
          starterBody: ['// Верни результат операции по символу op'],
          solutionBody: [
            'if (op === "+") {',
            '  return a + b;',
            '}',
            'if (op === "-") {',
            '  return a - b;',
            '}',
            'return a * b;'
          ],
          hints: ['Проверь значение `op` через `if` или `switch`.', 'Сначала реализуй только три поддерживаемые операции.'],
          explanation: 'Такой шаблон тренирует ветвление и работу с разными типами входа через один интерфейс функции.',
          tests: [
            { args: [a, b, op], expected },
            { args: [8, 3, '+'], expected: 11 },
            { args: [8, 3, '-'], expected: 5 }
          ],
          tags: ['branching', 'math']
        });
      }

      if (variant === 4) {
        const phrase = `${sampleWord(rng)}   ${sampleWord(rng)}  ${sampleWord(rng)} ${sampleWord(rng)}`;
        const cleaned = phrase.trim().replace(/\s+/g, ' ');
        const expected = cleaned.split(' ').reverse().join(' ');
        return buildTaskFromParts({
          category: 'functions',
          difficulty,
          title: 'РћР±СЂР°С‚РЅС‹Р№ РїРѕСЂСЏРґРѕРє СЃР»РѕРІ',
          prompt: `Р”Р°РЅР° СЃС‚СЂРѕРєР° text = ${quote(phrase)}. РЈР±РµСЂРё Р»РёС€РЅРёРµ РїСЂРѕР±РµР»С‹ Рё РІРµСЂРЅРё СЃР»РѕРІР° РІ РѕР±СЂР°С‚РЅРѕРј РїРѕСЂСЏРґРєРµ.`,
          signature: 'solve(text)',
          starterBody: ['// РћС‡РёСЃС‚Рё СЃС‚СЂРѕРєСѓ Рё СЂР°Р·РІРµСЂРЅРё СЃР»РѕРІР°'],
          solutionBody: [
            'const cleaned = text.trim().replace(/\\s+/g, " ");',
            'return cleaned.split(" ").reverse().join(" ");'
          ],
          hints: ['РЎРЅР°С‡Р°Р»Р° РЅРѕСЂРјР°Р»РёР·СѓР№ РїСЂРѕР±РµР»С‹, Р·Р°С‚РµРј РїРµСЂРµРІРµСЂРЅРё РјР°СЃСЃРёРІ СЃР»РѕРІ.', 'Р”Р»СЏ Р°СЂР°РЅР¶РёСЂРѕРІРєРё РїРѕРґРѕР№РґСѓС‚ `split`, `reverse` Рё `join`.'],
          explanation: 'Р­С‚Р° РІРµС‚РєР° РґР°РµС‚ С‚СЂРµРЅРёСЂРѕРІРєСѓ СЃС‚СЂРѕРє Рё РјР°СЃСЃРёРІРѕРІ: СЃРЅР°С‡Р°Р»Р° РјС‹ С‡РёСЃС‚РёРј С‚РµРєСЃС‚, Р° Р·Р°С‚РµРј РјРµРЅСЏРµРј РїРѕСЂСЏРґРѕРє СЃР»РѕРІ.',
          tests: [
            { args: [phrase], expected },
            { args: ['  one   two three  '], expected: 'three two one' }
          ],
          tags: ['strings', 'reverse']
        });
      }

      const email = sampleEmail(rng, sampleName(rng));
      const expected = (() => {
        const [local, domain] = email.split('@');
        const stars = '*'.repeat(Math.max(1, local.length - 2));
        return `${local[0]}${stars}${local.slice(-1)}@${domain}`;
      })();
      return buildTaskFromParts({
        category: 'functions',
        difficulty,
        title: 'Маска email',
        prompt: `Дан email = ${quote(email)}. Спрячь середину локальной части, оставив первую и последнюю буквы.`,
        signature: 'solve(email)',
        starterBody: ['// Замаскируй локальную часть email'],
        solutionBody: [
          'const [local, domain] = email.split("@");',
          'const stars = "*".repeat(Math.max(1, local.length - 2));',
          'return `${local[0]}${stars}${local.slice(-1)}@${domain}`;'
        ],
        hints: ['Раздели email по символу `@`.', 'Сохрани первую и последнюю буквы локальной части, середину замени звёздочками.'],
        explanation: 'Это типичная утилита для работы со строками, которая требует аккуратной индексации и обработки граничных случаев.',
        tests: [
          { args: [email], expected },
          { args: ['ada@example.com'], expected: 'a*a@example.com' }
        ],
        tags: ['strings', 'mask']
      });
    }
    case 'medium': {
      const variant = rng.int(0, 4);
      if (variant === 0) {
        const numbers = sampleNumbers(rng, rng.int(6, 8), 1, 20);
        const expected = numbers.map((value) => value + 1).filter((value) => value % 3 !== 0);
        return buildTaskFromParts({
          category: 'functions',
          difficulty,
          title: 'Карта и фильтрация',
          prompt: `Дан массив numbers = ${preview(numbers)} и две функции mapper и predicate. Верни массив: сначала примени mapper к каждому числу, затем оставь только значения, которые проходят predicate.`,
          signature: 'solve(numbers, mapper, predicate)',
          starterBody: ['// Используй переданные функции как инструменты'],
          solutionBody: [
            'return numbers',
            '  .map((value, index) => mapper(value, index))',
            '  .filter((value, index) => predicate(value, index));'
          ],
          hints: ['Удобно сделать это через цепочку `map` и `filter`.', 'Функции-аргументы можно вызывать как обычные переменные.'],
          explanation: 'Здесь функция выступает как универсальный инструмент, который комбинирует работу с массивом и колбэками.',
          tests: [
            {
              args: [
                numbers,
                { __fn: 'add', value: 1, key: 'mapper-add-1' },
                { __fn: 'predicateNotMultipleOf', divisor: 3, key: 'predicate-not-multiple-3' }
              ],
              expected
            },
            {
              args: [
                [1, 2, 3],
                { __fn: 'multiply', value: 10, key: 'mapper-times-10' },
                { __fn: 'predicateGreaterThan', value: 19, key: 'predicate-at-least-20' }
              ],
              expected: [20, 30]
            }
          ],
          tags: ['callbacks', 'array']
        });
      }

      if (variant === 1) {
        const users = samplePersons(rng, rng.int(4, 6)).map((person) => ({
          ...person,
          active: rng.bool(0.7)
        }));
        const threshold = rng.int(50, 75);
        const expected = users
          .filter((user) => user.active && user.score >= threshold)
          .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
          .map((user) => `${user.name}:${user.score}`);
        return buildTaskFromParts({
          category: 'functions',
          difficulty,
          title: 'Формат активных пользователей',
          prompt: `Дан массив users = ${preview(users)} и порог score = ${threshold}. Оставь активных пользователей с score не ниже порога, отсортируй их по score убыванию и верни строки "name:score".`,
          signature: 'solve(users, formatter, threshold)',
          starterBody: ['// Отфильтруй, отсортируй и отформатируй пользователей'],
          solutionBody: [
            'return users',
            '  .filter((user) => user.active && user.score >= threshold)',
            '  .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))',
            '  .map((user, index) => formatter(user, index));'
          ],
          hints: ['Сначала отфильтруй подходящие записи.', 'Потом отсортируй, а уже затем применяй функцию форматирования.'],
          explanation: 'Этот шаблон показывает, как функции-комбинации упрощают обработку списка объектов.',
          tests: [
            {
              args: [users, { __fn: 'formatUserScore', key: 'format-user-score' }, threshold],
              expected
            },
            {
              args: [
                [
                  { name: 'Ada', score: 90, active: true },
                  { name: 'Leo', score: 40, active: false },
                  { name: 'Mila', score: 85, active: true }
                ],
                { __fn: 'formatUserScore', key: 'format-user-score-2' },
                50
              ],
              expected: ['Ada:90', 'Mila:85']
            }
          ],
          tags: ['callbacks', 'objects']
        });
      }

      if (variant === 2) {
        const values = sampleWords(rng, rng.int(4, 6));
        const separator = rng.pick([' - ', ' | ', ' / ']);
        const expected = values.map((value) => value.toUpperCase()).join(separator);
        return buildTaskFromParts({
          category: 'functions',
          difficulty,
          title: 'Склейка и формат',
          prompt: `Дан массив values = ${preview(values)} и separator = ${quote(separator)}. Верни строку, где каждый элемент приведён к верхнему регистру и соединён через separator.`,
          signature: 'solve(values, formatter, separator)',
          starterBody: ['// Сначала преобразуй каждый элемент, потом склей их в строку'],
          solutionBody: [
            'return values',
            '  .map((value, index) => formatter(value, index))',
            '  .join(separator);'
          ],
          hints: ['Сначала вызови formatter для каждого элемента.', 'После map просто объедини результат через `join`.'],
          explanation: 'Такой шаблон тренирует обработку callback-функции и последующую сборку строки из массива.',
          tests: [
            {
              args: [values, { __fn: 'toUpperCase', key: 'format-upper' }, separator],
              expected
            },
            {
              args: [['a', 'b', 'c'], { __fn: 'appendSuffix', suffix: '!', key: 'format-suffix' }, ' '],
              expected: 'a! b! c!'
            }
          ],
          tags: ['map', 'join']
        });
      }

      if (variant === 3) {
        const categories = ['food', 'travel', 'books', 'tools'];
        const entries = Array.from({ length: rng.int(5, 7) }, () => ({
          category: rng.pick(categories),
          amount: rng.int(2, 30)
        }));
        const expected = entries.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] ?? 0) + item.amount;
          return acc;
        }, {});
        return buildTaskFromParts({
          category: 'functions',
          difficulty,
          title: 'Сумма по категориям',
          prompt: `Дан массив entries = ${preview(entries)}. Сложи amount отдельно для каждой category и верни объект итогов.`,
          signature: 'solve(entries)',
          starterBody: ['// Сложи значения по category и верни объект'],
          solutionBody: [
            'return entries.reduce((acc, item) => {',
            '  acc[item.category] = (acc[item.category] ?? 0) + item.amount;',
            '  return acc;',
            '}, {});'
          ],
          hints: ['`reduce` удобно использовать как сборщик итогов.', 'Для отсутствующего ключа подставляй `0`.'],
          explanation: 'Задача тренирует свёртку массива в объект-отчёт, где каждая категория накапливает свою сумму.',
          tests: [
            { args: [entries], expected },
            { args: [[{ category: 'food', amount: 5 }, { category: 'food', amount: 7 }, { category: 'travel', amount: 2 }]], expected: { food: 12, travel: 2 } }
          ],
          tags: ['reduce', 'grouping']
        });
      }

      const numbers = sampleNumbers(rng, rng.int(5, 7), 1, 12);
      const expected = numbers.reduce((acc, value, index) => acc + value * (index + 1), 0);
      return buildTaskFromParts({
        category: 'functions',
        difficulty,
        title: 'Сумма через колбэк',
        prompt: `Дан массив numbers = ${preview(numbers)} и функция transform. Примени transform к каждому числу и верни сумму результатов.`,
        signature: 'solve(numbers, transform)',
        starterBody: ['// Сначала преобразуй каждый элемент, потом суммируй'],
        solutionBody: [
          'return numbers.reduce((total, value, index) => {',
          '  return total + transform(value, index);',
          '}, 0);'
        ],
        hints: ['`reduce` умеет накапливать результат за один проход.', 'Второй аргумент колбэка `reduce` - это индекс элемента.'],
        explanation: 'Здесь функция выступает как набор правил для преобразования, а `reduce` собирает итоговое значение.',
        tests: [
          { args: [numbers, { __fn: 'weightedAdd', key: 'weighted-add-1' }], expected },
          { args: [[2, 4, 6], { __fn: 'weightedAdd', key: 'weighted-add-2' }], expected: 2 * 1 + 4 * 2 + 6 * 3 }
        ],
        tags: ['reduce', 'transform']
      });
    }
    case 'hard': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const funcs = [
          { __fn: 'add', value: 2, key: 'compose-add-2' },
          { __fn: 'multiply', value: 3, key: 'compose-multiply-3' },
          { __fn: 'subtract', value: 5, key: 'compose-subtract-5' }
        ];
        const composedExpected = funcs.reduceRight((value, fn) => {
          if (fn.__fn === 'add') {
            return value + fn.value;
          }
          if (fn.__fn === 'subtract') {
            return value - fn.value;
          }
          return value * fn.value;
        }, 4);
        return buildTaskFromParts({
          category: 'functions',
          difficulty,
          title: 'Композиция функций',
          prompt: 'Дан массив функций functions. Верни новую функцию, которая применяет их справа налево: последняя функция массива вызывается первой.',
          signature: 'solve(functions)',
          starterBody: [
            '// Верни функцию, которая применяет массив функций справа налево',
            '// Подсказка: reduceRight'
          ],
          solutionBody: [
            'return function composed(initialValue) {',
            '  return functions.reduceRight((value, fn) => fn(value), initialValue);',
            '};'
          ],
          hints: ['Справа налево удобнее идти через `reduceRight`.', 'Внутри возвращаемой функции обработай начальное значение.'],
          explanation: 'Это классическая композиция функций: одна функция строится на основе набора более простых.',
          strategy: 'closure',
          tests: [
            {
              args: [funcs],
              sequence: [{ input: [4], expected: composedExpected }]
            },
            {
              args: [[
                { __fn: 'add', value: 1, key: 'compose-add-1' },
                { __fn: 'multiply', value: 2, key: 'compose-multiply-2' }
              ]],
              sequence: [{ input: [3], expected: 7 }]
            }
          ],
          tags: ['compose', 'higher-order']
        });
      }

      if (variant === 1) {
        return buildTaskFromParts({
          category: 'functions',
          difficulty,
          title: 'Ограниченный вызов',
          prompt: 'Верни обёртку, которая вызывает fn только первые limit раз. После этого продолжай возвращать последний результат, не вызывая fn снова.',
          signature: 'solve(fn, limit)',
          starterBody: [
            'let calls = 0;',
            'let lastResult;',
            'return function limited(...args) {',
            '  // TODO',
            '};'
          ],
          solutionBody: [
            'let calls = 0;',
            'let lastResult;',
            'return function limited(...args) {',
            '  if (calls < limit) {',
            '    lastResult = fn(...args);',
            '    calls += 1;',
            '  }',
            '  return lastResult;',
            '};'
          ],
          hints: ['Нужно сохранить число вызовов и последний результат в замыкании.', 'После достижения лимита не трогай `fn`, а просто возвращай сохранённое значение.'],
          explanation: 'Это полезный шаблон для ограничителей, кэшей и любых обёрток, которым нужно помнить прошлое состояние.',
          strategy: 'closure',
          tests: [
            {
              args: [{ __fn: 'spyMultiply', value: 2, key: 'limited-spy' }, 2],
              sequence: [
                { input: [3], expected: 6 },
                { input: [4], expected: 8 },
                { input: [10], expected: 8 }
              ],
              expectCalls: { 'limited-spy': 2 }
            }
          ],
          tags: ['closure', 'limit']
        });
      }

      const pairs = [
        { __fn: 'add', value: 1, key: 'wrap-add-1' },
        { __fn: 'multiply', value: 2, key: 'wrap-mul-2' },
        { __fn: 'subtract', value: 3, key: 'wrap-sub-3' }
      ];
      const expectedTrace = [5];
      let cursor = 5;
      for (const step of pairs) {
        if (step.__fn === 'add') {
          cursor += step.value;
        } else if (step.__fn === 'subtract') {
          cursor -= step.value;
        } else {
          cursor *= step.value;
        }
        expectedTrace.push(cursor);
      }
      return buildTaskFromParts({
        category: 'functions',
        difficulty,
        title: 'Трассировка цепочки',
        prompt: 'Дан массив функций functions. Верни функцию, которая применяет их слева направо и возвращает объект { value, trace } с промежуточными значениями.',
        signature: 'solve(functions)',
        starterBody: ['// Верни функцию, которая собирает trace значений'],
        solutionBody: [
          'return function traced(initialValue) {',
          '  const trace = [initialValue];',
          '  let value = initialValue;',
          '  for (const fn of functions) {',
          '    value = fn(value);',
          '    trace.push(value);',
          '  }',
          '  return { value, trace };',
          '};'
        ],
        hints: ['Сохраняй каждое промежуточное значение в отдельный массив.', 'Итоговый объект может содержать и финальное значение, и trace.'],
        explanation: 'Такой вариант полезен, когда надо не просто вычислить результат, а показать путь вычисления по шагам.',
        strategy: 'closure',
        tests: [
          { args: [pairs], sequence: [{ input: [5], expected: { value: cursor, trace: expectedTrace } }] },
          { args: [[{ __fn: 'add', value: 1, key: 'trace-add-1' }, { __fn: 'add', value: 2, key: 'trace-add-2' }]], sequence: [{ input: [0], expected: { value: 3, trace: [0, 1, 3] } }] }
        ],
        tags: ['trace', 'pipeline']
      });
    }
    case 'expert': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const pipelineA = [
          { __fn: 'add', value: 1, key: 'pipeline-a-add-1' },
          { __fn: 'asyncMultiply', value: 2, key: 'pipeline-a-async-mul-2' },
          { __fn: 'subtract', value: 3, key: 'pipeline-a-sub-3' }
        ];
        const pipelineB = [
          { __fn: 'asyncAdd', value: 5, key: 'pipeline-b-async-add-5' },
          { __fn: 'multiply', value: 4, key: 'pipeline-b-mul-4' }
        ];
        return buildTaskFromParts({
          category: 'functions',
          difficulty,
          title: 'Асинхронный pipeline',
          prompt: 'Дан массив функций functions. Верни асинхронную функцию, которая применяет их слева направо и ждёт Promise на каждом шаге.',
          signature: 'solve(functions)',
          starterBody: [
            '// Верни async-функцию pipeline',
            '// Она должна поддерживать как sync, так и async колбэки'
          ],
          solutionBody: [
            'return async function pipeline(initialValue) {',
            '  let value = initialValue;',
            '  for (const fn of functions) {',
            '    value = await fn(value);',
            '  }',
            '  return value;',
            '};'
          ],
          hints: ['Обрабатывай функции в исходном порядке.', 'Используй `await` для каждого шага, даже если функция синхронная.'],
          explanation: 'Экспертная задача расширяет композицию на случай Promise. Такой pipeline пригодится в реальных приложениях.',
          strategy: 'closure',
          tests: [
            { args: [pipelineA], sequence: [{ input: [10], expected: 19 }] },
            { args: [pipelineB], sequence: [{ input: [2], expected: 28 }] }
          ],
          tags: ['async', 'pipeline']
        });
      }

      if (variant === 1) {
        return buildTaskFromParts({
          category: 'functions',
          difficulty,
          title: 'История применения',
          prompt: 'Верни объект с методами apply(transform), undo(), redo() и current(). Метод apply должен применять функцию к текущему значению и сохранять историю, а undo/redo должны перемещаться по этой истории.',
          signature: 'solve(initialValue)',
          starterBody: [
            'let current = initialValue;',
            'const undoStack = [];',
            'const redoStack = [];',
            'return {',
            '  apply(transform) {',
            '    // TODO',
            '  },',
            '  undo() {',
            '    // TODO',
            '  },',
            '  redo() {',
            '    // TODO',
            '  },',
            '  current() {',
            '    // TODO',
            '  }',
            '};'
          ],
          solutionBody: [
            'let current = initialValue;',
            'const undoStack = [];',
            'const redoStack = [];',
            'return {',
            '  apply(transform) {',
            '    undoStack.push(current);',
            '    current = transform(current);',
            '    redoStack.length = 0;',
            '    return current;',
            '  },',
            '  undo() {',
            '    if (undoStack.length === 0) {',
            '      return current;',
            '    }',
            '    redoStack.push(current);',
            '    current = undoStack.pop();',
            '    return current;',
            '  },',
            '  redo() {',
            '    if (redoStack.length === 0) {',
            '      return current;',
            '    }',
            '    undoStack.push(current);',
            '    current = redoStack.pop();',
            '    return current;',
            '  },',
            '  current() {',
            '    return current;',
            '  }',
            '};'
          ],
          hints: ['Храни отдельные стеки для отмены и повтора.', 'Любой новый `apply` должен очищать redo-историю.'],
          explanation: 'Такой объект полезен для редакторов, пошаговых трансформаций и любых интерфейсов с откатом изменений.',
          strategy: 'closure',
          tests: [
            {
              args: [5],
              sequence: [
                { method: 'apply', input: [{ __fn: 'add', value: 3, key: 'history-add-3' }], expected: 8 },
                { method: 'apply', input: [{ __fn: 'multiply', value: 2, key: 'history-mul-2' }], expected: 16 },
                { method: 'undo', expected: 8 },
                { method: 'redo', expected: 16 },
                { method: 'current', expected: 16 }
              ]
            },
            {
              args: [1],
              sequence: [
                { method: 'apply', input: [{ __fn: 'add', value: 2, key: 'history-add-2' }], expected: 3 },
                { method: 'undo', expected: 1 },
                { method: 'apply', input: [{ __fn: 'multiply', value: 5, key: 'history-mul-5' }], expected: 5 },
                { method: 'redo', expected: 5 }
              ]
            }
          ],
          tags: ['history', 'state']
        });
      }

      const stages = [
        { __fn: 'add', value: 3, key: 'trace-add-3' },
        { __fn: 'multiply', value: 2, key: 'trace-multiply-2' },
        { __fn: 'subtract', value: 4, key: 'trace-subtract-4' }
      ];
      const expectedTrace = [5];
      let value = 5;
      for (const step of stages) {
        if (step.__fn === 'add') {
          value += step.value;
        } else if (step.__fn === 'subtract') {
          value -= step.value;
        } else {
          value *= step.value;
        }
        expectedTrace.push(value);
      }
      return buildTaskFromParts({
        category: 'functions',
        difficulty,
        title: 'Трассировка pipeline',
        prompt: 'Дан массив функций functions. Верни функцию, которая применяет их слева направо и возвращает объект { value, trace } с промежуточными значениями.',
        signature: 'solve(functions)',
        starterBody: ['// Верни функцию, которая собирает trace значений'],
        solutionBody: [
          'return function traced(initialValue) {',
          '  const trace = [initialValue];',
          '  let current = initialValue;',
          '  for (const fn of functions) {',
          '    current = fn(current);',
          '    trace.push(current);',
          '  }',
          '  return { value: current, trace };',
          '};'
        ],
        hints: ['Сохраняй каждое промежуточное значение в отдельный массив.', 'Итоговый объект может содержать и финальное значение, и trace.'],
        explanation: 'Такой вариант полезен, когда надо не просто вычислить результат, а показать путь вычисления по шагам.',
        strategy: 'closure',
        tests: [
          { args: [stages], sequence: [{ input: [5], expected: { value, trace: expectedTrace } }] },
          { args: [[{ __fn: 'add', value: 1, key: 'trace-add-1' }, { __fn: 'add', value: 2, key: 'trace-add-2' }]], sequence: [{ input: [0], expected: { value: 3, trace: [0, 1, 3] } }] }
        ],
        tags: ['trace', 'pipeline']
      });
    }
    default:
      return buildFunctionsTask('easy', rng);
  }
}

function buildClosuresTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const start = rng.int(0, 10);
        const step = rng.int(1, 4);
        return buildTaskFromParts({
          category: 'closures',
          difficulty,
          title: 'Счётчик',
          prompt: `Верни функцию-счётчик, которая начинается с ${start} и на каждом вызове прибавляет ${step}. Первый вызов должен вернуть текущее значение, а затем увеличить его.`,
          signature: 'solve(start, step)',
          starterBody: [
            'let current = start;',
            'return function next() {',
            '  // TODO',
            '};'
          ],
          solutionBody: [
            'let current = start;',
            'return function next() {',
            '  const value = current;',
            '  current += step;',
            '  return value;',
            '};'
          ],
          hints: ['Нужна переменная во внешней области видимости.', 'Возвращаемая функция должна менять и читать это состояние.'],
          explanation: 'Замыкание позволяет внутренней функции помнить значение между вызовами, не вынося его наружу.',
          strategy: 'closure',
          tests: [
            {
              args: [start, step],
              sequence: [
                { input: [], expected: start },
                { input: [], expected: start + step },
                { input: [], expected: start + step * 2 }
              ]
            },
            {
              args: [2, 3],
              sequence: [
                { input: [], expected: 2 },
                { input: [], expected: 5 }
              ]
            }
          ],
          tags: ['counter', 'state']
        });
      }

      if (variant === 1) {
        return buildTaskFromParts({
          category: 'closures',
          difficulty,
          title: 'Переключатель значений',
          prompt: 'Верни функцию, которая поочерёдно возвращает first и second. Первый вызов должен вернуть first, второй - second, затем снова first.',
          signature: 'solve(first, second)',
          starterBody: [
            'let useFirst = true;',
            'return function next() {',
            '  // TODO',
            '};'
          ],
          solutionBody: [
            'let useFirst = true;',
            'return function next() {',
            '  const value = useFirst ? first : second;',
            '  useFirst = !useFirst;',
            '  return value;',
            '};'
          ],
          hints: ['Храни только флаг переключения в замыкании.', 'Первый вызов должен вернуть первый аргумент.'],
          explanation: 'Простой переключатель показывает, как замыкание удерживает минимальное состояние без лишних структур.',
          strategy: 'closure',
          tests: [
            {
              args: ['left', 'right'],
              sequence: [
                { input: [], expected: 'left' },
                { input: [], expected: 'right' },
                { input: [], expected: 'left' }
              ]
            },
            {
              args: [1, 2],
              sequence: [
                { input: [], expected: 1 },
                { input: [], expected: 2 },
                { input: [], expected: 1 }
              ]
            }
          ],
          tags: ['toggle', 'state']
        });
      }

      const items = sampleWords(rng, rng.int(3, 5));
      return buildTaskFromParts({
        category: 'closures',
        difficulty,
        title: 'Циклический выбор',
        prompt: `Верни функцию, которая по очереди возвращает элементы массива items = ${preview(items)} и после конца начинает сначала.`,
        signature: 'solve(items)',
        starterBody: [
          'let index = 0;',
          'return function next() {',
          '  // TODO',
          '};'
        ],
        solutionBody: [
          'let index = 0;',
          'return function next() {',
          '  const value = items[index];',
          '  index = (index + 1) % items.length;',
          '  return value;',
          '};'
        ],
        hints: ['Индекс можно двигать по кругу через `% items.length`.', 'Функция должна помнить, на каком элементе она остановилась.'],
        explanation: 'Это замыкание удобно для ротации по списку значений без внешнего состояния.',
        strategy: 'closure',
        tests: [
          {
            args: [items],
            sequence: [
              { input: [], expected: items[0] },
              { input: [], expected: items[1] },
              { input: [], expected: items[2 % items.length] }
            ]
          },
          {
            args: [['a', 'b']],
            sequence: [
              { input: [], expected: 'a' },
              { input: [], expected: 'b' },
              { input: [], expected: 'a' }
            ]
          }
        ],
        tags: ['cycle', 'state']
      });
    }
    case 'medium': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        return buildTaskFromParts({
          category: 'closures',
          difficulty,
          title: 'Мемоизация',
          prompt: 'Дана функция fn. Верни обёртку, которая кэширует результат по набору аргументов и не вызывает fn повторно для одинакового вызова.',
          signature: 'solve(fn)',
          starterBody: [
            'const cache = new Map();',
            'return function memoized(...args) {',
            '  // TODO',
            '};'
          ],
          solutionBody: [
            'const cache = new Map();',
            'return function memoized(...args) {',
            '  const key = JSON.stringify(args);',
            '  if (cache.has(key)) {',
            '    return cache.get(key);',
            '  }',
            '  const result = fn(...args);',
            '  cache.set(key, result);',
            '  return result;',
            '};'
          ],
          hints: ['Нужен словарь для результатов.', 'Ключ можно собрать из `JSON.stringify(args)`.'],
          explanation: 'Кэширование через замыкание позволяет хранить состояние без глобальных переменных.',
          strategy: 'closure',
          tests: [
            {
              args: [{ __fn: 'spyMultiply', value: 10, key: 'memo-spy' }],
              sequence: [
                { input: [2], expected: 20 },
                { input: [2], expected: 20 },
                { input: [3], expected: 30 }
              ],
              expectCalls: { 'memo-spy': 2 }
            },
            {
              args: [{ __fn: 'collector', key: 'memo-collect' }],
              sequence: [
                { input: ['x'], expected: undefined },
                { input: ['x'], expected: undefined }
              ],
              expectCalls: { 'memo-collect': 1 }
            }
          ],
          tags: ['cache', 'memoize']
        });
      }

      if (variant === 1) {
        return buildTaskFromParts({
          category: 'closures',
          difficulty,
          title: 'Сумма по ключам',
          prompt: 'Верни функцию add(category, amount), которая хранит сумму отдельно для каждой category и возвращает текущий итог по этой категории.',
          signature: 'solve()',
          starterBody: [
            'const totals = new Map();',
            'return function add(category, amount) {',
            '  // TODO',
            '};'
          ],
          solutionBody: [
            'const totals = new Map();',
            'return function add(category, amount) {',
            '  const next = (totals.get(category) ?? 0) + amount;',
            '  totals.set(category, next);',
            '  return next;',
            '};'
          ],
          hints: ['Для каждого ключа нужен свой счётчик.', 'Map удобен, когда ключей может быть много и они приходят динамически.'],
          explanation: 'Замыкание позволяет построить небольшой агрегатор, который помнит суммы по разным категориям между вызовами.',
          strategy: 'closure',
          tests: [
            {
              args: [],
              sequence: [
                { input: ['food', 3], expected: 3 },
                { input: ['food', 2], expected: 5 },
                { input: ['travel', 7], expected: 7 },
                { input: ['food', 1], expected: 6 }
              ]
            }
          ],
          tags: ['map', 'aggregation']
        });
      }

      return buildTaskFromParts({
        category: 'closures',
        difficulty,
        title: 'Сборщик уникальных значений',
        prompt: 'Верни функцию add(value), которая запоминает только уникальные значения и после каждого вызова возвращает массив уже увиденных элементов.',
        signature: 'solve()',
        starterBody: [
          'const seen = new Set();',
          'return function add(value) {',
          '  // TODO',
          '};'
        ],
        solutionBody: [
          'const seen = new Set();',
          'return function add(value) {',
          '  seen.add(value);',
          '  return Array.from(seen);',
          '};'
        ],
        hints: ['`Set` автоматически убирает дубликаты.', 'После добавления можно вернуть копию массива из `Set`.'],
        explanation: 'Такой формат часто используют для уникальных списков тегов, фильтров и истории действий.',
        strategy: 'closure',
        tests: [
          {
            args: [],
            sequence: [
              { method: 'call', input: ['a'], expected: ['a'] },
              { method: 'call', input: ['b'], expected: ['a', 'b'] },
              { method: 'call', input: ['a'], expected: ['a', 'b'] }
            ]
          }
        ],
        tags: ['unique', 'set']
      });
    }
    case 'hard': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const initial = sampleWords(rng, 3);
        return buildTaskFromParts({
          category: 'closures',
          difficulty,
          title: 'Фабрика стека',
          prompt: `Верни объект-стек на основе начального массива initial = ${preview(initial)}. Объект должен иметь методы push(value), pop(), peek(), size() и reset().`,
          signature: 'solve(initial)',
          starterBody: [
            'let stack = Array.isArray(initial) ? initial.slice() : [];',
            'return {',
            '  push(value) {',
            '    // TODO',
            '  },',
            '  pop() {',
            '    // TODO',
            '  },',
            '  peek() {',
            '    // TODO',
            '  },',
            '  size() {',
            '    // TODO',
            '  },',
            '  reset() {',
            '    // TODO',
            '  }',
            '};'
          ],
          solutionBody: [
            'let stack = Array.isArray(initial) ? initial.slice() : [];',
            'return {',
            '  push(value) {',
            '    stack.push(value);',
            '    return stack.length;',
            '  },',
            '  pop() {',
            '    return stack.pop() ?? null;',
            '  },',
            '  peek() {',
            '    return stack.length > 0 ? stack[stack.length - 1] : null;',
            '  },',
            '  size() {',
            '    return stack.length;',
            '  },',
            '  reset() {',
            '    stack = [];',
            '    return stack.length;',
            '  }',
            '};'
          ],
          hints: ['Состояние стека должно жить в замыкании.', 'Методы объекта будут работать с одной и той же скрытой переменной.'],
          explanation: 'Тут замыкание используется для хранения структуры данных, недоступной снаружи напрямую.',
          strategy: 'closure',
          tests: [
            {
              args: [initial],
              sequence: [
                { method: 'size', expected: initial.length },
                { method: 'peek', expected: initial[initial.length - 1] },
                { method: 'push', input: ['extra'], expected: initial.length + 1 },
                { method: 'pop', expected: 'extra' },
                { method: 'reset', expected: 0 }
              ]
            },
            {
              args: [[1, 2]],
              sequence: [
                { method: 'push', input: [3], expected: 3 },
                { method: 'peek', expected: 3 },
                { method: 'size', expected: 3 }
              ]
            }
          ],
          tags: ['stack', 'methods']
        });
      }

      if (variant === 1) {
        return buildTaskFromParts({
          category: 'closures',
          difficulty,
          title: 'Лимит по ключам',
          prompt: 'Верни объект с методами allow(key), remaining(key) и reset(key). Каждый key можно использовать не более limit раз.',
          signature: 'solve(limit)',
          starterBody: [
            'const usage = new Map();',
            'return {',
            '  allow(key) {',
            '    // TODO',
            '  },',
            '  remaining(key) {',
            '    // TODO',
            '  },',
            '  reset(key) {',
            '    // TODO',
            '  }',
            '};'
          ],
          solutionBody: [
            'const usage = new Map();',
            'return {',
            '  allow(key) {',
            '    const used = usage.get(key) ?? 0;',
            '    if (used >= limit) {',
            '      return false;',
            '    }',
            '    usage.set(key, used + 1);',
            '    return true;',
            '  },',
            '  remaining(key) {',
            '    return Math.max(0, limit - (usage.get(key) ?? 0));',
            '  },',
            '  reset(key) {',
            '    if (typeof key === "undefined") {',
            '      usage.clear();',
            '    } else {',
            '      usage.delete(key);',
            '    }',
            '    return limit;',
            '  }',
            '};'
          ],
          hints: ['Map поможет учитывать счётчик отдельно для каждого ключа.', 'После сброса ключ должен снова иметь полный лимит.'],
          explanation: 'Это уже почти настоящий rate limiter: он хранит использование по ключам и позволяет сбрасывать счётчик точечно или целиком.',
          strategy: 'closure',
          tests: [
            {
              args: [2],
              sequence: [
                { method: 'allow', input: ['api'], expected: true },
                { method: 'allow', input: ['api'], expected: true },
                { method: 'allow', input: ['api'], expected: false },
                { method: 'remaining', input: ['api'], expected: 0 },
                { method: 'reset', input: ['api'], expected: 2 },
                { method: 'allow', input: ['api'], expected: true }
              ]
            },
            {
              args: [1],
              sequence: [
                { method: 'allow', input: ['x'], expected: true },
                { method: 'allow', input: ['y'], expected: true },
                { method: 'allow', input: ['x'], expected: false },
                { method: 'remaining', input: ['y'], expected: 0 }
              ]
            }
          ],
          tags: ['rate-limit', 'map']
        });
      }

      return buildTaskFromParts({
        category: 'closures',
        difficulty,
        title: 'Очередь действий',
        prompt: 'Верни объект-очередь с методами enqueue(value), dequeue(), peek(), size() и reset(). Первый добавленный элемент должен выходить первым.',
        signature: 'solve(initial)',
        starterBody: [
          'let queue = Array.isArray(initial) ? initial.slice() : [];',
          'return {',
          '  enqueue(value) {',
          '    // TODO',
          '  },',
          '  dequeue() {',
          '    // TODO',
          '  },',
          '  peek() {',
          '    // TODO',
          '  },',
          '  size() {',
          '    // TODO',
          '  },',
          '  reset() {',
          '    // TODO',
          '  }',
          '};'
        ],
        solutionBody: [
          'let queue = Array.isArray(initial) ? initial.slice() : [];',
          'return {',
          '  enqueue(value) {',
          '    queue.push(value);',
          '    return queue.length;',
          '  },',
          '  dequeue() {',
          '    return queue.shift() ?? null;',
          '  },',
          '  peek() {',
          '    return queue.length > 0 ? queue[0] : null;',
          '  },',
          '  size() {',
          '    return queue.length;',
          '  },',
          '  reset() {',
          '    queue = [];',
          '    return queue.length;',
          '  }',
          '};'
        ],
        hints: ['Для очереди нужен `shift`, а не `pop`.', 'Первые добавленные элементы должны выходить первыми.'],
        explanation: 'Очередь, как и стек, удобно инкапсулировать внутри замыкания, чтобы скрыть состояние от внешнего кода.',
        strategy: 'closure',
        tests: [
          {
            args: [[1, 2]],
            sequence: [
              { method: 'enqueue', input: [3], expected: 3 },
              { method: 'peek', expected: 1 },
              { method: 'dequeue', expected: 1 },
              { method: 'dequeue', expected: 2 },
              { method: 'size', expected: 1 }
            ]
          }
        ],
        tags: ['queue', 'methods']
      });
    }
    case 'expert': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        return buildTaskFromParts({
          category: 'closures',
          difficulty,
          title: 'Event bus',
          prompt: 'Верни объект event bus с методами on(event, handler), off(event, handler) и emit(event, payload). Подписчики одного события должны вызываться в порядке регистрации.',
          signature: 'solve()',
          starterBody: [
            'const listeners = new Map();',
            'return {',
            '  on(event, handler) {',
            '    // TODO',
            '  },',
            '  off(event, handler) {',
            '    // TODO',
            '  },',
            '  emit(event, payload) {',
            '    // TODO',
            '  }',
            '};'
          ],
          solutionBody: [
            'const listeners = new Map();',
            'return {',
            '  on(event, handler) {',
            '    if (!listeners.has(event)) {',
            '      listeners.set(event, []);',
            '    }',
            '    listeners.get(event).push(handler);',
            '  },',
            '  off(event, handler) {',
            '    const list = listeners.get(event);',
            '    if (!list) {',
            '      return;',
            '    }',
            '    const index = list.indexOf(handler);',
            '    if (index >= 0) {',
            '      list.splice(index, 1);',
            '    }',
            '  },',
            '  emit(event, payload) {',
            '    const list = listeners.get(event) || [];',
            '    for (const handler of list.slice()) {',
            '      handler(payload);',
            '    }',
            '    return list.length;',
            '  }',
            '};'
          ],
          hints: ['Используй `Map` для списка слушателей.', 'Не забывай копировать массив обработчиков перед обходом, если возможны изменения в процессе emit.'],
          explanation: 'Это полноценное применение замыкания: объект event bus хранит список подписчиков внутри скрытого состояния.',
          strategy: 'closure',
          tests: [
            {
              args: [],
              sequence: [
                { method: 'on', input: ['ping', { __fn: 'collector', key: 'bus-a' }] },
                { method: 'on', input: ['ping', { __fn: 'collector', key: 'bus-b' }] },
                { method: 'emit', input: ['ping', 'hello'], expected: 2 },
                { method: 'off', input: ['ping', { __fn: 'collector', key: 'bus-a' }] },
                { method: 'emit', input: ['ping', 'bye'], expected: 1 }
              ],
              expectCollected: {
                'bus-a': ['hello'],
                'bus-b': ['hello', 'bye']
              }
            }
          ],
          tags: ['event-bus', 'pubsub']
        });
      }

      if (variant === 1) {
        return buildTaskFromParts({
          category: 'closures',
          difficulty,
          title: 'Менеджер истории',
          prompt: 'Верни объект с методами set(value), undo(), redo() и current(). Новое set должно запоминать историю, а undo/redo - перемещаться по ней.',
          signature: 'solve(initialValue)',
          starterBody: [
            'let current = initialValue;',
            'const undoStack = [];',
            'const redoStack = [];',
            'return {',
            '  set(value) {',
            '    // TODO',
            '  },',
            '  undo() {',
            '    // TODO',
            '  },',
            '  redo() {',
            '    // TODO',
            '  },',
            '  current() {',
            '    // TODO',
            '  }',
            '};'
          ],
          solutionBody: [
            'let current = initialValue;',
            'const undoStack = [];',
            'const redoStack = [];',
            'return {',
            '  set(value) {',
            '    undoStack.push(current);',
            '    current = value;',
            '    redoStack.length = 0;',
            '    return current;',
            '  },',
            '  undo() {',
            '    if (undoStack.length === 0) {',
            '      return current;',
            '    }',
            '    redoStack.push(current);',
            '    current = undoStack.pop();',
            '    return current;',
            '  },',
            '  redo() {',
            '    if (redoStack.length === 0) {',
            '      return current;',
            '    }',
            '    undoStack.push(current);',
            '    current = redoStack.pop();',
            '    return current;',
            '  },',
            '  current() {',
            '    return current;',
            '  }',
            '};'
          ],
          hints: ['Нужно хранить прошлые и будущие состояния отдельно.', 'После нового `set` история redo должна очищаться.'],
          explanation: 'Такой менеджер похож на внутреннюю модель редактора: есть текущее значение, стек отмены и стек повтора.',
          strategy: 'closure',
          tests: [
            {
              args: [1],
              sequence: [
                { method: 'set', input: [2], expected: 2 },
                { method: 'set', input: [3], expected: 3 },
                { method: 'undo', expected: 2 },
                { method: 'redo', expected: 3 },
                { method: 'current', expected: 3 }
              ]
            },
            {
              args: [10],
              sequence: [
                { method: 'set', input: [20], expected: 20 },
                { method: 'undo', expected: 10 },
                { method: 'set', input: [99], expected: 99 },
                { method: 'redo', expected: 99 }
              ]
            }
          ],
          tags: ['history', 'undo']
        });
      }

      return buildTaskFromParts({
        category: 'closures',
        difficulty,
        title: 'Банковский счёт',
        prompt: 'Верни объект банковского счёта с методами deposit(amount), withdraw(amount), balance() и history(). История должна хранить все операции и итоговый баланс после каждой операции.',
        signature: 'solve(initialBalance)',
        starterBody: [
          'let balance = initialBalance;',
          'const history = [];',
          'return {',
          '  deposit(amount) {',
          '    // TODO',
          '  },',
          '  withdraw(amount) {',
          '    // TODO',
          '  },',
          '  balance() {',
          '    // TODO',
          '  },',
          '  history() {',
          '    // TODO',
          '  }',
          '};'
        ],
        solutionBody: [
          'let balance = initialBalance;',
          'const history = [];',
          'const snapshot = (type, amount) => {',
          '  history.push({ type, amount, balance });',
          '};',
          'return {',
          '  deposit(amount) {',
          '    balance += amount;',
          '    snapshot("deposit", amount);',
          '    return balance;',
          '  },',
          '  withdraw(amount) {',
          '    balance -= amount;',
          '    snapshot("withdraw", amount);',
          '    return balance;',
          '  },',
          '  balance() {',
          '    return balance;',
          '  },',
          '  history() {',
          '    return history.map((entry) => ({ ...entry }));',
          '  }',
          '};'
        ],
        hints: ['Храни баланс и историю внутри замыкания.', 'После каждой операции добавляй снимок состояния в history.'],
        explanation: 'Это удобная модель для инкапсуляции бизнес-логики: снаружи доступен только интерфейс, а состояние скрыто.',
        strategy: 'closure',
        tests: [
          {
            args: [100],
            sequence: [
              { method: 'deposit', input: [25], expected: 125 },
              { method: 'withdraw', input: [40], expected: 85 },
              { method: 'balance', expected: 85 },
              {
                method: 'history',
                expected: [
                  { type: 'deposit', amount: 25, balance: 125 },
                  { type: 'withdraw', amount: 40, balance: 85 }
                ]
              }
            ]
          }
        ],
        tags: ['bank', 'history']
      });
    }
    default:
      return buildClosuresTask('easy', rng);
  }
}

function buildAsyncTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const bonus = rng.int(3, 12);
        return buildTaskFromParts({
          category: 'async',
          difficulty,
          title: 'Дождаться результата',
          prompt: `Дана async-функция loadScore(). Дождись её и верни результат + ${bonus}.`,
          signature: 'solve(loadScore)',
          starterBody: [
            'const score = await loadScore();',
            `return score; // TODO: add the bonus`
          ],
          solutionBody: [
            'const score = await loadScore();',
            `return score + ${bonus};`
          ],
          hints: ['Нужно использовать `await`.', 'Сначала дождись `loadScore`, затем прибавь бонус.'],
          explanation: 'Это базовый сценарий для async/await: получить Promise и продолжить вычисление после его разрешения.',
          tests: [
            { args: [{ __fn: 'asyncValue', value: 10, key: 'load-score-a' }], expected: 10 + bonus },
            { args: [{ __fn: 'asyncValue', value: 25, key: 'load-score-b' }], expected: 25 + bonus }
          ],
          strategy: 'async',
          async: true,
          tags: ['await', 'promise']
        });
      }

      if (variant === 1) {
        const first = rng.int(1, 9);
        const second = rng.int(1, 9);
        return buildTaskFromParts({
          category: 'async',
          difficulty,
          title: 'Сумма двух загрузок',
          prompt: `Даны async-функции loadA и loadB. Дождись обеих и верни сумму их результатов: ${first} + ${second}.`,
          signature: 'solve(loadA, loadB)',
          starterBody: [
            'const a = await loadA();',
            'const b = await loadB();',
            'return a; // TODO: sum both values'
          ],
          solutionBody: [
            'const a = await loadA();',
            'const b = await loadB();',
            'return a + b;'
          ],
          hints: ['Нужно дождаться обеих асинхронных функций.', 'После await просто сложи два числа.'],
          explanation: 'Эта ветка учит базовой композиции async/await: получить два значения и объединить их в один результат.',
          tests: [
            { args: [{ __fn: 'asyncValue', value: first, key: 'sum-a' }, { __fn: 'asyncValue', value: second, key: 'sum-b' }], expected: first + second },
            { args: [{ __fn: 'asyncValue', value: 3, key: 'sum-c' }, { __fn: 'asyncValue', value: 4, key: 'sum-d' }], expected: 7 }
          ],
          strategy: 'async',
          async: true,
          tags: ['await', 'sum']
        });
      }

      return buildTaskFromParts({
        category: 'async',
        difficulty,
        title: 'Профиль пользователя',
        prompt: 'Дана async-функция loadUser(). Дождись пользователя и верни строку "name from city" в верхнем регистре для имени.',
        signature: 'solve(loadUser)',
        starterBody: [
          'const user = await loadUser();',
          '// TODO: return formatted profile'
        ],
        solutionBody: [
          'const user = await loadUser();',
          'return `${user.name.toUpperCase()} from ${user.city}`;'
        ],
        hints: ['`await` вернёт объект пользователя.', 'Имя можно преобразовать через `toUpperCase`.'],
        explanation: 'Задача показывает, как из resolved Promise сразу собрать пользовательский вывод.',
        tests: [
          { args: [{ __fn: 'asyncValue', value: { name: 'Ada', city: 'Oslo' }, key: 'load-user-a' }], expected: 'ADA from Oslo' },
          { args: [{ __fn: 'asyncValue', value: { name: 'Leo', city: 'Tokyo' }, key: 'load-user-b' }], expected: 'LEO from Tokyo' }
        ],
        strategy: 'async',
        async: true,
        tags: ['await', 'string']
      });
    }
    case 'medium': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        return buildTaskFromParts({
          category: 'async',
          difficulty,
          title: 'Параллельная загрузка',
          prompt: 'Даны две async-функции loadName и loadBonus. Выполни их параллельно и верни объект { name, bonus }.',
          signature: 'solve(loadName, loadBonus)',
          starterBody: [
            'const [name, bonus] = await Promise.all([loadName(), loadBonus()]);',
            'return { name, bonus: 0 }; // TODO: return the real bonus'
          ],
          solutionBody: [
            'const [name, bonus] = await Promise.all([loadName(), loadBonus()]);',
            'return { name, bonus };'
          ],
          hints: ['`Promise.all` запускает задачи одновременно.', 'После ожидания просто собери объект.'],
          explanation: 'Средний уровень показывает, как объединять несколько Promise и собирать результаты без лишних задержек.',
          tests: [
            {
              args: [
                { __fn: 'asyncValue', value: 'Ada', key: 'load-name-a' },
                { __fn: 'asyncValue', value: 7, key: 'load-bonus-a' }
              ],
              expected: { name: 'Ada', bonus: 7 }
            },
            {
              args: [
                { __fn: 'asyncValue', value: 'Leo', key: 'load-name-b' },
                { __fn: 'asyncValue', value: 12, key: 'load-bonus-b' }
              ],
              expected: { name: 'Leo', bonus: 12 }
            }
          ],
          strategy: 'async',
          async: true,
          tags: ['promise.all', 'parallel']
        });
      }

      if (variant === 1) {
        return buildTaskFromParts({
          category: 'async',
          difficulty,
          title: 'Первый успешный loader',
          prompt: 'Дан массив async-функций loaders. Вызывай их по порядку и верни первый успешный результат. Если все упали, пробрось последнюю ошибку.',
          signature: 'solve(loaders)',
          starterBody: [
            'let lastError = null;',
            'for (const loader of loaders) {',
            '  // TODO: try loaders in order',
            '}',
            'throw lastError;'
          ],
          solutionBody: [
            'let lastError = null;',
            'for (const loader of loaders) {',
            '  try {',
            '    return await loader();',
            '  } catch (error) {',
            '    lastError = error;',
            '  }',
            '}',
            'throw lastError;'
          ],
          hints: ['Идти нужно по порядку, но останавливаться на первом успехе.', 'Запоминай последнюю ошибку, чтобы пробросить её если все варианты не подошли.'],
          explanation: 'Этот шаблон полезен для fallback-логики, когда источники нужно пробовать по очереди до первого удачного ответа.',
          tests: [
            {
              args: [[
                { __fn: 'asyncReject', error: 'bad-a', key: 'loader-a' },
                { __fn: 'asyncValue', value: 'ok', key: 'loader-b' },
                { __fn: 'asyncValue', value: 'late', key: 'loader-c' }
              ]],
              expected: 'ok'
            },
            {
              args: [[
                { __fn: 'asyncReject', error: 'first', key: 'loader-d' },
                { __fn: 'asyncReject', error: 'second', key: 'loader-e' }
              ]],
              expectedError: 'second'
            }
          ],
          strategy: 'async',
          async: true,
          tags: ['fallback', 'sequential']
        });
      }

      return buildTaskFromParts({
        category: 'async',
        difficulty,
        title: 'Собрать успешные результаты',
        prompt: 'Дан массив async-функций loaders. Дождись всех через allSettled и верни только успешные значения в исходном порядке.',
        signature: 'solve(loaders)',
        starterBody: [
          'const settled = await Promise.allSettled(loaders.map((loader) => loader()));',
          '// TODO: keep only fulfilled values'
        ],
        solutionBody: [
          'const settled = await Promise.allSettled(loaders.map((loader) => loader()));',
          'return settled.filter((item) => item.status === "fulfilled").map((item) => item.value);'
        ],
        hints: ['`allSettled` не падает, даже если часть промисов отклонится.', 'Отфильтруй только элементы со статусом `fulfilled`.'],
        explanation: 'Этот шаблон полезен, когда нужно собрать частичный результат и не потерять успешные элементы из-за ошибки одного шага.',
        tests: [
          {
            args: [
              [
                { __fn: 'asyncValue', value: 'Ada', key: 'settled-a' },
                { __fn: 'asyncReject', error: 'bad', key: 'settled-b' },
                { __fn: 'asyncValue', value: 'Mila', key: 'settled-c' }
              ]
            ],
            expected: ['Ada', 'Mila']
          },
          {
            args: [
              [
                { __fn: 'asyncValue', value: 1, key: 'settled-d' },
                { __fn: 'asyncValue', value: 2, key: 'settled-e' }
              ]
            ],
            expected: [1, 2]
          }
        ],
        strategy: 'async',
        async: true,
        tags: ['allSettled', 'filter']
      });
    }
    case 'hard': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const retries = rng.int(2, 4);
        return buildTaskFromParts({
          category: 'async',
          difficulty,
          title: 'Retry helper',
          prompt: `Дана async-функция fetcher. Попробуй вызвать её до ${retries + 1} раз, пока она не вернёт успех. Если все попытки провалились, пробрось последнюю ошибку.`,
          signature: 'solve(fetcher, retries)',
          starterBody: [
            'let lastError = null;',
            'for (let attempt = 0; attempt <= retries; attempt += 1) {',
            '  try {',
            '    // TODO: call fetcher(attempt) and return the first successful result',
            '  } catch (error) {',
            '    lastError = error;',
            '  }',
            '}',
            'throw lastError;'
          ],
          solutionBody: [
            'let lastError = null;',
            'for (let attempt = 0; attempt <= retries; attempt += 1) {',
            '  try {',
            '    return await fetcher(attempt);',
            '  } catch (error) {',
            '    lastError = error;',
            '  }',
            '}',
            'throw lastError;'
          ],
          hints: ['Сделай цикл по попыткам.', 'Ошибка последней неудачи должна сохраниться и быть брошена после всех попыток.'],
          explanation: 'Задача учит строить устойчивую асинхронную логику с повторными попытками и корректной обработкой ошибок.',
          tests: [
            {
              args: [{ __fn: 'flakyAsync', failTimes: 2, value: 'ok-3', error: 'fail', key: 'retry-flaky' }, 4],
              expected: 'ok-3'
            },
            {
              args: [{ __fn: 'flakyAsync', failTimes: 99, value: 'never', error: 'boom', key: 'retry-fail' }, 1],
              expectedError: 'boom'
            }
          ],
          strategy: 'async',
          async: true,
          tags: ['retry', 'error-handling']
        });
      }

      if (variant === 1) {
        const steps = [
          { __fn: 'asyncAdd', value: rng.int(2, 5), key: 'pipeline-async-add' },
          { __fn: 'multiply', value: rng.int(2, 4), key: 'pipeline-multiply' },
          { __fn: 'asyncMultiply', value: rng.int(2, 4), key: 'pipeline-async-multiply' }
        ];
        const expected = ((value) => {
          let current = 5;
          for (const step of steps) {
            if (step.__fn === 'asyncAdd') {
              current += step.value;
            } else if (step.__fn === 'asyncMultiply') {
              current *= step.value;
            } else {
              current *= step.value;
            }
          }
          return current;
        })();
        return buildTaskFromParts({
          category: 'async',
          difficulty,
          title: 'Async pipeline',
          prompt: 'Дан массив async/sync шагов. Последовательно применяй каждый шаг к текущему значению и верни итог.',
          signature: 'solve(steps, initialValue)',
          starterBody: [
            'let value = initialValue;',
            'for (const step of steps) {',
            '  // TODO',
            '}',
            'return value;'
          ],
          solutionBody: [
            'let value = initialValue;',
            'for (const step of steps) {',
            '  value = await step(value);',
            '}',
            'return value;'
          ],
          hints: ['На каждом шаге бери результат предыдущего шага.', 'Даже синхронные функции можно спокойно `await`-ить.'],
          explanation: 'Последовательный pipeline полезен, когда каждый следующий async-этап зависит от результата предыдущего.',
          tests: [
            {
              args: [steps, 5],
              expected: expected
            },
            {
              args: [[
                { __fn: 'add', value: 1, key: 'pipeline-add-1' },
                { __fn: 'asyncMultiply', value: 2, key: 'pipeline-async-mul-2' },
                { __fn: 'subtract', value: 4, key: 'pipeline-sub-4' }
              ], 3],
              expected: 4
            }
          ],
          strategy: 'async',
          async: true,
          tags: ['pipeline', 'sequence']
        });
      }

      const timeoutMs = rng.int(15, 40);
      return buildTaskFromParts({
        category: 'async',
        difficulty,
        title: 'Тайм-аут ожидания',
        prompt: `Дана async-функция fetcher. Верни её результат, но если она не успела за ${timeoutMs} мс, отклони Promise с ошибкой timeout.`,
        signature: 'solve(fetcher, timeoutMs)',
        starterBody: [
          'return fetcher(); // TODO: enforce timeout'
        ],
        solutionBody: [
          'return Promise.race([',
          '  Promise.resolve().then(() => fetcher()),',
          '  new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs))',
          ']);'
        ],
        hints: ['`Promise.race` возвращает первый завершившийся Promise.', 'Для тайм-аута подойдёт `setTimeout` и `reject(new Error("timeout"))`.'],
        explanation: 'Такой помощник нужен для сетевых запросов и любых задач, которые не должны зависать бесконечно.',
        tests: [
          {
            args: [
              { __fn: 'delayedValue', value: 'fast', delay: 1, key: 'timeout-fast' },
              20
            ],
            expected: 'fast'
          },
          {
            args: [
              { __fn: 'delayedValue', value: 'slow', delay: 40, key: 'timeout-slow' },
              5
            ],
            expectedError: 'timeout'
          }
        ],
        strategy: 'async',
        async: true,
        tags: ['race', 'timeout']
      });
    }
    case 'expert': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const limit = rng.int(2, 3);
        return buildTaskFromParts({
          category: 'async',
          difficulty,
          title: 'Ограничение concurrency',
          prompt: `Дан массив async-джобов jobs. Верни Promise с результатами в исходном порядке, но одновременно должно выполняться не больше ${limit} задач.`,
          signature: 'solve(jobs, limit)',
          starterBody: [
        'return null; // TODO: enforce the concurrency limit'
          ],
          solutionBody: [
            'return new Promise((resolve, reject) => {',
            '  const results = new Array(jobs.length);',
            '  let nextIndex = 0;',
            '  let active = 0;',
            '  const launch = () => {',
            '    if (nextIndex >= jobs.length && active === 0) {',
            '      resolve(results);',
            '      return;',
            '    }',
            '    while (active < limit && nextIndex < jobs.length) {',
            '      const index = nextIndex;',
            '      nextIndex += 1;',
            '      active += 1;',
            '      Promise.resolve()',
            '        .then(() => jobs[index]())',
            '        .then((value) => {',
            '          results[index] = value;',
            '          active -= 1;',
            '          launch();',
            '        }, reject);',
            '    }',
            '  };',
            '  launch();',
            '});'
          ],
          hints: ['Храни очередь индексов и число активных задач.', 'Когда задача завершается, запускай следующую.', 'Порядок результатов должен совпадать с исходным массивом.'],
          explanation: 'Экспертная задача проверяет умение управлять очередью Promise и сохранять порядок результатов при ограниченной параллельности.',
          tests: [
            {
              args: [
                [
                  { __fn: 'delayedValue', value: 'A', delay: 2, key: 'job-a' },
                  { __fn: 'delayedValue', value: 'B', delay: 1, key: 'job-b' },
                  { __fn: 'asyncValue', value: 'C', key: 'job-c' }
                ],
                limit
              ],
              expected: ['A', 'B', 'C']
            },
            {
              args: [
                [
                  { __fn: 'asyncValue', value: 1, key: 'job-1' },
                  { __fn: 'asyncValue', value: 2, key: 'job-2' },
                  { __fn: 'asyncValue', value: 3, key: 'job-3' },
                  { __fn: 'asyncValue', value: 4, key: 'job-4' }
                ],
                2
              ],
              expected: [1, 2, 3, 4]
            }
          ],
          strategy: 'async',
          async: true,
          tags: ['concurrency', 'queue']
        });
      }

      if (variant === 1) {
        const limit = rng.int(2, 3);
        return buildTaskFromParts({
          category: 'async',
          difficulty,
          title: 'Первый успех под лимитом',
          prompt: `Дан массив async-джобов jobs. Запускай не больше ${limit} задач одновременно и верни первый успешно завершившийся результат. Если все джобы упали, пробрось последнюю ошибку.`,
          signature: 'solve(jobs, limit)',
          starterBody: [
        'return null; // TODO: launch with concurrency limit and stop on first success'
          ],
          solutionBody: [
            'return new Promise((resolve, reject) => {',
            '  let nextIndex = 0;',
            '  let active = 0;',
            '  let settled = false;',
            '  let lastError = null;',
            '',
            '  const maybeFinish = () => {',
            '    if (!settled && nextIndex >= jobs.length && active === 0) {',
            '      reject(lastError ?? new Error("no successful result"));',
            '    }',
            '  };',
            '',
            '  const launch = () => {',
            '    if (settled) {',
            '      return;',
            '    }',
            '    while (!settled && active < limit && nextIndex < jobs.length) {',
            '      const index = nextIndex;',
            '      nextIndex += 1;',
            '      active += 1;',
            '      Promise.resolve()',
            '        .then(() => jobs[index]())',
            '        .then(',
            '          (value) => {',
            '            if (!settled) {',
            '              settled = true;',
            '              resolve(value);',
            '            }',
            '          },',
            '          (error) => {',
            '            lastError = error;',
            '          }',
            '        )',
            '        .finally(() => {',
            '          active -= 1;',
            '          if (!settled) {',
            '            launch();',
            '            maybeFinish();',
            '          }',
            '        });',
            '    }',
            '    maybeFinish();',
            '  };',
            '',
            '  launch();',
            '});'
          ],
          hints: ['Сначала запусти только `limit` задач.', 'Как только одна из них успешно завершилась, можно сразу вернуть результат.'],
          explanation: 'Этот шаблон сочетает ограничение параллелизма с ранним выходом на первом успехе, что полезно для резервных источников данных.',
          tests: [
            {
              args: [
                [
                  { __fn: 'asyncReject', error: 'nope', key: 'win-limit-a' },
                  { __fn: 'delayedValue', value: 'winner', delay: 1, key: 'win-limit-b' },
                  { __fn: 'delayedValue', value: 'late', delay: 20, key: 'win-limit-c' }
                ],
                limit
              ],
              expected: 'winner'
            },
            {
              args: [
                [
                  { __fn: 'asyncReject', error: 'fail-1', key: 'win-limit-d' },
                  { __fn: 'asyncReject', error: 'fail-2', key: 'win-limit-e' }
                ],
                1
              ],
              expectedError: 'fail-2'
            }
          ],
          strategy: 'async',
          async: true,
          tags: ['concurrency', 'first-success']
        });
      }

      return buildTaskFromParts({
        category: 'async',
        difficulty,
        title: 'Первый успешный результат',
        prompt: 'Дан массив async-функций tasks. Верни первый успешно завершившийся результат, игнорируя отклонённые Promise.',
        signature: 'solve(tasks)',
        starterBody: [
          'return Promise.any(tasks.map((task) => task()));'
        ],
        solutionBody: [
          'return Promise.any(tasks.map((task) => task())).catch((error) => {',
          '  throw error.errors && error.errors.length > 0 ? error.errors[0] : error;',
          '});'
        ],
        hints: ['`Promise.any` подходит, когда нужен первый успех.', 'Если все варианты провалились, можно пробросить первую или последнюю ошибку из `AggregateError`.'],
        explanation: 'Такая задача полезна, когда есть несколько источников данных и нужен самый быстрый валидный ответ.',
        tests: [
          {
            args: [
              [
                { __fn: 'asyncReject', error: 'fail-a', key: 'any-a' },
                { __fn: 'delayedValue', value: 'winner', delay: 1, key: 'any-b' },
                { __fn: 'delayedValue', value: 'later', delay: 10, key: 'any-c' }
              ]
            ],
            expected: 'winner'
          },
          {
            args: [
              [
                { __fn: 'asyncReject', error: 'boom-1', key: 'any-d' },
                { __fn: 'asyncReject', error: 'boom-2', key: 'any-e' }
              ]
            ],
            expectedError: 'boom-1'
          }
        ],
        strategy: 'async',
        async: true,
        tags: ['promise.any', 'first-success']
      });
    }
    default:
      return buildAsyncTask('easy', rng);
  }
}

function buildObjectsTask(difficulty, rng) {
  const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const flattenOne = (value, path = '', out = {}) => {
    for (const [key, child] of Object.entries(value)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (isPlainObject(child)) {
        for (const [nestedKey, nestedValue] of Object.entries(child)) {
          out[`${nextPath}.${nestedKey}`] = nestedValue;
        }
      } else {
        out[nextPath] = child;
      }
    }
    return out;
  };
  const flattenDeep = (value, path = '', out = {}) => {
    for (const [key, child] of Object.entries(value)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (isPlainObject(child)) {
        flattenDeep(child, nextPath, out);
      } else {
        out[nextPath] = child;
      }
    }
    return out;
  };
  const deepMerge = (left, right) => {
    const result = Array.isArray(left) ? left.slice() : { ...left };
    for (const [key, value] of Object.entries(right)) {
      if (isPlainObject(value) && isPlainObject(result[key])) {
        result[key] = deepMerge(result[key], value);
      } else {
        result[key] = Array.isArray(value) ? value.slice() : value;
      }
    }
    return result;
  };
  const prune = (value) => {
    if (Array.isArray(value)) {
      return value
        .map(prune)
        .filter((item) => item !== undefined && item !== null && !(isPlainObject(item) && Object.keys(item).length === 0) && !(Array.isArray(item) && item.length === 0));
    }
    if (isPlainObject(value)) {
      const result = {};
      for (const [key, child] of Object.entries(value)) {
        const cleaned = prune(child);
        if (cleaned === undefined || cleaned === null) {
          continue;
        }
        if (isPlainObject(cleaned) && Object.keys(cleaned).length === 0) {
          continue;
        }
        if (Array.isArray(cleaned) && cleaned.length === 0) {
          continue;
        }
        result[key] = cleaned;
      }
      return result;
    }
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }
    return value;
  };
  const setByPath = (source, path, nextValue) => {
    const clone = cloneJson(source);
    let cursor = clone;
    for (let i = 0; i < path.length - 1; i += 1) {
      const key = path[i];
      if (!isPlainObject(cursor[key])) {
        cursor[key] = {};
      }
      cursor = cursor[key];
    }
    cursor[path[path.length - 1]] = nextValue;
    return clone;
  };

  switch (difficulty) {
    case 'easy': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const profile = {
          name: sampleName(rng),
          city: sampleCity(rng),
          role: rng.pick(['developer', 'designer', 'analyst']),
          active: rng.bool()
        };
        const keys = rng.sample(['name', 'city', 'role', 'active'], rng.int(2, 3));
        const title = 'Выбор полей';
        const prompt = `Дан объект profile = ${preview(profile)} и список keys = ${preview(keys)}. Верни новый объект только с указанными полями.`;
        const signature = 'solve(profile, keys)';
        const solutionBody = [
          'const result = {};',
          'for (const key of keys) {',
          '  if (Object.prototype.hasOwnProperty.call(profile, key)) {',
          '    result[key] = profile[key];',
          '  }',
          '}',
          'return result;'
        ];
        const expected = keys.reduce((acc, key) => {
          if (Object.prototype.hasOwnProperty.call(profile, key)) {
            acc[key] = profile[key];
          }
          return acc;
        }, {});
        return buildTaskFromParts({
          category: 'objects',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return {};'],
          solutionBody,
          hints: ['Собери новый объект, а не меняй исходный.', 'Проверяй наличие поля перед копированием.'],
          explanation: 'Задача учит выбору нужных свойств без мутаций и с сохранением порядка ключей из списка.',
          tests: [
            { args: [profile, keys], expected },
            { args: [{ a: 1, b: 2, c: 3 }, ['a', 'c']], expected: { a: 1, c: 3 } }
          ],
          tags: ['pick', 'object']
        });
      }

      if (variant === 1) {
        const user = {
          name: sampleName(rng),
          city: sampleCity(rng)
        };
        const defaults = {
          city: 'Unknown',
          role: 'guest',
          active: true
        };
        const title = 'Заполнение значений по умолчанию';
        const prompt = `Дан объект user = ${preview(user)} и defaults = ${preview(defaults)}. Верни новый объект, где отсутствующие поля берутся из defaults.`;
        const signature = 'solve(user, defaults)';
        const solutionBody = ['return { ...defaults, ...user };'];
        const expected = { ...defaults, ...user };
        return buildTaskFromParts({
          category: 'objects',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return user;'],
          solutionBody,
          hints: ['Сначала возьми defaults, потом перезапиши их значениями user.', 'Spread-оператор подходит для плоских объектов.'],
          explanation: 'Базовая операция со значениями по умолчанию помогает тренировать понимание порядка при объединении объектов.',
          tests: [
            { args: [user, defaults], expected },
            { args: [{ name: 'Ada' }, { name: 'Unknown', role: 'student' }], expected: { name: 'Ada', role: 'student' } }
          ],
          tags: ['defaults', 'spread']
        });
      }

      const profile = {
        name: sampleName(rng),
        city: sampleCity(rng),
        score: rng.int(10, 99)
      };
      const title = 'Карточка пользователя';
      const prompt = `Дан объект profile = ${preview(profile)}. Верни строку формата "Имя из Город (score)".`;
      const signature = 'solve(profile)';
      const solutionBody = ['return `${profile.name} из ${profile.city} (${profile.score})`;'];
      return buildTaskFromParts({
        category: 'objects',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['return profile.name;'],
        solutionBody,
        hints: ['Собери строку из нескольких полей объекта.', 'Можно использовать template string.'],
        explanation: 'Даже простая сборка строки учит вытаскивать данные из объекта и комбинировать их в нужном формате.',
        tests: [
          { args: [profile], expected: `${profile.name} из ${profile.city} (${profile.score})` },
          { args: [{ name: 'Ada', city: 'Berlin', score: 42 }], expected: 'Ada из Berlin (42)' }
        ],
        tags: ['format', 'object']
      });
    }
    case 'medium': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const data = {
          user: {
            name: sampleName(rng),
            contact: {
              email: sampleEmail(rng, sampleName(rng))
            }
          }
        };
        const path = ['user', 'contact', 'email'];
        const title = 'Глубокий доступ';
        const prompt = `Дан объект data = ${preview(data)} и path = ${preview(path)}. Верни значение по этому пути или fallback, если путь не найден.`;
        const signature = 'solve(data, path, fallback)';
        const solutionBody = [
          'let cursor = data;',
          'for (const key of path) {',
          '  if (cursor === null || cursor === undefined || typeof cursor !== "object") {',
          '    return fallback;',
          '  }',
          '  cursor = cursor[key];',
          '}',
          'return cursor === undefined ? fallback : cursor;'
        ];
        const expected = data.user.contact.email;
        return buildTaskFromParts({
          category: 'objects',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return fallback;'],
          solutionBody,
          hints: ['Иди по пути шаг за шагом.', 'Если промежуточного объекта нет, сразу возвращай fallback.'],
          explanation: 'Глубокое чтение часто нужно для конфигов и API-ответов, где структура вложенная и не всегда полная.',
          tests: [
            { args: [data, path, 'n/a'], expected },
            { args: [{ a: { b: 1 } }, ['a', 'c'], 'missing'], expected: 'missing' }
          ],
          tags: ['path', 'lookup']
        });
      }

      if (variant === 1) {
        const people = samplePersons(rng, rng.int(4, 6));
        const title = 'Группировка по городу';
        const prompt = `Дан массив people = ${preview(people)}. Верни объект, где ключи - города, а значения - массивы имён людей из этих городов.`;
        const signature = 'solve(people)';
        const solutionBody = [
          'const result = {};',
          'for (const person of people) {',
          '  const bucket = result[person.city] || (result[person.city] = []);',
          '  bucket.push(person.name);',
          '}',
          'return result;'
        ];
        const expected = people.reduce((acc, person) => {
          if (!acc[person.city]) {
            acc[person.city] = [];
          }
          acc[person.city].push(person.name);
          return acc;
        }, {});
        return buildTaskFromParts({
          category: 'objects',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return {};'],
          solutionBody,
          hints: ['Сохраняй уже созданный массив для каждого города.', 'Подойдёт обычный `for...of`.'],
          explanation: 'Группировка превращает массив объектов в удобную карту по ключу, что часто нужно для отчётов и фильтров.',
          tests: [
            { args: [people], expected },
            {
              args: [[
                { name: 'Ada', city: 'Berlin' },
                { name: 'Mila', city: 'Berlin' },
                { name: 'Oleg', city: 'Tokyo' }
              ]],
              expected: { Berlin: ['Ada', 'Mila'], Tokyo: ['Oleg'] }
            }
          ],
          tags: ['group', 'map']
        });
      }

      const nested = {
        user: {
          name: sampleName(rng),
          contact: {
            city: sampleCity(rng),
            email: sampleEmail(rng, sampleName(rng))
          }
        },
        stats: {
          score: rng.int(10, 100),
          level: rng.int(1, 9)
        }
      };
      const title = 'Плоские ключи';
      const prompt = `Дан вложенный объект data = ${preview(nested)}. Преобразуй его в плоский объект с ключами через точку.`;
      const signature = 'solve(data)';
      const solutionBody = [
        'const result = {};',
        'const walk = (value, path = "") => {',
        '  for (const [key, child] of Object.entries(value)) {',
        '    const nextPath = path ? `${path}.${key}` : key;',
        '    if (child !== null && typeof child === "object" && !Array.isArray(child)) {',
        '      walk(child, nextPath);',
        '    } else {',
        '      result[nextPath] = child;',
        '    }',
        '  }',
        '};',
        'walk(data);',
        'return result;'
      ];
      return buildTaskFromParts({
        category: 'objects',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['return data;'],
        solutionBody,
        hints: ['Когда видишь вложенный объект, продолжай обход рекурсивно.', 'Для листьев записывай полный путь в результат.'],
        explanation: 'Такая нормализация удобна для логов, фильтров и сохранения табличных данных.',
        tests: [
          { args: [nested], expected: flattenDeep(nested) },
          {
            args: [{ a: { b: 1, c: { d: 2 } }, e: 3 }],
            expected: { 'a.b': 1, 'a.c.d': 2, e: 3 }
          }
        ],
        tags: ['flatten', 'recursion']
      });
    }
    case 'hard': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const before = {
          user: {
            name: sampleName(rng),
            city: sampleCity(rng),
            score: rng.int(20, 60)
          },
          flags: {
            beta: rng.bool(),
            admin: rng.bool()
          }
        };
        const after = {
          user: {
            name: before.user.name,
            city: rng.bool() ? before.user.city : sampleCity(rng),
            score: before.user.score + rng.int(5, 20)
          },
          flags: {
            beta: !before.flags.beta,
            admin: before.flags.admin
          },
          meta: {
            updatedAt: '2026-04-19'
          }
        };
        const buildDiff = (left, right) => {
          const flatten = (value, path = '', out = {}) => {
            for (const [key, child] of Object.entries(value)) {
              const nextPath = path ? `${path}.${key}` : key;
              if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
                flatten(child, nextPath, out);
              } else {
                out[nextPath] = child;
              }
            }
            return out;
          };
          const flatLeft = flatten(left);
          const flatRight = flatten(right);
          const added = {};
          const removed = {};
          const changed = {};
          for (const [key, value] of Object.entries(flatRight)) {
            if (!(key in flatLeft)) {
              added[key] = value;
            } else if (!Object.is(flatLeft[key], value)) {
              changed[key] = { from: flatLeft[key], to: value };
            }
          }
          for (const [key, value] of Object.entries(flatLeft)) {
            if (!(key in flatRight)) {
              removed[key] = value;
            }
          }
          return { added, removed, changed };
        };
        const title = 'Diff объектов';
        const prompt = `Даны objects before = ${preview(before)} и after = ${preview(after)}. Верни { added, removed, changed }, где changed хранит пары { from, to } для изменённых путей.`;
        const signature = 'solve(before, after)';
        const solutionBody = [
          'const flatten = (value, path = "", out = {}) => {',
          '  for (const [key, child] of Object.entries(value)) {',
          '    const nextPath = path ? `${path}.${key}` : key;',
          '    if (child !== null && typeof child === "object" && !Array.isArray(child)) {',
          '      flatten(child, nextPath, out);',
          '    } else {',
          '      out[nextPath] = child;',
          '    }',
          '  }',
          '  return out;',
          '};',
          'const flatBefore = flatten(before);',
          'const flatAfter = flatten(after);',
          'const added = {};',
          'const removed = {};',
          'const changed = {};',
          'for (const [key, value] of Object.entries(flatAfter)) {',
          '  if (!(key in flatBefore)) {',
          '    added[key] = value;',
          '  } else if (!Object.is(flatBefore[key], value)) {',
          '    changed[key] = { from: flatBefore[key], to: value };',
          '  }',
          '}',
          'for (const [key, value] of Object.entries(flatBefore)) {',
          '  if (!(key in flatAfter)) {',
          '    removed[key] = value;',
          '  }',
          '}',
          'return { added, removed, changed };'
        ];
        return buildTaskFromParts({
          category: 'objects',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return { added: {}, removed: {}, changed: {} };'],
          solutionBody,
          hints: ['Сначала разверни объекты в плоский вид.', 'Потом сравни наборы ключей и значения по каждому пути.'],
          explanation: 'Diff помогает увидеть, какие именно поля изменились между двумя версиями объекта.',
          tests: [
            { args: [before, after], expected: buildDiff(before, after) }
          ],
          tags: ['diff', 'deep']
        });
      }

      if (variant === 1) {
        const source = {
          title: sampleWord(rng),
          description: '',
          tags: [sampleWord(rng), '', null, sampleWord(rng)],
          owner: {
            name: sampleName(rng),
            city: sampleCity(rng),
            note: null
          },
          extra: rng.bool() ? undefined : 'keep'
        };
        const title = 'Очистка объекта';
        const prompt = `Дан объект source = ${preview(source)}. Верни новый объект без пустых строк, null и undefined, очищая и вложенные структуры.`;
        const signature = 'solve(source)';
        const solutionBody = [
          'const clean = (value) => {',
          '  if (Array.isArray(value)) {',
          '    return value.map(clean).filter((item) => item !== undefined);',
          '  }',
          '  if (value !== null && typeof value === "object") {',
          '    const result = {};',
          '    for (const [key, child] of Object.entries(value)) {',
          '      const cleaned = clean(child);',
          '      if (cleaned === undefined) {',
          '        continue;',
          '      }',
          '      if (Array.isArray(cleaned) && cleaned.length === 0) {',
          '        continue;',
          '      }',
          '      if (cleaned && typeof cleaned === "object" && !Array.isArray(cleaned) && Object.keys(cleaned).length === 0) {',
          '        continue;',
          '      }',
          '      result[key] = cleaned;',
          '    }',
          '    return result;',
          '  }',
          '  if (value === "" || value === null || value === undefined) {',
          '    return undefined;',
          '  }',
          '  return value;',
          '};',
          'return clean(source);'
        ];
        const expected = prune(source);
        return buildTaskFromParts({
          category: 'objects',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return source;'],
          solutionBody,
          hints: ['Пустые строки, `null` и `undefined` нужно выкинуть.', 'Удобно написать рекурсивную функцию `clean`.'],
          explanation: 'Такая очистка полезна для нормализации форм и API-ответов перед сохранением.',
          tests: [
            { args: [source], expected },
            {
              args: [{ a: null, b: '', c: [1, undefined, 2], d: { e: '' } }],
              expected: { c: [1, 2] }
            }
          ],
          tags: ['prune', 'recursion']
        });
      }

      const base = {
        theme: {
          mode: 'dark',
          accent: 'cyan'
        },
        limits: {
          daily: 10,
          weekly: 50
        }
      };
      const patch = {
        theme: {
          accent: 'violet'
        },
        limits: {
          daily: 20
        }
      };
      const title = 'Глубокое слияние';
      const prompt = `Даны объекты base = ${preview(base)} и patch = ${preview(patch)}. Верни новый объект, где вложенные plain objects сливаются рекурсивно.`;
      const signature = 'solve(base, patch)';
      const solutionBody = [
        'const merge = (left, right) => {',
        '  const result = { ...left };',
        '  for (const [key, value] of Object.entries(right)) {',
        '    if (value !== null && typeof value === "object" && !Array.isArray(value) && result[key] && typeof result[key] === "object" && !Array.isArray(result[key])) {',
        '      result[key] = merge(result[key], value);',
        '    } else {',
        '      result[key] = Array.isArray(value) ? value.slice() : value;',
        '    }',
        '  }',
        '  return result;',
        '};',
        'return merge(base, patch);'
      ];
      const expected = deepMerge(base, patch);
      return buildTaskFromParts({
        category: 'objects',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['return base;'],
        solutionBody,
        hints: ['Рекурсивно объединяй только plain objects.', 'Массивы можно копировать как есть или заменять значением из patch.'],
        explanation: 'Рекурсивное слияние нужно для конфигов, тем и вложенных настроек.',
        tests: [
          { args: [base, patch], expected },
          {
            args: [{ a: { x: 1, y: 2 }, list: [1, 2] }, { a: { y: 5, z: 9 }, list: [3] }],
            expected: { a: { x: 1, y: 5, z: 9 }, list: [3] }
          }
        ],
        tags: ['merge', 'deep']
      });
    }
    case 'expert': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const state = {
          user: {
            name: sampleName(rng),
            city: sampleCity(rng),
            score: rng.int(20, 60)
          },
          flags: {
            beta: rng.bool()
          }
        };
        const patches = [
          { path: ['user', 'score'], value: state.user.score + rng.int(5, 15) },
          { path: ['flags', 'beta'], value: !state.flags.beta },
          { path: ['meta', 'updatedAt'], value: '2026-04-19' }
        ];
        const title = 'Применение патча';
        const prompt = `Даны state = ${preview(state)} и patches = ${preview(patches)}. Верни новый объект, применяя patch по путям без мутации исходного state.`;
        const signature = 'solve(state, patches)';
        const solutionBody = [
          'const result = JSON.parse(JSON.stringify(state));',
          'for (const patch of patches) {',
          '  let cursor = result;',
          '  for (let i = 0; i < patch.path.length - 1; i += 1) {',
          '    const key = patch.path[i];',
          '    if (cursor[key] === null || typeof cursor[key] !== "object") {',
          '      cursor[key] = {};',
          '    }',
          '    cursor = cursor[key];',
          '  }',
          '  cursor[patch.path[patch.path.length - 1]] = patch.value;',
          '}',
          'return result;'
        ];
        const expected = patches.reduce((acc, patch) => setByPath(acc, patch.path, patch.value), state);
        return buildTaskFromParts({
          category: 'objects',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return state;'],
          solutionBody,
          hints: ['Сначала склонируй исходное состояние.', 'Каждый patch должен создавать недостающие вложенные объекты по пути.'],
          explanation: 'Иммутабельное применение патчей полезно для state-management и undo/redo.',
          tests: [
            { args: [state, patches], expected },
            {
              args: [
                { a: { b: 1 } },
                [{ path: ['a', 'c'], value: 2 }, { path: ['d'], value: 5 }]
              ],
              expected: { a: { b: 1, c: 2 }, d: 5 }
            }
          ],
          tags: ['patch', 'immutable']
        });
      }

      if (variant === 1) {
        const groups = {
          frontend: ['Ada', 'Mila', 'Noah'],
          backend: ['Ilya', 'Vera'],
          design: ['Zoe', 'Rita']
        };
        const title = 'Обратный индекс';
        const prompt = `Дан объект groups = ${preview(groups)}. Построй обратный индекс: для каждого имени верни массив групп, где оно встречается.`;
        const signature = 'solve(groups)';
        const solutionBody = [
          'const result = {};',
          'for (const [group, names] of Object.entries(groups)) {',
          '  for (const name of names) {',
          '    if (!result[name]) {',
          '      result[name] = [];',
          '    }',
          '    result[name].push(group);',
          '  }',
          '}',
          'return result;'
        ];
        const expected = Object.entries(groups).reduce((acc, [group, names]) => {
          for (const name of names) {
            if (!acc[name]) {
              acc[name] = [];
            }
            acc[name].push(group);
          }
          return acc;
        }, {});
        return buildTaskFromParts({
          category: 'objects',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return {};'],
          solutionBody,
          hints: ['Поменяй местами ключи и значения.', 'Если имя встречается в нескольких группах, накапливай все группы в массив.'],
          explanation: 'Обратный индекс полезен для построения поисковых структур и связей между сущностями.',
          tests: [
            { args: [groups], expected },
            {
              args: [{ a: ['x', 'y'], b: ['y'] }],
              expected: { x: ['a'], y: ['a', 'b'] }
            }
          ],
          tags: ['invert', 'index']
        });
      }

      const raw = {
        firstName: sampleName(rng),
        lastName: sampleName(rng),
        city: sampleCity(rng),
        skills: rng.sample(['js', 'css', 'html', 'node', 'react'], rng.int(2, 4))
      };
      const title = 'Нормализация профиля';
      const prompt = `Дан объект raw = ${preview(raw)}. Верни объект { fullName, location, skillCount, primarySkill }.`;
      const signature = 'solve(raw)';
      const solutionBody = [
        'return {',
        '  fullName: `${raw.firstName} ${raw.lastName}`.trim(),',
        '  location: raw.city,',
        '  skillCount: Array.isArray(raw.skills) ? raw.skills.length : 0,',
        '  primarySkill: Array.isArray(raw.skills) && raw.skills.length > 0 ? raw.skills[0] : null',
        '};'
      ];
      return buildTaskFromParts({
        category: 'objects',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['return raw;'],
        solutionBody,
        hints: ['Собери новый объект в нужном формате.', 'Длину массива можно узнать через `length`.'],
        explanation: 'Нормализация помогает привести разные поля к единому виду перед хранением или отправкой на сервер.',
        tests: [
          { args: [raw], expected: {
            fullName: `${raw.firstName} ${raw.lastName}`.trim(),
            location: raw.city,
            skillCount: raw.skills.length,
            primarySkill: raw.skills[0] || null
          } },
          {
            args: [{ firstName: 'Ada', lastName: 'Lovelace', city: 'London', skills: ['math', 'logic'] }],
            expected: { fullName: 'Ada Lovelace', location: 'London', skillCount: 2, primarySkill: 'math' }
          }
        ],
        tags: ['normalize', 'profile']
      });
    }
    default:
      return buildObjectsTask('easy', rng);
  }
}

function buildAlgorithmsTask(difficulty, rng) {
  const normalizeText = (text) => String(text).toLowerCase().replace(/[^a-z0-9а-яё]/g, '');
  const gcd = (a, b) => {
    let left = Math.abs(a);
    let right = Math.abs(b);
    while (right !== 0) {
      const temp = left % right;
      left = right;
      right = temp;
    }
    return left;
  };
  const binarySearch = (values, target) => {
    let left = 0;
    let right = values.length - 1;
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
  };
  const twoSum = (values, target) => {
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
    return [];
  };
  const longestUniqueSubstring = (text) => {
    const seen = new Map();
    let left = 0;
    let best = 0;
    for (let right = 0; right < text.length; right += 1) {
      const char = text[right];
      if (seen.has(char) && seen.get(char) >= left) {
        left = seen.get(char) + 1;
      }
      seen.set(char, right);
      best = Math.max(best, right - left + 1);
    }
    return best;
  };
  const mergeIntervals = (intervals) => {
    if (intervals.length === 0) {
      return [];
    }
    const sorted = intervals.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const result = [sorted[0].slice()];
    for (let index = 1; index < sorted.length; index += 1) {
      const [start, end] = sorted[index];
      const last = result[result.length - 1];
      if (start <= last[1]) {
        last[1] = Math.max(last[1], end);
      } else {
        result.push([start, end]);
      }
    }
    return result;
  };
  const maxSubarray = (values) => {
    let best = values[0];
    let current = values[0];
    for (let index = 1; index < values.length; index += 1) {
      current = Math.max(values[index], current + values[index]);
      best = Math.max(best, current);
    }
    return best;
  };
  const topKFrequent = (values, k) => {
    const counts = new Map();
    for (const value of values) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
      .slice(0, k)
      .map(([value]) => value);
  };
  const subarraySum = (values, target) => {
    const counts = new Map([[0, 1]]);
    let sum = 0;
    let total = 0;
    for (const value of values) {
      sum += value;
      total += counts.get(sum - target) || 0;
      counts.set(sum, (counts.get(sum) || 0) + 1);
    }
    return total;
  };
  const slidingWindowMax = (values, size) => {
    const deque = [];
    const result = [];
    for (let index = 0; index < values.length; index += 1) {
      while (deque.length > 0 && deque[0] <= index - size) {
        deque.shift();
      }
      while (deque.length > 0 && values[deque[deque.length - 1]] <= values[index]) {
        deque.pop();
      }
      deque.push(index);
      if (index >= size - 1) {
        result.push(values[deque[0]]);
      }
    }
    return result;
  };
  const topologicalSort = (nodes, edges) => {
    const graph = new Map(nodes.map((node) => [node, []]));
    const indegree = new Map(nodes.map((node) => [node, 0]));
    for (const [from, to] of edges) {
      graph.get(from).push(to);
      indegree.set(to, (indegree.get(to) || 0) + 1);
    }
    const queue = nodes.filter((node) => indegree.get(node) === 0);
    const order = [];
    while (queue.length > 0) {
      const node = queue.shift();
      order.push(node);
      for (const next of graph.get(node) || []) {
        indegree.set(next, indegree.get(next) - 1);
        if (indegree.get(next) === 0) {
          queue.push(next);
        }
      }
    }
    return order;
  };
  const shortestPath = (graph, start, end) => {
    const queue = [[start, 0]];
    const visited = new Set([start]);
    while (queue.length > 0) {
      const [node, distance] = queue.shift();
      if (node === end) {
        return distance;
      }
      for (const next of graph[node] || []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push([next, distance + 1]);
        }
      }
    }
    return -1;
  };

  switch (difficulty) {
    case 'easy': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const value = `${sampleWord(rng)}-${sampleWord(rng)}`;
        const title = 'Палиндром строки';
        const prompt = `Дана строка text = ${quote(value)}. Верни true, если она читается одинаково слева направо и справа налево после удаления пробелов и знаков препинания.`;
        const signature = 'solve(text)';
        const solutionBody = [
          'const cleaned = String(text).toLowerCase().replace(/[^a-z0-9а-яё]/g, "");',
          'return cleaned === cleaned.split("").reverse().join("");'
        ];
        const tests = [
          { args: [value], expected: false },
          { args: ['Never odd or even'], expected: true }
        ];
        return buildTaskFromParts({
          category: 'algorithms',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return false;'],
          solutionBody,
          hints: ['Нормализуй строку перед сравнением.', 'Сравни строку с её перевёрнутой копией.'],
          explanation: 'Палиндромы - хороший старт для практики работы со строками и индексами.',
          tests,
          tags: ['string', 'palindrome']
        });
      }

      if (variant === 1) {
        const a = rng.int(12, 48);
        const b = rng.int(8, 36);
        const title = 'НОД';
        const prompt = `Даны числа a = ${a} и b = ${b}. Верни их наибольший общий делитель.`;
        const signature = 'solve(a, b)';
        const solutionBody = [
          'let left = Math.abs(a);',
          'let right = Math.abs(b);',
          'while (right !== 0) {',
          '  const temp = left % right;',
          '  left = right;',
          '  right = temp;',
          '}',
          'return left;'
        ];
        return buildTaskFromParts({
          category: 'algorithms',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return Math.max(a, b);'],
          solutionBody,
          hints: ['Используй алгоритм Евклида.', 'Меняй местами остаток, пока он не станет нулём.'],
          explanation: 'Евклид делает задачу короткой и показывает, как из цикла получается быстрый числовой алгоритм.',
          tests: [
            { args: [a, b], expected: gcd(a, b) },
            { args: [54, 24], expected: 6 }
          ],
          tags: ['math', 'gcd']
        });
      }

      const values = sampleNumbers(rng, rng.int(8, 12), 1, 60).sort((left, right) => left - right);
      const target = values[rng.int(0, values.length - 1)];
      const title = 'Бинарный поиск';
      const prompt = `Дан отсортированный массив values = ${preview(values)} и target = ${target}. Верни индекс target или -1, если его нет.`;
      const signature = 'solve(values, target)';
      const solutionBody = [
        'let left = 0;',
        'let right = values.length - 1;',
        'while (left <= right) {',
        '  const mid = Math.floor((left + right) / 2);',
        '  if (values[mid] === target) {',
        '    return mid;',
        '  }',
        '  if (values[mid] < target) {',
        '    left = mid + 1;',
        '  } else {',
        '    right = mid - 1;',
        '  }',
        '}',
        'return -1;'
      ];
        return buildTaskFromParts({
          category: 'algorithms',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return -1;'],
          solutionBody,
          hints: ['Ищи середину и сужай диапазон пополам.', 'Работает только на отсортированном массиве.'],
          explanation: 'Бинарный поиск показывает, как порядок данных позволяет резко сократить число проверок.',
          tests: [
          { args: [values, target], expected: binarySearch(values, target) },
          { args: [[1, 3, 5, 9, 12], 9], expected: 3 }
        ],
        tags: ['search', 'binary']
      });
    }
    case 'medium': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const values = sampleNumbers(rng, rng.int(6, 8), 1, 20);
        const target = values[0] + values[1];
        const title = 'Two Sum';
        const prompt = `Дан массив values = ${preview(values)}. Верни индексы двух чисел, сумма которых равна target = ${target}.`;
        const signature = 'solve(values, target)';
        const solutionBody = [
          'const seen = new Map();',
          'for (let index = 0; index < values.length; index += 1) {',
          '  const value = values[index];',
          '  const complement = target - value;',
          '  if (seen.has(complement)) {',
          '    return [seen.get(complement), index];',
          '  }',
          '  if (!seen.has(value)) {',
          '    seen.set(value, index);',
          '  }',
          '}',
          'return [];'
        ];
        return buildTaskFromParts({
          category: 'algorithms',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return [];'],
          solutionBody,
          hints: ['Сохраняй уже виденные числа в `Map`.', 'Для каждого элемента ищи complement = target - value.'],
          explanation: 'Классическая задача на хеш-таблицу и поиск пары за линейное время.',
          tests: [
            { args: [values, target], expected: twoSum(values, target) },
            { args: [[2, 7, 11, 15], 9], expected: [0, 1] }
          ],
          tags: ['pair', 'hashmap']
        });
      }

      if (variant === 1) {
        const text = sampleWords(rng, rng.int(6, 9)).join('');
        const title = 'Самая длинная уникальная подстрока';
        const prompt = `Дана строка text = ${quote(text)}. Верни длину самой длинной подстроки без повторяющихся символов.`;
        const signature = 'solve(text)';
        const solutionBody = [
          'const seen = new Map();',
          'let left = 0;',
          'let best = 0;',
          'for (let right = 0; right < text.length; right += 1) {',
          '  const char = text[right];',
          '  if (seen.has(char) && seen.get(char) >= left) {',
          '    left = seen.get(char) + 1;',
          '  }',
          '  seen.set(char, right);',
          '  best = Math.max(best, right - left + 1);',
          '}',
          'return best;'
        ];
        return buildTaskFromParts({
          category: 'algorithms',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return text.length;'],
          solutionBody,
          hints: ['Держи окно и двигай левую границу при повторе.', 'Map поможет помнить последний индекс символа.'],
          explanation: 'Скользящее окно - один из самых полезных паттернов для строковых задач.',
          tests: [
            { args: [text], expected: longestUniqueSubstring(text) },
            { args: ['abcabcbb'], expected: 3 }
          ],
          tags: ['string', 'window']
        });
      }

      const intervals = sampleIntervals(rng, rng.int(4, 6));
      const title = 'Слияние интервалов';
      const prompt = `Дан массив интервалов intervals = ${preview(intervals)}. Объедини пересекающиеся интервалы.`;
      const signature = 'solve(intervals)';
      const solutionBody = [
        'if (intervals.length === 0) {',
        '  return [];',
        '}',
        'const sorted = intervals.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);',
        'const result = [sorted[0].slice()];',
        'for (let index = 1; index < sorted.length; index += 1) {',
        '  const [start, end] = sorted[index];',
        '  const last = result[result.length - 1];',
        '  if (start <= last[1]) {',
        '    last[1] = Math.max(last[1], end);',
        '  } else {',
        '    result.push([start, end]);',
        '  }',
        '}',
        'return result;'
      ];
      return buildTaskFromParts({
        category: 'algorithms',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['return intervals;'],
        solutionBody,
        hints: ['Сначала отсортируй интервалы по началу.', 'Расширяй последний интервал результата, если они пересекаются.'],
        explanation: 'Это типичный приём для интервальных задач и календарей.',
        tests: [
          { args: [intervals], expected: mergeIntervals(intervals) },
          { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] }
        ],
        tags: ['intervals', 'merge']
      });
    }
    case 'hard': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const values = sampleNumbers(rng, rng.int(8, 12), -10, 20, true);
        const title = 'Максимальная сумма подмассива';
        const prompt = `Дан массив values = ${preview(values)}. Верни максимальную сумму непрерывного подмассива.`;
        const signature = 'solve(values)';
        const solutionBody = [
          'let best = values[0];',
          'let current = values[0];',
          'for (let index = 1; index < values.length; index += 1) {',
          '  current = Math.max(values[index], current + values[index]);',
          '  best = Math.max(best, current);',
          '}',
          'return best;'
        ];
        return buildTaskFromParts({
          category: 'algorithms',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return values.reduce((sum, value) => sum + value, 0);'],
          solutionBody,
          hints: ['Сохраняй текущую и лучшую сумму.', 'Если текущая сумма стала хуже нового элемента, начинай заново.'],
          explanation: 'Алгоритм Кадане показывает, как локальное решение можно поддерживать за один проход.',
          tests: [
            { args: [values], expected: maxSubarray(values) },
            { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 }
          ],
          tags: ['subarray', 'kadane']
        });
      }

      if (variant === 1) {
        const values = sampleNumbers(rng, rng.int(8, 14), 1, 8);
        const k = rng.int(2, 4);
        const title = 'Топ-K частот';
        const prompt = `Дан массив values = ${preview(values)} и число k = ${k}. Верни k самых частых значений по убыванию частоты.`;
        const signature = 'solve(values, k)';
        const solutionBody = [
          'const counts = new Map();',
          'for (const value of values) {',
          '  counts.set(value, (counts.get(value) || 0) + 1);',
          '}',
          'return Array.from(counts.entries())',
          '  .sort((a, b) => b[1] - a[1] || a[0] - b[0])',
          '  .slice(0, k)',
          '  .map(([value]) => value);'
        ];
        return buildTaskFromParts({
          category: 'algorithms',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return values.slice(0, k);'],
          solutionBody,
          hints: ['Сначала посчитай частоты, потом отсортируй пары.', 'Возвращай только значения, а не счётчики.'],
          explanation: 'Частотные задачи часто решаются через Map и сортировку по счётчику.',
          tests: [
            { args: [values, k], expected: topKFrequent(values, k) },
            { args: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2] }
          ],
          tags: ['frequency', 'topk']
        });
      }

      const values = sampleNumbers(rng, rng.int(8, 14), 0, 10);
      const target = rng.int(5, 15);
      const title = 'Сумма подмассивов';
      const prompt = `Дан массив values = ${preview(values)} и target = ${target}. Посчитай, сколько непрерывных подмассивов имеют сумму target.`;
      const signature = 'solve(values, target)';
      const solutionBody = [
        'const counts = new Map([[0, 1]]);',
        'let sum = 0;',
        'let total = 0;',
        'for (const value of values) {',
        '  sum += value;',
        '  total += counts.get(sum - target) || 0;',
        '  counts.set(sum, (counts.get(sum) || 0) + 1);',
        '}',
        'return total;'
      ];
      return buildTaskFromParts({
        category: 'algorithms',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['return 0;'],
        solutionBody,
        hints: ['Используй префиксные суммы и Map с частотами.', 'Каждое новое значение может закрывать несколько подходящих подмассивов.'],
        explanation: 'Эта задача показывает, как Map помогает считать совпадения префиксных сумм за один проход.',
        tests: [
          { args: [values, target], expected: subarraySum(values, target) },
          { args: [[1, 1, 1], 2], expected: 2 }
        ],
        tags: ['prefix', 'map']
      });
    }
    case 'expert': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const values = sampleNumbers(rng, rng.int(8, 12), 1, 40);
        const windowSize = rng.int(2, 4);
        const title = 'Максимум в окне';
        const prompt = `Дан массив values = ${preview(values)} и windowSize = ${windowSize}. Верни массив максимумов для каждого окна.`;
        const signature = 'solve(values, windowSize)';
        const solutionBody = [
          'const deque = [];',
          'const result = [];',
          'for (let index = 0; index < values.length; index += 1) {',
          '  while (deque.length > 0 && deque[0] <= index - windowSize) {',
          '    deque.shift();',
          '  }',
          '  while (deque.length > 0 && values[deque[deque.length - 1]] <= values[index]) {',
          '    deque.pop();',
          '  }',
          '  deque.push(index);',
          '  if (index >= windowSize - 1) {',
          '    result.push(values[deque[0]]);',
          '  }',
          '}',
          'return result;'
        ];
        return buildTaskFromParts({
          category: 'algorithms',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return values;'],
          solutionBody,
          hints: ['Поддерживай дек из индексов в порядке убывания значений.', 'Удаляй индексы, которые уже вышли из окна.'],
          explanation: 'Дек позволяет решать задачу о максимуме в окне за линейное время.',
          tests: [
            { args: [values, windowSize], expected: slidingWindowMax(values, windowSize) },
            { args: [[1, 3, 1, 2, 0, 5], 3], expected: [3, 3, 2, 5] }
          ],
          tags: ['deque', 'window']
        });
      }

      if (variant === 1) {
        const nodes = ['A', 'B', 'C', 'D', 'E', 'F'];
        const edges = [['A', 'C'], ['B', 'C'], ['C', 'D'], ['C', 'E'], ['E', 'F']];
        const title = 'Топологическая сортировка';
        const prompt = `Дан DAG с узлами ${preview(nodes)} и рёбрами ${preview(edges)}. Верни один из корректных topological order.`;
        const signature = 'solve(nodes, edges)';
        const solutionBody = [
          'const graph = new Map(nodes.map((node) => [node, []]));',
          'const indegree = new Map(nodes.map((node) => [node, 0]));',
          'for (const [from, to] of edges) {',
          '  graph.get(from).push(to);',
          '  indegree.set(to, (indegree.get(to) || 0) + 1);',
          '}',
          'const queue = nodes.filter((node) => indegree.get(node) === 0);',
          'const order = [];',
          'while (queue.length > 0) {',
          '  const node = queue.shift();',
          '  order.push(node);',
          '  for (const next of graph.get(node) || []) {',
          '    indegree.set(next, indegree.get(next) - 1);',
          '    if (indegree.get(next) === 0) {',
          '      queue.push(next);',
          '    }',
          '  }',
          '}',
          'return order;'
        ];
        return buildTaskFromParts({
          category: 'algorithms',
          difficulty,
          title,
          prompt,
          signature,
          starterBody: ['return [];'],
          solutionBody,
          hints: ['Считай входящие степени и запускай очередные вершины с нулевой степенью.', 'Это стандартный алгоритм Кана.'],
          explanation: 'Топологическая сортировка нужна для зависимостей, сборок и планирования задач.',
          tests: [
            { args: [nodes, edges], expected: topologicalSort(nodes, edges) },
            { args: [['A', 'B', 'C'], [['A', 'B'], ['B', 'C']]], expected: ['A', 'B', 'C'] }
          ],
          tags: ['graph', 'dag']
        });
      }

      const graph = {
        A: ['B', 'C'],
        B: ['D'],
        C: ['D', 'E'],
        D: ['F'],
        E: ['F'],
        F: []
      };
      const start = 'A';
      const end = 'F';
      const title = 'Кратчайший путь';
      const prompt = `Дан граф graph = ${preview(graph)}. Верни длину кратчайшего пути от ${start} до ${end}.`;
      const signature = 'solve(graph, start, end)';
      const solutionBody = [
        'const queue = [[start, 0]];',
        'const visited = new Set([start]);',
        'while (queue.length > 0) {',
        '  const [node, distance] = queue.shift();',
        '  if (node === end) {',
        '    return distance;',
        '  }',
        '  for (const next of graph[node] || []) {',
        '    if (!visited.has(next)) {',
        '      visited.add(next);',
        '      queue.push([next, distance + 1]);',
        '    }',
        '  }',
        '}',
        'return -1;'
      ];
      return buildTaskFromParts({
        category: 'algorithms',
        difficulty,
        title,
        prompt,
        signature,
        starterBody: ['return 0;'],
        solutionBody,
        hints: ['Обход в ширину находит кратчайший путь в невзвешенном графе.', 'Помни, какие вершины уже посещал.'],
        explanation: 'BFS - базовый инструмент для графов и сетевых связей.',
        tests: [
          { args: [graph, start, end], expected: shortestPath(graph, start, end) },
          { args: [{ A: ['B'], B: ['C'], C: [] }, 'A', 'C'], expected: 2 }
        ],
        tags: ['graph', 'bfs']
      });
    }
    default:
      return buildAlgorithmsTask('easy', rng);
  }
}

function buildDomTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const title = 'Изменение текста';
        const prompt = 'На странице есть элемент #status. Измени его текст на "Готово" и добавь класс is-ready.';
        const signature = 'solve(document)';
        const starterBody = [
          'const status = document.getElementById("status");',
          'status.textContent = "Черновик"; // TODO: set the final text',
          '// TODO: add the is-ready class'
        ];
        const solutionBody = [
          'const status = document.getElementById("status");',
          'status.textContent = "Готово";',
          'status.classList.add("is-ready");'
        ];
        const fixture = {
          body: [
            {
              tag: 'div',
              id: 'status',
              className: 'status',
              text: 'Черновик'
            }
          ]
        };
        const tests = [
          {
            fixture,
            assertions: [
              { target: 'status', type: 'text', equals: 'Готово' },
              { target: 'status', type: 'classContains', value: 'is-ready' }
            ]
          }
        ];
        return buildTaskFromParts({
          category: 'dom',
          difficulty,
          title,
          prompt,
          signature,
          starterBody,
          solutionBody,
          hints: ['Сначала найди элемент через `getElementById`.', 'Измени `textContent` и добавь класс через `classList.add`.'],
          explanation: 'Базовая DOM-задача: найти нужный элемент и обновить текст с классом состояния.',
          tests,
          strategy: 'dom',
          tags: ['text', 'class']
        });
      }

      if (variant === 1) {
        const query = `${sampleWord(rng)} ${sampleWord(rng)}`;
        const title = 'Синхронизация ввода';
        const prompt = `На странице есть input #query и span #preview. Заполни input значением ${quote(query)} и отрази его в preview в верхнем регистре.`;
        const signature = 'solve(document)';
        const starterBody = [
          'const input = document.getElementById("query");',
          'const preview = document.getElementById("preview");',
          '// TODO: synchronize the input value with the preview'
        ];
        const solutionBody = [
          'const input = document.getElementById("query");',
          'const preview = document.getElementById("preview");',
          `input.value = ${quote(query)};`,
          'preview.textContent = input.value.trim().toUpperCase();'
        ];
        const fixture = {
          body: [
            { tag: 'input', id: 'query', className: 'query', value: '' },
            { tag: 'span', id: 'preview', className: 'preview', text: '' }
          ]
        };
        const tests = [
          {
            fixture,
            assertions: [
              { target: 'query', type: 'value', equals: query },
              { target: 'preview', type: 'text', equals: query.trim().toUpperCase() }
            ]
          }
        ];
        return buildTaskFromParts({
          category: 'dom',
          difficulty,
          title,
          prompt,
          signature,
          starterBody,
          solutionBody,
          hints: ['Можно проставить значение прямо в `input.value`.', 'После этого обнови `preview.textContent`.'],
          explanation: 'Такие задачи учат связке между полем ввода и отображением результата.',
          tests,
          strategy: 'dom',
          tags: ['input', 'mirror']
        });
      }

      const title = 'Состояние кнопки';
      const prompt = 'На странице есть кнопка #toggle. Переведи её в активное состояние: текст должен стать ON, а класс - is-active.';
      const signature = 'solve(document)';
      const starterBody = [
        'const toggle = document.getElementById("toggle");',
        '// TODO: update the button state'
      ];
      const solutionBody = [
        'const toggle = document.getElementById("toggle");',
        'toggle.textContent = "ON";',
        'toggle.classList.add("is-active");'
      ];
      const fixture = {
        body: [
          { tag: 'button', id: 'toggle', className: 'button', text: 'OFF' }
        ]
      };
      const tests = [
        {
          fixture,
          assertions: [
            { target: 'toggle', type: 'text', equals: 'ON' },
            { target: 'toggle', type: 'classContains', value: 'is-active' }
          ]
        }
      ];
      return buildTaskFromParts({
        category: 'dom',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Меняй и текст, и класс кнопки.', 'Для этого достаточно `textContent` и `classList.add`.'],
        explanation: 'Простейшая UI-задача: один контрол меняет визуальное состояние и текст.',
        tests,
        strategy: 'dom',
        tags: ['button', 'state']
      });
    }
    case 'medium': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const items = sampleWords(rng, rng.int(3, 5));
        const title = 'Рендер списка';
        const prompt = `На странице есть контейнер #list. Верни туда список элементов из массива items = ${preview(items)} и запиши их в textContent через разделитель " | ".`;
        const signature = 'solve(document, items)';
        const starterBody = [
          'const list = document.getElementById("list");',
          '// TODO: render the items'
        ];
        const solutionBody = [
          'const list = document.getElementById("list");',
          'list.textContent = items.join(" | ");',
          'for (const item of items) {',
          '  const li = document.createElement("li");',
          '  li.textContent = item;',
          '  list.appendChild(li);',
          '}'
        ];
        const fixture = {
          body: [
            { tag: 'ul', id: 'list', className: 'list' }
          ]
        };
        const tests = [
          {
            fixture,
            args: [items],
            assertions: [
              { target: 'list', type: 'text', equals: items.join(' | ') },
              { target: 'list', type: 'count', equals: items.length }
            ]
          }
        ];
        return buildTaskFromParts({
          category: 'dom',
          difficulty,
          title,
          prompt,
          signature,
          starterBody,
          solutionBody,
          hints: ['Сначала можно собрать строку для `textContent`.', 'Потом добавь элементы через `createElement` и `appendChild`.'],
          explanation: 'Рендер списков - основа для таблиц, меню и карточек.',
          tests,
          strategy: 'dom',
          tags: ['render', 'list']
        });
      }

      if (variant === 1) {
        const cards = samplePersons(rng, rng.int(4, 6)).map((person) => ({
          name: person.name,
          score: person.score
        }));
        const ordered = cards.slice().sort((left, right) => right.score - left.score);
        const title = 'Сортировка карточек';
        const prompt = `На странице есть контейнер #board. Отрендери карточки из cards = ${preview(cards)} в порядке убывания score и запиши порядок имён в textContent.`;
        const signature = 'solve(document, cards)';
        const starterBody = [
          'const board = document.getElementById("board");',
          '// TODO: sort and render cards'
        ];
        const solutionBody = [
          'const board = document.getElementById("board");',
          'const sorted = cards.slice().sort((left, right) => right.score - left.score);',
          'board.textContent = sorted.map((card) => card.name).join(" > ");',
          'for (const card of sorted) {',
          '  const item = document.createElement("div");',
          '  item.textContent = `${card.name}:${card.score}`;',
          '  board.appendChild(item);',
          '}'
        ];
        const fixture = {
          body: [
            { tag: 'section', id: 'board', className: 'board' }
          ]
        };
        const tests = [
          {
            fixture,
            args: [cards],
            assertions: [
              { target: 'board', type: 'text', equals: ordered.map((card) => card.name).join(' > ') },
              { target: 'board', type: 'count', equals: ordered.length }
            ]
          }
        ];
        return buildTaskFromParts({
          category: 'dom',
          difficulty,
          title,
          prompt,
          signature,
          starterBody,
          solutionBody,
          hints: ['Сначала отсортируй массив по score.', 'Запиши порядок имён в `textContent`, а карточки добавь как дочерние элементы.'],
          explanation: 'Сортировка и рендер карточек - базовая операция для таблиц лидеров и списков рейтингов.',
          tests,
          strategy: 'dom',
          tags: ['sort', 'cards']
        });
      }

      const cards = samplePersons(rng, rng.int(4, 6)).map((person) => ({
        id: person.name,
        score: person.score
      }));
      const threshold = cards[Math.floor(cards.length / 2)].score;
      const title = 'Фильтр карточек';
      const prompt = `На странице есть .card с data-score. Оставь видимыми только карточки со score >= ${threshold} и запиши имена видимых карточек в #summary.`;
      const signature = 'solve(document, threshold)';
      const starterBody = [
        'const cards = document.querySelectorAll(".card");',
        'const summary = document.getElementById("summary");',
        '// TODO: filter cards and update summary'
      ];
      const solutionBody = [
        'const cards = document.querySelectorAll(".card");',
        'const summary = document.getElementById("summary");',
        'const visible = [];',
        'for (const card of cards) {',
        '  const score = Number(card.dataset.score || 0);',
        '  const hot = score >= threshold;',
        '  card.classList.toggle("hidden", !hot);',
        '  if (hot) {',
        '    visible.push(card.id);',
        '  }',
        '}',
        'summary.textContent = visible.join(", ");'
      ];
      const fixture = {
        body: cards.map((card) => ({
          tag: 'div',
          id: card.id,
          className: 'card',
          attrs: { 'data-score': String(card.score) },
          text: card.id
        })).concat([
          { tag: 'div', id: 'summary', className: 'summary', text: '' }
        ])
      };
      const visible = cards.filter((card) => card.score >= threshold).map((card) => card.id);
      const tests = [
        {
          fixture,
          args: [threshold],
          assertions: [
            { target: 'summary', type: 'text', equals: visible.join(', ') },
            ...cards.map((card) => ({
              target: card.id,
              type: card.score >= threshold ? 'classNotContains' : 'classContains',
              value: 'hidden'
            }))
          ]
        }
      ];
      return buildTaskFromParts({
        category: 'dom',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Сравни `data-score` с порогом и используй `classList.toggle`.', 'Собери список видимых карточек для summary.'],
        explanation: 'Фильтрация DOM-элементов часто нужна для поиска и реактивных списков.',
        tests,
        strategy: 'dom',
        tags: ['filter', 'classList']
      });
    }
    case 'hard': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const threshold = rng.int(40, 70);
        const cards = Array.from({ length: rng.int(4, 6) }, (_, index) => {
          const isHot = index % 2 === 1;
          const score = isHot ? threshold + rng.int(1, 20) : Math.max(0, threshold - rng.int(5, 20));
          return {
            id: `card-${index + 1}`,
            score
          };
        });
        const title = 'Разметка карточек';
        const prompt = `На странице есть элементы .card с data-score. Добавь класс is-hot всем карточкам, у которых score >= ${threshold}, и убери его у остальных.`;
        const signature = 'solve(document, threshold)';
        const starterBody = [
          'const cards = document.querySelectorAll(".card");',
          '// TODO: toggle the is-hot class based on data-score'
        ];
        const solutionBody = [
          'const cards = document.querySelectorAll(".card");',
          'for (const card of cards) {',
          '  const score = Number(card.dataset.score || 0);',
          '  card.classList.toggle("is-hot", score >= threshold);',
          '}'
        ];
        const fixture = {
          body: cards.map((card) => ({
            tag: 'div',
            id: card.id,
            className: 'card',
            attrs: { 'data-score': String(card.score) },
            text: `score:${card.score}`
          }))
        };
        const assertions = cards.map((card) => ({
          target: card.id,
          type: card.score >= threshold ? 'classContains' : 'classNotContains',
          value: 'is-hot'
        }));
        const tests = [
          {
            fixture,
            args: [threshold],
            assertions
          }
        ];
        return buildTaskFromParts({
          category: 'dom',
          difficulty,
          title,
          prompt,
          signature,
          starterBody,
          solutionBody,
          hints: ['Используй `querySelectorAll(".card")`.', 'Сравни `data-score` с порогом и переключай класс.'],
          explanation: 'Задача проверяет умение работать с коллекциями DOM-элементов, data-атрибутами и классами.',
          tests,
          strategy: 'dom',
          tags: ['dataset', 'classList']
        });
      }

      if (variant === 1) {
        const items = sampleWords(rng, rng.int(3, 5));
        const title = 'Сводка по списку';
        const prompt = `На странице есть #summary. Запиши в него количество элементов и количество уникальных значений из массива items = ${preview(items)}.`;
        const signature = 'solve(document, items)';
        const starterBody = [
          'const summary = document.getElementById("summary");',
          '// TODO: calculate the summary'
        ];
        const solutionBody = [
          'const summary = document.getElementById("summary");',
          'const unique = new Set(items);',
          'summary.textContent = `${items.length}/${unique.size}`;'
        ];
        const fixture = {
          body: [
            { tag: 'div', id: 'summary', className: 'summary', text: '' }
          ]
        };
        const tests = [
          {
            fixture,
            args: [items],
            assertions: [
              { target: 'summary', type: 'text', equals: `${items.length}/${new Set(items).size}` }
            ]
          }
        ];
        return buildTaskFromParts({
          category: 'dom',
          difficulty,
          title,
          prompt,
          signature,
          starterBody,
          solutionBody,
          hints: ['`Set` помогает посчитать уникальные значения.', 'Можно записать краткую сводку прямо в `textContent`.'],
          explanation: 'Такие мини-отчёты полезны для панелей статистики и фильтров.',
          tests,
          strategy: 'dom',
          tags: ['summary', 'set']
        });
      }

      const title = 'Сортировка и подсветка';
      const cards = samplePersons(rng, rng.int(4, 6)).map((person) => ({
        id: person.name,
        score: person.score
      }));
      const sorted = cards.slice().sort((left, right) => right.score - left.score);
      const prompt = `На странице есть контейнер #board и карточки с именами. Отсортируй карточки по score, запиши порядок имён в #board и подсвети карточку с максимальным score классом is-top.`;
      const signature = 'solve(document)';
      const starterBody = [
        'const board = document.getElementById("board");',
        '// TODO: sort the cards and highlight the top one'
      ];
      const solutionBody = [
        'const board = document.getElementById("board");',
        'const cards = Array.from(document.querySelectorAll(".card"));',
        'const sorted = cards.slice().sort((left, right) => Number(right.dataset.score || 0) - Number(left.dataset.score || 0));',
        'const topCard = sorted[0] || null;',
        'if (topCard) {',
        '  topCard.classList.add("is-top");',
        '}',
        'board.textContent = sorted.map((card) => card.id).join(" > ");'
      ];
      const fixture = {
        body: [
          { tag: 'section', id: 'board', className: 'board', text: '' },
          ...cards.map((card) => ({
            tag: 'div',
            id: card.id,
            className: 'card',
            attrs: { 'data-score': String(card.score) },
            text: card.id
          }))
        ]
      };
      const tests = [
        {
          fixture,
          assertions: [
            { target: 'board', type: 'text', equals: sorted.map((card) => card.id).join(' > ') },
            { target: sorted[0].id, type: 'classContains', value: 'is-top' }
          ]
        }
      ];
      return buildTaskFromParts({
        category: 'dom',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Сначала получи массив карточек через `querySelectorAll`.', 'Используй `sort`, а потом выдели первую карточку.'],
        explanation: 'Комбинация сортировки и визуальной подсветки часто встречается в рейтингах и списках лидеров.',
        tests,
        strategy: 'dom',
        tags: ['sort', 'highlight']
      });
    }
    case 'expert': {
      const variant = rng.int(0, 2);
      if (variant === 0) {
        const title = 'Счётчик кликов';
        const prompt = 'На странице есть кнопка #add, счётчик #count и список #log. Подпишись на клик так, чтобы счётчик увеличивался, а в список добавлялся новый элемент с номером клика.';
        const signature = 'solve(document)';
        const starterBody = [
          'const button = document.getElementById("add");',
          'const count = document.getElementById("count");',
          'const log = document.getElementById("log");',
          'let total = Number(count.textContent || 0);',
          '// TODO: update the counter and append a new <li> on each click'
        ];
        const solutionBody = [
          'const button = document.getElementById("add");',
          'const count = document.getElementById("count");',
          'const log = document.getElementById("log");',
          'let total = Number(count.textContent || 0);',
          'button.addEventListener("click", () => {',
          '  total += 1;',
          '  count.textContent = String(total);',
          '  const item = document.createElement("li");',
          '  item.textContent = `Клик ${total}`;',
          '  log.appendChild(item);',
          '});'
        ];
        const fixture = {
          body: [
            { tag: 'button', id: 'add', className: 'button', text: 'Add' },
            { tag: 'span', id: 'count', className: 'count', text: '0' },
            { tag: 'ul', id: 'log', className: 'log' }
          ]
        };
        const tests = [
          {
            fixture,
            actions: [
              { type: 'click', target: 'add' },
              { type: 'click', target: 'add' }
            ],
            assertions: [
              { target: 'count', type: 'text', equals: '2' },
              { target: 'log', type: 'count', equals: 2 },
              { target: 'log', type: 'exists', equals: true }
            ]
          }
        ];
        return buildTaskFromParts({
          category: 'dom',
          difficulty,
          title,
          prompt,
          signature,
          starterBody,
          solutionBody,
          hints: ['Сохрани счётчик в локальной переменной или замыкании.', 'После каждого клика обновляй текст и добавляй новый элемент списка.'],
          explanation: 'Экспертная DOM-задача показывает, как подписываться на события и синхронно обновлять несколько частей интерфейса.',
          tests,
          strategy: 'dom',
          tags: ['events', 'counter']
        });
      }

      if (variant === 1) {
        const title = 'Todo list';
        const prompt = 'На странице есть input #task, кнопка #add и список #list. По клику добавляй введённый текст в список, очищая input после добавления.';
        const signature = 'solve(document)';
        const starterBody = [
          'const input = document.getElementById("task");',
          'const button = document.getElementById("add");',
          'const list = document.getElementById("list");',
          '// TODO: wire the add button'
        ];
      const solutionBody = [
        'const input = document.getElementById("task");',
        'const button = document.getElementById("add");',
        'const list = document.getElementById("list");',
        'const items = [];',
        'button.addEventListener("click", () => {',
        '  const value = input.value.trim();',
        '  if (!value) {',
        '    return;',
        '  }',
        '  const item = document.createElement("li");',
        '  item.textContent = value;',
        '  items.push(value);',
        '  list.appendChild(item);',
        '  input.value = "";',
        '  list.textContent = items.join(", ");',
        '});'
      ];
        const fixture = {
          body: [
            { tag: 'input', id: 'task', className: 'task', value: '' },
            { tag: 'button', id: 'add', className: 'button', text: 'Add' },
            { tag: 'ul', id: 'list', className: 'list' }
          ]
        };
        const tests = [
          {
            fixture,
            actions: [
              { type: 'setValue', target: 'task', value: 'first' },
              { type: 'click', target: 'add' },
              { type: 'setValue', target: 'task', value: 'second' },
              { type: 'click', target: 'add' }
            ],
            assertions: [
              { target: 'list', type: 'count', equals: 2 },
              { target: 'list', type: 'text', equals: 'first, second' },
              { target: 'task', type: 'value', equals: '' }
            ]
          }
        ];
        return buildTaskFromParts({
          category: 'dom',
          difficulty,
          title,
          prompt,
          signature,
          starterBody,
          solutionBody,
          hints: ['Сделай обработчик клика и добавляй `li` с текстом из input.', 'Не забудь очистить поле после добавления.'],
          explanation: 'Todo list - классическая DOM-практика на события, создание элементов и обновление состояния.',
          tests,
          strategy: 'dom',
          tags: ['todo', 'events']
        });
      }

      const title = 'Переключение вкладок';
      const prompt = 'На странице есть кнопки .tab и панели .pane. По клику на кнопку активируй соответствующую панель и кнопку по data-tab.';
      const signature = 'solve(document)';
      const starterBody = [
        'const tabs = document.querySelectorAll(".tab");',
        'const panes = document.querySelectorAll(".pane");',
        '// TODO: switch the active tab and pane'
      ];
      const solutionBody = [
        'const tabs = document.querySelectorAll(".tab");',
        'const panes = document.querySelectorAll(".pane");',
        'const activate = (name) => {',
        '  for (const tab of tabs) {',
        '    tab.classList.toggle("is-active", tab.dataset.tab === name);',
        '  }',
        '  for (const pane of panes) {',
        '    pane.classList.toggle("is-active", pane.dataset.tab === name);',
        '  }',
        '};',
        'for (const tab of tabs) {',
        '  tab.addEventListener("click", () => activate(tab.dataset.tab));',
        '}',
        'activate(tabs[0] ? tabs[0].dataset.tab : "");'
      ];
      const fixture = {
        body: [
          { tag: 'button', id: 'tab-a', className: 'tab is-active', text: 'A', attrs: { 'data-tab': 'a' } },
          { tag: 'button', id: 'tab-b', className: 'tab', text: 'B', attrs: { 'data-tab': 'b' } },
          { tag: 'section', id: 'pane-a', className: 'pane is-active', text: 'Pane A', attrs: { 'data-tab': 'a' } },
          { tag: 'section', id: 'pane-b', className: 'pane', text: 'Pane B', attrs: { 'data-tab': 'b' } }
        ]
      };
      const tests = [
        {
          fixture,
          actions: [
            { type: 'click', target: 'tab-b' }
          ],
          assertions: [
            { target: 'tab-b', type: 'classContains', value: 'is-active' },
            { target: 'tab-a', type: 'classNotContains', value: 'is-active' },
            { target: 'pane-b', type: 'classContains', value: 'is-active' },
            { target: 'pane-a', type: 'classNotContains', value: 'is-active' }
          ]
        }
      ];
      return buildTaskFromParts({
        category: 'dom',
        difficulty,
        title,
        prompt,
        signature,
        starterBody,
        solutionBody,
        hints: ['Слушай клик на каждой вкладке и переключай классы.', 'По `data-tab` можно связать кнопку и панель.'],
        explanation: 'Переключение вкладок учит работе с коллекциями элементов, data-атрибутами и событиями.',
        tests,
        strategy: 'dom',
        tags: ['tabs', 'events']
      });
    }
    default:
      return buildDomTask('easy', rng);
  }
}

module.exports = {
  CATEGORY_META,
  CATEGORY_ORDER,
  DIFFICULTIES,
  DIFFICULTY_META,
  hashString,
  createRng,
  cloneJson,
  preview,
  capitalize,
  unique,
  sum,
  sampleWord,
  sampleName,
  sampleCity,
  sampleEmail,
  sampleNumbers,
  sampleWords,
  samplePersons,
  sampleIntervals,
  sampleText,
  makeTaskId,
  makeTask,
  buildTaskFromParts,
  normalizeCustomTask,
  createBasicConsoleBuffer,
  createTestState,
  buildCallableFromSpec,
  materializeTestValue,
  normalizeComparisonValue,
  resolveExportedFunction,
  executeTaskTests,
  resolveSeed,
  normalizeSelection,
  chooseCategory,
  chooseDifficulty,
  buildArraysTask,
  buildObjectsTask,
  buildFunctionsTask,
  buildClosuresTask,
  buildAsyncTask,
  buildAlgorithmsTask,
  buildDomTask,
  buildGeneratedTask,
  generateTask,
  runTaskTests,
  getProgressSummary,
  buildAchievements,
  createCustomTaskTemplate,
  normalizeCustomTask,
  xpForDifficulty
};
