const { hashString } = require('./rng');
const { unique } = require('./utils');

const CONTEXT_POOLS = {
  arrays: [
    { id: 'scores', title: 'баллы игроков', note: 'Сюжет: баллы игроков.' },
    { id: 'prices', title: 'цены товаров', note: 'Сюжет: цены товаров.' },
    { id: 'temperatures', title: 'температуры за день', note: 'Сюжет: температуры за день.' },
    { id: 'logs', title: 'события лога', note: 'Сюжет: события лога.' }
  ],
  strings: [
    { id: 'messages', title: 'сообщения чата', note: 'Сюжет: сообщения чата.' },
    { id: 'filenames', title: 'названия файлов', note: 'Сюжет: названия файлов.' },
    { id: 'emails', title: 'email-адреса', note: 'Сюжет: email-адреса.' },
    { id: 'descriptions', title: 'описания товаров', note: 'Сюжет: описания товаров.' }
  ],
  collections: [
    { id: 'orders', title: 'заказы магазина', note: 'Сюжет: заказы магазина.' },
    { id: 'profiles', title: 'профили пользователей', note: 'Сюжет: профили пользователей.' },
    { id: 'tasks', title: 'карточки задач', note: 'Сюжет: карточки задач.' },
    { id: 'events', title: 'события лога', note: 'Сюжет: события лога.' }
  ],
  recursion: [
    { id: 'folders', title: 'вложенные папки', note: 'Сюжет: вложенные папки.' },
    { id: 'trees', title: 'деревья меню', note: 'Сюжет: деревья меню.' },
    { id: 'comments', title: 'иерархии комментариев', note: 'Сюжет: иерархии комментариев.' },
    { id: 'callStacks', title: 'цепочки вызовов', note: 'Сюжет: цепочки вызовов.' }
  ],
  algorithms: [
    { id: 'routes', title: 'маршруты доставки', note: 'Сюжет: маршруты доставки.' },
    { id: 'intervals', title: 'интервалы времени', note: 'Сюжет: интервалы времени.' },
    { id: 'queues', title: 'очереди задач', note: 'Сюжет: очереди задач.' },
    { id: 'graphs', title: 'сети связей', note: 'Сюжет: сети связей.' }
  ],
  default: [
    { id: 'records', title: 'набор записей', note: 'Сюжет: набор записей.' },
    { id: 'metrics', title: 'метрики сервиса', note: 'Сюжет: метрики сервиса.' },
    { id: 'timeline', title: 'последовательность событий', note: 'Сюжет: последовательность событий.' },
    { id: 'dataset', title: 'рабочий набор данных', note: 'Сюжет: рабочий набор данных.' }
  ]
};

const ANSWER_FORMAT_POOLS = {
  number: [
    { id: 'number', label: 'число', note: 'Ожидаемый формат ответа: число.' },
    { id: 'scalar', label: 'одно значение', note: 'Ожидаемый формат ответа: одно значение.' },
    { id: 'integer', label: 'целое число', note: 'Ожидаемый формат ответа: целое число.' }
  ],
  boolean: [
    { id: 'boolean', label: 'логическое значение', note: 'Ожидаемый формат ответа: логическое значение.' },
    { id: 'flag', label: 'true/false', note: 'Ожидаемый формат ответа: true/false.' }
  ],
  text: [
    { id: 'text', label: 'строка', note: 'Ожидаемый формат ответа: строка.' },
    { id: 'normalized-text', label: 'нормализованная строка', note: 'Ожидаемый формат ответа: нормализованная строка.' },
    { id: 'summary-text', label: 'краткий текст', note: 'Ожидаемый формат ответа: краткий текст.' }
  ],
  array: [
    { id: 'array', label: 'массив', note: 'Ожидаемый формат ответа: массив.' },
    { id: 'sequence', label: 'последовательность', note: 'Ожидаемый формат ответа: последовательность.' },
    { id: 'list', label: 'список', note: 'Ожидаемый формат ответа: список.' }
  ],
  collection: [
    { id: 'collection', label: 'коллекция', note: 'Ожидаемый формат ответа: коллекция.' },
    { id: 'set', label: 'набор', note: 'Ожидаемый формат ответа: набор.' },
    { id: 'list', label: 'список', note: 'Ожидаемый формат ответа: список.' }
  ],
  object: [
    { id: 'object', label: 'объект', note: 'Ожидаемый формат ответа: объект.' },
    { id: 'summary', label: 'сводка', note: 'Ожидаемый формат ответа: сводка.' },
    { id: 'map', label: 'карта', note: 'Ожидаемый формат ответа: карта.' }
  ],
  void: [
    { id: 'void', label: 'без возврата', note: 'Ожидаемый формат ответа: без возврата значения.' }
  ]
};

const THINKING_STYLE_POOLS = {
  arrays: [
    { id: 'one-pass', label: 'однопроходный', note: 'Подход: решай в один проход.' },
    { id: 'window', label: 'оконный', note: 'Подход: используй скользящее окно.' },
    { id: 'partition', label: 'разделяющий', note: 'Подход: раздели данные на части и собери ответ.' }
  ],
  strings: [
    { id: 'normalize-first', label: 'с нормализацией', note: 'Подход: сначала нормализуй строку.' },
    { id: 'scan-build', label: 'сканирующий', note: 'Подход: проходи строку слева направо и строй ответ.' },
    { id: 'compare-pass', label: 'сравнивающий', note: 'Подход: сравнивай фрагменты на лету.' }
  ],
  collections: [
    { id: 'lookup-driven', label: 'по словарю', note: 'Подход: опирайся на Map, Set или словарь.' },
    { id: 'group-and-map', label: 'группирующий', note: 'Подход: сначала сгруппируй, потом собери ответ.' },
    { id: 'stable-pass', label: 'стабильный проход', note: 'Подход: сохрани стабильный порядок.' }
  ],
  recursion: [
    { id: 'recursive', label: 'рекурсивный', note: 'Подход: используй рекурсию.' },
    { id: 'memoized', label: 'с кэшем', note: 'Подход: добавь memoization там, где нужно.' },
    { id: 'divide-and-conquer', label: 'разделяй и властвуй', note: 'Подход: дели задачу на подзадачи.' }
  ],
  algorithms: [
    { id: 'two-pointers', label: 'двухуказательный', note: 'Подход: попробуй два указателя.' },
    { id: 'sliding-window', label: 'окно', note: 'Подход: используй скользящее окно.' },
    { id: 'binary-search', label: 'бинарный поиск', note: 'Подход: проверь, можно ли ускорить через бинарный поиск.' }
  ],
  default: [
    { id: 'direct', label: 'прямой', note: 'Подход: решай задачу напрямую.' },
    { id: 'two-stage', label: 'двухэтапный', note: 'Подход: сначала подготовка, потом финальный шаг.' },
    { id: 'stateful', label: 'с состоянием', note: 'Подход: сохрани промежуточное состояние.' }
  ]
};

const STRUCTURE_POOLS = {
  single: [
    { id: 'single', label: 'один вход', note: 'Структура: один входной параметр.' },
    { id: 'single-options', label: 'один вход + настройки', note: 'Структура: основной вход и вспомогательные настройки.' },
    { id: 'single-stream', label: 'линейный вход', note: 'Структура: линейный поток данных.' }
  ],
  pair: [
    { id: 'pair', label: 'пара входов', note: 'Структура: два связанных входа.' },
    { id: 'pair-options', label: 'данные + настройки', note: 'Структура: данные и отдельные параметры.' },
    { id: 'pair-compare', label: 'сравнение двух значений', note: 'Структура: сравни две части входа.' }
  ],
  multi: [
    { id: 'multi', label: 'несколько входов', note: 'Структура: несколько аргументов.' },
    { id: 'multi-bundle', label: 'пакет входов', note: 'Структура: собери ответ из набора входов.' },
    { id: 'multi-stage', label: 'многоэтапный вход', note: 'Структура: обработай данные по этапам.' }
  ],
  default: [
    { id: 'single', label: 'один вход', note: 'Структура: один входной параметр.' },
    { id: 'pair', label: 'пара входов', note: 'Структура: два связанных входа.' },
    { id: 'multi', label: 'несколько входов', note: 'Структура: несколько аргументов.' }
  ]
};

const CONSTRAINT_POOLS = {
  arrays: [
    { id: 'no-mutation', label: 'без мутации', note: 'Ограничение: не мутируй входные данные.' },
    { id: 'one-pass', label: 'один проход', note: 'Ограничение: реши за один проход.' },
    { id: 'preserve-order', label: 'с сохранением порядка', note: 'Ограничение: сохрани порядок элементов.' }
  ],
  strings: [
    { id: 'trim-input', label: 'trim входа', note: 'Ограничение: убери лишние пробелы.' },
    { id: 'case-insensitive', label: 'без учёта регистра', note: 'Ограничение: сравнивай без учёта регистра.' },
    { id: 'preserve-separators', label: 'с разделителями', note: 'Ограничение: не теряй разделители.' }
  ],
  collections: [
    { id: 'stable-order', label: 'стабильный порядок', note: 'Ограничение: сохрани порядок первого появления.' },
    { id: 'dedupe', label: 'без дублей', note: 'Ограничение: убери дубликаты.' },
    { id: 'no-extra-sort', label: 'без лишней сортировки', note: 'Ограничение: не сортируй там, где это не нужно.' }
  ],
  recursion: [
    { id: 'use-recursion', label: 'рекурсия', note: 'Ограничение: используй рекурсию.' },
    { id: 'no-loops', label: 'без циклов', note: 'Ограничение: не используй циклы.' },
    { id: 'memoize', label: 'memoization', note: 'Ограничение: добавь кэширование.' }
  ],
  algorithms: [
    { id: 'optimize-time', label: 'по времени', note: 'Ограничение: уложись в оптимальную сложность.' },
    { id: 'window', label: 'скользящее окно', note: 'Ограничение: применяй окно там, где оно уместно.' },
    { id: 'two-pointers', label: 'два указателя', note: 'Ограничение: попробуй два указателя.' }
  ],
  default: [
    { id: 'no-mutation', label: 'без мутации', note: 'Ограничение: не мутируй входные данные.' },
    { id: 'one-pass', label: 'один проход', note: 'Ограничение: реши за один проход.' },
    { id: 'stable-order', label: 'с сохранением порядка', note: 'Ограничение: сохрани порядок элементов.' }
  ]
};

function normalizeTextList(values) {
  return unique(
    (Array.isArray(values) ? values : [])
      .map((value) => (value === null || value === undefined ? '' : String(value).trim()))
      .filter(Boolean)
  );
}

function joinPromptParts(basePrompt, notes) {
  const parts = [String(basePrompt || '').trim(), ...normalizeTextList(notes)];
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function normalizeVariantPool(pool) {
  return (Array.isArray(pool) ? pool : [])
    .map((item, index) => {
      if (item && typeof item === 'object') {
        const id = String(item.id || item.key || item.type || item.label || item.title || index);
        const label = String(item.label || item.title || item.name || id);
        return {
          ...item,
          id,
          label,
          title: String(item.title || label),
          note: item.note ? String(item.note).trim() : ''
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

function pickVariantByKey(key, variants, fallback = null) {
  const pool = normalizeVariantPool(variants);
  if (pool.length === 0) {
    return fallback;
  }

  const index = hashString(String(key || 'variant')) % pool.length;
  return pool[index] || fallback;
}

function pickVariantsByKey(key, variants, count = 1) {
  const pool = normalizeVariantPool(variants);
  if (pool.length === 0 || count <= 0) {
    return [];
  }

  const limit = Math.min(pool.length, Math.max(1, Number(count) || 1));
  const selected = [];
  let cursor = String(key || 'variant');
  let attempt = 0;

  while (selected.length < limit && attempt < pool.length * 4) {
    const choice = pickVariantByKey(`${cursor}:${attempt}`, pool, pool[0]);
    attempt += 1;
    if (!choice) {
      continue;
    }
    if (!selected.some((item) => item.id === choice.id)) {
      selected.push(choice);
    }
    cursor = `${cursor}:${choice.id}`;
  }

  return selected;
}

function extractVariationFields(source = {}) {
  const meta = source && typeof source.meta === 'object' ? source.meta : {};
  const sourceConstraints = Array.isArray(source.constraints)
    ? source.constraints
    : source.constraints
      ? [source.constraints]
      : meta.constraints;
  const sourceVariationNotes = Array.isArray(source.variationNotes)
    ? source.variationNotes
    : source.variationNotes
      ? [source.variationNotes]
      : meta.variationNotes;
  return {
    family: source.family || meta.family || '',
    logicType: source.logicType || meta.logicType || '',
    structureType: source.structureType || meta.structureType || '',
    answerFormat: source.answerFormat || meta.answerFormat || '',
    thinkingStyle: source.thinkingStyle || meta.thinkingStyle || '',
    contextType: source.contextType || meta.contextType || '',
    contextTitle: source.contextTitle || meta.contextTitle || '',
    contextSubject: source.contextSubject || meta.contextSubject || '',
    constraints: normalizeTextList(sourceConstraints),
    variationNotes: normalizeTextList(sourceVariationNotes),
    variantId: source.variantId || meta.variantId || ''
  };
}

function inferReturnGroup(returnType = '') {
  const normalized = String(returnType || '').trim().toLowerCase();
  if (!normalized) {
    return 'number';
  }
  if (normalized.includes('void')) {
    return 'void';
  }
  if (normalized.includes('bool')) {
    return 'boolean';
  }
  if (normalized.includes('string') || normalized.includes('charsequence')) {
    return 'text';
  }
  if (normalized.includes('map') || normalized.includes('dictionary') || normalized.includes('hashmap') || normalized.includes('treemap')) {
    return 'object';
  }
  if (
    normalized.includes('[]') ||
    normalized.includes('array') ||
    normalized.includes('list<') ||
    normalized.includes('arraylist') ||
    normalized.includes('linkedlist') ||
    normalized.includes('deque') ||
    normalized.includes('queue') ||
    normalized.includes('stack')
  ) {
    return normalized.includes('list') || normalized.includes('set') || normalized.includes('collection') ? 'collection' : 'array';
  }
  if (normalized.includes('set') || normalized.includes('collection') || normalized.includes('iterable')) {
    return 'collection';
  }
  return 'number';
}

function inferStructureGroup(spec = {}) {
  if (typeof spec.structureType === 'string' && spec.structureType.trim()) {
    return spec.structureType.trim();
  }

  const argCount = Array.isArray(spec.argTypes) ? spec.argTypes.length : 0;
  if (argCount <= 1) {
    return 'single';
  }
  if (argCount === 2) {
    return 'pair';
  }
  return 'multi';
}

function getContextPool(category, overridePool) {
  if (Array.isArray(overridePool) && overridePool.length > 0) {
    return overridePool;
  }
  return CONTEXT_POOLS[category] || CONTEXT_POOLS.default;
}

function getAnswerPool(spec, returnGroup) {
  if (Array.isArray(spec.answerFormats) && spec.answerFormats.length > 0) {
    return spec.answerFormats;
  }
  return ANSWER_FORMAT_POOLS[returnGroup] || ANSWER_FORMAT_POOLS.number;
}

function getThinkingPool(spec, key) {
  if (Array.isArray(spec.thinkingStyles) && spec.thinkingStyles.length > 0) {
    return spec.thinkingStyles;
  }
  return THINKING_STYLE_POOLS[key] || THINKING_STYLE_POOLS.default;
}

function getStructurePool(spec, key) {
  if (Array.isArray(spec.structures) && spec.structures.length > 0) {
    return spec.structures;
  }
  return STRUCTURE_POOLS[key] || STRUCTURE_POOLS.default;
}

function getConstraintPool(spec, key) {
  if (Array.isArray(spec.constraintsPool) && spec.constraintsPool.length > 0) {
    return spec.constraintsPool;
  }
  return CONSTRAINT_POOLS[key] || CONSTRAINT_POOLS.default;
}

function buildVariationProfile(spec = {}) {
  const kernelId = String(spec.kernelId || 'task');
  const category = String(spec.category || 'general').trim() || 'general';
  const difficulty = String(spec.difficulty || 'easy').trim() || 'easy';
  const title = String(spec.title || '').trim();
  const prompt = String(spec.prompt || '').trim();
  const signature = String(spec.signature || '').trim();
  const strategy = String(spec.strategy || spec.logicType || category || 'simple').trim() || 'simple';
  const family = String(spec.family || spec.logicType || strategy || category).trim() || category;
  const logicType = String(spec.logicType || family).trim() || family;
  const baseSeed = spec.seed !== undefined && spec.seed !== null
    ? String(spec.seed)
    : [kernelId, category, difficulty, title, signature, strategy].join('::');

  const contextPool = getContextPool(category, spec.contexts);
  const context = spec.context && typeof spec.context === 'object'
    ? normalizeVariantPool([spec.context])[0] || normalizeVariantPool(contextPool)[0]
    : pickVariantByKey(`${baseSeed}:context`, contextPool, normalizeVariantPool(contextPool)[0]);

  const returnGroup = inferReturnGroup(spec.returnType || spec.signature || '');
  const answerPool = getAnswerPool(spec, returnGroup);
  const answerFormatVariant = typeof spec.answerFormat === 'string' && spec.answerFormat.trim()
    ? { id: spec.answerFormat.trim(), label: String(spec.answerFormatLabel || spec.answerFormat).trim(), note: '' }
    : pickVariantByKey(`${baseSeed}:answer`, answerPool, normalizeVariantPool(answerPool)[0]);

  const thinkingPoolKey = String(spec.thinkingStyle || strategy || category).trim() || 'default';
  const thinkingPool = getThinkingPool(spec, thinkingPoolKey);
  const thinkingStyleVariant = typeof spec.thinkingStyle === 'string' && spec.thinkingStyle.trim()
    ? { id: spec.thinkingStyle.trim(), label: String(spec.thinkingStyleLabel || spec.thinkingStyle).trim(), note: '' }
    : pickVariantByKey(`${baseSeed}:thinking`, thinkingPool, normalizeVariantPool(thinkingPool)[0]);

  const structureKey = inferStructureGroup({
    structureType: spec.structureType,
    argTypes: spec.argTypes
  });
  const structurePool = getStructurePool(spec, structureKey);
  const structureVariant = typeof spec.structureType === 'string' && spec.structureType.trim()
    ? { id: spec.structureType.trim(), label: String(spec.structureLabel || spec.structureType).trim(), note: '' }
    : pickVariantByKey(`${baseSeed}:structure`, structurePool, normalizeVariantPool(structurePool)[0]);

  const constraintPool = getConstraintPool(spec, strategy);
  const autoConstraintCount = difficulty === 'hard' || difficulty === 'expert' ? 2 : 1;
  const constraintVariants = pickVariantsByKey(`${baseSeed}:constraints`, constraintPool, autoConstraintCount);
  const explicitConstraints = normalizeTextList(spec.constraints);
  const constraints = unique([
    ...explicitConstraints,
    ...constraintVariants.map((constraint) => constraint.id).filter(Boolean)
  ]);

  const variationNotes = normalizeTextList([
    ...(Array.isArray(spec.variationNotes) ? spec.variationNotes : []),
    context && context.note ? context.note : `Сюжет: ${context && context.title ? context.title : category}.`,
    answerFormatVariant && answerFormatVariant.note ? answerFormatVariant.note : `Ожидаемый формат ответа: ${answerFormatVariant && answerFormatVariant.label ? answerFormatVariant.label : returnGroup}.`,
    thinkingStyleVariant && thinkingStyleVariant.note ? thinkingStyleVariant.note : `Подход: ${thinkingStyleVariant && thinkingStyleVariant.label ? thinkingStyleVariant.label : strategy}.`,
    structureVariant && structureVariant.note ? structureVariant.note : `Структура решения: ${structureVariant && structureVariant.label ? structureVariant.label : structureKey}.`,
    ...constraintVariants.map((constraint) => constraint.note).filter(Boolean)
  ]);

  const promptNotes = normalizeTextList([
    ...variationNotes,
    ...(Array.isArray(spec.notes) ? spec.notes : [])
  ]);
  const finalPrompt = joinPromptParts(prompt, promptNotes);
  const variantId = String(spec.variantId || `${kernelId}-${category}-${hashString([
    baseSeed,
    context ? context.id : 'context',
    answerFormatVariant ? answerFormatVariant.id : 'answer',
    thinkingStyleVariant ? thinkingStyleVariant.id : 'thinking',
    structureVariant ? structureVariant.id : 'structure',
    constraints.join('|')
  ].join('::'))}`);
  const seed = spec.seed !== undefined && spec.seed !== null ? String(spec.seed) : variantId;

  const tags = unique([
    ...normalizeTextList(spec.tags),
    category,
    family,
    logicType,
    structureVariant ? structureVariant.id : structureKey,
    answerFormatVariant ? answerFormatVariant.id : returnGroup,
    thinkingStyleVariant ? thinkingStyleVariant.id : strategy,
    context ? context.id : category,
    ...constraints
  ]);

  return {
    seed,
    variantId,
    family,
    logicType,
    structureType: structureVariant ? structureVariant.id : structureKey,
    structureLabel: structureVariant ? structureVariant.label : structureKey,
    answerFormat: answerFormatVariant ? answerFormatVariant.id : returnGroup,
    answerFormatLabel: answerFormatVariant ? answerFormatVariant.label : returnGroup,
    thinkingStyle: thinkingStyleVariant ? thinkingStyleVariant.id : strategy,
    thinkingStyleLabel: thinkingStyleVariant ? thinkingStyleVariant.label : strategy,
    contextType: context ? context.id : category,
    contextTitle: context ? context.title : category,
    contextSubject: context ? context.title : category,
    constraints,
    variationNotes,
    prompt: finalPrompt,
    tags,
    meta: {
      family,
      logicType,
      structureType: structureVariant ? structureVariant.id : structureKey,
      structureLabel: structureVariant ? structureVariant.label : structureKey,
      answerFormat: answerFormatVariant ? answerFormatVariant.id : returnGroup,
      answerFormatLabel: answerFormatVariant ? answerFormatVariant.label : returnGroup,
      thinkingStyle: thinkingStyleVariant ? thinkingStyleVariant.id : strategy,
      thinkingStyleLabel: thinkingStyleVariant ? thinkingStyleVariant.label : strategy,
      contextType: context ? context.id : category,
      contextTitle: context ? context.title : category,
      contextSubject: context ? context.title : category,
      constraints,
      variationNotes,
      variantId: variantId
    }
  };
}

module.exports = {
  normalizeTextList,
  joinPromptParts,
  pickVariantByKey,
  pickVariantsByKey,
  extractVariationFields,
  buildVariationProfile
};
