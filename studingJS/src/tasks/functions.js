const {
  pickVariant,
  preview,
  sampleNumbers,
  sampleWords,
  sampleName,
  samplePersons,
  sampleText,
  capitalize,
  sum,
  unique
} = require('../engine/taskShared');
const { buildVariantTask, pickVariantByKey } = require('../engine/variantTaskBuilder');

const CATEGORY = 'functions';

const DIFFICULTY_PROFILE = {
  easy: {
    numbers: [4, 6],
    text: [2, 4],
    size: [2, 4],
    magnitude: 25,
    allowNegative: false
  },
  medium: {
    numbers: [5, 8],
    text: [3, 5],
    size: [3, 5],
    magnitude: 50,
    allowNegative: true
  },
  hard: {
    numbers: [6, 9],
    text: [4, 6],
    size: [4, 6],
    magnitude: 80,
    allowNegative: true
  },
  expert: {
    numbers: [7, 10],
    text: [5, 7],
    size: [5, 7],
    magnitude: 120,
    allowNegative: true
  }
};

const FAMILY_WEIGHTS = {
  easy: [
    { value: 'clamp', weight: 6 },
    { value: 'normalize', weight: 5 },
    { value: 'aggregate', weight: 4 },
    { value: 'transform', weight: 2 },
    { value: 'filter', weight: 1 },
    { value: 'compose', weight: 1 },
    { value: 'reduce', weight: 1 }
  ],
  medium: [
    { value: 'clamp', weight: 2 },
    { value: 'normalize', weight: 4 },
    { value: 'aggregate', weight: 5 },
    { value: 'transform', weight: 5 },
    { value: 'filter', weight: 4 },
    { value: 'compose', weight: 2 },
    { value: 'reduce', weight: 2 }
  ],
  hard: [
    { value: 'clamp', weight: 1 },
    { value: 'normalize', weight: 2 },
    { value: 'aggregate', weight: 4 },
    { value: 'transform', weight: 5 },
    { value: 'filter', weight: 4 },
    { value: 'compose', weight: 5 },
    { value: 'reduce', weight: 4 }
  ],
  expert: [
    { value: 'clamp', weight: 1 },
    { value: 'normalize', weight: 2 },
    { value: 'aggregate', weight: 3 },
    { value: 'transform', weight: 4 },
    { value: 'filter', weight: 3 },
    { value: 'compose', weight: 6 },
    { value: 'reduce', weight: 6 }
  ]
};

const STRUCTURE_WEIGHTS = {
  easy: {
    clamp: [
      { value: 'primitive', weight: 5 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 2 },
      { value: 'summary', weight: 1 },
      { value: 'callback', weight: 1 }
    ],
    normalize: [
      { value: 'primitive', weight: 5 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 2 },
      { value: 'summary', weight: 1 },
      { value: 'callback', weight: 1 }
    ],
    aggregate: [
      { value: 'primitive', weight: 5 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 2 },
      { value: 'summary', weight: 2 },
      { value: 'callback', weight: 1 }
    ],
    transform: [
      { value: 'primitive', weight: 5 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 2 },
      { value: 'summary', weight: 1 },
      { value: 'callback', weight: 1 }
    ],
    filter: [
      { value: 'primitive', weight: 5 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 2 },
      { value: 'summary', weight: 2 },
      { value: 'callback', weight: 1 }
    ],
    compose: [
      { value: 'primitive', weight: 5 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 2 },
      { value: 'summary', weight: 1 }
    ],
    reduce: [
      { value: 'primitive', weight: 5 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 2 },
      { value: 'summary', weight: 1 },
      { value: 'callback', weight: 1 }
    ]
  },
  medium: {
    clamp: [
      { value: 'primitive', weight: 4 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'summary', weight: 2 },
      { value: 'callback', weight: 2 }
    ],
    normalize: [
      { value: 'primitive', weight: 4 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'summary', weight: 2 },
      { value: 'callback', weight: 2 }
    ],
    aggregate: [
      { value: 'primitive', weight: 3 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'summary', weight: 3 },
      { value: 'callback', weight: 2 }
    ],
    transform: [
      { value: 'primitive', weight: 3 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'summary', weight: 3 },
      { value: 'callback', weight: 2 }
    ],
    filter: [
      { value: 'primitive', weight: 3 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'summary', weight: 3 },
      { value: 'callback', weight: 2 }
    ],
    compose: [
      { value: 'primitive', weight: 3 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 4 },
      { value: 'summary', weight: 2 }
    ],
    reduce: [
      { value: 'primitive', weight: 3 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'summary', weight: 2 },
      { value: 'callback', weight: 2 }
    ]
  },
  hard: {
    clamp: [
      { value: 'primitive', weight: 3 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 4 },
      { value: 'summary', weight: 3 },
      { value: 'callback', weight: 2 }
    ],
    normalize: [
      { value: 'primitive', weight: 3 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 4 },
      { value: 'summary', weight: 3 },
      { value: 'callback', weight: 2 }
    ],
    aggregate: [
      { value: 'primitive', weight: 2 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'summary', weight: 4 },
      { value: 'callback', weight: 3 }
    ],
    transform: [
      { value: 'primitive', weight: 2 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'summary', weight: 4 },
      { value: 'callback', weight: 3 }
    ],
    filter: [
      { value: 'primitive', weight: 2 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'summary', weight: 4 },
      { value: 'callback', weight: 3 }
    ],
    compose: [
      { value: 'primitive', weight: 2 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 4 },
      { value: 'summary', weight: 3 }
    ],
    reduce: [
      { value: 'primitive', weight: 2 },
      { value: 'object', weight: 3 },
      { value: 'options', weight: 4 },
      { value: 'summary', weight: 4 },
      { value: 'callback', weight: 3 }
    ]
  },
  expert: {
    clamp: [
      { value: 'primitive', weight: 2 },
      { value: 'object', weight: 2 },
      { value: 'options', weight: 4 },
      { value: 'summary', weight: 4 },
      { value: 'callback', weight: 3 }
    ],
    normalize: [
      { value: 'primitive', weight: 2 },
      { value: 'object', weight: 2 },
      { value: 'options', weight: 4 },
      { value: 'summary', weight: 4 },
      { value: 'callback', weight: 3 }
    ],
    aggregate: [
      { value: 'primitive', weight: 1 },
      { value: 'object', weight: 2 },
      { value: 'options', weight: 3 },
      { value: 'summary', weight: 5 },
      { value: 'callback', weight: 4 }
    ],
    transform: [
      { value: 'primitive', weight: 1 },
      { value: 'object', weight: 2 },
      { value: 'options', weight: 3 },
      { value: 'summary', weight: 5 },
      { value: 'callback', weight: 4 }
    ],
    filter: [
      { value: 'primitive', weight: 1 },
      { value: 'object', weight: 2 },
      { value: 'options', weight: 3 },
      { value: 'summary', weight: 5 },
      { value: 'callback', weight: 4 }
    ],
    compose: [
      { value: 'primitive', weight: 1 },
      { value: 'object', weight: 2 },
      { value: 'options', weight: 5 },
      { value: 'summary', weight: 4 }
    ],
    reduce: [
      { value: 'primitive', weight: 1 },
      { value: 'object', weight: 2 },
      { value: 'options', weight: 4 },
      { value: 'summary', weight: 5 },
      { value: 'callback', weight: 4 }
    ]
  }
};

const LOGIC_WEIGHTS = {
  normalize: {
    easy: [
      { value: 'collapse', weight: 5 },
      { value: 'sentence', weight: 4 },
      { value: 'lower', weight: 2 }
    ],
    medium: [
      { value: 'collapse', weight: 4 },
      { value: 'sentence', weight: 4 },
      { value: 'title', weight: 3 },
      { value: 'lower', weight: 3 }
    ],
    hard: [
      { value: 'sentence', weight: 4 },
      { value: 'title', weight: 4 },
      { value: 'collapse', weight: 3 },
      { value: 'lower', weight: 3 }
    ],
    expert: [
      { value: 'title', weight: 4 },
      { value: 'sentence', weight: 4 },
      { value: 'collapse', weight: 3 },
      { value: 'lower', weight: 3 }
    ]
  },
  aggregate: {
    easy: [
      { value: 'sum', weight: 5 },
      { value: 'max', weight: 4 },
      { value: 'min', weight: 3 }
    ],
    medium: [
      { value: 'sum', weight: 4 },
      { value: 'max', weight: 3 },
      { value: 'min', weight: 3 },
      { value: 'average', weight: 3 }
    ],
    hard: [
      { value: 'sum', weight: 3 },
      { value: 'average', weight: 4 },
      { value: 'spread', weight: 4 },
      { value: 'product', weight: 2 }
    ],
    expert: [
      { value: 'average', weight: 4 },
      { value: 'spread', weight: 4 },
      { value: 'product', weight: 4 }
    ]
  },
  transform: {
    easy: [
      { value: 'numbers', weight: 4 },
      { value: 'words', weight: 4 },
      { value: 'format', weight: 2 }
    ],
    medium: [
      { value: 'numbers', weight: 3 },
      { value: 'words', weight: 3 },
      { value: 'format', weight: 4 },
      { value: 'join', weight: 3 }
    ],
    hard: [
      { value: 'numbers', weight: 2 },
      { value: 'words', weight: 3 },
      { value: 'format', weight: 4 },
      { value: 'join', weight: 4 }
    ],
    expert: [
      { value: 'numbers', weight: 2 },
      { value: 'words', weight: 2 },
      { value: 'format', weight: 5 },
      { value: 'join', weight: 5 }
    ]
  },
  filter: {
    easy: [
      { value: 'greater', weight: 5 },
      { value: 'not-multiple', weight: 4 },
      { value: 'modulo', weight: 3 }
    ],
    medium: [
      { value: 'greater', weight: 4 },
      { value: 'less', weight: 4 },
      { value: 'not-multiple', weight: 3 },
      { value: 'modulo', weight: 3 }
    ],
    hard: [
      { value: 'greater', weight: 3 },
      { value: 'less', weight: 3 },
      { value: 'not-multiple', weight: 4 },
      { value: 'modulo', weight: 4 }
    ],
    expert: [
      { value: 'greater', weight: 3 },
      { value: 'less', weight: 3 },
      { value: 'not-multiple', weight: 4 },
      { value: 'modulo', weight: 4 }
    ]
  },
  compose: {
    easy: [
      { value: 'numeric', weight: 5 },
      { value: 'string', weight: 3 }
    ],
    medium: [
      { value: 'numeric', weight: 4 },
      { value: 'string', weight: 4 },
      { value: 'pipeline', weight: 3 }
    ],
    hard: [
      { value: 'numeric', weight: 3 },
      { value: 'string', weight: 4 },
      { value: 'pipeline', weight: 5 }
    ],
    expert: [
      { value: 'numeric', weight: 2 },
      { value: 'string', weight: 4 },
      { value: 'pipeline', weight: 6 }
    ]
  },
  reduce: {
    easy: [
      { value: 'sum', weight: 5 },
      { value: 'bias', weight: 3 }
    ],
    medium: [
      { value: 'sum', weight: 4 },
      { value: 'bias', weight: 4 },
      { value: 'weighted', weight: 3 }
    ],
    hard: [
      { value: 'sum', weight: 3 },
      { value: 'bias', weight: 4 },
      { value: 'weighted', weight: 5 }
    ],
    expert: [
      { value: 'sum', weight: 2 },
      { value: 'bias', weight: 4 },
      { value: 'weighted', weight: 5 },
      { value: 'trace', weight: 4 }
    ]
  }
};

const CONTEXTS = {
  clamp: [
    { id: 'scores', title: 'баллов игрока' },
    { id: 'temperature', title: 'температуры' },
    { id: 'budget', title: 'бюджета' },
    { id: 'age', title: 'возраста' },
    { id: 'rating', title: 'рейтинга' }
  ],
  normalize: [
    { id: 'title', title: 'заголовка' },
    { id: 'query', title: 'поискового запроса' },
    { id: 'label', title: 'подписи' },
    { id: 'username', title: 'логина' }
  ],
  aggregate: [
    { id: 'sales', title: 'продаж' },
    { id: 'points', title: 'очков' },
    { id: 'temperatures', title: 'температур' },
    { id: 'durations', title: 'длительностей' }
  ],
  transform: [
    { id: 'words', title: 'списка слов' },
    { id: 'names', title: 'имён' },
    { id: 'products', title: 'названий товаров' },
    { id: 'people', title: 'профилей пользователей' }
  ],
  filter: [
    { id: 'numbers', title: 'чисел' },
    { id: 'readings', title: 'замеров' },
    { id: 'tasks', title: 'задач' }
  ],
  compose: [
    { id: 'pipeline', title: 'конвейера преобразований' },
    { id: 'format', title: 'формата вывода' },
    { id: 'value', title: 'значения' }
  ],
  reduce: [
    { id: 'fold', title: 'свёртки массива' },
    { id: 'accumulator', title: 'накопителя' },
    { id: 'trace', title: 'счётчика шагов' }
  ]
};

const TITLES = {
  clamp: [
    ({ context }) => `Границы значения: ${context.title}`,
    ({ context }) => `Ограничение диапазона: ${context.title}`,
    ({ context }) => `Чистый clamp для ${context.title}`
  ],
  normalize: [
    ({ context }) => `Нормализация ${context.title}`,
    ({ context }) => `Чистка строки: ${context.title}`,
    ({ context }) => `Приведение ${context.title} к виду`
  ],
  aggregate: [
    ({ context }) => `Сводка по ${context.title}`,
    ({ context }) => `Агрегация ${context.title}`,
    ({ context }) => `Собери итог по ${context.title}`
  ],
  transform: [
    ({ context }) => `Преобразование ${context.title}`,
    ({ context }) => `Карта значений: ${context.title}`,
    ({ context }) => `Пропусти через mapper: ${context.title}`
  ],
  filter: [
    ({ context }) => `Фильтрация ${context.title}`,
    ({ context }) => `Отбор ${context.title}`,
    ({ context }) => `Оставь нужные ${context.title}`
  ],
  compose: [
    ({ context }) => `Композиция функций: ${context.title}`,
    ({ context }) => `Конвейер для ${context.title}`,
    ({ context }) => `Цепочка преобразований: ${context.title}`
  ],
  reduce: [
    ({ context }) => `Свёртка ${context.title}`,
    ({ context }) => `Reduce для ${context.title}`,
    ({ context }) => `Накопление по ${context.title}`
  ]
};

const PROMPTS = {
  clamp: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Дан ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `У тебя есть значение для ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Реализуй clamp для ${context.title}. Вход: ${dataPreview}. ${goal} ${constraintsText}`
  ],
  normalize: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Дана грязная строка для ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Нужно привести ${context.title} к аккуратному виду. Строка: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Очисти ${context.title} от шума и лишних пробелов. Вход: ${dataPreview}. ${goal} ${constraintsText}`
  ],
  aggregate: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Дан массив ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `У тебя есть список ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Собери итог по ${context.title}. Входные данные: ${dataPreview}. ${goal} ${constraintsText}`
  ],
  transform: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Дан список ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Преобразуй ${context.title}. На входе ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Пропусти ${context.title} через mapper. Данные: ${dataPreview}. ${goal} ${constraintsText}`
  ],
  filter: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Есть набор ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Отбери нужные ${context.title}. Вход: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Фильтруй ${context.title} по предикату. Данные: ${dataPreview}. ${goal} ${constraintsText}`
  ],
  compose: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Даны преобразования для ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Собери конвейер для ${context.title}. Вход: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Соедини функции для ${context.title}. Данные: ${dataPreview}. ${goal} ${constraintsText}`
  ],
  reduce: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Дан массив ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Сверни ${context.title} через reducer. Вход: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Пройдись по ${context.title} одним накоплением. Данные: ${dataPreview}. ${goal} ${constraintsText}`
  ]
};

const GOALS = {
  clamp: {
    primitive: 'Верни число, зажатое в диапазон.',
    object: 'Считай value, min и max из объекта input.',
    options: 'Используй options.min и options.max для границ.',
    summary: 'Верни объект с исходным и итоговым значением.',
    callback: 'Передай результат в done(...) и верни его же.'
  },
  normalize: {
    primitive: 'Верни аккуратную строку.',
    object: 'Достань текст из входного объекта и нормализуй его.',
    options: 'Учитывай режим в options.mode.',
    summary: 'Верни объект с итоговой строкой и её метаданными.',
    callback: 'Передай нормализованную строку в done(...).'
  },
  aggregate: {
    primitive: 'Верни числовой итог.',
    object: 'Возьми массив из input и посчитай итог.',
    options: 'Используй options.mode для выбора операции.',
    summary: 'Верни объект-статистику вместо числа.',
    callback: 'Передай итог в done(...) и верни его же.'
  },
  transform: {
    primitive: 'Примени mapper к каждому элементу и верни результат.',
    object: 'Возьми values и mapper из input.',
    options: 'Используй options.separator или options.join, если они есть.',
    summary: 'Верни объект с mapped и счётчиком.',
    callback: 'Передай mapped в done(...) и верни его же.'
  },
  filter: {
    primitive: 'Верни только подходящие элементы.',
    object: 'Считай values и predicate из input.',
    options: 'Используй options.includeCount для расширенного ответа.',
    summary: 'Верни объект с kept и dropped.',
    callback: 'Передай отфильтрованный массив в done(...).'
  },
  compose: {
    primitive: 'Пропусти значение через две функции по порядку.',
    object: 'Возьми value и преобразователи из input.',
    options: 'Используй массив steps из options.',
    summary: 'Верни объект до/после с трассировкой.',
  },
  reduce: {
    primitive: 'Сверни массив через reducer.',
    object: 'Возьми values и reducer из input.',
    options: 'Используй options.initial как старт накопления.',
    summary: 'Верни объект с результатом и числом шагов.',
    callback: 'Передай итог в done(...) и верни его же.'
  }
};

const CONSTRAINTS = {
  'no-mutation': 'Не меняй входные данные.',
  'single-pass': 'Сделай решение за один проход.',
  'preserve-order': 'Сохрани порядок элементов.',
  'object-result': 'Верни объект.',
  'callback': 'Используй callback в ответе.',
  'options-api': 'Используй options как часть API.',
  'order-matters': 'Порядок преобразований важен.',
  'summary-result': 'Верни сводку вместо голого значения.'
};

function pickWeighted(rng, entries) {
  const filtered = Array.isArray(entries) ? entries.filter((entry) => Number(entry && entry.weight) > 0) : [];
  if (filtered.length === 0) {
    return null;
  }
  return rng.weighted(filtered) || filtered[0].value;
}

function pickCount(rng, range) {
  return rng.int(range[0], range[1]);
}

function buildConstraintList(...keys) {
  return unique(keys.filter(Boolean));
}

function buildConstraintText(keys) {
  const text = keys.map((key) => CONSTRAINTS[key]).filter(Boolean).join(' ');
  return text ? `${text}` : '';
}

function makeVariantId(rng, family, logicType, structureType, context) {
  return `${CATEGORY}-${family}-${logicType}-${structureType}-${context.id}-${rng.int(0, 100000)}`;
}

function createTask(difficulty, rng, spec) {
  const context = spec.context || { id: 'general', title: 'значений' };
  const logicType = spec.logicType || spec.family || 'general';
  const structureType = spec.structureType || 'primitive';
  const variantId = spec.variantId || makeVariantId(rng, spec.family || logicType, logicType, structureType, context);

  return buildVariantTask({
    category: CATEGORY,
    difficulty,
    seed: variantId,
    strategy: 'simple',
    ...spec,
    context,
    tags: unique([...(spec.tags || []), CATEGORY, spec.family || logicType, logicType, structureType, context.id]),
    meta: {
      ...(spec.meta || {}),
      family: spec.family || logicType,
      logicType,
      structureType,
      contextType: context.id,
      constraints: buildConstraintList(...(spec.constraints || [])),
      variantId
    }
  });
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundTo2(value) {
  return Math.round(value * 100) / 100;
}

function collapseSpaces(text) {
  return String(text).trim().replace(/\s+/g, ' ');
}

function titleCase(text) {
  return collapseSpaces(text)
    .split(' ')
    .filter(Boolean)
    .map((word) => capitalize(word))
    .join(' ');
}

function normalizeText(text, mode) {
  const cleaned = collapseSpaces(text);
  switch (mode) {
    case 'title':
      return titleCase(cleaned);
    case 'lower':
      return cleaned.toLowerCase();
    case 'sentence':
      return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase() : cleaned;
    case 'collapse':
    default:
      return cleaned;
  }
}

function sampleNumericSeries(rng, difficulty, options = {}) {
  const profile = DIFFICULTY_PROFILE[difficulty] || DIFFICULTY_PROFILE.easy;
  const count = options.count || pickCount(rng, profile.numbers);
  const min = options.min !== undefined ? options.min : -profile.magnitude;
  const max = options.max !== undefined ? options.max : profile.magnitude;
  const allowNegative = options.allowNegative !== undefined ? options.allowNegative : profile.allowNegative;
  const values = sampleNumbers(rng, count, Math.min(min, max), Math.max(min, max), allowNegative);

  if (options.duplicateFriendly !== false && values.length > 2 && unique(values).length === values.length) {
    values[rng.int(1, values.length - 1)] = values[0];
  }

  return values;
}

function sampleDirtyText(rng, difficulty) {
  const profile = DIFFICULTY_PROFILE[difficulty] || DIFFICULTY_PROFILE.easy;
  const words = sampleWords(rng, pickCount(rng, profile.text));
  const spaced = words
    .map((word, index) => {
      const variant = index % 3 === 0
        ? word.toUpperCase()
        : index % 3 === 1
          ? capitalize(word)
          : word;
      return variant;
    })
    .join(rng.bool(0.5) ? '   ' : ' \t ');

  return `${rng.bool(0.5) ? '  ' : ' '} ${spaced} ${rng.bool(0.5) ? '  ' : ' '}`;
}

function buildLabels(values, mapper) {
  return values.map((value, index) => mapper(value, index));
}

function buildClampTask(difficulty, rng) {
  const context = rng.pick(CONTEXTS.clamp);
  const structure = pickWeighted(rng, STRUCTURE_WEIGHTS[difficulty].clamp) || 'primitive';
  const value = rng.int(-40, 120);
  const min = rng.int(-30, 20);
  const max = rng.int(Math.max(min + 5, 10), Math.max(min + 10, 140));
  const clamped = clampValue(value, min, max);
  const title = pickVariant(rng, TITLES.clamp)({ context });
  const prompt = pickVariant(rng, PROMPTS.clamp)({
    context,
    dataPreview: preview({ value, min, max }),
    goal: GOALS.clamp[structure],
    constraintsText: buildConstraintText(
      structure === 'summary'
        ? ['no-mutation', 'object-result']
        : structure === 'callback'
          ? ['no-mutation', 'callback']
          : ['no-mutation']
    )
  });

  switch (structure) {
    case 'object':
      return createTask(difficulty, rng, {
        family: 'clamp',
        logicType: 'clamp',
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(input)',
        starterBody: ['return input.value;'],
        solutionBody: [
          'const { value, min, max } = input;',
          'return Math.min(max, Math.max(min, value));'
        ],
        hints: ['Достань value, min и max из объекта.', 'Сначала подними значение до min, потом опусти до max.'],
        explanation: 'Задача учит аккуратно работать с объектом-входом и границами диапазона.',
        tests: [
          { args: [{ value, min, max }], expected: clamped },
          { args: [{ value: 100, min: 0, max: 25 }], expected: 25 }
        ],
        constraints: ['no-mutation'],
        tags: ['clamp', 'bounds', 'object']
      });
    case 'options':
      return createTask(difficulty, rng, {
        family: 'clamp',
        logicType: 'clamp',
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(value, options)',
        starterBody: ['return value;'],
        solutionBody: [
          'const min = options.min;',
          'const max = options.max;',
          'return Math.min(max, Math.max(min, value));'
        ],
        hints: ['Границы лежат в options.', 'Сравни значение с min и max.'],
        explanation: 'В этой версии границы передаются через options, чтобы потренировать альтернативный API.',
        tests: [
          { args: [value, { min, max }], expected: clamped },
          { args: [-5, { min: 0, max: 12 }], expected: 0 }
        ],
        constraints: ['no-mutation', 'options-api'],
        tags: ['clamp', 'bounds', 'options']
      });
    case 'summary':
      return createTask(difficulty, rng, {
        family: 'clamp',
        logicType: 'clamp',
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(value, min, max)',
        starterBody: ['return value;'],
        solutionBody: [
          'const clamped = Math.min(max, Math.max(min, value));',
          'return {',
          '  original: value,',
          '  clamped,',
          '  insideRange: clamped === value',
          '};'
        ],
        hints: ['Нужно вернуть объект, а не только число.', 'Добавь исходное значение и признак изменения.'],
        explanation: 'Сводка полезна, когда нужно не только посчитать результат, но и объяснить его.',
        tests: [
          { args: [value, min, max], expected: { original: value, clamped, insideRange: clamped === value } },
          { args: [100, 0, 25], expected: { original: 100, clamped: 25, insideRange: false } }
        ],
        constraints: ['no-mutation', 'object-result', 'summary-result'],
        tags: ['clamp', 'bounds', 'summary']
      });
    case 'callback':
      return createTask(difficulty, rng, {
        family: 'clamp',
        logicType: 'clamp',
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(value, min, max, done)',
        starterBody: [
          'done(value);',
          'return value;'
        ],
        solutionBody: [
          'const clamped = Math.min(max, Math.max(min, value));',
          'done(clamped);',
          'return clamped;'
        ],
        hints: ['Функция должна вернуть результат и вызвать done.', 'Сначала посчитай clamped, потом отправь его в callback.'],
        explanation: 'Callback-версия полезна для отработки API, где результат уходит в внешний обработчик.',
        tests: [
          {
            args: [
              value,
              min,
              max,
              { __fn: 'record', key: 'done', returnValue: clamped }
            ],
            expected: clamped,
            expectCollected: { done: [[clamped]] }
          }
        ],
        constraints: ['no-mutation', 'callback'],
        tags: ['clamp', 'bounds', 'callback']
      });
    case 'primitive':
    default:
      return createTask(difficulty, rng, {
        family: 'clamp',
        logicType: 'clamp',
        structureType: 'primitive',
        context,
        title,
        prompt,
        signature: 'solve(value, min, max)',
        starterBody: ['return value;'],
        solutionBody: ['return Math.min(max, Math.max(min, value));'],
        hints: ['Используй Math.min и Math.max.', 'Сначала подними значение до нижней границы, потом ограничь сверху.'],
        explanation: 'Это базовая функция ограничения числа по диапазону.',
        tests: [
          { args: [value, min, max], expected: clamped },
          { args: [100, 0, 25], expected: 25 },
          { args: [-5, 0, 25], expected: 0 }
        ],
        constraints: ['no-mutation'],
        tags: ['clamp', 'bounds']
      });
  }
}

function buildNormalizeTask(difficulty, rng) {
  const context = rng.pick(CONTEXTS.normalize);
  const structure = pickWeighted(rng, STRUCTURE_WEIGHTS[difficulty].normalize) || 'primitive';
  const mode = pickWeighted(rng, LOGIC_WEIGHTS.normalize[difficulty]) || 'collapse';
  const rawText = sampleDirtyText(rng, difficulty);
  const expected = normalizeText(rawText, mode);
  const wordCount = collapseSpaces(rawText).split(' ').length;
  const title = pickVariant(rng, TITLES.normalize)({ context });
  const prompt = pickVariant(rng, PROMPTS.normalize)({
    context,
    dataPreview: preview(rawText),
    goal: GOALS.normalize[structure],
    constraintsText: buildConstraintText(
      structure === 'summary'
        ? ['no-mutation', 'object-result']
        : structure === 'callback'
          ? ['no-mutation', 'callback']
          : ['no-mutation']
    )
  });

  switch (structure) {
    case 'object':
      return createTask(difficulty, rng, {
        family: 'normalize',
        logicType: `normalize-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(input)',
        starterBody: ['return input.text;'],
        solutionBody: [
          'const text = input.text;',
          `const cleaned = ${JSON.stringify(mode)} === 'lower' ? text.trim().replace(/\\s+/g, ' ').toLowerCase() : text.trim().replace(/\\s+/g, ' ');`,
          `if (${JSON.stringify(mode)} === 'title') {`,
          '  return cleaned.split(" ").filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");',
          '}',
          `if (${JSON.stringify(mode)} === 'sentence') {`,
          '  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase() : cleaned;',
          '}',
          'return cleaned;'
        ],
        hints: ['Сначала возьми text из input.', 'Потом выбери режим нормализации.'],
        explanation: 'Object-API заставляет сначала распаковать входной объект, а потом уже чистить строку.',
        tests: [
          { args: [{ text: rawText }], expected },
          { args: [{ text: '   hello   world   ' }], expected: mode === 'title' ? 'Hello World' : mode === 'lower' ? 'hello world' : mode === 'sentence' ? 'Hello world' : 'hello world' }
        ],
        constraints: ['no-mutation'],
        tags: ['normalize', mode, 'object']
      });
    case 'options':
      return createTask(difficulty, rng, {
        family: 'normalize',
        logicType: `normalize-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(text, options)',
        starterBody: ['return text;'],
        solutionBody: [
          'const cleaned = text.trim().replace(/\\s+/g, " ");',
          'const mode = options.mode || "collapse";',
          'if (mode === "title") {',
          '  return cleaned.split(" ").filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");',
          '}',
          'if (mode === "lower") {',
          '  return cleaned.toLowerCase();',
          '}',
          'if (mode === "sentence") {',
          '  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase() : cleaned;',
          '}',
          'return cleaned;'
        ],
        hints: ['Режим передан в options.mode.', 'Сначала приведи строку в аккуратный вид, потом применяй правило.'],
        explanation: 'Options-API позволяет выбирать поведение не меняя сигнатуру решения.',
        tests: [
          { args: [rawText, { mode }], expected },
          { args: ['   hello   world   ', { mode: 'title' }], expected: 'Hello World' }
        ],
        constraints: ['no-mutation', 'options-api'],
        tags: ['normalize', mode, 'options']
      });
    case 'summary':
      return createTask(difficulty, rng, {
        family: 'normalize',
        logicType: `normalize-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(text)',
        starterBody: ['return text;'],
        solutionBody: [
          `const cleaned = text.trim().replace(/\\s+/g, ' ');`,
          `const normalized = ${JSON.stringify(mode)} === 'title'`,
          '  ? cleaned.split(" ").filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ")',
          `  : ${JSON.stringify(mode)} === 'lower'`,
          '    ? cleaned.toLowerCase()',
          `    : ${JSON.stringify(mode)} === 'sentence'`,
          '      ? (cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase() : cleaned)',
          '      : cleaned;',
          'return {',
          '  normalized,',
          '  length: normalized.length,',
          '  words: normalized ? normalized.split(" ").filter(Boolean).length : 0',
          '};'
        ],
        hints: ['Верни объект с метаданными строки.', 'Добавь длину и число слов.'],
        explanation: 'Сводка полезна, когда нормализацию нужно использовать вместе с дополнительной аналитикой.',
        tests: [
          {
            args: [rawText],
            expected: {
              normalized: expected,
              length: expected.length,
              words: expected ? expected.split(' ').filter(Boolean).length : 0
            }
          }
        ],
        constraints: ['no-mutation', 'object-result', 'summary-result'],
        tags: ['normalize', mode, 'summary']
      });
    case 'callback':
      return createTask(difficulty, rng, {
        family: 'normalize',
        logicType: `normalize-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(text, done)',
        starterBody: [
          'done(text);',
          'return text;'
        ],
        solutionBody: [
          `const cleaned = text.trim().replace(/\\s+/g, ' ');`,
          `const normalized = ${JSON.stringify(mode)} === 'title'`,
          '  ? cleaned.split(" ").filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ")',
          `  : ${JSON.stringify(mode)} === 'lower'`,
          '    ? cleaned.toLowerCase()',
          `    : ${JSON.stringify(mode)} === 'sentence'`,
          '      ? (cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase() : cleaned)',
          '      : cleaned;',
          'done(normalized);',
          'return normalized;'
        ],
        hints: ['Не забудь вызвать done.', 'Сначала вычисли normalized, потом отдай его наружу.'],
        explanation: 'Callback-формат тренирует работу с внешним обработчиком результата.',
        tests: [
          {
            args: [rawText, { __fn: 'record', key: 'done', returnValue: expected }],
            expected,
            expectCollected: { done: [[expected]] }
          }
        ],
        constraints: ['no-mutation', 'callback'],
        tags: ['normalize', mode, 'callback']
      });
    case 'primitive':
    default:
      return createTask(difficulty, rng, {
        family: 'normalize',
        logicType: `normalize-${mode}`,
        structureType: 'primitive',
        context,
        title,
        prompt,
        signature: 'solve(text)',
        starterBody: ['return text;'],
        solutionBody: [
          'const cleaned = text.trim().replace(/\\s+/g, " ");',
          `if (${JSON.stringify(mode)} === 'title') {`,
          '  return cleaned.split(" ").filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");',
          '}',
          `if (${JSON.stringify(mode)} === 'lower') {`,
          '  return cleaned.toLowerCase();',
          '}',
          `if (${JSON.stringify(mode)} === 'sentence') {`,
          '  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase() : cleaned;',
          '}',
          'return cleaned;'
        ],
        hints: ['Сначала почисти пробелы.', 'Потом примени режим нормализации.'],
        explanation: 'Эта задача прокачивает простую, но важную обработку строк.',
        tests: [
          { args: [rawText], expected },
          { args: ['   hello   world   '], expected: mode === 'title' ? 'Hello World' : mode === 'lower' ? 'hello world' : mode === 'sentence' ? 'Hello world' : 'hello world' }
        ],
        constraints: ['no-mutation'],
        tags: ['normalize', mode]
      });
  }
}

function buildAggregateTask(difficulty, rng) {
  const context = rng.pick(CONTEXTS.aggregate);
  const structure = pickWeighted(rng, STRUCTURE_WEIGHTS[difficulty].aggregate) || 'primitive';
  const mode = pickWeighted(rng, LOGIC_WEIGHTS.aggregate[difficulty]) || 'sum';
  const numbers = mode === 'product'
    ? sampleNumericSeries(rng, difficulty, { min: 1, max: 7, allowNegative: false, duplicateFriendly: false })
    : sampleNumericSeries(rng, difficulty, { min: -20, max: 70, allowNegative: true });
  const expected = (() => {
    switch (mode) {
      case 'max':
        return Math.max(...numbers);
      case 'min':
        return Math.min(...numbers);
      case 'average':
        return roundTo2(sum(numbers) / numbers.length);
      case 'spread':
        return Math.max(...numbers) - Math.min(...numbers);
      case 'product':
        return numbers.reduce((acc, value) => acc * value, 1);
      case 'sum':
      default:
        return sum(numbers);
    }
  })();
  const title = pickVariant(rng, TITLES.aggregate)({ context });
  const prompt = pickVariant(rng, PROMPTS.aggregate)({
    context,
    dataPreview: preview(numbers),
    goal: GOALS.aggregate[structure],
    constraintsText: buildConstraintText(
      structure === 'summary'
        ? ['no-mutation', 'object-result', 'summary-result']
        : structure === 'callback'
          ? ['no-mutation', 'callback']
          : mode === 'product'
            ? ['no-mutation']
            : ['no-mutation']
    )
  });

  const total = sum(numbers);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const aggregateSummary = {
    mode,
    total: mode === 'sum' || mode === 'average' ? total : null,
    count: numbers.length,
    average: mode === 'sum' || mode === 'average' ? roundTo2(total / numbers.length) : null,
    min: mode === 'min' || mode === 'spread' ? min : null,
    max: mode === 'max' || mode === 'spread' ? max : null,
    spread: mode === 'spread' ? max - min : null,
    product: mode === 'product' ? expected : null
  };

  switch (structure) {
    case 'object':
      return createTask(difficulty, rng, {
        family: 'aggregate',
        logicType: `aggregate-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(input)',
        starterBody: ['return input.numbers[0] || 0;'],
        solutionBody: [
          'const numbers = input.numbers || input.values || [];',
          `const mode = input.mode || ${JSON.stringify(mode)};`,
          'switch (mode) {',
          '  case "max": return Math.max(...numbers);',
          '  case "min": return Math.min(...numbers);',
          '  case "average": return Math.round((numbers.reduce((acc, value) => acc + value, 0) / numbers.length) * 100) / 100;',
          '  case "spread": return Math.max(...numbers) - Math.min(...numbers);',
          '  case "product": return numbers.reduce((acc, value) => acc * value, 1);',
          '  case "sum":',
          '  default: return numbers.reduce((acc, value) => acc + value, 0);',
          '}'
        ],
        hints: ['Возьми массив из input.', 'Добавь switch по mode, если нужен выбор операции.'],
        explanation: 'Object-API здесь делает задачу гибче: и данные, и режим находятся в одном месте.',
        tests: [
          { args: [{ numbers, mode }], expected },
          { args: [{ numbers: [1, 2, 3], mode: 'sum' }], expected: 6 }
        ],
        constraints: ['no-mutation', 'options-api'],
        tags: ['aggregate', mode, 'object']
      });
    case 'options':
      return createTask(difficulty, rng, {
        family: 'aggregate',
        logicType: `aggregate-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(numbers, options)',
        starterBody: ['return numbers[0] || 0;'],
        solutionBody: [
          'const mode = options.mode || "sum";',
          'switch (mode) {',
          '  case "max": return Math.max(...numbers);',
          '  case "min": return Math.min(...numbers);',
          '  case "average": return Math.round((numbers.reduce((acc, value) => acc + value, 0) / numbers.length) * 100) / 100;',
          '  case "spread": return Math.max(...numbers) - Math.min(...numbers);',
          '  case "product": return numbers.reduce((acc, value) => acc * value, 1);',
          '  case "sum":',
          '  default: return numbers.reduce((acc, value) => acc + value, 0);',
          '}'
        ],
        hints: ['Режим задаётся через options.mode.', 'Для average не забудь округление.'],
        explanation: 'Options-API удобно использовать, когда операция меняется без изменения самой сигнатуры.',
        tests: [
          { args: [numbers, { mode }], expected },
          { args: [[1, 2, 3, 4], { mode: 'average' }], expected: 2.5 }
        ],
        constraints: ['no-mutation', 'options-api'],
        tags: ['aggregate', mode, 'options']
      });
    case 'summary':
      return createTask(difficulty, rng, {
        family: 'aggregate',
        logicType: `aggregate-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(numbers)',
        starterBody: ['return numbers[0] || 0;'],
        solutionBody: [
          'const total = numbers.reduce((acc, value) => acc + value, 0);',
          'const count = numbers.length;',
          'const min = Math.min(...numbers);',
          'const max = Math.max(...numbers);',
          'const average = Math.round((total / count) * 100) / 100;',
          'const spread = max - min;',
          'const product = numbers.reduce((acc, value) => acc * value, 1);',
          'return {',
          `  mode: ${JSON.stringify(mode)},`,
          `  total: ${JSON.stringify(mode)} === "sum" || ${JSON.stringify(mode)} === "average" ? total : null,`,
          '  count,',
          `  average: ${JSON.stringify(mode)} === "sum" || ${JSON.stringify(mode)} === "average" ? average : null,`,
          `  min: ${JSON.stringify(mode)} === "min" || ${JSON.stringify(mode)} === "spread" ? min : null,`,
          `  max: ${JSON.stringify(mode)} === "max" || ${JSON.stringify(mode)} === "spread" ? max : null,`,
          `  spread: ${JSON.stringify(mode)} === "spread" ? spread : null,`,
          `  product: ${JSON.stringify(mode)} === "product" ? product : null`,
          '};'
        ],
        hints: ['Нужно вернуть объект-результат.', 'Добавь не только итог, но и полезные поля для анализа.'],
        explanation: 'Сводка помогает увидеть не только ответ, но и сопутствующую статистику.',
        tests: [
          { args: [numbers], expected: aggregateSummary }
        ],
        constraints: ['no-mutation', 'object-result', 'summary-result'],
        tags: ['aggregate', mode, 'summary']
      });
    case 'callback':
      return createTask(difficulty, rng, {
        family: 'aggregate',
        logicType: `aggregate-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(numbers, done)',
        starterBody: [
          'done(numbers[0] || 0);',
          'return numbers[0] || 0;'
        ],
        solutionBody: [
          `const result = ${(() => {
            switch (mode) {
              case 'max':
                return 'Math.max(...numbers)';
              case 'min':
                return 'Math.min(...numbers)';
              case 'average':
                return 'Math.round((numbers.reduce((acc, value) => acc + value, 0) / numbers.length) * 100) / 100';
              case 'spread':
                return 'Math.max(...numbers) - Math.min(...numbers)';
              case 'product':
                return 'numbers.reduce((acc, value) => acc * value, 1)';
              case 'sum':
              default:
                return 'numbers.reduce((acc, value) => acc + value, 0)';
            }
          })()};`,
          'done(result);',
          'return result;'
        ],
        hints: ['Не забудь вызвать done с итогом.', 'Само решение должно вернуть то же значение.'],
        explanation: 'Callback-версия тренирует работу с функциями обратного вызова без лишней магии.',
        tests: [
          {
            args: [
              numbers,
              { __fn: 'record', key: 'done', returnValue: expected }
            ],
            expected,
            expectCollected: { done: [[expected]] }
          }
        ],
        constraints: ['no-mutation', 'callback'],
        tags: ['aggregate', mode, 'callback']
      });
    case 'primitive':
    default:
      return createTask(difficulty, rng, {
        family: 'aggregate',
        logicType: `aggregate-${mode}`,
        structureType: 'primitive',
        context,
        title,
        prompt,
        signature: 'solve(numbers)',
        starterBody: ['return numbers[0] || 0;'],
        solutionBody: [
          'switch (true) {',
          `  case ${JSON.stringify(mode)} === "max": return Math.max(...numbers);`,
          `  case ${JSON.stringify(mode)} === "min": return Math.min(...numbers);`,
          `  case ${JSON.stringify(mode)} === "average": return Math.round((numbers.reduce((acc, value) => acc + value, 0) / numbers.length) * 100) / 100;`,
          `  case ${JSON.stringify(mode)} === "spread": return Math.max(...numbers) - Math.min(...numbers);`,
          `  case ${JSON.stringify(mode)} === "product": return numbers.reduce((acc, value) => acc * value, 1);`,
          '  default: return numbers.reduce((acc, value) => acc + value, 0);',
          '}'
        ],
        hints: ['Определи нужную операцию по mode.', 'Для average округли результат до двух знаков.'],
        explanation: 'Агрегация - это базовый навык для любой аналитики.',
        tests: [
          { args: [numbers], expected },
          { args: [[1, 2, 3, 4]], expected: mode === 'max' ? 4 : mode === 'min' ? 1 : mode === 'average' ? 2.5 : mode === 'spread' ? 3 : mode === 'product' ? 24 : 10 }
        ],
        constraints: ['no-mutation'],
        tags: ['aggregate', mode]
      });
  }
}

function buildTransformTask(difficulty, rng) {
  const context = rng.pick(CONTEXTS.transform);
  const structure = pickWeighted(rng, STRUCTURE_WEIGHTS[difficulty].transform) || 'primitive';
  let mode = pickWeighted(rng, LOGIC_WEIGHTS.transform[difficulty]) || 'numbers';
  if (mode === 'join' && structure !== 'options') {
    mode = rng.bool() ? 'words' : 'format';
  }
  let values;
  let mapper;
  let expected;

  switch (mode) {
    case 'words': {
      values = sampleWords(rng, pickCount(rng, DIFFICULTY_PROFILE[difficulty].text));
      mapper = rng.bool() ? { __fn: 'toUpperCase', key: 'upper' } : { __fn: 'appendSuffix', suffix: `-${sampleText(rng, 3)}`, key: 'suffix' };
      expected = buildLabels(values, (value) => mapper.__fn === 'toUpperCase' ? String(value).toUpperCase() : `${String(value)}${mapper.suffix}`);
      break;
    }
    case 'format': {
      values = samplePersons(rng, pickCount(rng, DIFFICULTY_PROFILE[difficulty].size));
      mapper = { __fn: 'formatUserScore', key: 'format' };
      expected = buildLabels(values, (person) => `${person.name}:${person.score}`);
      break;
    }
    case 'join': {
      values = sampleWords(rng, pickCount(rng, DIFFICULTY_PROFILE[difficulty].text));
      mapper = rng.bool() ? { __fn: 'appendSuffix', suffix: `-${sampleText(rng, 2)}`, key: 'suffix' } : { __fn: 'toUpperCase', key: 'upper' };
      const mapped = buildLabels(values, (value) => mapper.__fn === 'toUpperCase' ? String(value).toUpperCase() : `${String(value)}${mapper.suffix}`);
      expected = mapped.join(rng.bool() ? ' | ' : ' / ');
      break;
    }
    case 'numbers':
    default: {
      values = sampleNumericSeries(rng, difficulty, { min: -15, max: 25, allowNegative: true });
      mapper = rng.bool()
        ? { __fn: 'add', value: rng.int(1, 6), key: 'plus' }
        : { __fn: 'multiply', value: rng.int(2, 4), key: 'mul' };
      expected = buildLabels(values, (value, index) => {
        if (mapper.__fn === 'add') {
          return value + mapper.value;
        }
        if (mapper.__fn === 'multiply') {
          return value * mapper.value;
        }
        return value * (index + 1);
      });
      break;
    }
  }

  const title = pickVariant(rng, TITLES.transform)({ context });
  const prompt = pickVariant(rng, PROMPTS.transform)({
    context,
    dataPreview: preview(values),
    goal: GOALS.transform[structure],
    constraintsText: buildConstraintText(
      structure === 'summary'
        ? ['no-mutation', 'object-result', 'summary-result']
        : structure === 'callback'
          ? ['no-mutation', 'callback']
          : ['no-mutation', 'preserve-order']
    )
  });

  switch (structure) {
    case 'object':
      return createTask(difficulty, rng, {
        family: 'transform',
        logicType: `transform-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(input)',
        starterBody: ['return input.values;'],
        solutionBody: [
          'const values = input.values;',
          'const mapper = input.mapper;',
          'return values.map((value, index) => mapper(value, index));'
        ],
        hints: ['Возьми values и mapper из input.', 'Просто промапь каждый элемент.'],
        explanation: 'Object-API удобен, когда вместе с данными передаётся функция преобразования.',
        tests: [
          { args: [{ values, mapper }], expected },
          { args: [{ values: ['hello', 'world'], mapper: { __fn: 'toUpperCase', key: 'upper2' } }], expected: ['HELLO', 'WORLD'] }
        ],
        constraints: ['no-mutation', 'preserve-order'],
        tags: ['transform', mode, 'object']
      });
    case 'options':
      return createTask(difficulty, rng, {
        family: 'transform',
        logicType: `transform-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(values, mapper, options)',
        starterBody: ['return values;'],
        solutionBody: [
          'const mapped = values.map((value, index) => mapper(value, index));',
          'if (options && options.join) {',
          '  return mapped.join(options.separator || " ");',
          '}',
          'return mapped;'
        ],
        hints: ['Сначала построй mapped.', 'Потом при необходимости склей результат строкой.'],
        explanation: 'Options-версия добавляет гибкость: можно вернуть и массив, и строку.',
        tests: [
          {
            args: [
              values,
              mapper,
              { join: mode === 'join', separator: ' | ' }
            ],
            expected
          }
        ],
        constraints: ['no-mutation', 'preserve-order', 'options-api'],
        tags: ['transform', mode, 'options']
      });
    case 'summary':
      return createTask(difficulty, rng, {
        family: 'transform',
        logicType: `transform-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(values, mapper)',
        starterBody: ['return values;'],
        solutionBody: [
          'const mapped = values.map((value, index) => mapper(value, index));',
          'return {',
          '  mapped,',
          '  count: mapped.length,',
          '  first: mapped[0] ?? null,',
          '  last: mapped[mapped.length - 1] ?? null',
          '};'
        ],
        hints: ['Верни объект с mapped и счётчиками.', 'Добавь первый и последний элементы для удобства отладки.'],
        explanation: 'Сводка помогает увидеть не только значения, но и форму результата.',
        tests: [
          {
            args: [values, mapper],
            expected: {
              mapped: expected,
              count: expected.length,
              first: expected[0] ?? null,
              last: expected[expected.length - 1] ?? null
            }
          }
        ],
        constraints: ['no-mutation', 'object-result', 'summary-result', 'preserve-order'],
        tags: ['transform', mode, 'summary']
      });
    case 'callback':
      return createTask(difficulty, rng, {
        family: 'transform',
        logicType: `transform-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(values, mapper, done)',
        starterBody: [
          'done(values);',
          'return values;'
        ],
        solutionBody: [
          'const mapped = values.map((value, index) => mapper(value, index));',
          'done(mapped);',
          'return mapped;'
        ],
        hints: ['Сначала получи mapped.', 'Передай mapped в done и верни его же.'],
        explanation: 'Callback-вариант заставляет держать результат и побочный канал синхронно.',
        tests: [
          {
            args: [
              values,
              mapper,
              { __fn: 'record', key: 'done', returnValue: expected }
            ],
            expected,
            expectCollected: { done: [ [expected] ] }
          }
        ],
        constraints: ['no-mutation', 'callback', 'preserve-order'],
        tags: ['transform', mode, 'callback']
      });
    case 'primitive':
    default:
      return createTask(difficulty, rng, {
        family: 'transform',
        logicType: `transform-${mode}`,
        structureType: 'primitive',
        context,
        title,
        prompt,
        signature: 'solve(values, mapper)',
        starterBody: ['return values;'],
        solutionBody: ['return values.map((value, index) => mapper(value, index));'],
        hints: ['Просто пройди по values через map.', 'Не меняй порядок элементов.'],
        explanation: 'Эта задача тренирует классический map с callback-функцией.',
        tests: [
          { args: [values, mapper], expected },
          { args: [[1, 2, 3], { __fn: 'multiply', value: 2, key: 'double' }], expected: [2, 4, 6] }
        ],
        constraints: ['no-mutation', 'preserve-order'],
        tags: ['transform', mode]
      });
  }
}

function buildFilterTask(difficulty, rng) {
  const context = rng.pick(CONTEXTS.filter);
  const structure = pickWeighted(rng, STRUCTURE_WEIGHTS[difficulty].filter) || 'primitive';
  const mode = pickWeighted(rng, LOGIC_WEIGHTS.filter[difficulty]) || 'greater';
  const values = sampleNumericSeries(rng, difficulty, { min: -25, max: 70, allowNegative: true });
  const threshold = rng.int(0, 25);
  const divisor = rng.int(2, 5);
  const rangeStart = rng.int(-10, 20);
  const rangeEnd = rangeStart + rng.int(4, 20);

  let predicate;
  let expected;

  switch (mode) {
    case 'less':
      predicate = { __fn: 'predicateLessThan', value: threshold, key: 'less' };
      expected = values.filter((value) => value < threshold);
      break;
    case 'not-multiple':
      predicate = { __fn: 'predicateNotMultipleOf', divisor, key: 'notMultiple' };
      expected = values.filter((value) => value % divisor !== 0);
      break;
    case 'modulo':
      predicate = { __fn: 'predicateModuloEquals', divisor, remainder: 0, key: 'modulo' };
      expected = values.filter((value) => value % divisor === 0);
      break;
    case 'greater':
    default:
      predicate = { __fn: 'predicateGreaterThan', value: threshold, key: 'greater' };
      expected = values.filter((value) => value > threshold);
      break;
  }

  const title = pickVariant(rng, TITLES.filter)({ context });
  const prompt = pickVariant(rng, PROMPTS.filter)({
    context,
    dataPreview: preview(values),
    goal: GOALS.filter[structure],
    constraintsText: buildConstraintText(
      structure === 'summary'
        ? ['no-mutation', 'object-result', 'summary-result', 'preserve-order']
        : structure === 'callback'
          ? ['no-mutation', 'callback', 'preserve-order']
          : ['no-mutation', 'preserve-order']
    )
  });

  switch (structure) {
    case 'object':
      return createTask(difficulty, rng, {
        family: 'filter',
        logicType: `filter-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(input)',
        starterBody: ['return input.values;'],
        solutionBody: [
          'const values = input.values;',
          'const predicate = input.predicate;',
          'return values.filter((value, index) => predicate(value, index));'
        ],
        hints: ['Возьми values и predicate из input.', 'Отфильтруй через Array.filter.'],
        explanation: 'Object-API удобно использовать, когда фильтр и данные приходят вместе.',
        tests: [
          { args: [{ values, predicate }], expected },
          { args: [{ values: [1, 2, 3, 4, 5], predicate: { __fn: 'predicateNotMultipleOf', divisor: 2, key: 'odd' } }], expected: [1, 3, 5] }
        ],
        constraints: ['no-mutation', 'preserve-order'],
        tags: ['filter', mode, 'object']
      });
    case 'options':
      return createTask(difficulty, rng, {
        family: 'filter',
        logicType: `filter-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(values, predicate, options)',
        starterBody: ['return values;'],
        solutionBody: [
          'const filtered = values.filter((value, index) => predicate(value, index));',
          'if (options && options.includeCount) {',
          '  return { values: filtered, count: filtered.length };',
          '}',
          'return filtered;'
        ],
        hints: ['Сначала отфильтруй массив.', 'Потом при необходимости верни объект с количеством.'],
        explanation: 'Options-версия позволяет гибко переключать формат ответа.',
        tests: [
          {
            args: [values, predicate, { includeCount: true }],
            expected: { values: expected, count: expected.length }
          }
        ],
        constraints: ['no-mutation', 'preserve-order', 'options-api'],
        tags: ['filter', mode, 'options']
      });
    case 'summary':
      return createTask(difficulty, rng, {
        family: 'filter',
        logicType: `filter-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(values, predicate)',
        starterBody: ['return values;'],
        solutionBody: [
          'const kept = values.filter((value, index) => predicate(value, index));',
          'return {',
          '  kept,',
          '  dropped: values.length - kept.length',
          '};'
        ],
        hints: ['Верни сводку по отбору.', 'Добавь число отброшенных элементов.'],
        explanation: 'Сводка помогает видеть не только результат, но и масштаб отбора.',
        tests: [
          { args: [values, predicate], expected: { kept: expected, dropped: values.length - expected.length } }
        ],
        constraints: ['no-mutation', 'object-result', 'summary-result', 'preserve-order'],
        tags: ['filter', mode, 'summary']
      });
    case 'callback':
      return createTask(difficulty, rng, {
        family: 'filter',
        logicType: `filter-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(values, predicate, done)',
        starterBody: [
          'done(values);',
          'return values;'
        ],
        solutionBody: [
          'const filtered = values.filter((value, index) => predicate(value, index));',
          'done(filtered);',
          'return filtered;'
        ],
        hints: ['Сначала вычисли filtered.', 'Передай filtered в done.'],
        explanation: 'Callback-версия показывает, как отдавать результат во внешний обработчик.',
        tests: [
          {
            args: [
              values,
              predicate,
              { __fn: 'record', key: 'done', returnValue: expected }
            ],
            expected,
            expectCollected: { done: [ [expected] ] }
          }
        ],
        constraints: ['no-mutation', 'callback', 'preserve-order'],
        tags: ['filter', mode, 'callback']
      });
    case 'primitive':
    default:
      return createTask(difficulty, rng, {
        family: 'filter',
        logicType: `filter-${mode}`,
        structureType: 'primitive',
        context,
        title,
        prompt,
        signature: 'solve(values, predicate)',
        starterBody: ['return values;'],
        solutionBody: ['return values.filter((value, index) => predicate(value, index));'],
        hints: ['Используй Array.filter.', 'Предикат получает элемент и индекс.'],
        explanation: 'Фильтрация - это одна из самых частых операций с массивами.',
        tests: [
          { args: [values, predicate], expected },
          { args: [[1, 2, 3, 4, 5], { __fn: 'predicateModuloEquals', divisor: 2, remainder: 0, key: 'even' }], expected: [2, 4] }
        ],
        constraints: ['no-mutation', 'preserve-order'],
        tags: ['filter', mode]
      });
  }
}

function buildComposeTask(difficulty, rng) {
  const context = rng.pick(CONTEXTS.compose);
  const structure = pickWeighted(rng, STRUCTURE_WEIGHTS[difficulty].compose) || 'primitive';
  const mode = pickWeighted(rng, LOGIC_WEIGHTS.compose[difficulty]) || 'numeric';
  const numericValue = rng.int(1, 12);
  const textValue = sampleWords(rng, 2).join(' ');
  const useText = mode !== 'numeric' && rng.bool(0.55);

  let value;
  let steps;
  let expected;

  if (useText) {
    value = textValue;
    steps = [
      rng.bool() ? { __fn: 'toUpperCase', key: 'upper' } : { __fn: 'appendSuffix', suffix: `-${sampleText(rng, 2)}`, key: 'suffix1' },
      rng.bool() ? { __fn: 'appendSuffix', suffix: `-${sampleText(rng, 3)}`, key: 'suffix2' } : { __fn: 'toUpperCase', key: 'upper2' }
    ];
    expected = steps.reduce((acc, fn) => {
      if (fn.__fn === 'toUpperCase') {
        return String(acc).toUpperCase();
      }
      return `${String(acc)}${fn.suffix}`;
    }, value);
  } else {
    value = numericValue;
    steps = [
      { __fn: 'add', value: rng.int(1, 4), key: 'add1' },
      { __fn: 'multiply', value: rng.int(2, 4), key: 'mul1' }
    ];
    expected = steps.reduce((acc, fn) => {
      if (fn.__fn === 'add') {
        return acc + fn.value;
      }
      return acc * fn.value;
    }, value);
  }

  const title = pickVariant(rng, TITLES.compose)({ context });
  const prompt = pickVariant(rng, PROMPTS.compose)({
    context,
    dataPreview: preview({ value, steps }),
    goal: GOALS.compose[structure],
    constraintsText: buildConstraintText(
      structure === 'summary'
        ? ['no-mutation', 'object-result', 'summary-result', 'order-matters']
        : ['no-mutation', 'order-matters']
    )
  });

  switch (structure) {
    case 'object':
      return createTask(difficulty, rng, {
        family: 'compose',
        logicType: `compose-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(input)',
        starterBody: ['return input.value;'],
        solutionBody: [
          'const { value, steps } = input;',
          'let current = value;',
          'for (const step of steps) {',
          '  current = step(current);',
          '}',
          'return current;'
        ],
        hints: ['Возьми value и steps из input.', 'Пройдись по steps в порядке их передачи.'],
        explanation: 'Object-API удобно использовать для явного описания конвейера.',
        tests: [
          { args: [{ value, steps }], expected }
        ],
        constraints: ['no-mutation', 'order-matters'],
        tags: ['compose', mode, 'object']
      });
    case 'options':
      return createTask(difficulty, rng, {
        family: 'compose',
        logicType: `compose-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(value, steps, options)',
        starterBody: ['return value;'],
        solutionBody: [
          'let current = value;',
          'for (const step of steps) {',
          '  current = step(current);',
          '}',
          'if (options && options.trace) {',
          '  return { value, result: current, steps: steps.length };',
          '}',
          'return current;'
        ],
        hints: ['steps уже содержит функции.', 'При trace верни объект со следами выполнения.'],
        explanation: 'Options-версия добавляет tracing без изменения основной логики.',
        tests: [
          {
            args: [value, steps, { trace: true }],
            expected: { value, result: expected, steps: steps.length }
          }
        ],
        constraints: ['no-mutation', 'order-matters', 'options-api'],
        tags: ['compose', mode, 'options']
      });
    case 'summary':
      return createTask(difficulty, rng, {
        family: 'compose',
        logicType: `compose-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(value, first, second)',
        starterBody: ['return value;'],
        solutionBody: [
          'const firstValue = first(value);',
          'const secondValue = second(firstValue);',
          'return {',
          '  before: value,',
          '  after: secondValue,',
          '  trace: [value, firstValue, secondValue]',
          '};'
        ],
        hints: ['Сохрани промежуточный результат первой функции.', 'Верни объект с trace.'],
        explanation: 'Сводка полезна, когда важно увидеть путь преобразований, а не только финал.',
        tests: [
          {
            args: [value, steps[0], steps[1]],
            expected: {
              before: value,
              after: expected,
              trace: useText
                ? [value, steps[0] === undefined ? value : (steps[0].__fn === 'toUpperCase' ? String(value).toUpperCase() : `${String(value)}${steps[0].suffix}`), expected]
                : [value, value + steps[0].value, expected]
            }
          }
        ],
        constraints: ['no-mutation', 'object-result', 'summary-result', 'order-matters'],
        tags: ['compose', mode, 'summary']
      });
    case 'primitive':
    default:
      return createTask(difficulty, rng, {
        family: 'compose',
        logicType: `compose-${mode}`,
        structureType: 'primitive',
        context,
        title,
        prompt,
        signature: 'solve(value, first, second)',
        starterBody: ['return value;'],
        solutionBody: [
          'const firstValue = first(value);',
          'return second(firstValue);'
        ],
        hints: ['Сначала вызови first, потом second.', 'Порядок преобразований обязателен.'],
        explanation: 'Композиция функций - основа для пайплайнов и чистых вычислений.',
        tests: [
          { args: [value, steps[0], steps[1]], expected }
        ],
        constraints: ['no-mutation', 'order-matters'],
        tags: ['compose', mode]
      });
  }
}

function buildReduceTask(difficulty, rng) {
  const context = rng.pick(CONTEXTS.reduce);
  const structure = pickWeighted(rng, STRUCTURE_WEIGHTS[difficulty].reduce) || 'primitive';
  const mode = pickWeighted(rng, LOGIC_WEIGHTS.reduce[difficulty]) || 'sum';
  const values = sampleNumericSeries(rng, difficulty, {
    min: -15,
    max: 45,
    allowNegative: true,
    duplicateFriendly: true
  });
  const offset = rng.int(0, 4);
  const reducer = { __fn: 'accumulate', value: offset, key: `${mode}-reducer` };
  const expected = values.reduce((acc, value) => acc + value + offset, 0);

  const title = pickVariant(rng, TITLES.reduce)({ context });
  const prompt = pickVariant(rng, PROMPTS.reduce)({
    context,
    dataPreview: preview({ values, offset }),
    goal: GOALS.reduce[structure],
    constraintsText: buildConstraintText(
      structure === 'summary'
        ? ['no-mutation', 'object-result', 'summary-result', 'single-pass']
        : structure === 'callback'
          ? ['no-mutation', 'callback', 'single-pass']
          : ['no-mutation', 'single-pass']
    )
  });

  switch (structure) {
    case 'object':
      return createTask(difficulty, rng, {
        family: 'reduce',
        logicType: `reduce-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(input)',
        starterBody: ['return input.values[0] || 0;'],
        solutionBody: [
          'const values = input.values;',
          'const reducer = input.reducer;',
          'const initial = input.initial ?? 0;',
          'let acc = initial;',
          'for (let index = 0; index < values.length; index += 1) {',
          '  acc = reducer(acc, values[index], index);',
          '}',
          'return acc;'
        ],
        hints: ['Считай values, reducer и initial из input.', 'Иди по массиву одним циклом.'],
        explanation: 'Object-API полезен, когда аккумулятор и функция свёртки приходят вместе.',
        tests: [
          { args: [{ values, reducer, initial: 0 }], expected },
          { args: [{ values: [1, 2, 3], reducer: { __fn: 'accumulate', value: 1, key: 'plus-one' }, initial: 0 }], expected: 9 }
        ],
        constraints: ['no-mutation', 'single-pass'],
        tags: ['reduce', mode, 'object']
      });
    case 'options':
      return createTask(difficulty, rng, {
        family: 'reduce',
        logicType: `reduce-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(values, reducer, options)',
        starterBody: ['return values[0] || 0;'],
        solutionBody: [
          'let acc = options.initial ?? 0;',
          'for (let index = 0; index < values.length; index += 1) {',
          '  acc = reducer(acc, values[index], index);',
          '}',
          'return acc;'
        ],
        hints: ['Стартовое значение берётся из options.initial.', 'Используй обычный for, чтобы не потерять индекс.'],
        explanation: 'Options-версия удобна, если стартовый аккумулятор меняется от задачи к задаче.',
        tests: [
          { args: [values, reducer, { initial: 0 }], expected },
          { args: [[1, 2, 3], { __fn: 'accumulate', value: 2, key: 'plus-two' }, { initial: 1 }], expected: 13 }
        ],
        constraints: ['no-mutation', 'single-pass', 'options-api'],
        tags: ['reduce', mode, 'options']
      });
    case 'summary':
      return createTask(difficulty, rng, {
        family: 'reduce',
        logicType: `reduce-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(values, reducer)',
        starterBody: ['return values[0] || 0;'],
        solutionBody: [
          'let acc = 0;',
          'let steps = 0;',
          'for (let index = 0; index < values.length; index += 1) {',
          '  acc = reducer(acc, values[index], index);',
          '  steps += 1;',
          '}',
          'return {',
          '  result: acc,',
          '  steps,',
          '  initial: 0',
          '};'
        ],
        hints: ['Верни объект с результатом и числом шагов.', 'Шаги посчитай прямо в цикле.'],
        explanation: 'Сводка помогает отладить reduce и понять, сколько итераций было выполнено.',
        tests: [
          { args: [values, reducer], expected: { result: expected, steps: values.length, initial: 0 } }
        ],
        constraints: ['no-mutation', 'object-result', 'summary-result', 'single-pass'],
        tags: ['reduce', mode, 'summary']
      });
    case 'callback':
      return createTask(difficulty, rng, {
        family: 'reduce',
        logicType: `reduce-${mode}`,
        structureType: structure,
        context,
        title,
        prompt,
        signature: 'solve(values, reducer, done)',
        starterBody: [
          'done(values[0] || 0);',
          'return values[0] || 0;'
        ],
        solutionBody: [
          'let acc = 0;',
          'for (let index = 0; index < values.length; index += 1) {',
          '  acc = reducer(acc, values[index], index);',
          '}',
          'done(acc);',
          'return acc;'
        ],
        hints: ['Сначала вычисли итог, потом вызови done.', 'Один проход по массиву вполне достаточно.'],
        explanation: 'Callback-версия делает reduce более похожим на реальный внешний интерфейс.',
        tests: [
          {
            args: [
              values,
              reducer,
              { __fn: 'record', key: 'done', returnValue: expected }
            ],
            expected,
            expectCollected: { done: [[expected]] }
          }
        ],
        constraints: ['no-mutation', 'single-pass', 'callback'],
        tags: ['reduce', mode, 'callback']
      });
    case 'primitive':
    default:
      return createTask(difficulty, rng, {
        family: 'reduce',
        logicType: `reduce-${mode}`,
        structureType: 'primitive',
        context,
        title,
        prompt,
        signature: 'solve(values, reducer)',
        starterBody: ['return values[0] || 0;'],
        solutionBody: [
          'let acc = 0;',
          'for (let index = 0; index < values.length; index += 1) {',
          '  acc = reducer(acc, values[index], index);',
          '}',
          'return acc;'
        ],
        hints: ['Идти по массиву нужно один раз.', 'Reducer получает аккумулятор, значение и индекс.'],
        explanation: 'Reduce-логика тренирует аккуратную работу с аккумулятором и индексом.',
        tests: [
          { args: [values, reducer], expected },
          { args: [[1, 2, 3], { __fn: 'accumulate', value: 1, key: 'plus-one' }], expected: 9 }
        ],
        constraints: ['no-mutation', 'single-pass'],
        tags: ['reduce', mode]
      });
  }
}

function buildFunctionsTask(difficulty, rng) {
  const family = pickWeighted(rng, FAMILY_WEIGHTS[difficulty]) || 'aggregate';

  switch (family) {
    case 'clamp':
      return buildClampTask(difficulty, rng);
    case 'normalize':
      return buildNormalizeTask(difficulty, rng);
    case 'aggregate':
      return buildAggregateTask(difficulty, rng);
    case 'transform':
      return buildTransformTask(difficulty, rng);
    case 'filter':
      return buildFilterTask(difficulty, rng);
    case 'compose':
      return buildComposeTask(difficulty, rng);
    case 'reduce':
      return buildReduceTask(difficulty, rng);
    default:
      return buildAggregateTask(difficulty, rng);
  }
}

const FUNCTIONS_VARIATION_PROFILES = {
  clamp: {
    answerFormats: [
      { value: 'primitive', text: 'Верни одно число.' },
      { value: 'object', text: 'Верни объект с полями value и clamped.' },
      { value: 'callback', text: 'Верни значение через callback и сохрани исходный результат.' }
    ],
    thinkingStyles: [
      { value: 'direct', text: 'Решай напрямую, но без нарушения границ.' },
      { value: 'bound', text: 'Сначала найди нижнюю и верхнюю границу, потом зажми значение.' },
      { value: 'normalize', text: 'Сравни значение с диапазоном и приведи его к норме.' }
    ]
  },
  normalize: {
    answerFormats: [
      { value: 'primitive', text: 'Верни нормализованную строку.' },
      { value: 'object', text: 'Верни объект с нормализованным текстом и длиной.' },
      { value: 'summary', text: 'Верни краткое summary-описание преобразования.' }
    ],
    thinkingStyles: [
      { value: 'trim', text: 'Сначала убери шум, потом склей пробелы.' },
      { value: 'canonicalize', text: 'Приведи данные к канонической форме.' },
      { value: 'compare', text: 'Сравни исходное и очищенное представление.' }
    ]
  },
  aggregate: {
    answerFormats: [
      { value: 'primitive', text: 'Верни одно агрегированное число.' },
      { value: 'object', text: 'Верни объект со сводкой и деталями.' },
      { value: 'summary', text: 'Верни summary-объект с основными метриками.' },
      { value: 'callback', text: 'Верни результат через callback вместе с итогом.' }
    ],
    thinkingStyles: [
      { value: 'accumulate', text: 'Собирай ответ в одном проходе через аккумулятор.' },
      { value: 'single-pass', text: 'Считай всё за один проход по данным.' },
      { value: 'two-pass', text: 'Сначала измерь, потом проверь результат.' }
    ]
  },
  transform: {
    answerFormats: [
      { value: 'primitive', text: 'Верни одно преобразованное значение.' },
      { value: 'object', text: 'Верни объект с исходным и новым значением.' },
      { value: 'callback', text: 'Передай результат в callback и верни тот же итог.' }
    ],
    thinkingStyles: [
      { value: 'map-like', text: 'Думай как map: одно входное значение превращается в одно выходное.' },
      { value: 'format', text: 'Сначала выбери формат, потом преобразуй под него.' },
      { value: 'convert', text: 'Преобразуй значение без потери смысла.' }
    ]
  },
  filter: {
    answerFormats: [
      { value: 'array', text: 'Верни массив отфильтрованных элементов.' },
      { value: 'object', text: 'Верни объект с выборкой и правилом.' },
      { value: 'summary', text: 'Верни summary с количеством совпадений.' },
      { value: 'callback', text: 'Верни отфильтрованные данные и вызови callback.' }
    ],
    thinkingStyles: [
      { value: 'predicate', text: 'Сначала проверь условие, потом добавляй элемент.' },
      { value: 'rule', text: 'Определи правило и применяй его одинаково к каждому элементу.' },
      { value: 'select', text: 'Отбирай только то, что проходит фильтр.' }
    ]
  },
  compose: {
    answerFormats: [
      { value: 'primitive', text: 'Верни итоговое значение композиции.' },
      { value: 'object', text: 'Верни объект с результатом и шагами.' },
      { value: 'callback', text: 'Верни результат и передай его в callback.' }
    ],
    thinkingStyles: [
      { value: 'pipeline', text: 'Думай как о цепочке шагов.' },
      { value: 'chain', text: 'Сначала собери цепочку, потом прогони значение через неё.' },
      { value: 'derive', text: 'Преобразуй вход через последовательность маленьких шагов.' }
    ]
  },
  reduce: {
    answerFormats: [
      { value: 'primitive', text: 'Верни итоговое число.' },
      { value: 'object', text: 'Верни объект с итогом и метаданными.' },
      { value: 'callback', text: 'Верни результат и проверь callback-ветку.' }
    ],
    thinkingStyles: [
      { value: 'fold', text: 'Сверни массив в одно значение.' },
      { value: 'accumulator', text: 'Держи аккумулятор и обновляй его на каждом шаге.' },
      { value: 'reduce', text: 'Сначала выбери нейтральное значение, потом наращивай результат.' }
    ]
  }
};

function buildFunctionsVariation(family, structureType, variantId, contextType) {
  const profile = FUNCTIONS_VARIATION_PROFILES[family] || FUNCTIONS_VARIATION_PROFILES.aggregate;
  const answerFormat = pickVariantByKey(`${variantId}:${family}:${structureType}:format`, profile.answerFormats);
  const thinkingStyle = pickVariantByKey(`${variantId}:${family}:${contextType}:thinking`, profile.thinkingStyles);

  return {
    answerFormat: answerFormat ? answerFormat.value : structureType,
    thinkingStyle: thinkingStyle ? thinkingStyle.value : family,
    variationNotes: unique([answerFormat && answerFormat.text, thinkingStyle && thinkingStyle.text])
  };
}

function createTask(difficulty, rng, spec) {
  const context = spec.context || { id: 'general', title: 'значений' };
  const logicType = spec.logicType || spec.family || 'general';
  const structureType = spec.structureType || 'primitive';
  const variantId = spec.variantId || makeVariantId(rng, spec.family || logicType, logicType, structureType, context);
  const variation = buildFunctionsVariation(spec.family || logicType, structureType, variantId, context.id);
  const answerFormat = spec.answerFormat || variation.answerFormat;
  const thinkingStyle = spec.thinkingStyle || variation.thinkingStyle;
  const variationNotes = unique([...(Array.isArray(spec.variationNotes) ? spec.variationNotes : []), ...variation.variationNotes]);

  return buildVariantTask({
    category: CATEGORY,
    difficulty,
    seed: variantId,
    strategy: 'simple',
    ...spec,
    context,
    answerFormat,
    thinkingStyle,
    variationNotes,
    tags: unique([...(spec.tags || []), CATEGORY, spec.family || logicType, logicType, structureType, context.id, answerFormat, thinkingStyle]),
    meta: {
      ...(spec.meta || {}),
      family: spec.family || logicType,
      logicType,
      structureType,
      answerFormat,
      thinkingStyle,
      contextType: context.id,
      constraints: buildConstraintList(...(spec.constraints || [])),
      variationNotes,
      variantId
    }
  });
}

module.exports = {
  buildFunctionsTask
};
