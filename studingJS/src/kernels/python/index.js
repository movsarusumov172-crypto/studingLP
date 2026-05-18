const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildSafeProcessEnv, NATIVE_RUN_TIMEOUT_MS } = require('../../runtime/childProcessSafety');
const { pickVariantByKey, joinPromptParts, normalizeTextList } = require('../../engine/variantTaskBuilder');

const PYTHON_KERNEL_META = {
  id: 'python',
  title: 'Python',
  shortTitle: 'Py',
  family: 'backend',
  editorLanguage: 'python',
  strategies: ['simple', 'collection', 'recursion', 'algorithm'],
  strategyLabels: {
    simple: 'Обычная',
    collection: 'Коллекции',
    recursion: 'Рекурсия',
    algorithm: 'Алгоритм'
  },
  description: 'Полноценное ядро с генерацией Python-задач и запуском решений через локальный интерпретатор.',
  status: 'available',
  available: true,
  accent: '#facc15'
};

const CATEGORY_META = {
  variables: {
    title: 'Переменные',
    description: 'Присваивание, переопределение, распаковка и промежуточные расчёты',
    accent: '#38bdf8'
  },
  conditionals: {
    title: 'Условия',
    description: 'Ветвления, проверки и выбор результата по правилу',
    accent: '#f97316'
  },
  loops: {
    title: 'Циклы',
    description: 'Повторение, обход данных и накопление результата',
    accent: '#22c55e'
  },
  lists: {
    title: 'Списки',
    description: 'Срезы, фильтрация, сортировка и окна',
    accent: '#7dd3fc'
  },
  dicts: {
    title: 'Словари',
    description: 'Группировка, инверсия, слияние и нормализация',
    accent: '#f59e0b'
  },
  strings: {
    title: 'Строки',
    description: 'Очистка текста, поиск, парсинг и трансформация',
    accent: '#34d399'
  },
  functions: {
    title: 'Функции',
    description: 'Рекурсия, композиция и вспомогательные вычисления',
    accent: '#fb7185'
  },
  algorithms: {
    title: 'Алгоритмы',
    description: 'Поиск, интервалы, графы и динамика',
    accent: '#a78bfa'
  }
};

const CATEGORY_ORDER = Object.keys(CATEGORY_META);
const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];

const DIFFICULTY_META = {
  easy: { title: 'Лёгкий', xp: 12 },
  medium: { title: 'Средний', xp: 24 },
  hard: { title: 'Сложный', xp: 42 },
  expert: { title: 'Эксперт', xp: 72 }
};

const NAME_POOL = ['Ada', 'Mila', 'Nina', 'Oleg', 'Leo', 'Sara', 'Ilya', 'Zoe', 'Maks', 'Lina', 'Vera', 'Pavel', 'Rita', 'Artem', 'Noah', 'Iris'];
const WORD_POOL = ['alpha', 'beta', 'gamma', 'delta', 'omega', 'nova', 'pulse', 'vector', 'lumen', 'mint', 'orbit', 'spark', 'drift', 'tide', 'glow', 'zen', 'flux'];
const CITY_POOL = ['Berlin', 'Tokyo', 'Oslo', 'Lisbon', 'Prague', 'Riga', 'Milan', 'Helsinki', 'Athens', 'Seoul', 'Rome', 'Paris', 'Madrid', 'Dublin'];
const TAG_POOL = ['frontend', 'backend', 'data', 'infra', 'ai', 'mobile', 'design', 'ops', 'study', 'review'];

const CONTEXT_POOLS = {
  variables: [
    { id: 'budget', label: 'бюджет проекта', note: 'Сюжет: бюджет проекта.' },
    { id: 'profile', label: 'профиль пользователя', note: 'Сюжет: профиль пользователя.' },
    { id: 'inventory', label: 'остатки склада', note: 'Сюжет: остатки склада.' },
    { id: 'counter', label: 'счётчик события', note: 'Сюжет: счётчик события.' }
  ],
  conditionals: [
    { id: 'access', label: 'доступ к системе', note: 'Сюжет: доступ к системе.' },
    { id: 'status', label: 'статус операции', note: 'Сюжет: статус операции.' },
    { id: 'grading', label: 'оценка результата', note: 'Сюжет: оценка результата.' },
    { id: 'shipping', label: 'доставка заказа', note: 'Сюжет: доставка заказа.' }
  ],
  loops: [
    { id: 'records', label: 'записи журнала', note: 'Сюжет: записи журнала.' },
    { id: 'readings', label: 'показания датчика', note: 'Сюжет: показания датчика.' },
    { id: 'items', label: 'элементы очереди', note: 'Сюжет: элементы очереди.' },
    { id: 'events', label: 'события ленты', note: 'Сюжет: события ленты.' }
  ],
  lists: [
    { id: 'scores', label: 'баллы игроков', note: 'Сюжет: баллы игроков.' },
    { id: 'prices', label: 'цены товаров', note: 'Сюжет: цены товаров.' },
    { id: 'temperatures', label: 'температуры за день', note: 'Сюжет: температуры за день.' },
    { id: 'logs', label: 'события лога', note: 'Сюжет: события лога.' }
  ],
  dicts: [
    { id: 'profiles', label: 'профили пользователей', note: 'Сюжет: профили пользователей.' },
    { id: 'orders', label: 'заказы магазина', note: 'Сюжет: заказы магазина.' },
    { id: 'events', label: 'события лога', note: 'Сюжет: события лога.' },
    { id: 'metrics', label: 'метрики сервиса', note: 'Сюжет: метрики сервиса.' }
  ],
  strings: [
    { id: 'messages', label: 'сообщения чата', note: 'Сюжет: сообщения чата.' },
    { id: 'filenames', label: 'названия файлов', note: 'Сюжет: названия файлов.' },
    { id: 'emails', label: 'email-адреса', note: 'Сюжет: email-адреса.' },
    { id: 'descriptions', label: 'описания товаров', note: 'Сюжет: описания товаров.' }
  ],
  functions: [
    { id: 'calculations', label: 'расчёты', note: 'Сюжет: расчёты.' },
    { id: 'pipelines', label: 'пайплайны', note: 'Сюжет: пайплайны.' },
    { id: 'signals', label: 'сигналы', note: 'Сюжет: сигналы.' },
    { id: 'formulas', label: 'формулы', note: 'Сюжет: формулы.' }
  ],
  algorithms: [
    { id: 'routes', label: 'маршруты доставки', note: 'Сюжет: маршруты доставки.' },
    { id: 'intervals', label: 'интервалы времени', note: 'Сюжет: интервалы времени.' },
    { id: 'queues', label: 'очереди задач', note: 'Сюжет: очереди задач.' },
    { id: 'graphs', label: 'сети связей', note: 'Сюжет: сети связей.' }
  ]
};

const STRUCTURE_POOLS = {
  variables: [
    { id: 'pair', label: 'пара значений', note: 'Структура решения: два связанных значения.' },
    { id: 'triple', label: 'тройка шагов', note: 'Структура решения: три промежуточных шага.' },
    { id: 'bundle', label: 'пакет переменных', note: 'Структура решения: несколько переменных и итог.' }
  ],
  conditionals: [
    { id: 'single', label: 'одна проверка', note: 'Структура решения: одна основная проверка.' },
    { id: 'chain', label: 'цепочка веток', note: 'Структура решения: несколько веток if/elif/else.' },
    { id: 'guard', label: 'защитные проверки', note: 'Структура решения: ранние выходы и guard-ветки.' }
  ],
  loops: [
    { id: 'single', label: 'один проход', note: 'Структура решения: один проход по данным.' },
    { id: 'window', label: 'скользящий контроль', note: 'Структура решения: сохраняй окно или контекст.' },
    { id: 'sequence', label: 'последовательный учёт', note: 'Структура решения: считай шаг за шагом.' }
  ],
  lists: [
    { id: 'single', label: 'один вход', note: 'Структура решения: один входной список.' },
    { id: 'pair', label: 'пара входов', note: 'Структура решения: два связанных списка.' },
    { id: 'window', label: 'скользящее окно', note: 'Структура решения: работа через окно.' }
  ],
  dicts: [
    { id: 'single', label: 'один словарь', note: 'Структура решения: один словарь на вход.' },
    { id: 'nested', label: 'вложенная структура', note: 'Структура решения: работай с вложенными полями.' },
    { id: 'pair', label: 'пара словарей', note: 'Структура решения: сравни две структуры.' }
  ],
  strings: [
    { id: 'single', label: 'одна строка', note: 'Структура решения: одна строка на вход.' },
    { id: 'pair', label: 'строка и настройки', note: 'Структура решения: строка и вспомогательные параметры.' },
    { id: 'multi', label: 'несколько частей', note: 'Структура решения: несколько строковых частей.' }
  ],
  functions: [
    { id: 'single', label: 'один аргумент', note: 'Структура решения: один аргумент.' },
    { id: 'pair', label: 'пара аргументов', note: 'Структура решения: два аргумента.' },
    { id: 'multi', label: 'несколько аргументов', note: 'Структура решения: несколько аргументов.' }
  ],
  algorithms: [
    { id: 'single', label: 'одна последовательность', note: 'Структура решения: одна последовательность данных.' },
    { id: 'pair', label: 'две последовательности', note: 'Структура решения: сравни две последовательности.' },
    { id: 'multi', label: 'несколько входов', note: 'Структура решения: несколько связанных входов.' }
  ]
};

const CONSTRAINT_POOLS = {
  variables: [
    { id: 'use-intermediates', label: 'с промежуточными переменными', note: 'Ограничение: используй промежуточные переменные.' },
    { id: 'clear-names', label: 'с понятными именами', note: 'Ограничение: называй переменные понятно.' },
    { id: 'no-one-liner', label: 'без одной строки', note: 'Ограничение: не упаковывай всё в одну строку.' }
  ],
  conditionals: [
    { id: 'cover-all-branches', label: 'все ветки', note: 'Ограничение: обработай все возможные ветки.' },
    { id: 'guard-first', label: 'сначала защита', note: 'Ограничение: начни с защитной проверки.' },
    { id: 'explicit-branches', label: 'явные ветки', note: 'Ограничение: не прячь логику в сложные выражения.' }
  ],
  loops: [
    { id: 'one-pass', label: 'один проход', note: 'Ограничение: реши за один проход.' },
    { id: 'preserve-order', label: 'с сохранением порядка', note: 'Ограничение: сохрани порядок элементов.' },
    { id: 'no-builtins', label: 'без готовых помощников', note: 'Ограничение: не используй готовые агрегаты, если можно пройтись циклом.' }
  ],
  lists: [
    { id: 'no-mutation', label: 'без мутации', note: 'Ограничение: не меняй входной список на месте.' },
    { id: 'stable-order', label: 'с сохранением порядка', note: 'Ограничение: сохрани порядок первых появлений.' },
    { id: 'one-pass', label: 'один проход', note: 'Ограничение: реши за один проход.' }
  ],
  dicts: [
    { id: 'stable-keys', label: 'стабильные ключи', note: 'Ограничение: не меняй порядок ключей без причины.' },
    { id: 'no-extra-sort', label: 'без лишней сортировки', note: 'Ограничение: не сортируй там, где это не нужно.' },
    { id: 'nested-safe', label: 'безопасно для вложенности', note: 'Ограничение: учитывай вложенные структуры.' }
  ],
  strings: [
    { id: 'trim-input', label: 'trim входа', note: 'Ограничение: убери лишние пробелы.' },
    { id: 'case-insensitive', label: 'без учёта регистра', note: 'Ограничение: сравнивай без учёта регистра.' },
    { id: 'preserve-separators', label: 'с разделителями', note: 'Ограничение: не теряй разделители.' }
  ],
  functions: [
    { id: 'pure', label: 'чистая функция', note: 'Ограничение: не используй глобальное состояние.' },
    { id: 'no-loops', label: 'без циклов', note: 'Ограничение: реши без циклов там, где это возможно.' },
    { id: 'composable', label: 'компонуемая', note: 'Ограничение: сделай решение легко расширяемым.' }
  ],
  algorithms: [
    { id: 'optimize-time', label: 'по времени', note: 'Ограничение: уложись в разумную сложность.' },
    { id: 'window', label: 'скользящее окно', note: 'Ограничение: используй окно там, где оно уместно.' },
    { id: 'two-pointers', label: 'два указателя', note: 'Ограничение: попробуй два указателя.' }
  ]
};

let cachedPythonRuntime = null;
let extractedRunnerPath = null;

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

function normalizeCategory(value) {
  return CATEGORY_ORDER.includes(value) ? value : CATEGORY_ORDER[0];
}

function normalizeDifficulty(value) {
  return DIFFICULTIES.includes(value) ? value : 'easy';
}

function normalizeStrategy(value) {
  return PYTHON_KERNEL_META.strategies.includes(value) ? value : 'simple';
}

function xpForDifficulty(difficulty) {
  return DIFFICULTY_META[normalizeDifficulty(difficulty)]?.xp || 0;
}

function preview(value) {
  return JSON.stringify(value, null, 2);
}

function uniqueList(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));
}

function normalizeVariantPool(values) {
  return (Array.isArray(values) ? values : [])
    .map((item, index) => {
      if (item && typeof item === 'object') {
        const id = String(item.id || item.value || item.key || item.type || item.label || item.title || index);
        const label = String(item.label || item.title || item.text || item.note || id);
        const title = String(item.title || label);
        const note = item.note ? String(item.note).trim() : item.text ? String(item.text).trim() : '';
        return {
          ...item,
          id,
          label,
          title,
          note
        };
      }

      const text = item === null || item === undefined ? '' : String(item).trim();
      if (!text) {
        return null;
      }

      return {
        id: text,
        label: text,
        title: text,
        note: ''
      };
    })
    .filter(Boolean);
}

function inferAnswerFormat(sample) {
  if (Array.isArray(sample)) {
    return 'list';
  }
  if (sample === null || sample === undefined) {
    return 'none';
  }
  if (typeof sample === 'object') {
    return 'dict';
  }
  if (typeof sample === 'string') {
    return 'string';
  }
  if (typeof sample === 'number') {
    return 'number';
  }
  if (typeof sample === 'boolean') {
    return 'bool';
  }
  return 'value';
}

const VARIATION_PROFILES = {
  variables: {
    answerFormats: [
      { value: 'number', text: 'Верни число.' },
      { value: 'list', text: 'Верни список или пару значений.' },
      { value: 'dict', text: 'Верни словарь со сводкой расчёта.' }
    ],
    thinkingStyles: [
      { value: 'assign', text: 'Сначала сохрани промежуточные значения в переменные.' },
      { value: 'unpack', text: 'Используй распаковку или несколько присваиваний.' },
      { value: 'derive', text: 'Собери ответ через цепочку понятных шагов.' }
    ]
  },
  conditionals: {
    answerFormats: [
      { value: 'string', text: 'Верни строковую категорию.' },
      { value: 'number', text: 'Верни число или код статуса.' },
      { value: 'bool', text: 'Верни булево значение.' }
    ],
    thinkingStyles: [
      { value: 'branch', text: 'Сначала разложи все ветки по условиям.' },
      { value: 'guard', text: 'Начни с защитных проверок и ранних выходов.' },
      { value: 'compare', text: 'Сравни значения и выбери подходящую ветку.' }
    ]
  },
  loops: {
    answerFormats: [
      { value: 'number', text: 'Верни число.' },
      { value: 'list', text: 'Верни список.' },
      { value: 'dict', text: 'Верни словарь со сводкой цикла.' }
    ],
    thinkingStyles: [
      { value: 'scan', text: 'Проходи по данным один раз и копи результат.' },
      { value: 'accumulate', text: 'Держи промежуточный итог в переменной.' },
      { value: 'filter', text: 'На каждом шаге решай, добавлять ли элемент.' }
    ]
  },
  lists: {
    answerFormats: [
      { value: 'list', text: 'Верни список.' },
      { value: 'tuple', text: 'Верни кортеж или пару значений.' },
      { value: 'summary', text: 'Верни краткую сводку результата.' }
    ],
    thinkingStyles: [
      { value: 'scan', text: 'Сначала просканируй список, потом собери ответ.' },
      { value: 'rebuild', text: 'Собери новый список без мутаций.' },
      { value: 'window', text: 'Думай как про окно или проход по индексу.' }
    ]
  },
  dicts: {
    answerFormats: [
      { value: 'dict', text: 'Верни словарь.' },
      { value: 'list', text: 'Верни список пар или элементов.' },
      { value: 'summary', text: 'Верни объект-резюме.' }
    ],
    thinkingStyles: [
      { value: 'map', text: 'Сопоставляй ключи и значения аккуратно.' },
      { value: 'merge', text: 'Сначала слей данные, потом нормализуй результат.' },
      { value: 'invert', text: 'Думай через инверсию связей.' }
    ]
  },
  strings: {
    answerFormats: [
      { value: 'string', text: 'Верни строку.' },
      { value: 'dict', text: 'Верни словарь с метаданными о строке.' },
      { value: 'summary', text: 'Верни краткую сводку по тексту.' }
    ],
    thinkingStyles: [
      { value: 'clean', text: 'Сначала очисти текст, потом преобразуй его.' },
      { value: 'parse', text: 'Разбей строку на части и работай по сегментам.' },
      { value: 'rewrite', text: 'Переосмысли строку как нормализованный результат.' }
    ]
  },
  functions: {
    answerFormats: [
      { value: 'number', text: 'Верни число.' },
      { value: 'dict', text: 'Верни словарь с результатом и деталями.' },
      { value: 'summary', text: 'Верни краткую сводку вычисления.' }
    ],
    thinkingStyles: [
      { value: 'direct', text: 'Считай напрямую, шаг за шагом.' },
      { value: 'compose', text: 'Разбей задачу на маленькие функции.' },
      { value: 'accumulate', text: 'Держи промежуточный результат и обновляй его.' }
    ]
  },
  algorithms: {
    answerFormats: [
      { value: 'number', text: 'Верни число.' },
      { value: 'list', text: 'Верни список как итог.' },
      { value: 'dict', text: 'Верни словарь со сводкой.' }
    ],
    thinkingStyles: [
      { value: 'search', text: 'Сначала найди структуру, потом выдай ответ.' },
      { value: 'optimize', text: 'Сделай решение аккуратным по сложности.' },
      { value: 'decompose', text: 'Разбей задачу на понятные подшаги.' }
    ]
  }
};

function buildVariationMeta({
  category,
  difficulty,
  title,
  seed,
  tests,
  prompt,
  answerFormat,
  thinkingStyle,
  structureType,
  contextType,
  variationNotes
}) {
  const profile = VARIATION_PROFILES[category] || VARIATION_PROFILES.lists;
  const sampleExpected = Array.isArray(tests) && tests[0] ? tests[0].expected : undefined;
  const inferredAnswerFormat = inferAnswerFormat(sampleExpected);
  const resolvedAnswerFormat = answerFormat || inferredAnswerFormat || 'value';
  const variantKey = `${seed || title || 'python'}:${category}:${difficulty}:${title || ''}`;
  const thinkingPool = normalizeVariantPool(profile.thinkingStyles);
  const contextPool = normalizeVariantPool(CONTEXT_POOLS[category] || CONTEXT_POOLS.lists);
  const structurePool = normalizeVariantPool(STRUCTURE_POOLS[category] || STRUCTURE_POOLS.lists);
  const constraintPool = normalizeVariantPool(CONSTRAINT_POOLS[category] || CONSTRAINT_POOLS.lists);
  const pickedThinking = thinkingStyle
    ? {
        id: String(thinkingStyle).trim(),
        label: String(thinkingStyle).trim(),
        title: String(thinkingStyle).trim(),
        note: ''
      }
    : pickVariantByKey(`${variantKey}:thinking`, thinkingPool, thinkingPool[0]);
  const pickedContext = contextType
    ? {
        id: String(contextType).trim(),
        label: String(contextType).trim(),
        title: String(contextType).trim(),
        note: ''
      }
    : pickVariantByKey(`${variantKey}:context`, contextPool, contextPool[0]);
  const pickedStructure = structureType
    ? {
        id: String(structureType).trim(),
        label: String(structureType).trim(),
        title: String(structureType).trim(),
        note: ''
      }
    : pickVariantByKey(`${variantKey}:structure`, structurePool, structurePool[0]);
  const pickedConstraint = pickVariantByKey(`${variantKey}:constraint`, constraintPool, constraintPool[0]);
  const resolvedThinkingStyle = pickedThinking ? pickedThinking.id : category;
  const resolvedContextType = pickedContext ? pickedContext.id : category;
  const resolvedStructureType = pickedStructure ? pickedStructure.id : 'single';
  const resolvedConstraints = pickedConstraint ? [pickedConstraint.id] : [];
  const notes = uniqueList([
    ...(normalizeTextList(variationNotes)),
    pickedContext && pickedContext.note,
    `Сюжет: ${pickedContext && pickedContext.title ? pickedContext.title : category}.`,
    `Ожидаемый формат ответа: ${resolvedAnswerFormat}.`,
    pickedThinking && pickedThinking.note ? pickedThinking.note : `Подход: ${resolvedThinkingStyle}.`,
    pickedStructure && pickedStructure.note ? pickedStructure.note : `Структура решения: ${resolvedStructureType}.`,
    pickedConstraint && pickedConstraint.note ? pickedConstraint.note : null
  ]);

  const variantId = `python-${category}-${hashString([
    variantKey,
    resolvedContextType,
    resolvedStructureType,
    resolvedAnswerFormat,
    resolvedThinkingStyle,
    resolvedConstraints.join('|')
  ].join('::'))}`;

  return {
    answerFormat: resolvedAnswerFormat,
    thinkingStyle: resolvedThinkingStyle,
    structureType: resolvedStructureType,
    contextType: resolvedContextType,
    constraints: resolvedConstraints,
    variantId,
    variationNotes: notes,
    prompt: joinPromptParts(prompt, notes)
  };
}

function makeTaskId(category, difficulty, title, seed) {
  return `python-${category}-${difficulty}-${hashString(`python:${title}:${seed}`)}`;
}

function pythonCodeBlock(signature, bodyLines) {
  const lines = Array.isArray(bodyLines) && bodyLines.length > 0 ? bodyLines : ['pass'];
  return [`def ${signature}:`, ...lines.map((line) => `    ${line}`)].join('\n');
}

function makeTask(data) {
  const kernelId = 'python';
  return {
    id: data.id || makeTaskId(data.category, data.difficulty, data.title, data.seed || data.title),
    seed: data.seed || data.title,
    source: data.source || 'generated',
    createdAt: data.createdAt || null,
    kernelId,
    kernelTitle: PYTHON_KERNEL_META.title,
    kernelFamily: PYTHON_KERNEL_META.family,
    editorLanguage: PYTHON_KERNEL_META.editorLanguage,
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
    xp: data.xp || xpForDifficulty(data.difficulty),
    tags: Array.isArray(data.tags) ? data.tags : [],
    answerFormat: data.answerFormat || null,
    thinkingStyle: data.thinkingStyle || null,
    structureType: data.structureType || null,
    contextType: data.contextType || null,
    variantId: data.variantId || null,
    constraints: Array.isArray(data.constraints) ? data.constraints : [],
    variationNotes: Array.isArray(data.variationNotes) ? data.variationNotes : [],
    meta: data.meta || {},
    challengeType: data.challengeType || 'practice'
  };
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
  tags = [],
  challengeType = 'practice',
  seed = title,
  answerFormat,
  thinkingStyle,
  structureType,
  contextType,
  constraints,
  variationNotes,
  meta = {},
  source = 'generated',
  createdAt = null
}) {
  const resolvedSeed = seed || hashString([
    category,
    difficulty,
    title || '',
    prompt || '',
    signature || '',
    JSON.stringify(tests || [])
  ].join('::'));
  const variation = buildVariationMeta({
    category,
    difficulty,
    title,
    seed: resolvedSeed,
    tests,
    prompt,
    answerFormat,
    thinkingStyle,
    structureType,
    contextType,
    constraints,
    variationNotes
  });

  return makeTask({
    category,
    difficulty,
    title,
    prompt: variation.prompt,
    signature,
    starterCode: pythonCodeBlock(signature, starterBody),
    solution: pythonCodeBlock(signature, solutionBody),
    hints,
    explanation,
    tests,
    strategy,
    seed: resolvedSeed,
    tags: uniqueList([...tags, category, variation.answerFormat, variation.thinkingStyle, variation.structureType, variation.contextType]),
    challengeType,
    answerFormat: variation.answerFormat,
    thinkingStyle: variation.thinkingStyle,
    structureType: variation.structureType,
    contextType: variation.contextType,
    constraints: Array.isArray(variation.constraints) ? variation.constraints.slice() : [],
    variantId: variation.variantId,
    variationNotes: variation.variationNotes,
    meta: {
      ...meta,
      answerFormat: variation.answerFormat,
      thinkingStyle: variation.thinkingStyle,
      structureType: variation.structureType,
      contextType: variation.contextType,
      constraints: Array.isArray(variation.constraints) ? variation.constraints.slice() : [],
      variantId: variation.variantId,
      variationNotes: variation.variationNotes
    },
    source,
    createdAt
  });
}

function normalizeSelection(value, fallback) {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback.slice();
  }
  const filtered = value.filter((item) => fallback.includes(item));
  return filtered.length > 0 ? filtered : fallback.slice();
}

function resolveSeed(options) {
  return options?.seed || options?.seriesIndex || `${options?.mode || 'practice'}:${options?.kernelId || 'python'}:${Date.now()}`;
}

function randomNumbers(rng, count, min, max) {
  return Array.from({ length: count }, () => rng.int(min, max));
}

function randomWords(rng, count) {
  return rng.sample(WORD_POOL, count).map((word) => `${word}${rng.int(1, 9)}`);
}

function randomNames(rng, count) {
  return rng.sample(NAME_POOL, count);
}

function randomCities(rng, count) {
  return rng.sample(CITY_POOL, count);
}

function randomTags(rng, count) {
  return rng.sample(TAG_POOL, count);
}

function reverseList(values) {
  return values.slice().reverse();
}

function filterMinimum(values, threshold) {
  return values.filter((value) => value >= threshold);
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

function rotateLeft(values, offset) {
  if (values.length === 0) {
    return [];
  }
  const shift = offset % values.length;
  return values.slice(shift).concat(values.slice(0, shift));
}

function mergeSortedLists(left, right) {
  return left.concat(right).slice().sort((a, b) => a - b);
}

function chunkList(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
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

function prefixSums(values) {
  const result = [];
  let total = 0;
  for (const value of values) {
    total += value;
    result.push(total);
  }
  return result;
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

function countByInitial(words) {
  const result = {};
  for (const word of words) {
    const key = word[0].toLowerCase();
    result[key] = (result[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

function mergeWithDefaults(profile, defaults) {
  return Object.fromEntries(
    Object.entries({
      ...defaults,
      ...profile
    }).sort(([a], [b]) => a.localeCompare(b))
  );
}

function groupByCity(records) {
  const result = {};
  for (const record of records) {
    if (!result[record.city]) {
      result[record.city] = [];
    }
    result[record.city].push(record.name);
  }
  return Object.fromEntries(
    Object.entries(result)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([city, names]) => [city, names.slice()])
  );
}

function invertMapping(mapping) {
  const result = {};
  for (const [name, team] of Object.entries(mapping)) {
    if (!result[team]) {
      result[team] = [];
    }
    result[team].push(name);
  }
  return Object.fromEntries(
    Object.entries(result)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([team, names]) => [team, names.slice().sort((a, b) => a.localeCompare(b))])
  );
}

function flattenDict(value, prefix = '', output = {}) {
  for (const [key, item] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      flattenDict(item, nextKey, output);
    } else {
      output[nextKey] = item;
    }
  }
  return output;
}

function sumNumericDicts(left, right) {
  const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort((a, b) => a.localeCompare(b));
  return Object.fromEntries(keys.map((key) => [key, Number(left[key] || 0) + Number(right[key] || 0)]));
}

function countPrimes(values) {
  const isPrime = (value) => {
    const number = Math.abs(Number(value));
    if (number < 2) {
      return false;
    }
    for (let divider = 2; divider * divider <= number; divider += 1) {
      if (number % divider === 0) {
        return false;
      }
    }
    return true;
  };
  return values.filter((value) => isPrime(value)).length;
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
  return [];
}

function longestUniqueSubstring(text) {
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
}

function topologicalSort(nodes, edges) {
  const adjacency = new Map(nodes.map((node) => [node, []]));
  const incoming = new Map(nodes.map((node) => [node, 0]));
  for (const [from, to] of edges) {
    if (!adjacency.has(from) || !incoming.has(to)) {
      continue;
    }
    adjacency.get(from).push(to);
    incoming.set(to, incoming.get(to) + 1);
  }
  const queue = nodes.filter((node) => incoming.get(node) === 0);
  const result = [];
  while (queue.length > 0) {
    const node = queue.shift();
    result.push(node);
    for (const next of adjacency.get(node) || []) {
      incoming.set(next, incoming.get(next) - 1);
      if (incoming.get(next) === 0) {
        queue.push(next);
      }
    }
  }
  return result;
}

function reverseIndex(records) {
  const result = {};
  for (const record of records) {
    for (const tag of record.tags) {
      if (!result[tag]) {
        result[tag] = [];
      }
      result[tag].push(record.id);
    }
  }
  return Object.fromEntries(
    Object.entries(result)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, ids]) => [tag, ids.slice().sort((a, b) => a.localeCompare(b))])
  );
}

function normalizeSpaces(text) {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function reverseWords(text) {
  return text.trim().split(/\s+/).reverse().join(' ');
}

function longestWord(text) {
  const words = text.match(/[A-Za-z0-9]+/g) || [];
  let best = '';
  for (const word of words) {
    if (word.length > best.length) {
      best = word;
    }
  }
  return best;
}

function countVowelsAndConsonants(text) {
  const vowels = new Set(['a', 'e', 'i', 'o', 'u', 'y', 'а', 'е', 'ё', 'и', 'о', 'у', 'ы', 'э', 'ю', 'я']);
  let vowelCount = 0;
  let consonantCount = 0;
  for (const char of text.toLowerCase()) {
    if (!/[a-zа-яё]/i.test(char)) {
      continue;
    }
    if (vowels.has(char)) {
      vowelCount += 1;
    } else {
      consonantCount += 1;
    }
  }
  return {
    vowels: vowelCount,
    consonants: consonantCount
  };
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

function parsePairs(text) {
  const result = {};
  text.split(';').forEach((part) => {
    const [rawKey, rawValue] = part.split('=');
    const key = (rawKey || '').trim();
    const value = (rawValue || '').trim();
    if (key) {
      result[key] = value;
    }
  });
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

function replacePlaceholders(template, values) {
  return template.replace(/\{([^}]+)\}/g, (_, key) => String(values[key] ?? ''));
}

function sumDigits(value) {
  return String(Math.abs(Number(value) || 0))
    .split('')
    .reduce((sum, char) => sum + Number(char), 0);
}

function factorial(value) {
  let total = 1;
  for (let index = 2; index <= Math.max(0, Number(value) || 0); index += 1) {
    total *= index;
  }
  return total;
}

function sumNestedNumbers(value) {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + sumNestedNumbers(item), 0);
  }
  return typeof value === 'number' ? value : 0;
}

function applyOperations(value, operations) {
  let current = value;
  for (const operation of operations) {
    switch (operation.op) {
      case 'add':
        current += operation.value;
        break;
      case 'mul':
        current *= operation.value;
        break;
      case 'pow':
        current = current ** operation.value;
        break;
      case 'clamp':
        current = Math.max(operation.min, Math.min(operation.max, current));
        break;
      case 'mod':
        current %= operation.value;
        break;
      default:
        break;
    }
  }
  return current;
}

function fibonacci(value) {
  const n = Math.max(0, Number(value) || 0);
  if (n <= 1) {
    return n;
  }
  let a = 0;
  let b = 1;
  for (let index = 2; index <= n; index += 1) {
    [a, b] = [b, a + b];
  }
  return b;
}

function gcdPair(a, b) {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right !== 0) {
    [left, right] = [right, left % right];
  }
  return left;
}

function gcdArray(values) {
  return values.reduce((result, value) => gcdPair(result, value), 0);
}

function validBrackets(text) {
  const stack = [];
  const pairs = {
    ')': '(',
    ']': '[',
    '}': '{'
  };
  for (const char of text) {
    if ('([{'.includes(char)) {
      stack.push(char);
    } else if (pairs[char]) {
      if (stack.pop() !== pairs[char]) {
        return false;
      }
    }
  }
  return stack.length === 0;
}

function binarySearch(values, target) {
  let left = 0;
  let right = values.length - 1;
  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
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

function twoSumIndices(values, target) {
  const indexes = new Map();
  for (let index = 0; index < values.length; index += 1) {
    const needed = target - values[index];
    if (indexes.has(needed)) {
      return [indexes.get(needed), index];
    }
    indexes.set(values[index], index);
  }
  return [-1, -1];
}

function mergeIntervals(intervals) {
  if (intervals.length === 0) {
    return [];
  }
  const sorted = intervals
    .map((interval) => interval.slice())
    .sort((a, b) => a[0] - b[0]);
  const result = [sorted[0]];
  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const last = result[result.length - 1];
    if (current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      result.push(current);
    }
  }
  return result;
}

function longestUniqueSubstring(text) {
  const seen = new Map();
  let start = 0;
  let best = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (seen.has(char) && seen.get(char) >= start) {
      start = seen.get(char) + 1;
    }
    seen.set(char, index);
    best = Math.max(best, index - start + 1);
  }
  return best;
}

function shortestPathGrid(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const queue = [[0, 0, 1]];
  const visited = new Set(['0,0']);
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  while (queue.length > 0) {
    const [row, col, distance] = queue.shift();
    if (row === rows - 1 && col === cols - 1) {
      return distance;
    }
    for (const [dr, dc] of directions) {
      const nextRow = row + dr;
      const nextCol = col + dc;
      const key = `${nextRow},${nextCol}`;
      if (
        nextRow >= 0 &&
        nextRow < rows &&
        nextCol >= 0 &&
        nextCol < cols &&
        grid[nextRow][nextCol] === 0 &&
        !visited.has(key)
      ) {
        visited.add(key);
        queue.push([nextRow, nextCol, distance + 1]);
      }
    }
  }
  return -1;
}

function buildPythonTaskMeta(title, category, difficulty, prompt, signature, starterBody, solutionBody, tests, options = {}) {
  let starterLines = starterBody;
  let solutionLines = solutionBody;
  let testCases = tests;
  let taskOptions = options;

  if (!Array.isArray(testCases) && Array.isArray(solutionLines)) {
    const looksLikeTestCases = solutionLines.length > 0 && solutionLines.every((item) => item && typeof item === 'object' && ('args' in item || 'expected' in item));
    if (looksLikeTestCases) {
      taskOptions = options || {};
      testCases = solutionLines;
      solutionLines = starterLines;
      starterLines = ['# TODO', 'pass'];
    }
  }

  return buildTaskFromParts({
    category,
    difficulty,
    title,
    prompt,
    signature,
    starterBody: starterLines,
    solutionBody: solutionLines,
    hints: taskOptions.hints || [],
    explanation: taskOptions.explanation || '',
    tests: testCases,
    strategy: taskOptions.strategy || 'simple',
    tags: taskOptions.tags || [],
    challengeType: taskOptions.challengeType || 'practice',
    seed: taskOptions.seed || title,
    answerFormat: taskOptions.answerFormat || null,
    thinkingStyle: taskOptions.thinkingStyle || null,
    structureType: taskOptions.structureType || null,
    contextType: taskOptions.contextType || null,
    constraints: Array.isArray(taskOptions.constraints) ? taskOptions.constraints : [],
    variationNotes: taskOptions.variationNotes || []
  });
}

function topicTraceMeta(topicId, topicTitle, extra = {}) {
  return {
    ...extra,
    practiceTopicId: topicId,
    practiceTopicTitle: topicTitle
  };
}

function buildPythonTopicTask(options = {}) {
  const topicId = typeof options.practiceTopicId === 'string' ? options.practiceTopicId.trim() : '';
  const topicTitle = typeof options.practiceTopicTitle === 'string' && options.practiceTopicTitle.trim()
    ? options.practiceTopicTitle.trim()
    : topicId;
  const difficulties = normalizeSelection(options.difficulties, DIFFICULTIES);
  const difficulty = difficulties.includes(options.focusDifficulty) ? options.focusDifficulty : 'easy';
  const seed = `${resolveSeed(options)}:${topicId}`;

  const makeTopicTask = (parts) => buildTaskFromParts({
    ...parts,
    difficulty,
    seed,
    tags: [topicId, ...(parts.tags || [])],
    meta: topicTraceMeta(topicId, topicTitle, parts.meta)
  });

  switch (topicId) {
    case 'variables':
      return makeTopicTask({
        category: 'variables',
        title: 'Переупаковка профиля',
        prompt: `Практика темы "${topicTitle}". Даны name и age. Сохрани промежуточные значения в переменные и верни строку "name:age".`,
        signature: 'solve(name, age)',
        starterBody: ['return ""'],
        solutionBody: ['label = name.strip()', 'years = int(age)', 'return f"{label}:{years}"'],
        hints: ['Сохрани очищенное имя в отдельную переменную.', 'age можно привести через int.'],
        explanation: `${topicTitle}: переменные делают последовательность преобразований явной.`,
        tests: [
          { args: [' Mila ', 21], expected: 'Mila:21' },
          { args: ['Oleg', '18'], expected: 'Oleg:18' }
        ],
        strategy: 'simple',
        tags: ['variables', 'assignment']
      });
    case 'types':
      return makeTopicTask({
        category: 'variables',
        title: 'Опиши тип значения',
        prompt: `Практика темы "${topicTitle}". Верни имя базового типа: bool, int, float, str, list или other.`,
        signature: 'solve(value)',
        starterBody: ['return "other"'],
        solutionBody: [
          'if isinstance(value, bool):',
          '    return "bool"',
          'if isinstance(value, int):',
          '    return "int"',
          'if isinstance(value, float):',
          '    return "float"',
          'if isinstance(value, str):',
          '    return "str"',
          'if isinstance(value, list):',
          '    return "list"',
          'return "other"'
        ],
        hints: ['bool проверяй до int.', 'isinstance подходит для базовой классификации.'],
        explanation: `${topicTitle}: в Python bool является подклассом int, порядок проверок важен.`,
        tests: [
          { args: [true], expected: 'bool' },
          { args: [[1, 2]], expected: 'list' }
        ],
        strategy: 'simple',
        tags: ['types', 'isinstance']
      });
    case 'conditionals':
      return makeTopicTask({
        category: 'conditionals',
        title: 'Статус доступа',
        prompt: `Практика темы "${topicTitle}". Верни "deny" для заблокированного пользователя, "adult" для 18+, иначе "minor".`,
        signature: 'solve(age, blocked)',
        starterBody: ['return "deny"'],
        solutionBody: ['if blocked:', '    return "deny"', 'if age >= 18:', '    return "adult"', 'return "minor"'],
        hints: ['Сначала обработай защитную ветку blocked.', 'После этого проверь возраст.'],
        explanation: `${topicTitle}: порядок if/elif/else определяет результат.`,
        tests: [
          { args: [20, false], expected: 'adult' },
          { args: [16, true], expected: 'deny' },
          { args: [15, false], expected: 'minor' }
        ],
        strategy: 'simple',
        tags: ['if', 'guard']
      });
    case 'loops':
      return makeTopicTask({
        category: 'loops',
        title: 'Сумма положительных',
        prompt: `Практика темы "${topicTitle}". Пройди по values циклом и верни сумму только положительных чисел.`,
        signature: 'solve(values)',
        starterBody: ['return 0'],
        solutionBody: ['total = 0', 'for value in values:', '    if value > 0:', '        total += value', 'return total'],
        hints: ['Нужен аккумулятор total.', 'Увеличивай его только для value > 0.'],
        explanation: `${topicTitle}: цикл с аккумулятором — базовая техника обхода.`,
        tests: [
          { args: [[1, -2, 3, 0]], expected: 4 },
          { args: [[-5, 10, 2]], expected: 12 }
        ],
        strategy: 'simple',
        tags: ['loop', 'accumulate']
      });
    case 'functions':
      return makeTopicTask({
        category: 'functions',
        title: 'Вспомогательная функция скидки',
        prompt: `Практика темы "${topicTitle}". Посчитай итоговые цены после discount_percent через вложенную helper-функцию.`,
        signature: 'solve(prices, discount_percent)',
        starterBody: ['return prices'],
        solutionBody: [
          'def apply_discount(price):',
          '    return round(price * (100 - discount_percent) / 100, 2)',
          'return [apply_discount(price) for price in prices]'
        ],
        hints: ['Вынеси формулу в локальную функцию.', 'round(..., 2) стабилизирует деньги.'],
        explanation: `${topicTitle}: маленькая функция делает трансформацию переиспользуемой.`,
        tests: [
          { args: [[100, 50], 10], expected: [90, 45] },
          { args: [[19.99], 25], expected: [14.99] }
        ],
        strategy: 'simple',
        tags: ['function', 'helper']
      });
    case 'lists':
      return makeTopicTask({
        category: 'lists',
        title: 'Срез последних элементов',
        prompt: `Практика темы "${topicTitle}". Верни последние count элементов списка, не меняя исходный список.`,
        signature: 'solve(values, count)',
        starterBody: ['return values'],
        solutionBody: ['if count <= 0:', '    return []', 'return values[-count:]'],
        hints: ['Отрицательный индекс берёт элементы с конца.', 'Обработай count <= 0 отдельно.'],
        explanation: `${topicTitle}: срезы создают новый список без мутации исходного.`,
        tests: [
          { args: [[1, 2, 3, 4], 2], expected: [3, 4] },
          { args: [['a', 'b'], 0], expected: [] }
        ],
        strategy: 'collection',
        tags: ['list', 'slice']
      });
    case 'dicts':
      return makeTopicTask({
        category: 'dicts',
        title: 'Счётчик статусов',
        prompt: `Практика темы "${topicTitle}". По списку заказов верни словарь количества заказов по status.`,
        signature: 'solve(orders)',
        starterBody: ['return {}'],
        solutionBody: ['counts = {}', 'for order in orders:', '    status = order.get("status", "unknown")', '    counts[status] = counts.get(status, 0) + 1', 'return counts'],
        hints: ['dict.get помогает читать значение с запасным вариантом.', 'counts[status] увеличивается на 1.'],
        explanation: `${topicTitle}: словарь хорошо подходит для частот и группировок.`,
        tests: [
          { args: [[{ status: 'new' }, { status: 'done' }, { status: 'new' }]], expected: { new: 2, done: 1 } },
          { args: [[{}, { status: 'new' }]], expected: { unknown: 1, new: 1 } }
        ],
        strategy: 'collection',
        tags: ['dict', 'count']
      });
    case 'tuples':
      return makeTopicTask({
        category: 'lists',
        title: 'Координата как кортеж',
        prompt: `Практика темы "${topicTitle}". Дан список точек [x, y]. Верни список кортежей (x, y), где x и y поменяны местами.`,
        signature: 'solve(points)',
        starterBody: ['return points'],
        solutionBody: ['return [(y, x) for x, y in points]'],
        hints: ['Распакуй пару прямо в for.', 'Круглые скобки создают tuple.'],
        explanation: `${topicTitle}: кортежи удобны для фиксированных пар значений.`,
        tests: [
          { args: [[[1, 2], [3, 4]]], expected: [[2, 1], [4, 3]] },
          { args: [[[-1, 5]]], expected: [[5, -1]] }
        ],
        strategy: 'collection',
        tags: ['tuple', 'unpack']
      });
    case 'strings':
      return makeTopicTask({
        category: 'strings',
        title: 'Нормализация slug',
        prompt: `Практика темы "${topicTitle}". Убери лишние пробелы, приведи строку к нижнему регистру и замени пробелы дефисами.`,
        signature: 'solve(text)',
        starterBody: ['return text'],
        solutionBody: ['parts = text.strip().lower().split()', 'return "-".join(parts)'],
        hints: ['split без аргументов схлопывает пробелы.', 'join собирает части через дефис.'],
        explanation: `${topicTitle}: строковые методы удобно комбинируются в pipeline.`,
        tests: [
          { args: ['  Hello   Python  '], expected: 'hello-python' },
          { args: ['Async Await'], expected: 'async-await' }
        ],
        strategy: 'simple',
        tags: ['string', 'slug']
      });
    case 'exceptions':
      return makeTopicTask({
        category: 'functions',
        title: 'Безопасный int',
        prompt: `Практика темы "${topicTitle}". Попробуй преобразовать text в int. Если не получилось, верни None.`,
        signature: 'solve(text)',
        starterBody: ['return int(text)'],
        solutionBody: ['try:', '    return int(text)', 'except ValueError:', '    return None'],
        hints: ['int бросает ValueError для плохого текста.', 'except должен вернуть запасное значение.'],
        explanation: `${topicTitle}: try/except переводит ожидаемую ошибку в контролируемый ответ.`,
        tests: [
          { args: ['42'], expected: 42 },
          { args: ['x7'], expected: null }
        ],
        strategy: 'simple',
        tags: ['exception', 'try']
      });
    case 'closures':
      return makeTopicTask({
        category: 'functions',
        title: 'Замкнутый множитель',
        prompt: `Практика темы "${topicTitle}". Создай внутреннюю функцию, которая помнит factor, и примени её ко всем numbers.`,
        signature: 'solve(numbers, factor)',
        starterBody: ['return numbers'],
        solutionBody: ['def multiply(value):', '    return value * factor', 'return [multiply(value) for value in numbers]'],
        hints: ['multiply читает factor из внешней функции.', 'Это и есть замыкание.'],
        explanation: `${topicTitle}: внутренняя функция сохраняет доступ к переменной factor.`,
        tests: [
          { args: [[1, 2, 3], 4], expected: [4, 8, 12] },
          { args: [[-1, 5], 2], expected: [-2, 10] }
        ],
        strategy: 'recursion',
        tags: ['closure', 'nested-function']
      });
    case 'lambda':
      return makeTopicTask({
        category: 'functions',
        title: 'Сортировка lambda-ключом',
        prompt: `Практика темы "${topicTitle}". Отсортируй users по score по убыванию и верни список имён.`,
        signature: 'solve(users)',
        starterBody: ['return []'],
        solutionBody: ['ordered = sorted(users, key=lambda user: user["score"], reverse=True)', 'return [user["name"] for user in ordered]'],
        hints: ['key принимает функцию.', 'lambda user: user["score"] достаёт поле сортировки.'],
        explanation: `${topicTitle}: lambda удобна как короткий key/callback.`,
        tests: [
          { args: [[{ name: 'Ada', score: 5 }, { name: 'Lin', score: 9 }]], expected: ['Lin', 'Ada'] },
          { args: [[{ name: 'A', score: 1 }, { name: 'B', score: 1 }]], expected: ['A', 'B'] }
        ],
        strategy: 'collection',
        tags: ['lambda', 'sorted']
      });
    case 'imports':
      return makeTopicTask({
        category: 'functions',
        title: 'Импорт math.sqrt',
        prompt: `Практика темы "${topicTitle}". Используй import math внутри функции и верни квадратные корни чисел, округлённые до 2 знаков.`,
        signature: 'solve(values)',
        starterBody: ['return values'],
        solutionBody: ['import math', 'return [round(math.sqrt(value), 2) for value in values]'],
        hints: ['Импорт можно делать внутри функции.', 'math.sqrt возвращает float.'],
        explanation: `${topicTitle}: модуль math подключает готовые математические функции.`,
        tests: [
          { args: [[4, 9, 2]], expected: [2, 3, 1.41] },
          { args: [[16]], expected: [4] }
        ],
        strategy: 'simple',
        tags: ['import', 'math']
      });
    case 'oop':
      return makeTopicTask({
        category: 'functions',
        title: 'Класс Counter',
        prompt: `Практика темы "${topicTitle}". Создай класс Counter с методом inc и верни результаты трёх вызовов.`,
        signature: 'solve(start)',
        starterBody: ['return []'],
        solutionBody: [
          'class Counter:',
          '    def __init__(self, value):',
          '        self.value = value',
          '    def inc(self):',
          '        self.value += 1',
          '        return self.value',
          'counter = Counter(start)',
          'return [counter.inc(), counter.inc(), counter.inc()]'
        ],
        hints: ['self.value хранит состояние экземпляра.', 'Метод inc должен вернуть новое значение.'],
        explanation: `${topicTitle}: объект объединяет состояние и поведение.`,
        tests: [
          { args: [0], expected: [1, 2, 3] },
          { args: [7], expected: [8, 9, 10] }
        ],
        strategy: 'simple',
        tags: ['class', 'oop']
      });
    case 'comprehensions-generators':
      return makeTopicTask({
        category: 'lists',
        title: 'Comprehension квадратов',
        prompt: `Практика темы "${topicTitle}". Верни квадраты только чётных чисел через list comprehension.`,
        signature: 'solve(values)',
        starterBody: ['return []'],
        solutionBody: ['return [value * value for value in values if value % 2 == 0]'],
        hints: ['Фильтр if можно поставить в конце comprehension.', 'Выражение слева задаёт новый элемент.'],
        explanation: `${topicTitle}: comprehension совмещает map и filter в одной читаемой строке.`,
        tests: [
          { args: [[1, 2, 3, 4]], expected: [4, 16] },
          { args: [[-2, 5, 6]], expected: [4, 36] }
        ],
        strategy: 'collection',
        tags: ['comprehension', 'filter']
      });
    case 'decorators':
      return makeTopicTask({
        category: 'functions',
        title: 'Мини-декоратор результата',
        prompt: `Практика темы "${topicTitle}". Напиши внутренний декоратор, который оборачивает результат функции в словарь {"result": value}.`,
        signature: 'solve(value)',
        starterBody: ['return value'],
        solutionBody: [
          'def boxed(fn):',
          '    def wrapper(arg):',
          '        return {"result": fn(arg)}',
          '    return wrapper',
          '@boxed',
          'def double(arg):',
          '    return arg * 2',
          'return double(value)'
        ],
        hints: ['Декоратор принимает функцию и возвращает wrapper.', '@boxed применяет его к double.'],
        explanation: `${topicTitle}: декоратор меняет поведение функции без изменения её тела.`,
        tests: [
          { args: [5], expected: { result: 10 } },
          { args: [-2], expected: { result: -4 } }
        ],
        strategy: 'simple',
        tags: ['decorator', 'wrapper']
      });
    case 'context-managers-files':
      return makeTopicTask({
        category: 'strings',
        title: 'Имитация with-блока',
        prompt: `Практика темы "${topicTitle}". Даны строки файла. Верни непустые строки без пробелов по краям, как после безопасного чтения через with open(...).`,
        signature: 'solve(lines)',
        starterBody: ['return lines'],
        solutionBody: ['return [line.strip() for line in lines if line.strip()]'],
        hints: ['strip очищает края строки.', 'Пустые строки можно отфильтровать тем же strip.'],
        explanation: `${topicTitle}: с файлами часто читают строки и нормализуют их внутри context manager.`,
        tests: [
          { args: [['  alpha  ', '', ' beta']], expected: ['alpha', 'beta'] },
          { args: [[' one ', '   ']], expected: ['one'] }
        ],
        strategy: 'collection',
        tags: ['context-manager', 'files']
      });
    case 'typing-dataclasses':
      return makeTopicTask({
        category: 'dicts',
        title: 'Dataclass-подобная задача',
        prompt: `Практика темы "${topicTitle}". Нормализуй словарь задачи: title обязателен, done по умолчанию False.`,
        signature: 'solve(raw)',
        starterBody: ['return raw'],
        solutionBody: ['return {"title": str(raw["title"]), "done": bool(raw.get("done", False))}'],
        hints: ['done может отсутствовать.', 'Верни новый словарь с ожидаемыми типами.'],
        explanation: `${topicTitle}: dataclass фиксирует поля и значения по умолчанию; здесь тренируем ту же модель данных.`,
        tests: [
          { args: [{ title: 'Учить Python' }], expected: { title: 'Учить Python', done: false } },
          { args: [{ title: 123, done: 1 }], expected: { title: '123', done: true } }
        ],
        strategy: 'collection',
        tags: ['typing', 'dataclass']
      });
    case 'async-await':
      return makeTopicTask({
        category: 'functions',
        title: 'План async-результатов',
        prompt: `Практика темы "${topicTitle}". В Python async/await результаты часто собирают после ожидания. Здесь получи список ответов и верни только успешные payload в исходном порядке.`,
        signature: 'solve(responses)',
        starterBody: ['return []'],
        solutionBody: ['return [response["payload"] for response in responses if response.get("ok")]'],
        hints: ['Отфильтруй ok-ответы.', 'Сохрани порядок исходного списка.'],
        explanation: `${topicTitle}: после await/gather часто нужна аккуратная обработка успешных результатов.`,
        tests: [
          { args: [[{ ok: true, payload: 'user' }, { ok: false, payload: 'posts' }, { ok: true, payload: 'stats' }]], expected: ['user', 'stats'] },
          { args: [[{ ok: false, payload: 1 }]], expected: [] }
        ],
        strategy: 'collection',
        tags: ['async-await', 'responses']
      });
    default:
      return null;
  }
}

function buildListsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const values = randomNumbers(rng, rng.int(5, 8), -12, 24);
      const title = 'Обратный порядок списка';
      const prompt = `Дан список ${preview(values)}. Верни новый список в обратном порядке, не меняя исходный.`;
      const tests = [
        { args: [values], expected: reverseList(values) },
        { args: [[1, 2, 3, 4]], expected: [4, 3, 2, 1] }
      ];
      return buildPythonTaskMeta(title, 'lists', difficulty, prompt, 'solve(values)', ['# Верни новый список в обратном порядке', 'pass'], ['return list(reversed(values))'], tests, {
        hints: ['Используй срез `values[::-1]` или `reversed(values)`.', 'Не изменяй исходный список на месте.'],
        explanation: 'Задача проверяет базовую работу со списками и копированием данных.',
        strategy: 'collection',
        tags: ['reverse', 'slice'],
        seed: `reverse:${values.join(',')}`
      });
    }
    case 'medium': {
      const values = rng.sample(randomNumbers(rng, rng.int(7, 10), 0, 18), rng.int(5, 8));
      const title = 'Удаление дубликатов';
      const prompt = `Дан список ${preview(values)}. Верни его без дубликатов, сохранив первое появление каждого элемента.`;
      const tests = [
        { args: [values], expected: dedupePreserveOrder(values) },
        { args: [[3, 3, 2, 1, 2, 4, 1]], expected: [3, 2, 1, 4] }
      ];
      return buildPythonTaskMeta(title, 'lists', difficulty, prompt, 'solve(values)', ['seen = set()', 'result = []', 'for value in values:', '    if value not in seen:', '        seen.add(value)', '        result.append(value)', 'return result'], tests, {
        hints: ['Сохраняй уже увиденные значения в `set`.', 'Добавляй элемент только при первом встреченном вхождении.'],
        explanation: 'Нужно пройти по списку один раз и собрать результат без повторов.',
        strategy: 'collection',
        tags: ['dedupe', 'set'],
        seed: `dedupe:${values.join(',')}`
      });
    }
    case 'hard': {
      const left = randomNumbers(rng, rng.int(3, 5), -10, 20).sort((a, b) => a - b);
      const right = randomNumbers(rng, rng.int(3, 5), -10, 20).sort((a, b) => a - b);
      const title = 'Слияние отсортированных списков';
      const prompt = `Даны два отсортированных списка: ${preview(left)} и ${preview(right)}. Верни один отсортированный список со всеми элементами.`;
      const tests = [
        { args: [left, right], expected: mergeSortedLists(left, right) },
        { args: [[1, 4, 9], [2, 6, 7]], expected: [1, 2, 4, 6, 7, 9] }
      ];
      return buildPythonTaskMeta(title, 'lists', difficulty, prompt, 'solve(left, right)', ['return sorted(left + right)'], tests, {
        hints: ['Можно объединить списки и отсортировать результат.', 'Если хочешь, попробуй вариант с двумя указателями.'],
        explanation: 'Задача тренирует слияние уже отсортированных последовательностей.',
        strategy: 'algorithm',
        tags: ['merge', 'sorted'],
        seed: `merge:${left.join(',')}:${right.join(',')}`
      });
    }
    case 'expert':
    default: {
      const values = randomNumbers(rng, rng.int(8, 10), 0, 40);
      const windowSize = rng.int(2, 4);
      const title = 'Максимумы в окне';
      const prompt = `Дан список ${preview(values)} и размер окна ${windowSize}. Верни список максимумов для каждого окна длины ${windowSize}.`;
      const tests = [
        { args: [values, windowSize], expected: slidingWindowMax(values, windowSize) },
        { args: [[5, 1, 3, 8, 2, 7], 3], expected: [5, 8, 8, 8] }
      ];
      return buildPythonTaskMeta(title, 'lists', difficulty, prompt, 'solve(values, window)', ['result = []', 'for index in range(len(values) - window + 1):', '    result.append(max(values[index:index + window]))', 'return result'], tests, {
        hints: ['Используй срезы и `max` для каждой позиции.', 'Если захочешь ускорить решение, подумай про deque.'],
        explanation: 'Экспертная задача на скользящее окно и аккуратную обработку диапазонов.',
        strategy: 'algorithm',
        tags: ['window', 'max'],
        seed: `window:${values.join(',')}:${windowSize}`
      });
    }
  }
}

function buildDictsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const words = randomWords(rng, rng.int(5, 8));
      const title = 'Подсчёт по первой букве';
      const prompt = `Дан список слов ${preview(words)}. Верни словарь, где ключи - первые буквы слов, а значения - количество слов.`;
      const tests = [
        { args: [words], expected: countByInitial(words) },
        { args: [['Ada', 'Artem', 'Mila', 'Maks']], expected: { a: 2, m: 2 } }
      ];
      return buildPythonTaskMeta(title, 'dicts', difficulty, prompt, 'solve(words)', ['result = {}', 'for word in words:', '    key = word[0].lower()', '    result[key] = result.get(key, 0) + 1', 'return dict(sorted(result.items()))'], tests, {
        hints: ['Сохраняй счётчик в словаре.', 'Не забудь привести букву к нижнему регистру.'],
        explanation: 'Базовая задача на работу со словарями и подсчёт частот.',
        strategy: 'collection',
        tags: ['count', 'frequency'],
        seed: `count:${words.join(',')}`
      });
    }
    case 'medium': {
      const records = randomCities(rng, rng.int(3, 4)).map((city) => ({
        name: rng.pick(NAME_POOL),
        city
      }));
      const title = 'Группировка по городу';
      const prompt = `У тебя есть записи ${preview(records)}. Сгруппируй имена по городу в словарь city -> [names].`;
      const tests = [
        { args: [records], expected: groupByCity(records) },
        { args: [[{ name: 'Ada', city: 'Rome' }, { name: 'Mila', city: 'Rome' }, { name: 'Zoe', city: 'Paris' }]], expected: { Paris: ['Zoe'], Rome: ['Ada', 'Mila'] } }
      ];
      return buildPythonTaskMeta(title, 'dicts', difficulty, prompt, 'solve(records)', ['result = {}', 'for record in records:', '    result.setdefault(record["city"], []).append(record["name"])', 'return dict(sorted(result.items()))'], tests, {
        hints: ['Используй `setdefault` или обычную проверку ключа.', 'Сначала собери списки, потом отсортируй ключи.'],
        explanation: 'Задача учит собирать структурированные данные в словарь.',
        strategy: 'collection',
        tags: ['group', 'records'],
        seed: `group:${JSON.stringify(records)}`
      });
    }
    case 'hard': {
      const profile = {
        user: rng.pick(NAME_POOL).toLowerCase(),
        stats: {
          xp: rng.int(80, 240),
          solved: rng.int(8, 32)
        }
      };
      const title = 'Разворачивание словаря';
      const prompt = `Преобразуй вложенный словарь ${preview(profile)} в плоский формат с ключами вида stats.xp.`;
      const tests = [
        { args: [profile], expected: flattenDict(profile) },
        { args: [{ app: { name: 'trainer', version: 1 }, flags: { beta: true } }], expected: { 'app.name': 'trainer', 'app.version': 1, 'flags.beta': true } }
      ];
      return buildPythonTaskMeta(title, 'dicts', difficulty, prompt, 'solve(data)', ['result = {}', 'def walk(node, prefix=""):', '    for key, value in node.items():', '        next_key = f"{prefix}.{key}" if prefix else key', '        if isinstance(value, dict):', '            walk(value, next_key)', '        else:', '            result[next_key] = value', 'walk(data)', 'return dict(sorted(result.items()))'], tests, {
        hints: ['Рекурсивно проходи по вложенным словарям.', 'Собирай путь к ключу через точку.'],
        explanation: 'Нужно построить плоскую карту значений по путям.',
        strategy: 'algorithm',
        tags: ['flatten', 'nested'],
        seed: `flatten:${JSON.stringify(profile)}`
      });
    }
    case 'expert':
    default: {
      const records = Array.from({ length: rng.int(3, 4) }, (_, index) => ({
        id: `item-${index + 1}`,
        tags: rng.sample(TAG_POOL, rng.int(2, 3))
      }));
      const title = 'Обратный индекс';
      const prompt = `Построй обратный индекс по записям ${preview(records)}. Результат: tag -> [ids].`;
      const tests = [
        { args: [records], expected: reverseIndex(records) },
        { args: [[{ id: 'a', tags: ['x', 'y'] }, { id: 'b', tags: ['y'] }]], expected: { x: ['a'], y: ['a', 'b'] } }
      ];
      return buildPythonTaskMeta(title, 'dicts', difficulty, prompt, 'solve(records)', ['result = {}', 'for record in records:', '    for tag in record["tags"]:', '        result.setdefault(tag, []).append(record["id"])', 'return {key: sorted(value) for key, value in sorted(result.items())}'], tests, {
        hints: ['Сначала сгруппируй идентификаторы по тегам.', 'Потом отсортируй ключи и списки значений.'],
        explanation: 'Экспертная задача требует аккуратной агрегации и нормализации результата.',
        strategy: 'algorithm',
        tags: ['reverse-index', 'tags'],
        seed: `reverse-index:${JSON.stringify(records)}`
      });
    }
  }
}

function buildStringsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const text = `  ${rng.pick(WORD_POOL)}   ${rng.pick(WORD_POOL)}   ${rng.pick(WORD_POOL)}  `;
      const title = 'Нормализация пробелов';
      const prompt = `Очисти строку ${preview(text)}: убери лишние пробелы по краям и внутри, а затем переведи в нижний регистр.`;
      const tests = [
        { args: [text], expected: normalizeSpaces(text) },
        { args: ['  Hello   World  '], expected: 'hello world' }
      ];
      return buildPythonTaskMeta(title, 'strings', difficulty, prompt, 'solve(text)', ['return " ".join(text.split()).lower()'], tests, {
        hints: ['`split()` без аргументов уже убирает лишние пробелы.', 'После `join` приведи строку к нижнему регистру.'],
        explanation: 'Простая задача на очистку и нормализацию текста.',
        strategy: 'simple',
        tags: ['normalize', 'spaces'],
        seed: `normalize:${text}`
      });
    }
    case 'medium': {
      const text = `${rng.pick(WORD_POOL)}! ${rng.pick(WORD_POOL)} ${rng.pick(WORD_POOL)} ${rng.pick(WORD_POOL)}.`;
      const title = 'Самое длинное слово';
      const prompt = `Найди самое длинное слово в строке ${preview(text)}.`;
      const tests = [
        { args: [text], expected: longestWord(text) },
        { args: ['alpha beta omegawow'], expected: 'omegawow' }
      ];
      return buildPythonTaskMeta(title, 'strings', difficulty, prompt, 'solve(text)', ['words = __import__("re").findall(r"[A-Za-z0-9]+", text)', 'return max(words, key=len) if words else ""'], tests, {
        hints: ['Разбей текст на слова и сравни их длину.', 'Можно использовать `re.findall`.'],
        explanation: 'Задача показывает, как вынимать слова из строки и выбирать нужное по длине.',
        strategy: 'simple',
        tags: ['words', 'max'],
        seed: `longest:${text}`
      });
    }
    case 'hard': {
      const word = `${rng.pick(WORD_POOL)}${rng.pick(WORD_POOL)}${rng.pick(WORD_POOL)}`;
      const title = 'Палиндром';
      const prompt = `Проверь, является ли строка ${preview(word)} палиндромом, игнорируя регистр и все символы кроме букв и цифр.`;
      const tests = [
        { args: [word], expected: isPalindromeText(word) },
        { args: ['A man, a plan, a canal: Panama'], expected: true }
      ];
      return buildPythonTaskMeta(title, 'strings', difficulty, prompt, 'solve(text)', ['clean = "".join(char.lower() for char in text if char.isalnum())', 'return clean == clean[::-1]'], tests, {
        hints: ['Оставь только буквы и цифры.', 'Сравни строку с её обратной копией.'],
        explanation: 'Задача тренирует фильтрацию символов и сравнение строк.',
        strategy: 'simple',
        tags: ['palindrome', 'filter'],
        seed: `palindrome:${word}`
      });
    }
    case 'expert':
    default: {
      const template = `${rng.pick(NAME_POOL)}={name}; ${rng.pick(WORD_POOL)}={project}; ${rng.pick(WORD_POOL)}={level}`;
      const values = {
        name: rng.pick(NAME_POOL),
        project: rng.pick(WORD_POOL),
        level: String(rng.int(1, 9))
      };
      const title = 'Подстановка плейсхолдеров';
      const prompt = `Замени плейсхолдеры в строке ${preview(template)} значениями ${preview(values)}.`;
      const tests = [
        { args: [template, values], expected: replacePlaceholders(template, values) },
        { args: ['Hello {name}!', { name: 'Ada' }], expected: 'Hello Ada!' }
      ];
      return buildPythonTaskMeta(title, 'strings', difficulty, prompt, 'solve(template, values)', ['import re', 'return re.sub(r"\\{([^}]+)\\}", lambda match: str(values.get(match.group(1), "")), template)'], tests, {
        hints: ['Используй регулярное выражение для поиска `{key}`.', 'Значение можно брать из словаря по имени ключа.'],
        explanation: 'Экспертная строковая задача на шаблоны и подстановку значений.',
        strategy: 'simple',
        tags: ['template', 'replace'],
        seed: `template:${template}:${JSON.stringify(values)}`
      });
    }
  }
}

function buildFunctionsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const value = rng.int(-999, 999);
      const title = 'Сумма цифр';
      const prompt = `Посчитай сумму цифр числа ${value}.`;
      const tests = [
        { args: [value], expected: sumDigits(value) },
        { args: [5071], expected: 13 }
      ];
      return buildPythonTaskMeta(title, 'functions', difficulty, prompt, 'solve(value)', ['value = abs(int(value))', 'total = 0', 'for char in str(value):', '    total += int(char)', 'return total'], tests, {
        hints: ['Приведи число к строке или используй цикл по разрядам.', 'Не забудь обработать отрицательные значения.'],
        explanation: 'Базовая задача на простую функцию и обработку числа.',
        strategy: 'simple',
        tags: ['digits', 'sum'],
        seed: `digits:${value}`
      });
    }
    case 'medium': {
      const nested = [rng.int(1, 9), [rng.int(1, 9), [rng.int(1, 9), rng.int(1, 9)]], rng.int(1, 9)];
      const title = 'Сумма вложенных чисел';
      const prompt = `Просуммируй все числа в структуре ${preview(nested)}.`;
      const tests = [
        { args: [nested], expected: sumNestedNumbers(nested) },
        { args: [[1, [2, 3], [4, [5]]]], expected: 15 }
      ];
      return buildPythonTaskMeta(title, 'functions', difficulty, prompt, 'solve(values)', ['def walk(node):', '    if isinstance(node, list):', '        return sum(walk(item) for item in node)', '    return node if isinstance(node, int) else 0', 'return walk(values)'], tests, {
        hints: ['Сделай маленькую вспомогательную функцию.', 'Для списка обойди элементы рекурсивно.'],
        explanation: 'Задача учит выделять вспомогательную функцию и использовать рекурсию.',
        strategy: 'recursion',
        tags: ['recursion', 'nested'],
        seed: `nested:${JSON.stringify(nested)}`
      });
    }
    case 'hard': {
      const operations = [
        { op: 'add', value: rng.int(2, 6) },
        { op: 'mul', value: rng.int(2, 4) },
        { op: 'clamp', min: rng.int(-10, 0), max: rng.int(12, 24) }
      ];
      const startValue = rng.int(1, 9);
      const title = 'Последовательность операций';
      const prompt = `Применяй к числу ${startValue} операции ${preview(operations)} по очереди и верни итог.`;
      const tests = [
        { args: [startValue, operations], expected: applyOperations(startValue, operations) },
        { args: [5, [{ op: 'add', value: 3 }, { op: 'mul', value: 2 }]], expected: 16 }
      ];
      return buildPythonTaskMeta(title, 'functions', difficulty, prompt, 'solve(value, operations)', ['current = value', 'for operation in operations:', '    if operation["op"] == "add":', '        current += operation["value"]', '    elif operation["op"] == "mul":', '        current *= operation["value"]', '    elif operation["op"] == "clamp":', '        current = max(operation["min"], min(operation["max"], current))', 'return current'], tests, {
        hints: ['Обработай каждую операцию в цикле.', 'Сделай одно место, где изменяется текущее значение.'],
        explanation: 'Задача проверяет умение разбить вычисление на понятные шаги.',
        strategy: 'algorithm',
        tags: ['pipeline', 'operations'],
        seed: `operations:${startValue}:${JSON.stringify(operations)}`
      });
    }
    case 'expert':
    default: {
      const n = rng.int(7, 11);
      const title = 'Числа Фибоначчи';
      const prompt = `Верни ${n}-е число Фибоначчи, начиная с 0, 1, 1, 2, 3...`;
      const tests = [
        { args: [n], expected: fibonacci(n) },
        { args: [10], expected: 55 }
      ];
      return buildPythonTaskMeta(title, 'functions', difficulty, prompt, 'solve(n)', ['a, b = 0, 1', 'for _ in range(int(n)):', '    a, b = b, a + b', 'return a'], tests, {
        hints: ['Попробуй итеративное решение, чтобы не упереться в рекурсию.', 'Храни два последних значения последовательности.'],
        explanation: 'Экспертная задача на рекурсию и оптимизацию вычислений.',
        strategy: 'recursion',
        tags: ['fibonacci', 'recursion'],
        seed: `fib:${n}`
      });
    }
  }
}

function buildAlgorithmsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const values = randomNumbers(rng, rng.int(4, 7), 6, 36);
      const title = 'НОД массива';
      const prompt = `Найди наибольший общий делитель всех чисел в списке ${preview(values)}.`;
      const tests = [
        { args: [values], expected: gcdArray(values) },
        { args: [[12, 18, 30]], expected: 6 }
      ];
      return buildPythonTaskMeta(title, 'algorithms', difficulty, prompt, 'solve(values)', ['from math import gcd', 'result = 0', 'for value in values:', '    result = gcd(result, value)', 'return result'], tests, {
        hints: ['Нужен цикл по числам и функция `gcd`.', 'Начни с нуля и постепенно обновляй ответ.'],
        explanation: 'Базовая алгоритмическая задача на итеративное применение НОД.',
        strategy: 'algorithm',
        tags: ['gcd', 'math'],
        seed: `gcd:${values.join(',')}`
      });
    }
    case 'medium': {
      const values = randomNumbers(rng, rng.int(5, 8), 1, 40).sort((a, b) => a - b);
      const target = values[rng.int(0, values.length - 1)];
      const title = 'Бинарный поиск';
      const prompt = `В отсортированном списке ${preview(values)} найди индекс числа ${target}. Если числа нет, верни -1.`;
      const tests = [
        { args: [values, target], expected: binarySearch(values, target) },
        { args: [[1, 3, 5, 7, 9], 8], expected: -1 }
      ];
      return buildPythonTaskMeta(title, 'algorithms', difficulty, prompt, 'solve(values, target)', ['left = 0', 'right = len(values) - 1', 'while left <= right:', '    middle = (left + right) // 2', '    if values[middle] == target:', '        return middle', '    if values[middle] < target:', '        left = middle + 1', '    else:', '        right = middle - 1', 'return -1'], tests, {
        hints: ['Сравнивай середину с искомым значением.', 'Сужай границы поиска вдвое на каждом шаге.'],
        explanation: 'Классический бинарный поиск в отсортированном массиве.',
        strategy: 'algorithm',
        tags: ['binary-search', 'array'],
        seed: `binary:${values.join(',')}:${target}`
      });
    }
    case 'hard': {
      const intervals = Array.from({ length: rng.int(3, 5) }, () => {
        const start = rng.int(0, 18);
        const end = start + rng.int(1, 8);
        return [start, end];
      });
      const title = 'Слияние интервалов';
      const prompt = `Объедини пересекающиеся интервалы ${preview(intervals)} и верни упорядоченный список.`;
      const tests = [
        { args: [intervals], expected: mergeIntervals(intervals) },
        { args: [[[1, 3], [2, 6], [8, 10], [9, 12]]], expected: [[1, 6], [8, 12]] }
      ];
      return buildPythonTaskMeta(title, 'algorithms', difficulty, prompt, 'solve(intervals)', ['intervals = sorted([item[:] for item in intervals])', 'result = []', 'for start, end in intervals:', '    if not result or start > result[-1][1]:', '        result.append([start, end])', '    else:', '        result[-1][1] = max(result[-1][1], end)', 'return result'], tests, {
        hints: ['Сначала отсортируй интервалы по началу.', 'Если текущий интервал пересекается с предыдущим, расширь его.'],
        explanation: 'Задача на аккуратную работу с диапазонами и объединение пересечений.',
        strategy: 'algorithm',
        tags: ['intervals', 'merge'],
        seed: `intervals:${JSON.stringify(intervals)}`
      });
    }
    case 'expert':
    default: {
      const rows = rng.int(4, 5);
      const cols = rng.int(4, 5);
      const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => (rng.bool(0.35) ? 1 : 0)));
      for (let col = 0; col < cols; col += 1) {
        grid[0][col] = 0;
      }
      for (let row = 0; row < rows; row += 1) {
        grid[row][cols - 1] = 0;
      }
      const title = 'Кратчайший путь в сетке';
      const prompt = `Найди длину кратчайшего пути в сетке 0/1 ${preview(grid)}. Двигаться можно вверх, вниз, влево и вправо. 1 означает стену.`;
      const tests = [
        { args: [grid], expected: shortestPathGrid(grid) },
        { args: [
          [
            [0, 0, 1, 0],
            [1, 0, 1, 0],
            [1, 0, 0, 0],
            [1, 1, 1, 0]
          ]
        ], expected: 7 }
      ];
      return buildPythonTaskMeta(title, 'algorithms', difficulty, prompt, 'solve(grid)', ['from collections import deque', 'rows, cols = len(grid), len(grid[0])', 'queue = deque([(0, 0, 1)])', 'visited = {(0, 0)}', 'while queue:', '    row, col, distance = queue.popleft()', '    if row == rows - 1 and col == cols - 1:', '        return distance', '    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):', '        nr, nc = row + dr, col + dc', '        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0 and (nr, nc) not in visited:', '            visited.add((nr, nc))', '            queue.append((nr, nc, distance + 1))', 'return -1'], tests, {
        hints: ['Используй BFS, а не DFS.', 'Храни расстояние вместе с координатами в очереди.'],
        explanation: 'Экспертная задача на поиск в ширину по сетке с препятствиями.',
        strategy: 'algorithm',
        tags: ['bfs', 'grid'],
        seed: `grid:${JSON.stringify(grid)}`
      });
    }
  }
}

function buildListsTaskExpanded(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const values = randomNumbers(rng, rng.int(5, 8), -12, 24);
      const title = 'Сортировка по убыванию';
      const prompt = `Дан список ${preview(values)}. Верни новый список, отсортированный по убыванию, не меняя исходный.`;
      const tests = [
        { args: [values], expected: values.slice().sort((a, b) => b - a) },
        { args: [[3, 1, 4, 2]], expected: [4, 3, 2, 1] }
      ];
      return buildPythonTaskMeta(title, 'lists', difficulty, prompt, 'solve(values)', ['return sorted(values, reverse=True)'], tests, {
        hints: ['Используй `sorted` с `reverse=True`.', 'Не сортируй список на месте, верни новый.'],
        explanation: 'Это альтернативная задача на работу со списками и сортировкой.',
        strategy: 'collection',
        tags: ['sort', 'descending'],
        seed: `sorted-desc:${values.join(',')}`
      });
    }
    case 'medium': {
      const values = randomNumbers(rng, rng.int(5, 8), 1, 14);
      const title = 'Префиксные суммы';
      const prompt = `Дан список ${preview(values)}. Верни список префиксных сумм: каждый элемент равен сумме всех предыдущих и текущего.`;
      const tests = [
        { args: [values], expected: prefixSums(values) },
        { args: [[1, 2, 3, 4]], expected: [1, 3, 6, 10] }
      ];
      return buildPythonTaskMeta(title, 'lists', difficulty, prompt, 'solve(values)', ['result = []', 'total = 0', 'for value in values:', '    total += value', '    result.append(total)', 'return result'], tests, {
        hints: ['Держи текущую сумму в переменной.', 'Добавляй её в новый список после каждого шага.'],
        explanation: 'Префиксные суммы позволяют быстро видеть накопленный итог по списку.',
        strategy: 'algorithm',
        tags: ['prefix', 'sum'],
        seed: `prefix:${values.join(',')}`
      });
    }
    case 'hard': {
      const values = randomNumbers(rng, rng.int(6, 9), -12, 24);
      const shift = rng.int(1, Math.max(1, values.length - 1));
      const title = 'Сдвиг списка';
      const prompt = `Сдвинь список ${preview(values)} влево на ${shift} позиций и верни новый список.`;
      const tests = [
        { args: [values, shift], expected: rotateLeft(values, shift) },
        { args: [[1, 2, 3, 4, 5], 2], expected: [3, 4, 5, 1, 2] }
      ];
      return buildPythonTaskMeta(title, 'lists', difficulty, prompt, 'solve(values, shift)', ['shift %= len(values)', 'return values[shift:] + values[:shift]'], tests, {
        hints: ['Сначала нормализуй сдвиг по длине списка.', 'Потом склей две части списка заново.'],
        explanation: 'Это альтернативная задача на срезы и перестановку элементов.',
        strategy: 'collection',
        tags: ['rotate', 'slice'],
        seed: `rotate:${values.join(',')}:${shift}`
      });
    }
    case 'expert':
    default: {
      const values = randomNumbers(rng, rng.int(7, 10), -6, 18, true);
      const title = 'Самая длинная возрастающая серия';
      const prompt = `Дан список ${preview(values)}. Верни длину самой длинной строго возрастающей подряд идущей серии.`;
      const tests = [
        { args: [values], expected: longestIncreasingStreak(values) },
        { args: [[1, 2, 3, 1, 2, 3, 4]], expected: 4 }
      ];
      return buildPythonTaskMeta(title, 'lists', difficulty, prompt, 'solve(values)', ['if not values:', '    return 0', 'best = 1', 'current = 1', 'for index in range(1, len(values)):', '    if values[index] > values[index - 1]:', '        current += 1', '    else:', '        current = 1', '    best = max(best, current)', 'return best'], tests, {
        hints: ['Сравнивай текущий элемент с предыдущим.', 'Сбрасывай счётчик, когда серия ломается.'],
        explanation: 'Задача тренирует обработку последовательностей и поиск локальных серий.',
        strategy: 'algorithm',
        tags: ['sequence', 'streak'],
        seed: `streak:${values.join(',')}`
      });
    }
  }
}

function buildDictsTaskExpanded(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const mapping = Object.fromEntries(randomNames(rng, rng.int(4, 6)).map((name) => [name, rng.pick(['red', 'blue', 'green'])]));
      const title = 'Обратное соответствие';
      const prompt = `Дан словарь ${preview(mapping)}. Сгруппируй имена по значениям так, чтобы результат был вида цвет -> [имена].`;
      const tests = [
        { args: [mapping], expected: invertMapping(mapping) },
        { args: [{ Ada: 'red', Mila: 'red', Leo: 'blue' }], expected: { blue: ['Leo'], red: ['Ada', 'Mila'] } }
      ];
      return buildPythonTaskMeta(title, 'dicts', difficulty, prompt, 'solve(mapping)', ['result = {}', 'for name, group in mapping.items():', '    result.setdefault(group, []).append(name)', 'return {key: sorted(names) for key, names in sorted(result.items())}'], tests, {
        hints: ['Создай новый словарь, где ключами станут значения из исходного.', 'Отсортируй имена внутри списков для стабильного результата.'],
        explanation: 'Это альтернативная задача на переворот словаря в группу по значениям.',
        strategy: 'collection',
        tags: ['inverse', 'grouping'],
        seed: `invert:${JSON.stringify(mapping)}`
      });
    }
    case 'medium': {
      const left = Object.fromEntries(randomWords(rng, rng.int(3, 5)).map((word) => [word, rng.int(1, 5)]));
      const right = Object.fromEntries(randomWords(rng, rng.int(3, 5)).map((word) => [word, rng.int(1, 5)]));
      const title = 'Сложение словарей';
      const prompt = `Даны словари ${preview(left)} и ${preview(right)}. Верни новый словарь, где значения для одинаковых ключей сложены.`;
      const tests = [
        { args: [left, right], expected: sumNumericDicts(left, right) },
        { args: [{ a: 1, b: 2 }, { b: 3, c: 4 }], expected: { a: 1, b: 5, c: 4 } }
      ];
      return buildPythonTaskMeta(title, 'dicts', difficulty, prompt, 'solve(left, right)', ['result = dict(left)', 'for key, value in right.items():', '    result[key] = result.get(key, 0) + value', 'return dict(sorted(result.items()))'], tests, {
        hints: ['Пройди по ключам обоих словарей.', 'Для одинаковых ключей складывай значения.'],
        explanation: 'Эта ветка тренирует аккуратное слияние словарей с числовыми значениями.',
        strategy: 'collection',
        tags: ['merge', 'sum'],
        seed: `merge-dicts:${JSON.stringify(left)}:${JSON.stringify(right)}`
      });
    }
    case 'hard': {
      const profile = {
        user: rng.pick(NAME_POOL).toLowerCase(),
        stats: {
          xp: rng.int(80, 240),
          solved: rng.int(8, 32)
        }
      };
      const defaults = {
        role: rng.pick(['student', 'mentor', 'dev']),
        active: true,
        region: rng.pick(CITY_POOL)
      };
      const title = 'Заполнение значений по умолчанию';
      const prompt = `Дан объект ${preview(profile)} и defaults = ${preview(defaults)}. Верни новый объект, где отсутствующие поля берутся из defaults, а существующие не затираются.`;
      const tests = [
        { args: [profile, defaults], expected: mergeWithDefaults(profile, defaults) },
        { args: [{ name: 'Ada' }, { name: 'Unknown', role: 'guest' }], expected: { name: 'Ada', role: 'guest' } }
      ];
      return buildPythonTaskMeta(title, 'dicts', difficulty, prompt, 'solve(profile, defaults)', ['return {**defaults, **profile}'], tests, {
        hints: ['Сначала положи defaults, потом поверх profile.', 'Не меняй исходные словари.'],
        explanation: 'Нужно аккуратно собрать новый словарь с приоритетом значений пользователя.',
        strategy: 'collection',
        tags: ['defaults', 'merge'],
        seed: `defaults:${JSON.stringify(profile)}:${JSON.stringify(defaults)}`
      });
    }
    case 'expert':
    default: {
      const payload = `name=${rng.pick(NAME_POOL)};city=${rng.pick(CITY_POOL)};role=${rng.pick(['dev', 'designer', 'analyst'])}`;
      const title = 'Парсинг пар';
      const prompt = `Разбери строку ${preview(payload)} в словарь key -> value.`;
      const tests = [
        { args: [payload], expected: parsePairs(payload) },
        { args: ['a=1;b=2;c=3'], expected: { a: '1', b: '2', c: '3' } }
      ];
      return buildPythonTaskMeta(title, 'dicts', difficulty, prompt, 'solve(text)', ['result = {}', 'for part in text.split(";"):', '    if "=" not in part:', '        continue', '    key, value = part.split("=", 1)', '    key = key.strip()', '    value = value.strip()', '    if key:', '        result[key] = value', 'return dict(sorted(result.items()))'], tests, {
        hints: ['Раздели строку по `;`, потом по `=`.', 'Сохраняй только непустые ключи.'],
        explanation: 'Экспертная задача на разбор текстового представления словаря.',
        strategy: 'algorithm',
        tags: ['parse', 'text'],
        seed: `pairs:${payload}`
      });
    }
  }
}

function buildStringsTaskExpanded(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const text = `${rng.pick(WORD_POOL)} ${rng.pick(WORD_POOL)} ${rng.pick(WORD_POOL)}`;
      const title = 'Переворот слов';
      const prompt = `Дана строка ${preview(text)}. Верни слова в обратном порядке, не меняя сами слова.`;
      const tests = [
        { args: [text], expected: reverseWords(text) },
        { args: ['alpha beta gamma'], expected: 'gamma beta alpha' }
      ];
      return buildPythonTaskMeta(title, 'strings', difficulty, prompt, 'solve(text)', ['return " ".join(reversed(text.split()))'], tests, {
        hints: ['Разбей строку на слова и поменяй их порядок.', 'Склей обратно через пробел.'],
        explanation: 'Альтернативная строковая задача на порядок слов.',
        strategy: 'simple',
        tags: ['reverse', 'words'],
        seed: `reverse-words:${text}`
      });
    }
    case 'medium': {
      const text = `  ${randomWords(rng, rng.int(4, 7)).join(rng.bool(0.5) ? '   ' : ' ')}  `;
      const title = 'Run-length encoding';
      const prompt = `Сожми строку ${preview(text)} в формате run-length encoding.`;
      const tests = [
        { args: [text], expected: runLengthEncode(text) },
        { args: ['aaabcccc'], expected: 'a3b1c4' }
      ];
      return buildPythonTaskMeta(title, 'strings', difficulty, prompt, 'solve(text)', ['if not text:', '    return ""', 'result = []', 'current = text[0]', 'count = 1', 'for char in text[1:]:', '    if char == current:', '        count += 1', '    else:', '        result.append(f"{current}{count}")', '        current = char', '        count = 1', 'result.append(f"{current}{count}")', 'return "".join(result)'], tests, {
        hints: ['Считай повторяющиеся символы подряд.', 'Когда символ меняется, добавляй блок в результат.'],
        explanation: 'Эта ветка учит сжатию строки через длины повторов.',
        strategy: 'simple',
        tags: ['compression', 'string'],
        seed: `rle:${text}`
      });
    }
    case 'hard': {
      const text = `  ${randomWords(rng, rng.int(4, 8)).join(rng.bool(0.5) ? '   ' : ' ')}  `;
      const title = 'Подсчёт букв';
      const prompt = `Для строки ${preview(text)} верни объект с количеством гласных и согласных букв.`;
      const tests = [
        { args: [text], expected: countVowelsAndConsonants(text) },
        { args: ['Hello World'], expected: { vowels: 3, consonants: 7 } }
      ];
      return buildPythonTaskMeta(title, 'strings', difficulty, prompt, 'solve(text)', ['vowels = set("aeiouаеёиоуыэюя")', 'result = {"vowels": 0, "consonants": 0}', 'for char in text.lower():', '    if not char.isalpha():', '        continue', '    if char in vowels:', '        result["vowels"] += 1', '    else:', '        result["consonants"] += 1', 'return result'], tests, {
        hints: ['Проверяй только буквы.', 'Разделяй гласные и согласные через набор букв-гласных.'],
        explanation: 'Задача добавляет работу с подсчётом разных классов символов.',
        strategy: 'simple',
        tags: ['count', 'letters'],
        seed: `letters:${text}`
      });
    }
    case 'expert':
    default: {
      const template = `${rng.pick(NAME_POOL)}={name}; ${rng.pick(WORD_POOL)}={project}; ${rng.pick(WORD_POOL)}={level}`;
      const values = {
        name: rng.pick(NAME_POOL),
        project: rng.pick(WORD_POOL),
        level: String(rng.int(1, 9))
      };
      const title = 'Плейсхолдеры';
      const prompt = `Замени плейсхолдеры в строке ${preview(template)} значениями ${preview(values)}.`;
      const tests = [
        { args: [template, values], expected: replacePlaceholders(template, values) },
        { args: ['Hello {name}!', { name: 'Ada' }], expected: 'Hello Ada!' }
      ];
      return buildPythonTaskMeta(title, 'strings', difficulty, prompt, 'solve(template, values)', ['import re', 'return re.sub(r"\\{([^}]+)\\}", lambda match: str(values.get(match.group(1), "")), template)'], tests, {
        hints: ['Ищи блоки вида `{key}`.', 'Подставляй значения из словаря, если ключ найден.'],
        explanation: 'Экспертная строковая задача на шаблонную подстановку.',
        strategy: 'simple',
        tags: ['template', 'replace'],
        seed: `template:${template}:${JSON.stringify(values)}`
      });
    }
  }
}

function buildFunctionsTaskExpanded(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const value = rng.int(-30, 30);
      const low = rng.int(-20, 0);
      const high = rng.int(5, 40);
      const title = 'Ограничение диапазона';
      const prompt = `Верни число ${value}, зажатое в диапазоне [${low}, ${high}].`;
      const tests = [
        { args: [value, low, high], expected: Math.min(high, Math.max(low, value)) },
        { args: [100, 0, 25], expected: 25 },
        { args: [-5, 0, 25], expected: 0 }
      ];
      return buildPythonTaskMeta(title, 'functions', difficulty, prompt, 'solve(value, low, high)', ['return max(low, min(high, value))'], tests, {
        hints: ['Сначала подними число до нижней границы, потом ограничь сверху.', 'Комбинация `max` и `min` тут идеальна.'],
        explanation: 'Функция должна корректно ограничивать значение сверху и снизу.',
        strategy: 'simple',
        tags: ['clamp', 'math'],
        seed: `clamp:${value}:${low}:${high}`
      });
    }
    case 'medium': {
      const values = randomNumbers(rng, rng.int(5, 8), -8, 16);
      const threshold = rng.int(-2, 8);
      const title = 'Сумма значений выше порога';
      const prompt = `Дан список ${preview(values)} и порог ${threshold}. Верни сумму чисел, которые строго больше порога.`;
      const expected = values.filter((value) => value > threshold).reduce((sum, value) => sum + value, 0);
      const tests = [
        { args: [values, threshold], expected },
        { args: [[1, 5, 10, 2], 4], expected: 15 }
      ];
      return buildPythonTaskMeta(title, 'functions', difficulty, prompt, 'solve(values, threshold)', ['return sum(value for value in values if value > threshold)'], tests, {
        hints: ['Отфильтруй значения по порогу.', 'Суммируй только прошедшие фильтр числа.'],
        explanation: 'Задача тренирует функцию как маленький вычислительный блок.',
        strategy: 'simple',
        tags: ['filter', 'sum'],
        seed: `threshold:${values.join(',')}:${threshold}`
      });
    }
    case 'hard': {
      const operations = [
        { op: 'add', value: rng.int(2, 6) },
        { op: 'mul', value: rng.int(2, 4) },
        { op: 'clamp', min: rng.int(-10, 0), max: rng.int(12, 24) }
      ];
      const startValue = rng.int(1, 9);
      const title = 'Последовательность операций';
      const prompt = `Применяй к числу ${startValue} операции ${preview(operations)} по очереди и верни итог.`;
      const tests = [
        { args: [startValue, operations], expected: applyOperations(startValue, operations) },
        { args: [5, [{ op: 'add', value: 3 }, { op: 'mul', value: 2 }]], expected: 16 }
      ];
      return buildPythonTaskMeta(title, 'functions', difficulty, prompt, 'solve(value, operations)', ['current = value', 'for operation in operations:', '    if operation["op"] == "add":', '        current += operation["value"]', '    elif operation["op"] == "mul":', '        current *= operation["value"]', '    elif operation["op"] == "clamp":', '        current = max(operation["min"], min(operation["max"], current))', 'return current'], tests, {
        hints: ['Обработай операции по очереди.', 'Сохраняй текущее значение и меняй его на каждом шаге.'],
        explanation: 'Эта ветка учит строить функцию-пайплайн из набора операций.',
        strategy: 'algorithm',
        tags: ['pipeline', 'operations'],
        seed: `operations:${startValue}:${JSON.stringify(operations)}`
      });
    }
    case 'expert':
    default: {
      const n = rng.int(6, 10);
      const title = 'Факториал';
      const prompt = `Верни ${n}! с помощью функции и рекурсии.`;
      const tests = [
        { args: [n], expected: factorial(n) },
        { args: [6], expected: 720 }
      ];
      return buildPythonTaskMeta(title, 'functions', difficulty, prompt, 'solve(n)', ['if n <= 1:', '    return 1', 'return n * solve(n - 1)'], tests, {
        hints: ['Базовый случай - 1.', 'На каждом шаге умножай n на результат solve(n-1).'],
        explanation: 'Экспертная задача на рекурсию и самоподобную функцию.',
        strategy: 'recursion',
        tags: ['factorial', 'recursion'],
        seed: `factorial:${n}`
      });
    }
  }
}

function buildAlgorithmsTaskExpanded(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const values = randomNumbers(rng, rng.int(5, 8), 1, 40);
      const title = 'Подсчёт простых чисел';
      const prompt = `Дан список ${preview(values)}. Верни количество простых чисел в нём.`;
      const tests = [
        { args: [values], expected: countPrimes(values) },
        { args: [[2, 3, 4, 5, 6, 7]], expected: 4 }
      ];
      return buildPythonTaskMeta(title, 'algorithms', difficulty, prompt, 'solve(values)', ['count = 0', 'for value in values:', '    if value >= 2:', '        prime = True', '        for divider in range(2, int(value ** 0.5) + 1):', '            if value % divider == 0:', '                prime = False', '                break', '        if prime:', '            count += 1', 'return count'], tests, {
        hints: ['Проверь делимость каждого числа до его корня.', 'Считай только числа больше 1.'],
        explanation: 'Альтернативная простая алгоритмическая задача на проверку простоты.',
        strategy: 'algorithm',
        tags: ['prime', 'count'],
        seed: `primes:${values.join(',')}`
      });
    }
    case 'medium': {
      const values = randomNumbers(rng, rng.int(5, 8), 1, 25);
      const target = values[rng.int(0, values.length - 1)] + values[rng.int(0, values.length - 1)];
      const title = 'Two Sum';
      const prompt = `Верни индексы двух элементов списка ${preview(values)}, сумма которых равна ${target}.`;
      const tests = [
        { args: [values, target], expected: twoSumIndices(values, target) },
        { args: [[2, 7, 11, 15], 9], expected: [0, 1] }
      ];
      return buildPythonTaskMeta(title, 'algorithms', difficulty, prompt, 'solve(values, target)', ['seen = {}', 'for index, value in enumerate(values):', '    complement = target - value', '    if complement in seen:', '        return [seen[complement], index]', '    if value not in seen:', '        seen[value] = index', 'return []'], tests, {
        hints: ['Запоминай уже встреченные числа.', 'Когда найдёшь complement, верни пару индексов.'],
        explanation: 'Классическая задача Two Sum в python-стиле.',
        strategy: 'algorithm',
        tags: ['two-sum', 'map'],
        seed: `two-sum:${values.join(',')}:${target}`
      });
    }
    case 'hard': {
      const text = `${rng.pick(WORD_POOL)}${rng.pick(WORD_POOL)}${rng.pick(WORD_POOL)}${rng.pick(WORD_POOL)}`;
      const title = 'Самая длинная уникальная подстрока';
      const prompt = `Для строки ${preview(text)} верни длину самой длинной подстроки без повторяющихся символов.`;
      const tests = [
        { args: [text], expected: longestUniqueSubstring(text) },
        { args: ['abcabcbb'], expected: 3 }
      ];
      return buildPythonTaskMeta(title, 'algorithms', difficulty, prompt, 'solve(text)', ['seen = {}', 'left = 0', 'best = 0', 'for right, char in enumerate(text):', '    if char in seen and seen[char] >= left:', '        left = seen[char] + 1', '    seen[char] = right', '    best = max(best, right - left + 1)', 'return best'], tests, {
        hints: ['Используй скользящее окно.', 'Запоминай последнюю позицию каждого символа.'],
        explanation: 'Нужно держать окно без повторов и расширять его максимально широко.',
        strategy: 'algorithm',
        tags: ['window', 'unique'],
        seed: `unique:${text}`
      });
    }
    case 'expert':
    default: {
      const nodes = ['A', 'B', 'C', 'D', 'E'].slice(0, rng.int(4, 5));
      const edges = [];
      for (let index = 1; index < nodes.length; index += 1) {
        edges.push([nodes[index - 1], nodes[index]]);
        if (index + 1 < nodes.length && rng.bool(0.4)) {
          edges.push([nodes[index - 1], nodes[index + 1]]);
        }
      }
      const title = 'Топологическая сортировка';
      const prompt = `Вершины ${preview(nodes)} и рёбра ${preview(edges)} образуют DAG. Верни один корректный порядок вершин.`;
      const tests = [
        { args: [nodes, edges], expected: topologicalSort(nodes, edges) },
        { args: [['A', 'B', 'C'], [['A', 'B'], ['B', 'C']]], expected: ['A', 'B', 'C'] }
      ];
      return buildPythonTaskMeta(title, 'algorithms', difficulty, prompt, 'solve(nodes, edges)', ['from collections import deque', 'graph = {node: [] for node in nodes}', 'incoming = {node: 0 for node in nodes}', 'for left, right in edges:', '    if left in graph and right in incoming:', '        graph[left].append(right)', '        incoming[right] += 1', 'queue = deque([node for node in nodes if incoming[node] == 0])', 'result = []', 'while queue:', '    node = queue.popleft()', '    result.append(node)', '    for next_node in graph[node]:', '        incoming[next_node] -= 1', '        if incoming[next_node] == 0:', '            queue.append(next_node)', 'return result'], tests, {
        hints: ['Сначала найди вершины без входящих рёбер.', 'Убирай рёбра постепенно, как в алгоритме Кана.'],
        explanation: 'Экспертная задача на топологический порядок вершин графа.',
        strategy: 'algorithm',
        tags: ['graph', 'topological-sort'],
        seed: `topo:${JSON.stringify(nodes)}:${JSON.stringify(edges)}`
      });
    }
  }
}

function buildVariablesTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const start = rng.int(8, 40);
      const bonus = rng.int(1, 12);
      const fee = rng.int(0, 8);
      const result = start + bonus - fee;
      const title = 'Промежуточный расчёт баланса';
      const prompt = `Даны числа ${start}, ${bonus} и ${fee}. Сохрани промежуточный итог в переменной и верни финальный баланс.`;
      const tests = [
        { args: [start, bonus, fee], expected: result },
        { args: [12, 3, 2], expected: 13 }
      ];
      return buildPythonTaskMeta(title, 'variables', difficulty, prompt, 'solve(start, bonus, fee)', ['total = start + bonus', '# TODO: subtract the fee and return the final balance', 'return total'], ['total = start + bonus - fee', 'return total'], tests, {
        hints: ['Сначала сохрани стартовое значение в отдельную переменную.', 'Обновляй переменную шаг за шагом, чтобы не потерять смысл расчёта.'],
        explanation: 'Задача тренирует базовое присваивание и последовательное обновление значения через переменные.',
        strategy: 'simple',
        tags: ['assignment', 'intermediate-value'],
        seed: `variables:e:${start}:${bonus}:${fee}`
      });
    }
    case 'medium': {
      const left = rng.int(-20, 20);
      const right = rng.int(-20, 20);
      const title = 'Поменяй значения местами';
      const prompt = `Даны значения ${left} и ${right}. Поменяй их местами через переменные и верни новую пару.`;
      const tests = [
        { args: [left, right], expected: [right, left] },
        { args: [7, 2], expected: [2, 7] }
      ];
      return buildPythonTaskMeta(title, 'variables', difficulty, prompt, 'solve(left, right)', ['first = left', '# TODO: swap values before returning', 'return [first, right]'], ['first, second = right, left', 'return [first, second]'], tests, {
        hints: ['Распаковка в Python помогает менять значения местами без временной переменной.', 'Проверь, что возвращаешь именно новую пару значений.'],
        explanation: 'Задача показывает, как переменные могут менять местами значения и как использовать распаковку.',
        strategy: 'simple',
        tags: ['swap', 'unpacking'],
        seed: `variables:m:${left}:${right}`
      });
    }
    case 'hard': {
      const amount = rng.int(50, 240);
      const discount = rng.int(5, 25);
      const tax = rng.int(3, 15);
      const discounted = amount - (amount * discount / 100);
      const result = Number((discounted + discounted * tax / 100).toFixed(2));
      const title = 'Финальная стоимость';
      const prompt = `Цена товара ${amount}, скидка ${discount}% и налог ${tax}%. Сохрани промежуточные расчёты и верни итоговую стоимость с округлением до 2 знаков.`;
      const tests = [
        { args: [amount, discount, tax], expected: result },
        { args: [100, 10, 5], expected: 94.5 }
      ];
      return buildPythonTaskMeta(title, 'variables', difficulty, prompt, 'solve(amount, discount, tax)', ['discounted = amount - (amount * discount / 100)', '# TODO: add the tax and round the final price', 'return discounted'], ['discounted = amount - (amount * discount / 100)', 'final = discounted + (discounted * tax / 100)', 'return round(final, 2)'], tests, {
        hints: ['Разбей расчёт на понятные шаги: сначала скидка, потом налог.', 'Округли итог только в самом конце.'],
        explanation: 'Задача заставляет держать вычисление в нескольких переменных, а не сваливать всё в одну формулу.',
        strategy: 'simple',
        tags: ['price', 'rounding'],
        seed: `variables:h:${amount}:${discount}:${tax}`
      });
    }
    case 'expert':
    default: {
      const opening = rng.int(20, 80);
      const delta = rng.int(-10, 25);
      const multiplier = rng.int(2, 4);
      const offset = rng.int(1, 15);
      const base = opening + delta;
      const scaled = base * multiplier;
      const result = scaled - offset;
      const title = 'Сводка из нескольких шагов';
      const prompt = `Начальное значение ${opening}, изменение ${delta}, множитель ${multiplier} и смещение ${offset}. Сложи шаги в промежуточные переменные и верни словарь со всеми итогами.`;
      const tests = [
        { args: [opening, delta, multiplier, offset], expected: { base, scaled, result } },
        { args: [10, 5, 3, 4], expected: { base: 15, scaled: 45, result: 41 } }
      ];
      return buildPythonTaskMeta(title, 'variables', difficulty, prompt, 'solve(opening, delta, multiplier, offset)', ['base = opening + delta', '# TODO: scale, offset, and return all steps', 'return {"base": base}'], ['base = opening + delta', 'scaled = base * multiplier', 'result = scaled - offset', 'return {"base": base, "scaled": scaled, "result": result}'], tests, {
        hints: ['Сначала собери базовое значение, потом применяй множитель, потом финальное смещение.', 'Верни результат в виде словаря, чтобы было видно каждый шаг.'],
        explanation: 'Это уже не просто присваивание, а работа с цепочкой связанных переменных и явным сохранением промежуточных итогов.',
        strategy: 'simple',
        tags: ['summary', 'steps'],
        seed: `variables:x:${opening}:${delta}:${multiplier}:${offset}`
      });
    }
  }
}

function buildConditionalsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const value = rng.int(-12, 12);
      const title = 'Знак числа';
      const prompt = `Дано число ${value}. Верни строку: "negative", если число меньше нуля, "zero", если равно нулю, и "positive" иначе.`;
      const tests = [
        { args: [value], expected: value < 0 ? 'negative' : value === 0 ? 'zero' : 'positive' },
        { args: [-3], expected: 'negative' },
        { args: [0], expected: 'zero' },
        { args: [5], expected: 'positive' }
      ];
      return buildPythonTaskMeta(title, 'conditionals', difficulty, prompt, 'solve(value)', ['if value < 0:', "    return 'negative'", '# TODO: handle zero and positive values', "return 'positive'"], ['if value < 0:', "    return 'negative'", 'if value == 0:', "    return 'zero'", "return 'positive'"], tests, {
        hints: ['Сделай обычную цепочку if.', 'Проверяй отрицательное, затем ноль, затем всё остальное.'],
        explanation: 'Задача тренирует простую ветвящуюся логику без лишних деталей.',
        strategy: 'simple',
        tags: ['sign', 'branch'],
        seed: `conditionals:e:${value}`
      });
    }
    case 'medium': {
      const score = rng.int(0, 100);
      const title = 'Оценка результата';
      const prompt = `Дан балл ${score}. Верни оценку: "A" для 90+, "B" для 75+, "C" для 60+, иначе "D".`;
      const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';
      const tests = [
        { args: [score], expected: grade },
        { args: [95], expected: 'A' },
        { args: [80], expected: 'B' },
        { args: [65], expected: 'C' },
        { args: [20], expected: 'D' }
      ];
      return buildPythonTaskMeta(title, 'conditionals', difficulty, prompt, 'solve(score)', ['if score >= 90:', "    return 'A'", '# TODO: add the B/C branches', "return 'D'"], ['if score >= 90:', "    return 'A'", 'elif score >= 75:', "    return 'B'", 'elif score >= 60:', "    return 'C'", "return 'D'"], tests, {
        hints: ['Сначала проверь самый высокий порог.', 'В `elif` ветка ниже не должна перехватывать более высокий балл.'],
        explanation: 'Задача учит строить цепочку условий по убыванию порогов.',
        strategy: 'simple',
        tags: ['grade', 'branches'],
        seed: `conditionals:m:${score}`
      });
    }
    case 'hard': {
      const amount = rng.int(20, 160);
      const isMember = rng.bool(0.5);
      const title = 'Стоимость доставки';
      const prompt = `Заказ на сумму ${amount}. Если пользователь участник клуба, доставка бесплатна. Если сумма заказа 80 и больше, доставка стоит 5. Иначе доставка стоит 12. Верни итоговую стоимость заказа вместе с доставкой.`;
      const delivery = isMember ? 0 : amount >= 80 ? 5 : 12;
      const total = amount + delivery;
      const tests = [
        { args: [amount, isMember], expected: total },
        { args: [90, true], expected: 90 },
        { args: [90, false], expected: 95 },
        { args: [40, false], expected: 52 }
      ];
      return buildPythonTaskMeta(title, 'conditionals', difficulty, prompt, 'solve(amount, is_member)', ['delivery = 12', 'if is_member:', '    delivery = 0', '# TODO: give large orders cheaper delivery', 'return amount + delivery'], ['if is_member:', '    delivery = 0', 'elif amount >= 80:', '    delivery = 5', 'else:', '    delivery = 12', 'return amount + delivery'], tests, {
        hints: ['Начни с самого сильного условия: статус участника клуба.', 'Потом проверь размер заказа, и только потом ставь обычную доставку.'],
        explanation: 'Задача учит выстраивать приоритет веток: более важные условия должны идти раньше.',
        strategy: 'simple',
        tags: ['delivery', 'priority'],
        seed: `conditionals:h:${amount}:${Number(isMember)}`
      });
    }
    case 'expert':
    default: {
      const score = rng.int(0, 100);
      const latePenalty = rng.int(0, 20);
      const bonus = rng.int(0, 15);
      const total = score + bonus - latePenalty;
      const verdict = total >= 85 ? 'excellent' : total >= 70 ? 'good' : total >= 50 ? 'review' : 'redo';
      const title = 'Финальный вердикт';
      const prompt = `Исходный балл ${score}, бонус ${bonus}, штраф ${latePenalty}. Посчитай итог и верни строку: "excellent", "good", "review" или "redo" по итоговому баллу.`;
      const tests = [
        { args: [score, latePenalty, bonus], expected: verdict },
        { args: [90, 0, 0], expected: 'excellent' },
        { args: [75, 0, 0], expected: 'good' },
        { args: [60, 5, 0], expected: 'review' },
        { args: [30, 0, 0], expected: 'redo' }
      ];
      return buildPythonTaskMeta(title, 'conditionals', difficulty, prompt, 'solve(score, late_penalty, bonus)', ['total = score + bonus - late_penalty', '# TODO: map the total to a verdict', "return 'redo'"], ['total = score + bonus - late_penalty', 'if total >= 85:', "    return 'excellent'", 'elif total >= 70:', "    return 'good'", 'elif total >= 50:', "    return 'review'", "return 'redo'"], tests, {
        hints: ['Сначала посчитай итоговый балл, а потом выбери категорию.', 'Условные ветки лучше располагать от более строгой к более мягкой.'],
        explanation: 'Эта задача соединяет арифметику и ветвление, чтобы проверять не только if/else, но и порядок условий.',
        strategy: 'simple',
        tags: ['verdict', 'thresholds'],
        seed: `conditionals:x:${score}:${latePenalty}:${bonus}`
      });
    }
  }
}

function buildLoopsTask(difficulty, rng) {
  switch (difficulty) {
    case 'easy': {
      const values = randomNumbers(rng, rng.int(4, 7), -8, 20);
      const title = 'Сумма списка';
      const prompt = `Дан список ${preview(values)}. Пройди по нему циклом и верни сумму всех чисел.`;
      const total = values.reduce((acc, value) => acc + value, 0);
      const tests = [
        { args: [values], expected: total },
        { args: [[1, 2, 3, 4]], expected: 10 }
      ];
      return buildPythonTaskMeta(title, 'loops', difficulty, prompt, 'solve(values)', ['total = 0', 'for value in values:', '    total += value', '# TODO: return the accumulated total', 'return 0'], ['total = 0', 'for value in values:', '    total += value', 'return total'], tests, {
        hints: ['Заведи переменную для суммы и обновляй её на каждом шаге.', 'Не забудь вернуть итог после цикла.'],
        explanation: 'Это базовый loop-pattern: пройти по коллекции и накопить результат.',
        strategy: 'simple',
        tags: ['sum', 'accumulate'],
        seed: `loops:e:${values.join(',')}`
      });
    }
    case 'medium': {
      const values = randomNumbers(rng, rng.int(5, 8), 0, 20);
      const threshold = rng.int(5, 12);
      const title = 'Подсчёт значений выше порога';
      const prompt = `Дан список ${preview(values)} и порог ${threshold}. Пройди по списку циклом и верни, сколько значений больше или равно порогу.`;
      const count = values.filter((value) => value >= threshold).length;
      const tests = [
        { args: [values, threshold], expected: count },
        { args: [[1, 5, 7, 10], 5], expected: 3 }
      ];
      return buildPythonTaskMeta(title, 'loops', difficulty, prompt, 'solve(values, threshold)', ['count = 0', 'for value in values:', '    if value >= threshold:', '        count += 1', '# TODO: return the count', 'return 0'], ['count = 0', 'for value in values:', '    if value >= threshold:', '        count += 1', 'return count'], tests, {
        hints: ['Проверь каждое значение и решай, увеличивать ли счётчик.', 'Лучше считать в отдельной переменной, чем собирать лишние структуры.'],
        explanation: 'Задача тренирует цикл с условием внутри и подсчёт выбранных элементов.',
        strategy: 'simple',
        tags: ['count', 'threshold'],
        seed: `loops:m:${values.join(',')}:${threshold}`
      });
    }
    case 'hard': {
      const values = randomNumbers(rng, rng.int(5, 8), -10, 18);
      const title = 'Только чётные';
      const prompt = `Дан список ${preview(values)}. Пройди по нему циклом и верни новый список только с чётными числами, сохраняя порядок.`;
      const expected = values.filter((value) => value % 2 === 0);
      const tests = [
        { args: [values], expected },
        { args: [[1, 2, 3, 4, 5, 6]], expected: [2, 4, 6] }
      ];
      return buildPythonTaskMeta(title, 'loops', difficulty, prompt, 'solve(values)', ['result = []', 'for value in values:', '    if value % 2 == 0:', '        result.append(value)', '# TODO: return the filtered list', 'return []'], ['result = []', 'for value in values:', '    if value % 2 == 0:', '        result.append(value)', 'return result'], tests, {
        hints: ['Проверяй каждый элемент по очереди.', 'Сохраняй только те значения, которые проходят условие.'],
        explanation: 'Задача учит собирать новый список через цикл и фильтрацию.',
        strategy: 'collection',
        tags: ['filter', 'even'],
        seed: `loops:h:${values.join(',')}`
      });
    }
    case 'expert':
    default: {
      const values = randomNumbers(rng, rng.int(6, 9), 0, 20);
      const title = 'Самая длинная возрастающая серия';
      const prompt = `Дан список ${preview(values)}. Пройди по нему циклом и верни длину самой длинной возрастающей подряд серии.`;
      let best = 0;
      let current = 0;
      let previous = null;
      for (const value of values) {
        if (previous === null || value > previous) {
          current += 1;
        } else {
          current = 1;
        }
        best = Math.max(best, current);
        previous = value;
      }
      const tests = [
        { args: [values], expected: best },
        { args: [[1, 2, 3, 1, 2, 3, 4]], expected: 4 }
      ];
      return buildPythonTaskMeta(title, 'loops', difficulty, prompt, 'solve(values)', ['best = 0', 'current = 0', 'previous = None', '# TODO: finish the streak tracking loop', 'return best'], ['best = 0', 'current = 0', 'previous = None', 'for value in values:', '    if previous is None or value > previous:', '        current += 1', '    else:', '        current = 1', '    best = max(best, current)', '    previous = value', 'return best'], tests, {
        hints: ['Держи две переменные: текущую серию и лучшую серию.', 'Сравнивай текущее значение с предыдущим, а не со всем списком сразу.'],
        explanation: 'Это уже loop-pattern со слежением за состоянием между итерациями.',
        strategy: 'collection',
        tags: ['streak', 'sequence'],
        seed: `loops:x:${values.join(',')}`
      });
    }
  }
}

function buildGeneratedTask(category, difficulty, rng) {
  switch (category) {
    case 'variables':
      return buildVariablesTask(difficulty, rng);
    case 'conditionals':
      return buildConditionalsTask(difficulty, rng);
    case 'loops':
      return buildLoopsTask(difficulty, rng);
    case 'lists':
      return rng.bool(0.5) ? buildListsTaskExpanded(difficulty, rng) : buildListsTask(difficulty, rng);
    case 'dicts':
      return rng.bool(0.5) ? buildDictsTaskExpanded(difficulty, rng) : buildDictsTask(difficulty, rng);
    case 'strings':
      return rng.bool(0.5) ? buildStringsTaskExpanded(difficulty, rng) : buildStringsTask(difficulty, rng);
    case 'functions':
      return rng.bool(0.5) ? buildFunctionsTaskExpanded(difficulty, rng) : buildFunctionsTask(difficulty, rng);
    case 'algorithms':
      return rng.bool(0.5) ? buildAlgorithmsTaskExpanded(difficulty, rng) : buildAlgorithmsTask(difficulty, rng);
    default:
      return rng.bool(0.5) ? buildListsTaskExpanded(difficulty, rng) : buildListsTask(difficulty, rng);
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
      id: 'daily',
      title: 'Ежедневный',
      description: 'Заверши ежедневный челлендж',
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
}

function getCategories() {
  return CATEGORY_META;
}

function getDifficulties() {
  return DIFFICULTIES;
}

function getPythonRuntime() {
  if (cachedPythonRuntime) {
    return cachedPythonRuntime;
  }

  const candidates = [
    { command: 'python', args: [] },
    { command: 'py', args: ['-3'] }
  ];

  for (const candidate of candidates) {
    const probe = spawnSync(candidate.command, [...candidate.args, '--version'], {
      encoding: 'utf8'
    });
    const output = `${probe.stdout || ''}${probe.stderr || ''}`;
    if (!probe.error && (probe.status === 0 || /Python\s+\d+/i.test(output))) {
      cachedPythonRuntime = candidate;
      return candidate;
    }
  }

  cachedPythonRuntime = candidates[0];
  return cachedPythonRuntime;
}

function ensureRunnerPath() {
  if (extractedRunnerPath && fs.existsSync(extractedRunnerPath)) {
    return extractedRunnerPath;
  }

  const runnerSource = fs.readFileSync(path.join(__dirname, 'runner.py'), 'utf8');
  const runnerDir = path.join(os.tmpdir(), 'js-infinite-trainer-python');
  fs.mkdirSync(runnerDir, { recursive: true });
  const runnerHash = hashString(runnerSource).toString(16);
  extractedRunnerPath = path.join(runnerDir, `runner-${runnerHash}.py`);
  fs.writeFileSync(extractedRunnerPath, runnerSource, { encoding: 'utf8', mode: 0o600 });
  return extractedRunnerPath;
}

async function runTaskTests(task, userCode) {
  const start = Date.now();
  const runtime = getPythonRuntime();
  const runnerPath = ensureRunnerPath();
  const payload = JSON.stringify({
    task: {
      id: task?.id || null,
      title: task?.title || '',
      tests: cloneJson(task?.tests || [])
    },
    userCode: String(userCode ?? '')
  });

  const result = spawnSync(runtime.command, [...runtime.args, runnerPath], {
    input: payload,
    encoding: 'utf8',
    timeout: NATIVE_RUN_TIMEOUT_MS,
    env: buildSafeProcessEnv(),
    maxBuffer: 10 * 1024 * 1024
  });

  if (result.error && result.error.code === 'ETIMEDOUT') {
    return {
      passed: false,
      error: 'Python-раннер превысил лимит времени.',
      tests: [],
      logs: [],
      durationMs: Date.now() - start
    };
  }

  if (result.error) {
    return {
      passed: false,
      error: result.error.message || String(result.error),
      tests: [],
      logs: [],
      durationMs: Date.now() - start
    };
  }

  const output = String(result.stdout || '').trim();
  if (!output) {
    return {
      passed: false,
      error: (result.stderr || '').trim() || 'Python-раннер не вернул результат.',
      tests: [],
      logs: [],
      durationMs: Date.now() - start
    };
  }

  try {
    const report = JSON.parse(output);
    return {
      ...report,
      durationMs: typeof report.durationMs === 'number' ? report.durationMs : Date.now() - start
    };
  } catch (error) {
    return {
      passed: false,
      error: `Не удалось разобрать ответ Python-раннера: ${error.message || String(error)}`,
      tests: [],
      logs: result.stderr ? [{ type: 'stderr', text: String(result.stderr).trim() }] : [],
      durationMs: Date.now() - start
    };
  }
}

function createCustomTaskTemplate() {
  return {
    kernelId: PYTHON_KERNEL_META.id,
    title: 'Моя Python-задача',
    category: 'lists',
    difficulty: 'medium',
    strategy: 'simple',
    prompt: 'Опиши условие задачи здесь.',
    signature: 'solve(values)',
    starterCode: pythonCodeBlock('solve(values)', ['# TODO', 'pass']),
    solution: pythonCodeBlock('solve(values)', ['return values']),
    testsJson: JSON.stringify([
      {
        args: [[1, 2, 3]],
        expected: [1, 2, 3]
      }
    ], null, 2),
    hints: ['Первая подсказка', 'Вторая подсказка'],
    explanation: 'Краткий разбор решения.'
  };
}

function normalizeCustomTask(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const category = normalizeCategory(raw.category);
  const difficulty = normalizeDifficulty(raw.difficulty);
  const strategy = normalizeStrategy(raw.strategy);
  const answerFormat = typeof raw.answerFormat === 'string' && raw.answerFormat.trim()
    ? raw.answerFormat.trim()
    : typeof raw.meta?.answerFormat === 'string' && raw.meta.answerFormat.trim()
      ? raw.meta.answerFormat.trim()
      : undefined;
  const thinkingStyle = typeof raw.thinkingStyle === 'string' && raw.thinkingStyle.trim()
    ? raw.thinkingStyle.trim()
    : typeof raw.meta?.thinkingStyle === 'string' && raw.meta.thinkingStyle.trim()
      ? raw.meta.thinkingStyle.trim()
      : undefined;
  const variationNotes = Array.isArray(raw.variationNotes)
    ? raw.variationNotes.slice()
    : Array.isArray(raw.meta?.variationNotes)
      ? raw.meta.variationNotes.slice()
      : [];
  const structureType = typeof raw.structureType === 'string' && raw.structureType.trim()
    ? raw.structureType.trim()
    : typeof raw.meta?.structureType === 'string' && raw.meta.structureType.trim()
      ? raw.meta.structureType.trim()
      : null;
  const contextType = typeof raw.contextType === 'string' && raw.contextType.trim()
    ? raw.contextType.trim()
    : typeof raw.meta?.contextType === 'string' && raw.meta.contextType.trim()
      ? raw.meta.contextType.trim()
      : null;
  const variantId = typeof raw.variantId === 'string' && raw.variantId.trim()
    ? raw.variantId.trim()
    : typeof raw.meta?.variantId === 'string' && raw.meta.variantId.trim()
      ? raw.meta.variantId.trim()
      : null;
  const constraints = Array.isArray(raw.constraints)
    ? raw.constraints.slice()
    : Array.isArray(raw.meta?.constraints)
      ? raw.meta.constraints.slice()
      : [];
  let tests = [];

  if (Array.isArray(raw.tests)) {
    tests = cloneJson(raw.tests);
  } else if (typeof raw.testsJson === 'string') {
    try {
      const parsed = JSON.parse(raw.testsJson);
      if (Array.isArray(parsed)) {
        tests = cloneJson(parsed);
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
      : pythonCodeBlock('solve(values)', ['# TODO', 'pass']);

  const solution = typeof raw.solution === 'string'
    ? raw.solution
    : typeof raw.solutionCode === 'string'
      ? raw.solutionCode
      : starterCode;

  const createdAt = raw.createdAt || raw.importedAt || Date.now();

  return makeTask({
    id: raw.id || `python-custom-${hashString(`${raw.title || raw.prompt || 'task'}:${createdAt}`)}`,
    source: 'custom',
    createdAt,
    category,
    difficulty,
    title: String(raw.title || 'Пользовательская задача'),
    prompt: String(raw.prompt || ''),
    signature: String(raw.signature || 'solve(values)'),
    starterCode,
    solution,
    hints,
    explanation: String(raw.explanation || ''),
    strategy,
    tests,
    xp: Number(raw.xp) || xpForDifficulty(difficulty),
    tags: Array.isArray(raw.tags) ? raw.tags.slice() : ['custom'],
    answerFormat,
    thinkingStyle,
    structureType,
    contextType,
    variantId,
    constraints,
    variationNotes,
    meta: {
      ...(raw.meta && typeof raw.meta === 'object' ? raw.meta : {}),
      answerFormat,
      thinkingStyle,
      structureType,
      contextType,
      variantId,
      constraints,
      variationNotes
    }
  });
}

module.exports = {
  ...PYTHON_KERNEL_META,
  getCategories,
  getDifficulties,
  generateTask(options = {}) {
    const rng = createRng(resolveSeed(options));
    const categories = normalizeSelection(options.categories, CATEGORY_ORDER);
    const difficulties = normalizeSelection(options.difficulties, DIFFICULTIES);
    const category = categories.includes(options.focusCategory) && !options.randomMode ? options.focusCategory : rng.pick(categories);
    const difficulty = difficulties.includes(options.focusDifficulty) && !options.randomMode ? options.focusDifficulty : rng.pick(difficulties);
    const challengeType = options.mode === 'daily' ? 'daily' : options.mode === 'boss' ? 'boss' : 'practice';
    const topicTask = buildPythonTopicTask(options);
    if (topicTask) {
      topicTask.challengeType = challengeType;
      topicTask.meta = {
        ...topicTask.meta,
        challengeType,
        randomMode: options.randomMode !== false,
        seed: resolveSeed(options)
      };
      return topicTask;
    }

    const standard = buildGeneratedTask(category, difficulty, rng);
    standard.challengeType = challengeType;
    standard.meta = {
      ...standard.meta,
      challengeType,
      randomMode: options.randomMode !== false,
      seed: resolveSeed(options)
    };

    const customs = (options.customTasks || [])
      .map(normalizeCustomTask)
      .filter(Boolean)
      .filter((task) => task.category === category && task.difficulty === difficulty);

    const pool = [standard, ...customs];
    if (pool.length === 1) {
      return standard;
    }

    const chosen = rng.pick(pool);
    chosen.meta = {
      ...chosen.meta,
      challengeType,
      randomMode: options.randomMode !== false,
      seed: resolveSeed(options)
    };
    return chosen;
  },
  runTaskTests,
  getProgressSummary,
  buildAchievements,
  createCustomTaskTemplate,
  normalizeCustomTask
};
