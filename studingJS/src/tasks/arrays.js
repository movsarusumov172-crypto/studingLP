const {
  buildTask,
  pickVariant,
  preview,
  sampleNumbers,
  sampleWords,
  samplePersons,
  sampleText,
  sampleName,
  sampleCity,
  sampleEmail,
  capitalize,
  unique,
  sum
} = require('../engine/taskShared');

const CATEGORY = 'arrays';

const DIFFICULTY_PROFILE = {
  easy: {
    minCount: 5,
    maxCount: 7,
    minValue: -12,
    maxValue: 30,
    thresholdMin: 35,
    thresholdMax: 65,
    windowMin: 2,
    windowMax: 3
  },
  medium: {
    minCount: 6,
    maxCount: 9,
    minValue: -25,
    maxValue: 60,
    thresholdMin: 40,
    thresholdMax: 80,
    windowMin: 2,
    windowMax: 4
  },
  hard: {
    minCount: 8,
    maxCount: 12,
    minValue: -50,
    maxValue: 100,
    thresholdMin: 50,
    thresholdMax: 90,
    windowMin: 3,
    windowMax: 4
  },
  expert: {
    minCount: 10,
    maxCount: 14,
    minValue: -80,
    maxValue: 150,
    thresholdMin: 60,
    thresholdMax: 95,
    windowMin: 3,
    windowMax: 5
  }
};

const FAMILY_WEIGHTS = {
  easy: [
    { value: 'sum', weight: 5 },
    { value: 'filter', weight: 4 },
    { value: 'dedupe', weight: 3 },
    { value: 'group', weight: 1 },
    { value: 'window', weight: 1 }
  ],
  medium: [
    { value: 'sum', weight: 2 },
    { value: 'filter', weight: 3 },
    { value: 'dedupe', weight: 3 },
    { value: 'group', weight: 3 },
    { value: 'window', weight: 2 }
  ],
  hard: [
    { value: 'sum', weight: 1 },
    { value: 'filter', weight: 2 },
    { value: 'dedupe', weight: 2 },
    { value: 'group', weight: 3 },
    { value: 'window', weight: 4 }
  ],
  expert: [
    { value: 'sum', weight: 1 },
    { value: 'filter', weight: 1 },
    { value: 'dedupe', weight: 2 },
    { value: 'group', weight: 3 },
    { value: 'window', weight: 5 }
  ]
};

const STRUCTURES = {
  sum: ['primitive', 'object', 'summary', 'options', 'callback'],
  filter: ['array', 'object', 'options', 'callback'],
  dedupe: ['array', 'object', 'options', 'callback'],
  group: ['object', 'entries', 'summary', 'options', 'callback'],
  window: ['primitive', 'object', 'options', 'callback']
};

const STRUCTURE_WEIGHTS = {
  easy: {
    sum: [
      { value: 'primitive', weight: 6 },
      { value: 'object', weight: 3 },
      { value: 'summary', weight: 2 },
      { value: 'options', weight: 1 },
      { value: 'callback', weight: 1 }
    ],
    filter: [
      { value: 'array', weight: 5 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 2 },
      { value: 'callback', weight: 1 }
    ],
    dedupe: [
      { value: 'array', weight: 5 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 2 },
      { value: 'callback', weight: 1 }
    ],
    group: [
      { value: 'object', weight: 5 },
      { value: 'entries', weight: 2 },
      { value: 'summary', weight: 2 },
      { value: 'options', weight: 1 },
      { value: 'callback', weight: 1 }
    ],
    window: [
      { value: 'primitive', weight: 6 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 1 },
      { value: 'callback', weight: 1 }
    ]
  },
  medium: {
    sum: [
      { value: 'primitive', weight: 4 },
      { value: 'object', weight: 3 },
      { value: 'summary', weight: 3 },
      { value: 'options', weight: 2 },
      { value: 'callback', weight: 2 }
    ],
    filter: [
      { value: 'array', weight: 3 },
      { value: 'object', weight: 4 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 2 }
    ],
    dedupe: [
      { value: 'array', weight: 3 },
      { value: 'object', weight: 4 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 2 }
    ],
    group: [
      { value: 'object', weight: 3 },
      { value: 'entries', weight: 3 },
      { value: 'summary', weight: 3 },
      { value: 'options', weight: 2 },
      { value: 'callback', weight: 2 }
    ],
    window: [
      { value: 'primitive', weight: 4 },
      { value: 'object', weight: 4 },
      { value: 'options', weight: 2 },
      { value: 'callback', weight: 2 }
    ]
  },
  hard: {
    sum: [
      { value: 'primitive', weight: 2 },
      { value: 'object', weight: 2 },
      { value: 'summary', weight: 4 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 3 }
    ],
    filter: [
      { value: 'array', weight: 2 },
      { value: 'object', weight: 4 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 3 }
    ],
    dedupe: [
      { value: 'array', weight: 2 },
      { value: 'object', weight: 4 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 3 }
    ],
    group: [
      { value: 'object', weight: 2 },
      { value: 'entries', weight: 4 },
      { value: 'summary', weight: 4 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 3 }
    ],
    window: [
      { value: 'primitive', weight: 3 },
      { value: 'object', weight: 4 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 4 }
    ]
  },
  expert: {
    sum: [
      { value: 'primitive', weight: 1 },
      { value: 'object', weight: 2 },
      { value: 'summary', weight: 4 },
      { value: 'options', weight: 4 },
      { value: 'callback', weight: 4 }
    ],
    filter: [
      { value: 'array', weight: 1 },
      { value: 'object', weight: 4 },
      { value: 'options', weight: 4 },
      { value: 'callback', weight: 4 }
    ],
    dedupe: [
      { value: 'array', weight: 1 },
      { value: 'object', weight: 4 },
      { value: 'options', weight: 4 },
      { value: 'callback', weight: 4 }
    ],
    group: [
      { value: 'object', weight: 1 },
      { value: 'entries', weight: 4 },
      { value: 'summary', weight: 4 },
      { value: 'options', weight: 4 },
      { value: 'callback', weight: 4 }
    ],
    window: [
      { value: 'primitive', weight: 2 },
      { value: 'object', weight: 4 },
      { value: 'options', weight: 4 },
      { value: 'callback', weight: 4 }
    ]
  }
};

const CONSTRAINT_TEXT = {
  'one-pass': 'Сделай за один проход.',
  'linear-time': 'Сложность должна быть O(n).',
  'no-mutation': 'Не мутируй входные данные.',
  'no-map': 'Не используй map.',
  'no-filter': 'Не используй filter.',
  'preserve-order': 'Сохрани исходный порядок.',
  'callback': 'Верни результат через callback.',
  'object-result': 'Верни объект вместо примитива.',
  'options-api': 'Используй options как часть API.',
  'sliding-window': 'Используй идею скользящего окна.',
  'keep-last': 'Сохраняй последние вхождения.',
  'keep-first': 'Сохраняй первые вхождения.'
};

const SUM_GOALS = {
  primitive: 'Верни только сумму.',
  object: 'Верни объект { sum }.',
  summary: 'Верни объект { sum, count }.',
  options: 'Верни объект { sum, count, label } и возьми label из options.',
  callback: 'Передай сумму в done(...) и верни её из функции.'
};

const FILTER_GOALS = {
  array: 'Верни массив отобранных элементов.',
  object: 'Верни объект { items, count }.',
  options: 'Возьми правило отбора из options и верни массив отобранных элементов.',
  callback: 'Передай объект { items, count } в done(...) и верни его.'
};

const DEDUPE_GOALS = {
  array: 'Верни массив уникальных значений, сохранив порядок.',
  object: 'Верни объект { unique, removed }.',
  options: 'Используй options.keepLast и верни массив уникальных значений.',
  callback: 'Передай объект { unique, removed } в done(...) и верни его.'
};

const GROUP_GOALS = {
  object: 'Верни объект с количеством элементов по ключу.',
  entries: 'Верни массив пар [key, count], отсортированный по key.',
  summary: 'Верни объект { groups, total }.',
  options: 'Используй options.key и верни объект с группировкой.',
  callback: 'Передай объект с группировкой в done(...) и верни его.'
};

const WINDOW_GOALS = {
  primitive: 'Верни только лучшее значение окна.',
  object: 'Верни объект { value, index }.',
  options: 'Используй options.windowSize и верни объект { value, index, windowSize }.',
  callback: 'Передай объект { value, index } в done(...) и верни лучшее значение.'
};

const PROMPTS = {
  sum: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Дан массив ${dataPreview}. Это ${context.title}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `У тебя есть список для ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Реализуй решение для ${context.title}. На входе ${dataPreview}. ${goal} ${constraintsText}`
  ],
  filter: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Дан список ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `У тебя есть массив данных для ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Собери выборку для ${context.title}. На входе ${dataPreview}. ${goal} ${constraintsText}`
  ],
  dedupe: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Дан список ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `У тебя есть массив с повторами для ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Очисти ${context.title}. На входе ${dataPreview}. ${goal} ${constraintsText}`
  ],
  group: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Дан массив объектов для ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Собери статистику по ${context.title}. На входе ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Нужна группировка для ${context.title}. Данные: ${dataPreview}. ${goal} ${constraintsText}`
  ],
  window: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Дан массив значений для ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `У тебя есть поток ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Реализуй скользящее окно для ${context.title}. На входе ${dataPreview}. ${goal} ${constraintsText}`
  ]
};

const TITLES = {
  sum: [
    ({ context }) => `Сумма: ${context.title}`,
    ({ context }) => `Итог по ${context.title}`,
    ({ context }) => `Сводка ${context.title}`
  ],
  filter: [
    ({ context }) => `Фильтр ${context.title}`,
    ({ context }) => `Выборка ${context.title}`,
    ({ context }) => `Отбор ${context.title}`
  ],
  dedupe: [
    ({ context }) => `Уникальные ${context.title}`,
    ({ context }) => `Очистка ${context.title}`,
    ({ context }) => `Сжатие ${context.title}`
  ],
  group: [
    ({ context }) => `Группировка ${context.title}`,
    ({ context }) => `Статистика ${context.title}`,
    ({ context }) => `Сводка по ${context.title}`
  ],
  window: [
    ({ context }) => `Окно ${context.title}`,
    ({ context }) => `Пик ${context.title}`,
    ({ context }) => `Лучший отрезок ${context.title}`
  ]
};

const CONTEXTS = {
  sum: [
    { id: 'scores', title: 'баллов игроков' },
    { id: 'prices', title: 'цен товаров' },
    { id: 'temperatures', title: 'температур за день' },
    { id: 'latency', title: 'задержек запросов' },
    { id: 'distance', title: 'показаний датчиков' },
    { id: 'profit', title: 'доходов за смену' }
  ],
  filter: [
    { id: 'players', title: 'игроков по score', kind: 'records', field: 'score', comparator: 'gte', thresholdLabel: 'минимальный score' },
    { id: 'tickets', title: 'заявок по priority', kind: 'records', field: 'priority', comparator: 'gte', thresholdLabel: 'минимальный priority' },
    { id: 'products', title: 'товаров по цене', kind: 'records', field: 'price', comparator: 'lte', thresholdLabel: 'максимальная цена' },
    { id: 'temperatures', title: 'температур выше порога', kind: 'numbers', comparator: 'gte', thresholdLabel: 'порог температуры' },
    { id: 'events', title: 'событий по статусу', kind: 'records', field: 'status', comparator: 'in', thresholdLabel: 'список статусов', allowedValues: ['open', 'pending', 'queued'] }
  ],
  dedupe: [
    { id: 'words', title: 'слов' },
    { id: 'codes', title: 'кодовых меток' },
    { id: 'cities', title: 'городов' },
    { id: 'numbers', title: 'чисел' },
    { id: 'aliases', title: 'алиасов' }
  ],
  group: [
    { id: 'city', title: 'пользователей по городам', key: 'city' },
    { id: 'team', title: 'сотрудников по командам', key: 'team' },
    { id: 'department', title: 'заявок по отделам', key: 'department' },
    { id: 'role', title: 'участников по ролям', key: 'role' },
    { id: 'status', title: 'событий по статусам', key: 'status' }
  ],
  window: [
    { id: 'sensors', title: 'показаний датчиков', unit: 'units' },
    { id: 'latency', title: 'времени ответа', unit: 'ms' },
    { id: 'sales', title: 'продаж', unit: '₽' },
    { id: 'steps', title: 'шагов', unit: 'steps' },
    { id: 'load', title: 'нагрузки CPU', unit: '%' }
  ]
};

function pickDifficultyProfile(difficulty) {
  return DIFFICULTY_PROFILE[difficulty] || DIFFICULTY_PROFILE.easy;
}

function normalizeConstraints(constraints = []) {
  return Array.from(new Set(constraints.map((item) => String(item)).filter(Boolean))).sort();
}

function renderConstraints(constraints = []) {
  const normalized = normalizeConstraints(constraints);
  const phrases = normalized.map((key) => CONSTRAINT_TEXT[key]).filter(Boolean);
  return phrases.length > 0 ? phrases.join(' ') : '';
}

function makeVariantId(logicType, structureType, contextType, rng) {
  return `${CATEGORY}-${logicType}-${structureType}-${contextType}-${rng.int(0, 100000)}`;
}

function pickFamily(rng, difficulty) {
  const weights = FAMILY_WEIGHTS[difficulty] || FAMILY_WEIGHTS.easy;
  return rng.weighted(weights) || 'sum';
}

function pickStructure(rng, difficulty, logicType) {
  const weights = (STRUCTURE_WEIGHTS[difficulty] && STRUCTURE_WEIGHTS[difficulty][logicType]) || [];
  return rng.weighted(weights) || STRUCTURES[logicType][0];
}

function createTask(parts) {
  return buildTask({
    category: CATEGORY,
    difficulty: parts.difficulty,
    title: parts.title,
    prompt: parts.prompt,
    signature: parts.signature,
    starterBody: parts.starterBody,
    solutionBody: parts.solutionBody,
    hints: parts.hints,
    explanation: parts.explanation,
    tests: parts.tests,
    strategy: parts.strategy || 'simple',
    async: parts.async === true,
    tags: parts.tags || [],
    meta: {
      ...(parts.meta || {}),
      logicType: parts.logicType,
      structureType: parts.structureType,
      contextType: parts.contextType,
      constraints: normalizeConstraints(parts.constraints),
      variantId: parts.variantId
    }
  });
}

function makeTitle(rng, logicType, details) {
  return pickVariant(rng, TITLES[logicType])(details);
}

function makePrompt(rng, logicType, details) {
  return pickVariant(rng, PROMPTS[logicType])(details);
}

function injectDuplicates(rng, values, copies = 2) {
  const result = values.slice();
  if (result.length < 2) {
    return result;
  }

  const limit = Math.min(Math.max(1, copies), result.length - 1);
  for (let index = 0; index < limit; index += 1) {
    const from = rng.int(0, result.length - 1);
    const to = rng.int(0, result.length - 1);
    if (from !== to) {
      result[to] = result[from];
    }
  }
  return result;
}

function buildNumberSeries(rng, profile) {
  const count = rng.int(profile.minCount, profile.maxCount);
  const series = sampleNumbers(rng, count, profile.minValue, profile.maxValue, true);
  return injectDuplicates(rng, series, rng.int(1, Math.max(1, Math.floor(series.length / 3))));
}

function computeBestWindow(numbers, windowSize) {
  let current = 0;
  for (let index = 0; index < windowSize; index += 1) {
    current += numbers[index];
  }

  let best = current;
  let bestIndex = 0;

  for (let index = windowSize; index < numbers.length; index += 1) {
    current += numbers[index] - numbers[index - windowSize];
    if (current > best) {
      best = current;
      bestIndex = index - windowSize + 1;
    }
  }

  return { value: best, index: bestIndex };
}

function filterCondition(context, itemRef, ruleRef) {
  if (context.kind === 'numbers') {
    return `${itemRef} >= ${ruleRef}`;
  }

  if (context.comparator === 'in') {
    return `${ruleRef}.includes(${itemRef}.${context.field})`;
  }

  const operator = context.comparator === 'lte' ? '<=' : '>=';
  return `${itemRef}.${context.field} ${operator} ${ruleRef}`;
}

function filterMatches(context, item, rule) {
  if (context.kind === 'numbers') {
    return item >= rule;
  }

  if (context.comparator === 'in') {
    return Array.isArray(rule) && rule.includes(item.status);
  }

  if (context.comparator === 'lte') {
    return item[context.field] <= rule;
  }

  return item[context.field] >= rule;
}

function buildSumTask(difficulty, rng) {
  const profile = pickDifficultyProfile(difficulty);
  const context = pickVariant(rng, CONTEXTS.sum);
  const structureType = pickStructure(rng, difficulty, 'sum');
  const numbers = buildNumberSeries(rng, profile);
  const total = sum(numbers);
  const count = numbers.length;
  const variantId = makeVariantId('sum', structureType, context.id, rng);
  const constraintsByStructure = {
    primitive: ['one-pass', 'linear-time', 'no-mutation'],
    object: ['one-pass', 'linear-time', 'no-mutation', 'object-result'],
    summary: ['one-pass', 'linear-time', 'no-mutation', 'object-result'],
    options: ['one-pass', 'linear-time', 'no-mutation', 'object-result', 'options-api'],
    callback: ['one-pass', 'linear-time', 'no-mutation', 'callback']
  };

  const details = {
    context,
    dataPreview: preview(numbers),
    goal: SUM_GOALS[structureType],
    constraintsText: renderConstraints(constraintsByStructure[structureType])
  };

  switch (structureType) {
    case 'primitive':
      return createTask({
        difficulty,
        logicType: 'sum',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'sum', { context, structureType }),
        prompt: makePrompt(rng, 'sum', details),
        signature: 'solve(numbers)',
        starterBody: ['return 0;'],
        solutionBody: [
          'let total = 0;',
          'for (let index = 0; index < numbers.length; index += 1) {',
          '  total += numbers[index];',
          '}',
          'return total;'
        ],
        hints: ['Сложи все элементы в одном проходе.', 'Не меняй входной массив.'],
        explanation: `Базовая сумма для ${context.title}.`,
        tests: [
          { args: [numbers], expected: total },
          { args: [[1, -2, 3, 4]], expected: 6 }
        ],
        tags: ['sum', context.id, structureType]
      });

    case 'object':
      return createTask({
        difficulty,
        logicType: 'sum',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'sum', { context, structureType }),
        prompt: makePrompt(rng, 'sum', details),
        signature: 'solve(payload)',
        starterBody: ['return { sum: 0 };'],
        solutionBody: [
          'const values = Array.isArray(payload.numbers) ? payload.numbers : [];',
          'let total = 0;',
          'for (let index = 0; index < values.length; index += 1) {',
          '  total += values[index];',
          '}',
          'return { sum: total };'
        ],
        hints: ['Достань массив из payload.numbers.', 'Верни объект только с полем sum.'],
        explanation: `Форма с объектом полезна, когда в ответе нужен запас под метаданные.`,
        tests: [
          { args: [{ numbers, label: context.title }], expected: { sum: total } },
          { args: [{ numbers: [2, 3, 4], label: 'demo' }], expected: { sum: 9 } }
        ],
        tags: ['sum', context.id, structureType]
      });

    case 'summary':
      return createTask({
        difficulty,
        logicType: 'sum',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'sum', { context, structureType }),
        prompt: makePrompt(rng, 'sum', details),
        signature: 'solve(numbers)',
        starterBody: ['return { sum: 0, count: 0 };'],
        solutionBody: [
          'let total = 0;',
          'for (let index = 0; index < numbers.length; index += 1) {',
          '  total += numbers[index];',
          '}',
          'return { sum: total, count: numbers.length };'
        ],
        hints: ['Нужно вернуть и сумму, и длину.', 'Считай оба значения в одном проходе.'],
        explanation: `Это вариант для быстрой статистики по ${context.title}.`,
        tests: [
          { args: [numbers], expected: { sum: total, count } },
          { args: [[1, 2, 3]], expected: { sum: 6, count: 3 } }
        ],
        tags: ['sum', context.id, structureType]
      });

    case 'options':
      return createTask({
        difficulty,
        logicType: 'sum',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'sum', { context, structureType }),
        prompt: makePrompt(rng, 'sum', details),
        signature: 'solve(numbers, options)',
        starterBody: ['return options;'],
        solutionBody: [
          'const label = options && typeof options.label === "string" ? options.label : "summary";',
          'let total = 0;',
          'for (let index = 0; index < numbers.length; index += 1) {',
          '  total += numbers[index];',
          '}',
          'return { sum: total, count: numbers.length, label };'
        ],
        hints: ['Label бери из options.', 'Не забудь сохранить count вместе с суммой.'],
        explanation: `API-версия с options делает задачу ближе к реальному коду.`,
        tests: [
          { args: [numbers, { label: capitalize(context.title) }], expected: { sum: total, count, label: capitalize(context.title) } },
          { args: [[1, 2, 3], { label: 'demo' }], expected: { sum: 6, count: 3, label: 'demo' } }
        ],
        tags: ['sum', context.id, structureType]
      });

    case 'callback':
      return createTask({
        difficulty,
        logicType: 'sum',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'sum', { context, structureType }),
        prompt: makePrompt(rng, 'sum', details),
        signature: 'solve(numbers, done)',
        starterBody: ['return 0;'],
        solutionBody: [
          'let total = 0;',
          'for (let index = 0; index < numbers.length; index += 1) {',
          '  total += numbers[index];',
          '}',
          'done(total);',
          'return total;'
        ],
        hints: ['Сначала посчитай сумму, потом вызови done.', 'Возвращаемое значение тоже должно быть полезным.'],
        explanation: `Callback-вариант тренирует аккуратный API.`,
        tests: [
          {
            args: [numbers, { __fn: 'record', key: 'done', returnValue: total }],
            expected: total,
            expectCollected: { done: [total] }
          },
          {
            args: [[1, 2, 3], { __fn: 'record', key: 'done', returnValue: 6 }],
            expected: 6,
            expectCollected: { done: [6] }
          }
        ],
        tags: ['sum', context.id, structureType]
      });

    default:
      return buildSumTask('easy', rng);
  }
}

function buildFilterDataset(context, profile, rng) {
  const count = rng.int(profile.minCount, profile.maxCount);

  if (context.kind === 'numbers') {
    const items = injectDuplicates(rng, sampleNumbers(rng, count, profile.minValue, profile.maxValue, true), rng.int(1, 3));
    const threshold = rng.int(profile.thresholdMin, profile.thresholdMax);
    const matched = items.filter((value) => value >= threshold);
    return { items, rule: threshold, matched };
  }

  if (context.id === 'events') {
    const items = Array.from({ length: count }, (_, index) => ({
      id: `E-${index + 1}`,
      status: rng.pick(['open', 'pending', 'queued', 'done', 'closed']),
      type: rng.pick(['alert', 'sync', 'job', 'task']),
      title: capitalize(sampleWords(rng, 1)[0]),
      owner: sampleName(rng)
    }));
    const rule = rng.sample(context.allowedValues, rng.int(2, context.allowedValues.length));
    const matched = items.filter((item) => rule.includes(item.status));
    return { items, rule, matched };
  }

  if (context.id === 'products') {
    const items = Array.from({ length: count }, (_, index) => ({
      name: capitalize(sampleWords(rng, 1)[0]),
      price: rng.int(profile.minValue, profile.maxValue),
      category: rng.pick(['books', 'tools', 'gadgets', 'food']),
      inStock: rng.bool(0.7),
      sku: `SKU-${index + 1}`
    }));
    const rule = rng.int(profile.thresholdMin, profile.thresholdMax);
    const matched = items.filter((item) => item.price <= rule);
    return { items, rule, matched };
  }

  if (context.id === 'tickets') {
    const items = Array.from({ length: count }, (_, index) => ({
      id: `T-${index + 1}`,
      priority: rng.int(profile.thresholdMin - 2, profile.thresholdMax),
      status: rng.pick(['new', 'open', 'waiting', 'closed']),
      owner: sampleName(rng),
      email: sampleEmail(rng)
    }));
    const rule = rng.int(profile.thresholdMin, profile.thresholdMax);
    const matched = items.filter((item) => item.priority >= rule);
    return { items, rule, matched };
  }

  const items = samplePersons(rng, count).map((person) => ({
    ...person,
    score: rng.int(profile.minValue, profile.maxValue),
    active: rng.bool(0.65),
    city: person.city || sampleCity(rng)
  }));
  const rule = rng.int(profile.thresholdMin, profile.thresholdMax);
  const matched = items.filter((item) => item.score >= rule);
  return { items, rule, matched };
}

function buildFilterTask(difficulty, rng) {
  const profile = pickDifficultyProfile(difficulty);
  const context = pickVariant(rng, CONTEXTS.filter);
  const structureType = pickStructure(rng, difficulty, 'filter');
  const dataset = buildFilterDataset(context, profile, rng);
  const variantId = makeVariantId('filter', structureType, context.id, rng);
  const constraintsByStructure = {
    array: ['one-pass', 'linear-time', 'no-mutation', 'no-filter', 'no-map'],
    object: ['one-pass', 'linear-time', 'no-mutation', 'no-filter', 'object-result'],
    options: ['one-pass', 'linear-time', 'no-mutation', 'no-filter', 'options-api'],
    callback: ['one-pass', 'linear-time', 'no-mutation', 'no-filter', 'callback']
  };
  const condition = filterCondition(context, 'item', 'rule');
  const ruleText = Array.isArray(dataset.rule)
    ? `правило ${preview(dataset.rule)}`
    : `${context.thresholdLabel || 'порог'} = ${dataset.rule}`;
  const sampleItems = context.kind === 'numbers'
    ? [dataset.rule - 2, dataset.rule + 1, dataset.rule, dataset.rule - 5]
    : context.comparator === 'in'
      ? [
          { status: dataset.rule[0], type: 'open', title: 'Alpha' },
          { status: 'closed', type: 'job', title: 'Beta' },
          { status: dataset.rule[dataset.rule.length - 1], type: 'sync', title: 'Gamma' }
        ]
      : [
          { [context.field]: dataset.rule - 1, name: 'left' },
          { [context.field]: dataset.rule, name: 'center' },
          { [context.field]: dataset.rule + 1, name: 'right' }
        ];
  const sampleExpected = sampleItems.filter((item) => filterMatches(context, item, dataset.rule));

  const details = {
    context,
    dataPreview: preview(dataset.items),
    goal: FILTER_GOALS[structureType],
    constraintsText: renderConstraints(constraintsByStructure[structureType])
  };

  switch (structureType) {
    case 'array':
      return createTask({
        difficulty,
        logicType: 'filter',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'filter', { context, structureType }),
        prompt: makePrompt(rng, 'filter', details) + ` ${ruleText}.`,
        signature: context.kind === 'numbers' ? 'solve(items)' : 'solve(items)',
        starterBody: ['return [];'],
        solutionBody: [
          'const result = [];',
          'for (let index = 0; index < items.length; index += 1) {',
          '  const item = items[index];',
          `  if (${condition}) {`,
          '    result.push(item);',
          '  }',
          '}',
          'return result;'
        ],
        hints: ['Проверь правило для каждого элемента вручную.', 'Собери новый массив без мутаций.'],
        explanation: `Отбор элементов по ${context.title}.`,
        tests: [
          { args: [dataset.items], expected: dataset.matched },
          { args: [sampleItems], expected: sampleExpected }
        ],
        tags: ['filter', context.id, structureType]
      });

    case 'object':
      return createTask({
        difficulty,
        logicType: 'filter',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'filter', { context, structureType }),
        prompt: makePrompt(rng, 'filter', details) + ` ${ruleText}.`,
        signature: 'solve(payload)',
        starterBody: ['return { items: [], count: 0 };'],
        solutionBody: [
          'const items = Array.isArray(payload.items) ? payload.items : [];',
          'const rule = Object.prototype.hasOwnProperty.call(payload, "rule") ? payload.rule : payload.threshold;',
          'const result = [];',
          'for (let index = 0; index < items.length; index += 1) {',
          '  const item = items[index];',
          `  if (${filterCondition(context, 'item', 'rule')}) {`,
          '    result.push(item);',
          '  }',
          '}',
          'return { items: result, count: result.length };'
        ],
        hints: ['Собери и список, и count.', 'Правило отбора лежит в payload.rule или payload.threshold.'],
        explanation: `Объектный результат удобен для UI и статистики.`,
        tests: [
          {
            args: [{ items: dataset.items, rule: dataset.rule }],
            expected: { items: dataset.matched, count: dataset.matched.length }
          },
          {
            args: [{ items: sampleItems, rule: dataset.rule }],
            expected: { items: sampleExpected, count: sampleExpected.length }
          }
        ],
        tags: ['filter', context.id, structureType]
      });

    case 'options':
      return createTask({
        difficulty,
        logicType: 'filter',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'filter', { context, structureType }),
        prompt: makePrompt(rng, 'filter', details) + ` ${ruleText}.`,
        signature: 'solve(items, options)',
        starterBody: ['return items;'],
        solutionBody: [
          'const rule = Object.prototype.hasOwnProperty.call(options, "rule") ? options.rule : options.threshold;',
          'const result = [];',
          'for (let index = 0; index < items.length; index += 1) {',
          '  const item = items[index];',
          `  if (${filterCondition(context, 'item', 'rule')}) {`,
          '    result.push(item);',
          '  }',
          '}',
          'return result;'
        ],
        hints: ['Параметры отбора лежат в options.', 'Внутри цикла проверяй правило для каждого item.'],
        explanation: `API с options помогает добавить переключатели поведения без смены сигнатуры.`,
        tests: [
          {
            args: [dataset.items, context.kind === 'numbers' ? { threshold: dataset.rule } : { rule: dataset.rule }],
            expected: dataset.matched
          },
          {
            args: [sampleItems, context.kind === 'numbers' ? { threshold: dataset.rule } : { rule: dataset.rule }],
            expected: sampleExpected
          }
        ],
        tags: ['filter', context.id, structureType]
      });

    case 'callback':
      return createTask({
        difficulty,
        logicType: 'filter',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'filter', { context, structureType }),
        prompt: makePrompt(rng, 'filter', details) + ` ${ruleText}.`,
        signature: 'solve(items, rule, done)',
        starterBody: ['return { items: [], count: 0 };'],
        solutionBody: [
          'const result = [];',
          'for (let index = 0; index < items.length; index += 1) {',
          '  const item = items[index];',
          `  if (${filterCondition(context, 'item', 'rule')}) {`,
          '    result.push(item);',
          '  }',
          '}',
          'const payload = { items: result, count: result.length };',
          'done(payload);',
          'return payload;'
        ],
        hints: ['Callback должен получить уже готовый результат.', 'Не забывай вернуть payload из функции.'],
        explanation: `Callback-версия закрепляет тот же фильтр, но в другой форме API.`,
        tests: [
          {
            args: [dataset.items, dataset.rule, { __fn: 'record', key: 'done', returnValue: { items: dataset.matched, count: dataset.matched.length } }],
            expected: { items: dataset.matched, count: dataset.matched.length },
            expectCollected: { done: [{ items: dataset.matched, count: dataset.matched.length }] }
          },
          {
            args: [
              sampleItems,
              dataset.rule,
              { __fn: 'record', key: 'done', returnValue: { items: sampleExpected, count: sampleExpected.length } }
            ],
            expected: { items: sampleExpected, count: sampleExpected.length },
            expectCollected: { done: [{ items: sampleExpected, count: sampleExpected.length }] }
          }
        ],
        tags: ['filter', context.id, structureType]
      });

    default:
      return buildFilterTask('easy', rng);
  }
}

function buildDedupeValues(context, profile, rng) {
  const count = rng.int(profile.minCount, profile.maxCount);
  let values;

  switch (context.id) {
    case 'numbers':
      values = sampleNumbers(rng, count, profile.minValue, profile.maxValue, true);
      break;
    case 'codes':
      values = sampleWords(rng, count).map((word) => `${word.slice(0, 3).toUpperCase()}-${sampleText(rng, 2).toUpperCase()}`);
      break;
    case 'cities':
      values = Array.from({ length: count }, () => sampleCity(rng));
      break;
    case 'aliases':
      values = sampleWords(rng, count).map((word) => capitalize(word));
      break;
    default:
      values = sampleWords(rng, count);
      break;
  }

  const duplicates = rng.int(1, Math.max(1, Math.floor(values.length / 2)));
  return injectDuplicates(rng, values, duplicates);
}

function dedupeLast(values) {
  const seen = new Set();
  const result = [];
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.unshift(value);
  }
  return result;
}

function buildDedupeTask(difficulty, rng) {
  const profile = pickDifficultyProfile(difficulty);
  const context = pickVariant(rng, CONTEXTS.dedupe);
  const structureType = pickStructure(rng, difficulty, 'dedupe');
  const values = buildDedupeValues(context, profile, rng);
  const uniqueValues = unique(values);
  const removed = values.length - uniqueValues.length;
  const variantId = makeVariantId('dedupe', structureType, context.id, rng);
  const constraintsByStructure = {
    array: ['one-pass', 'linear-time', 'no-mutation', 'preserve-order', 'keep-first'],
    object: ['one-pass', 'linear-time', 'no-mutation', 'preserve-order', 'object-result'],
    options: ['one-pass', 'linear-time', 'no-mutation', 'keep-last', 'options-api'],
    callback: ['one-pass', 'linear-time', 'no-mutation', 'callback']
  };

  const details = {
    context,
    dataPreview: preview(values),
    goal: DEDUPE_GOALS[structureType],
    constraintsText: renderConstraints(constraintsByStructure[structureType])
  };

  switch (structureType) {
    case 'array':
      return createTask({
        difficulty,
        logicType: 'dedupe',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'dedupe', { context, structureType }),
        prompt: makePrompt(rng, 'dedupe', details),
        signature: 'solve(values)',
        starterBody: ['return values;'],
        solutionBody: [
          'const seen = new Set();',
          'const result = [];',
          'for (let index = 0; index < values.length; index += 1) {',
          '  const value = values[index];',
          '  if (seen.has(value)) {',
          '    continue;',
          '  }',
          '  seen.add(value);',
          '  result.push(value);',
          '}',
          'return result;'
        ],
        hints: ['Set помогает помнить, что уже встречалось.', 'Сохраняй первый порядок появления.'],
        explanation: `Убираем повторы из ${context.title}, не ломая порядок.`,
        tests: [
          { args: [values], expected: uniqueValues },
          { args: [[1, 2, 1, 3, 2]], expected: [1, 2, 3] }
        ],
        tags: ['dedupe', context.id, structureType]
      });

    case 'object':
      return createTask({
        difficulty,
        logicType: 'dedupe',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'dedupe', { context, structureType }),
        prompt: makePrompt(rng, 'dedupe', details),
        signature: 'solve(values)',
        starterBody: ['return { unique: [], removed: 0 };'],
        solutionBody: [
          'const seen = new Set();',
          'const uniqueValues = [];',
          'for (let index = 0; index < values.length; index += 1) {',
          '  const value = values[index];',
          '  if (seen.has(value)) {',
          '    continue;',
          '  }',
          '  seen.add(value);',
          '  uniqueValues.push(value);',
          '}',
          'return { unique: uniqueValues, removed: values.length - uniqueValues.length };'
        ],
        hints: ['Верни ещё и количество удалённых элементов.', 'Считай removed как разницу длин.'],
        explanation: `Объектный ответ удобен, когда нужен и результат, и статистика.`,
        tests: [
          { args: [values], expected: { unique: uniqueValues, removed } },
          { args: [[1, 1, 2, 3, 3]], expected: { unique: [1, 2, 3], removed: 2 } }
        ],
        tags: ['dedupe', context.id, structureType]
      });

    case 'options':
      return createTask({
        difficulty,
        logicType: 'dedupe',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'dedupe', { context, structureType }),
        prompt: makePrompt(rng, 'dedupe', details),
        signature: 'solve(values, options)',
        starterBody: ['return values;'],
        solutionBody: [
          'const keepLast = options && options.keepLast === true;',
          'if (keepLast) {',
          '  return dedupeLast(values);',
          '}',
          'const seen = new Set();',
          'const result = [];',
          'for (let index = 0; index < values.length; index += 1) {',
          '  const value = values[index];',
          '  if (seen.has(value)) {',
          '    continue;',
          '  }',
          '  seen.add(value);',
          '  result.push(value);',
          '}',
          'return result;'
        ],
        hints: ['keepLast меняет стратегию выбора дублей.', 'Если keepLast не включён, сохраняй первое вхождение.'],
        explanation: `Здесь API меняет не только название параметра, но и поведение.`,
        tests: [
          { args: [values, { keepLast: false }], expected: uniqueValues },
          { args: [values, { keepLast: true }], expected: dedupeLast(values) }
        ],
        tags: ['dedupe', context.id, structureType]
      });

    case 'callback':
      return createTask({
        difficulty,
        logicType: 'dedupe',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'dedupe', { context, structureType }),
        prompt: makePrompt(rng, 'dedupe', details),
        signature: 'solve(values, done)',
        starterBody: ['return { unique: [], removed: 0 };'],
        solutionBody: [
          'const seen = new Set();',
          'const uniqueValues = [];',
          'for (let index = 0; index < values.length; index += 1) {',
          '  const value = values[index];',
          '  if (seen.has(value)) {',
          '    continue;',
          '  }',
          '  seen.add(value);',
          '  uniqueValues.push(value);',
          '}',
          'const result = { unique: uniqueValues, removed: values.length - uniqueValues.length };',
          'done(result);',
          'return result;'
        ],
        hints: ['Callback должен получить тот же объект, который вернёт функция.', 'removed считает удалённые повторы.'],
        explanation: `Callback-вариант хорошо закрепляет идею дедупликации.`,
        tests: [
          {
            args: [values, { __fn: 'record', key: 'done', returnValue: { unique: uniqueValues, removed } }],
            expected: { unique: uniqueValues, removed },
            expectCollected: { done: [{ unique: uniqueValues, removed }] }
          },
          {
            args: [[1, 2, 2, 3], { __fn: 'record', key: 'done', returnValue: { unique: [1, 2, 3], removed: 1 } }],
            expected: { unique: [1, 2, 3], removed: 1 },
            expectCollected: { done: [{ unique: [1, 2, 3], removed: 1 }] }
          }
        ],
        tags: ['dedupe', context.id, structureType]
      });

    default:
      return buildDedupeTask('easy', rng);
  }
}

function buildGroupItems(context, profile, rng) {
  const count = rng.int(profile.minCount, profile.maxCount);
  const base = samplePersons(rng, count);
  return base.map((person, index) => ({
    name: person.name,
    city: person.city,
    score: rng.int(profile.minValue, profile.maxValue),
    team: rng.pick(['red', 'blue', 'green', 'orange']),
    department: rng.pick(['ops', 'design', 'sales', 'qa']),
    role: rng.pick(['junior', 'middle', 'senior']),
    status: rng.pick(['new', 'active', 'paused', 'blocked']),
    ticket: `TK-${index + 1}`,
    email: sampleEmail(rng, person.name)
  }));
}

function buildGroupTask(difficulty, rng) {
  const profile = pickDifficultyProfile(difficulty);
  const context = pickVariant(rng, CONTEXTS.group);
  const structureType = pickStructure(rng, difficulty, 'group');
  const items = buildGroupItems(context, profile, rng);
  const key = context.key;
  const counts = items.reduce((acc, item) => {
    const groupKey = String(item[key]);
    acc[groupKey] = (acc[groupKey] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(counts).sort(([left], [right]) => left.localeCompare(right));
  const summary = { groups: counts, total: items.length };
  const variantId = makeVariantId('group', structureType, context.id, rng);
  const constraintsByStructure = {
    object: ['one-pass', 'linear-time', 'no-mutation'],
    entries: ['one-pass', 'linear-time', 'no-mutation'],
    summary: ['one-pass', 'linear-time', 'no-mutation', 'object-result'],
    options: ['one-pass', 'linear-time', 'no-mutation', 'options-api'],
    callback: ['one-pass', 'linear-time', 'no-mutation', 'callback']
  };

  const details = {
    context,
    dataPreview: preview(items.map((item) => ({
      name: item.name,
      city: item.city,
      team: item.team,
      department: item.department,
      role: item.role,
      status: item.status,
      score: item.score
    }))),
    goal: GROUP_GOALS[structureType],
    constraintsText: renderConstraints(constraintsByStructure[structureType])
  };

  switch (structureType) {
    case 'object':
      return createTask({
        difficulty,
        logicType: 'group',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'group', { context, structureType }),
        prompt: makePrompt(rng, 'group', details),
        signature: 'solve(items, key)',
        starterBody: ['return {};'],
        solutionBody: [
          'const result = {};',
          'for (let index = 0; index < items.length; index += 1) {',
          '  const item = items[index];',
          '  const groupKey = String(item[key]);',
          '  result[groupKey] = (result[groupKey] || 0) + 1;',
          '}',
          'return result;'
        ],
        hints: ['Считай количество по значению key.', 'Сначала создай пустой объект.'],
        explanation: `Базовая группировка по ${key}.`,
        tests: [
          { args: [items, key], expected: counts },
          { args: [[{ city: 'Rome' }, { city: 'Rome' }, { city: 'Paris' }], 'city'], expected: { Rome: 2, Paris: 1 } }
        ],
        tags: ['group', context.id, structureType]
      });

    case 'entries':
      return createTask({
        difficulty,
        logicType: 'group',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'group', { context, structureType }),
        prompt: makePrompt(rng, 'group', details),
        signature: 'solve(items, key)',
        starterBody: ['return [];'],
        solutionBody: [
          'const counts = {};',
          'for (let index = 0; index < items.length; index += 1) {',
          '  const item = items[index];',
          '  const groupKey = String(item[key]);',
          '  counts[groupKey] = (counts[groupKey] || 0) + 1;',
          '}',
          'return Object.entries(counts).sort(([left], [right]) => left.localeCompare(right));'
        ],
        hints: ['Сначала посчитай, потом преврати объект в entries.', 'Сортировка по key делает результат стабильным.'],
        explanation: `Версия с entries удобна, когда нужен список пар.`,
        tests: [
          { args: [items, key], expected: entries },
          { args: [[{ team: 'red' }, { team: 'blue' }, { team: 'red' }], 'team'], expected: [['blue', 1], ['red', 2]] }
        ],
        tags: ['group', context.id, structureType]
      });

    case 'summary':
      return createTask({
        difficulty,
        logicType: 'group',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'group', { context, structureType }),
        prompt: makePrompt(rng, 'group', details),
        signature: 'solve(payload)',
        starterBody: ['return { groups: {}, total: 0 };'],
        solutionBody: [
          'const source = Array.isArray(payload.items) ? payload.items : [];',
          'const key = payload.key;',
          'const groups = {};',
          'for (let index = 0; index < source.length; index += 1) {',
          '  const item = source[index];',
          '  const groupKey = String(item[key]);',
          '  groups[groupKey] = (groups[groupKey] || 0) + 1;',
          '}',
          'return { groups, total: source.length };'
        ],
        hints: ['payload несёт и items, и key.', 'total — это просто длина исходного массива.'],
        explanation: `Сводка нужна, когда кроме группировок хочется сразу видеть общий объём.`,
        tests: [
          { args: [{ items, key }], expected: summary },
          { args: [{ items: [{ role: 'junior' }, { role: 'senior' }, { role: 'junior' }], key: 'role' }], expected: { groups: { junior: 2, senior: 1 }, total: 3 } }
        ],
        tags: ['group', context.id, structureType]
      });

    case 'options':
      return createTask({
        difficulty,
        logicType: 'group',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'group', { context, structureType }),
        prompt: makePrompt(rng, 'group', details),
        signature: 'solve(items, options)',
        starterBody: ['return options;'],
        solutionBody: [
          'const key = options && typeof options.key === "string" ? options.key : "city";',
          'const result = {};',
          'for (let index = 0; index < items.length; index += 1) {',
          '  const item = items[index];',
          '  const groupKey = String(item[key]);',
          '  result[groupKey] = (result[groupKey] || 0) + 1;',
          '}',
          'return result;'
        ],
        hints: ['options.key выбирает поле группировки.', 'Если key не передан, используй city.'],
        explanation: `API с options помогает переключать ключ без переписывания кода.`,
        tests: [
          { args: [items, { key }], expected: counts },
          { args: [items, { key: 'city' }], expected: items.reduce((acc, item) => { const groupKey = String(item.city); acc[groupKey] = (acc[groupKey] || 0) + 1; return acc; }, {}) }
        ],
        tags: ['group', context.id, structureType]
      });

    case 'callback':
      return createTask({
        difficulty,
        logicType: 'group',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'group', { context, structureType }),
        prompt: makePrompt(rng, 'group', details),
        signature: 'solve(items, key, done)',
        starterBody: ['return {};'],
        solutionBody: [
          'const result = {};',
          'for (let index = 0; index < items.length; index += 1) {',
          '  const item = items[index];',
          '  const groupKey = String(item[key]);',
          '  result[groupKey] = (result[groupKey] || 0) + 1;',
          '}',
          'done(result);',
          'return result;'
        ],
        hints: ['done должен получить объект с группировкой.', 'Можно вернуть тот же объект из функции.'],
        explanation: `Callback-версия тренирует аккуратную передачу результата наружу.`,
        tests: [
          {
            args: [items, key, { __fn: 'record', key: 'done', returnValue: counts }],
            expected: counts,
            expectCollected: { done: [counts] }
          },
          {
            args: [[{ city: 'Berlin' }, { city: 'Berlin' }, { city: 'Rome' }], 'city', { __fn: 'record', key: 'done', returnValue: { Berlin: 2, Rome: 1 } }],
            expected: { Berlin: 2, Rome: 1 },
            expectCollected: { done: [{ Berlin: 2, Rome: 1 }] }
          }
        ],
        tags: ['group', context.id, structureType]
      });

    default:
      return buildGroupTask('easy', rng);
  }
}

function buildWindowData(profile, rng) {
  const numbers = buildNumberSeries(rng, profile);
  const maxWindow = Math.min(profile.windowMax, Math.max(profile.windowMin, numbers.length - 1));
  const windowSize = rng.int(profile.windowMin, Math.max(profile.windowMin, maxWindow));
  const best = computeBestWindow(numbers, windowSize);
  return { numbers, windowSize, best };
}

function buildWindowTask(difficulty, rng) {
  const profile = pickDifficultyProfile(difficulty);
  const context = pickVariant(rng, CONTEXTS.window);
  const structureType = pickStructure(rng, difficulty, 'window');
  const dataset = buildWindowData(profile, rng);
  const variantId = makeVariantId('window', structureType, context.id, rng);
  const constraintsByStructure = {
    primitive: ['sliding-window', 'one-pass', 'no-mutation'],
    object: ['sliding-window', 'one-pass', 'no-mutation', 'object-result'],
    options: ['sliding-window', 'one-pass', 'no-mutation', 'options-api'],
    callback: ['sliding-window', 'one-pass', 'no-mutation', 'callback']
  };

  const details = {
    context,
    dataPreview: preview(dataset.numbers),
    goal: WINDOW_GOALS[structureType],
    constraintsText: renderConstraints(constraintsByStructure[structureType])
  };

  switch (structureType) {
    case 'primitive':
      return createTask({
        difficulty,
        logicType: 'window',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'window', { context, structureType }),
        prompt: makePrompt(rng, 'window', details),
        signature: 'solve(numbers, windowSize)',
        starterBody: ['return 0;'],
        solutionBody: [
          'let current = 0;',
          'for (let index = 0; index < windowSize; index += 1) {',
          '  current += numbers[index];',
          '}',
          'let best = current;',
          'for (let index = windowSize; index < numbers.length; index += 1) {',
          '  current += numbers[index] - numbers[index - windowSize];',
          '  if (current > best) {',
          '    best = current;',
          '  }',
          '}',
          'return best;'
        ],
        hints: ['Сначала посчитай первое окно.', 'Потом двигая окно, обновляй сумму за O(n).'],
        explanation: `Классическое скользящее окно для ${context.title}.`,
        tests: [
          { args: [dataset.numbers, dataset.windowSize], expected: dataset.best.value },
          { args: [[1, 2, 3, 4, 5], 2], expected: 9 }
        ],
        tags: ['window', context.id, structureType]
      });

    case 'object':
      return createTask({
        difficulty,
        logicType: 'window',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'window', { context, structureType }),
        prompt: makePrompt(rng, 'window', details),
        signature: 'solve(payload)',
        starterBody: ['return { value: 0, index: 0 };'],
        solutionBody: [
          'const numbers = Array.isArray(payload.numbers) ? payload.numbers : [];',
          'const windowSize = payload.windowSize;',
          'let current = 0;',
          'for (let index = 0; index < windowSize; index += 1) {',
          '  current += numbers[index];',
          '}',
          'let best = current;',
          'let bestIndex = 0;',
          'for (let index = windowSize; index < numbers.length; index += 1) {',
          '  current += numbers[index] - numbers[index - windowSize];',
          '  if (current > best) {',
          '    best = current;',
          '    bestIndex = index - windowSize + 1;',
          '  }',
          '}',
          'return { value: best, index: bestIndex };'
        ],
        hints: ['payload содержит numbers и windowSize.', 'Нужно вернуть ещё и старт окна.'],
        explanation: `В объектной форме удобно сохранять и значение, и индекс.`,
        tests: [
          { args: [{ numbers: dataset.numbers, windowSize: dataset.windowSize }], expected: dataset.best },
          { args: [{ numbers: [1, 2, 3, 4, 5], windowSize: 3 }], expected: { value: 12, index: 2 } }
        ],
        tags: ['window', context.id, structureType]
      });

    case 'options':
      return createTask({
        difficulty,
        logicType: 'window',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'window', { context, structureType }),
        prompt: makePrompt(rng, 'window', details),
        signature: 'solve(numbers, options)',
        starterBody: ['return options;'],
        solutionBody: [
          'const windowSize = options && typeof options.windowSize === "number" ? options.windowSize : 1;',
          'let current = 0;',
          'for (let index = 0; index < windowSize; index += 1) {',
          '  current += numbers[index];',
          '}',
          'let best = current;',
          'let bestIndex = 0;',
          'for (let index = windowSize; index < numbers.length; index += 1) {',
          '  current += numbers[index] - numbers[index - windowSize];',
          '  if (current > best) {',
          '    best = current;',
          '    bestIndex = index - windowSize + 1;',
          '  }',
          '}',
          'return { value: best, index: bestIndex, windowSize };'
        ],
        hints: ['windowSize приходит во втором аргументе.', 'Сохрани windowSize в результате.'],
        explanation: `options-версия готова к расширению API без смены сигнатуры.`,
        tests: [
          { args: [dataset.numbers, { windowSize: dataset.windowSize }], expected: { value: dataset.best.value, index: dataset.best.index, windowSize: dataset.windowSize } },
          { args: [[1, 2, 3, 4, 5], { windowSize: 2 }], expected: { value: 9, index: 3, windowSize: 2 } }
        ],
        tags: ['window', context.id, structureType]
      });

    case 'callback':
      return createTask({
        difficulty,
        logicType: 'window',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'window', { context, structureType }),
        prompt: makePrompt(rng, 'window', details),
        signature: 'solve(numbers, windowSize, done)',
        starterBody: ['return 0;'],
        solutionBody: [
          'let current = 0;',
          'for (let index = 0; index < windowSize; index += 1) {',
          '  current += numbers[index];',
          '}',
          'let best = current;',
          'let bestIndex = 0;',
          'for (let index = windowSize; index < numbers.length; index += 1) {',
          '  current += numbers[index] - numbers[index - windowSize];',
          '  if (current > best) {',
          '    best = current;',
          '    bestIndex = index - windowSize + 1;',
          '  }',
          '}',
          'const result = { value: best, index: bestIndex };',
          'done(result);',
          'return best;'
        ],
        hints: ['done должен получить объект с value и index.', 'Возвращаемое значение оставь числом.'],
        explanation: `Callback помогает закрепить идею окна и асинхронной точки завершения.`,
        tests: [
          {
            args: [dataset.numbers, dataset.windowSize, { __fn: 'record', key: 'done', returnValue: dataset.best.value }],
            expected: dataset.best.value,
            expectCollected: { done: [dataset.best] }
          },
          {
            args: [[1, 2, 3, 4, 5], 2, { __fn: 'record', key: 'done', returnValue: 9 }],
            expected: 9,
            expectCollected: { done: [{ value: 9, index: 3 }] }
          }
        ],
        tags: ['window', context.id, structureType]
      });

    default:
      return buildWindowTask('easy', rng);
  }
}

function buildArraysTask(difficulty, rng) {
  const normalizedDifficulty = DIFFICULTY_PROFILE[difficulty] ? difficulty : 'easy';
  const family = pickFamily(rng, normalizedDifficulty);

  switch (family) {
    case 'sum':
      return buildSumTask(normalizedDifficulty, rng);
    case 'filter':
      return buildFilterTask(normalizedDifficulty, rng);
    case 'dedupe':
      return buildDedupeTask(normalizedDifficulty, rng);
    case 'group':
      return buildGroupTask(normalizedDifficulty, rng);
    case 'window':
      return buildWindowTask(normalizedDifficulty, rng);
    default:
      return buildSumTask('easy', rng);
  }
}

module.exports = {
  buildArraysTask
};
