const {
  pickVariant,
  preview,
  sampleName,
  sampleCity,
  sampleWords,
  sampleEmail,
  sampleText,
  capitalize,
  cloneJson,
  unique
} = require('../engine/taskShared');
const { buildVariantTask, pickVariantByKey } = require('../engine/variantTaskBuilder');

const CATEGORY = 'objects';

const DIFFICULTY_PROFILE = {
  easy: { minScore: 10, maxScore: 60, minDepth: 1, fieldCount: 4 },
  medium: { minScore: 20, maxScore: 100, minDepth: 2, fieldCount: 5 },
  hard: { minScore: 30, maxScore: 160, minDepth: 3, fieldCount: 6 },
  expert: { minScore: 40, maxScore: 240, minDepth: 3, fieldCount: 7 }
};

const FAMILY_WEIGHTS = {
  easy: [
    { value: 'pick', weight: 5 },
    { value: 'defaults', weight: 4 },
    { value: 'rename', weight: 3 },
    { value: 'merge', weight: 1 },
    { value: 'flatten', weight: 1 }
  ],
  medium: [
    { value: 'pick', weight: 3 },
    { value: 'defaults', weight: 3 },
    { value: 'rename', weight: 2 },
    { value: 'merge', weight: 4 },
    { value: 'flatten', weight: 3 }
  ],
  hard: [
    { value: 'pick', weight: 1 },
    { value: 'defaults', weight: 2 },
    { value: 'rename', weight: 2 },
    { value: 'merge', weight: 5 },
    { value: 'flatten', weight: 5 }
  ],
  expert: [
    { value: 'pick', weight: 1 },
    { value: 'defaults', weight: 1 },
    { value: 'rename', weight: 1 },
    { value: 'merge', weight: 5 },
    { value: 'flatten', weight: 6 }
  ]
};

const STRUCTURE_WEIGHTS = {
  easy: {
    pick: [
      { value: 'object', weight: 6 },
      { value: 'summary', weight: 2 },
      { value: 'options', weight: 2 },
      { value: 'callback', weight: 1 }
    ],
    defaults: [
      { value: 'object', weight: 6 },
      { value: 'summary', weight: 2 },
      { value: 'options', weight: 2 },
      { value: 'callback', weight: 1 }
    ],
    rename: [
      { value: 'object', weight: 5 },
      { value: 'entries', weight: 3 },
      { value: 'options', weight: 2 },
      { value: 'callback', weight: 1 }
    ],
    merge: [
      { value: 'object', weight: 5 },
      { value: 'summary', weight: 2 },
      { value: 'options', weight: 2 },
      { value: 'callback', weight: 1 }
    ],
    flatten: [
      { value: 'object', weight: 5 },
      { value: 'entries', weight: 3 },
      { value: 'summary', weight: 2 },
      { value: 'callback', weight: 1 }
    ]
  },
  medium: {
    pick: [
      { value: 'object', weight: 4 },
      { value: 'summary', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 2 }
    ],
    defaults: [
      { value: 'object', weight: 4 },
      { value: 'summary', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 2 }
    ],
    rename: [
      { value: 'object', weight: 4 },
      { value: 'entries', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 2 }
    ],
    merge: [
      { value: 'object', weight: 4 },
      { value: 'summary', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 2 }
    ],
    flatten: [
      { value: 'object', weight: 4 },
      { value: 'entries', weight: 3 },
      { value: 'summary', weight: 3 },
      { value: 'callback', weight: 2 }
    ]
  },
  hard: {
    pick: [
      { value: 'object', weight: 3 },
      { value: 'summary', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 3 }
    ],
    defaults: [
      { value: 'object', weight: 3 },
      { value: 'summary', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 3 }
    ],
    rename: [
      { value: 'object', weight: 3 },
      { value: 'entries', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 3 }
    ],
    merge: [
      { value: 'object', weight: 4 },
      { value: 'summary', weight: 4 },
      { value: 'options', weight: 2 },
      { value: 'callback', weight: 2 }
    ],
    flatten: [
      { value: 'object', weight: 4 },
      { value: 'entries', weight: 4 },
      { value: 'summary', weight: 2 },
      { value: 'callback', weight: 2 }
    ]
  },
  expert: {
    pick: [
      { value: 'object', weight: 2 },
      { value: 'summary', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 4 }
    ],
    defaults: [
      { value: 'object', weight: 2 },
      { value: 'summary', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 4 }
    ],
    rename: [
      { value: 'object', weight: 2 },
      { value: 'entries', weight: 3 },
      { value: 'options', weight: 3 },
      { value: 'callback', weight: 4 }
    ],
    merge: [
      { value: 'object', weight: 4 },
      { value: 'summary', weight: 4 },
      { value: 'options', weight: 2 },
      { value: 'callback', weight: 2 }
    ],
    flatten: [
      { value: 'object', weight: 4 },
      { value: 'entries', weight: 4 },
      { value: 'summary', weight: 2 },
      { value: 'callback', weight: 2 }
    ]
  }
};

const CONSTRAINT_TEXT = {
  'one-pass': 'Сделай за один проход.',
  'no-mutation': 'Не мутируй входные данные.',
  'object-result': 'Верни объект.',
  'options-api': 'Используй options как часть API.',
  'callback': 'Верни результат через callback.',
  'preserve-order': 'Сохрани порядок ключей.',
  'recursive': 'Используй рекурсию для вложенных структур.',
  'deep-merge': 'Сливай вложенные объекты глубоко.'
};

const PROMPTS = {
  pick: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Дан объект ${dataPreview}. Это ${context.title}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `У тебя есть карточка ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Реализуй выбор полей для ${context.title}. На входе ${dataPreview}. ${goal} ${constraintsText}`
  ],
  defaults: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Даны user и defaults для ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `У тебя есть объект ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Заполни пропуски в ${context.title}. Входные данные: ${dataPreview}. ${goal} ${constraintsText}`
  ],
  rename: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Дан источник для ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Переименуй поля в ${context.title}. На входе ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Собери новый объект для ${context.title}. Данные: ${dataPreview}. ${goal} ${constraintsText}`
  ],
  merge: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Даны base и patch для ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Глубоко обнови ${context.title}. На входе ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Слей объекты для ${context.title}. Данные: ${dataPreview}. ${goal} ${constraintsText}`
  ],
  flatten: [
    ({ context, dataPreview, goal, constraintsText }) =>
      `Дано вложенное дерево для ${context.title}: ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Сделай ${context.title} плоским. На входе ${dataPreview}. ${goal} ${constraintsText}`,
    ({ context, dataPreview, goal, constraintsText }) =>
      `Разверни объект ${context.title} в карту путей. Вход: ${dataPreview}. ${goal} ${constraintsText}`
  ]
};

const TITLES = {
  pick: [
    ({ context }) => `Выбор полей: ${context.title}`,
    ({ context }) => `Срез объекта: ${context.title}`,
    ({ context }) => `Карточка без лишнего: ${context.title}`
  ],
  defaults: [
    ({ context }) => `Значения по умолчанию: ${context.title}`,
    ({ context }) => `Заполнение пропусков: ${context.title}`,
    ({ context }) => `Сборка объекта: ${context.title}`
  ],
  rename: [
    ({ context }) => `Переименование полей: ${context.title}`,
    ({ context }) => `Новая схема: ${context.title}`,
    ({ context }) => `Смена ключей: ${context.title}`
  ],
  merge: [
    ({ context }) => `Глубокое слияние: ${context.title}`,
    ({ context }) => `Патч объекта: ${context.title}`,
    ({ context }) => `Обновление структуры: ${context.title}`
  ],
  flatten: [
    ({ context }) => `Плоская карта: ${context.title}`,
    ({ context }) => `Пути объекта: ${context.title}`,
    ({ context }) => `Сведение в один уровень: ${context.title}`
  ]
};

const CONTEXTS = {
  pick: [
    { id: 'profile', title: 'профиля пользователя' },
    { id: 'account', title: 'аккаунта клиента' },
    { id: 'device', title: 'устройства' },
    { id: 'ticket', title: 'заявки' }
  ],
  defaults: [
    { id: 'settings', title: 'настроек' },
    { id: 'profile', title: 'профиля' },
    { id: 'product', title: 'карточки товара' },
    { id: 'preferences', title: 'предпочтений' }
  ],
  rename: [
    { id: 'contact', title: 'контактов' },
    { id: 'record', title: 'записи' },
    { id: 'card', title: 'карточки' },
    { id: 'payload', title: 'payload' }
  ],
  merge: [
    { id: 'profile', title: 'профиля' },
    { id: 'config', title: 'конфига' },
    { id: 'project', title: 'проекта' },
    { id: 'workspace', title: 'рабочей области' }
  ],
  flatten: [
    { id: 'tree', title: 'дерева настроек' },
    { id: 'dashboard', title: 'панели метрик' },
    { id: 'catalog', title: 'каталога' },
    { id: 'document', title: 'документа' }
  ]
};

const GOALS = {
  pick: {
    object: 'Верни новый объект только с указанными полями.',
    summary: 'Верни объект { selected, count }.',
    options: 'Используй options.keys и верни новый объект.',
    callback: 'Передай выбранный объект в done(...).'
  },
  defaults: {
    object: 'Верни новый объект, где пропуски заполнены из defaults.',
    summary: 'Верни объект { merged, filled }.',
    options: 'Используй options.defaults и верни объединённый объект.',
    callback: 'Передай объединённый объект в done(...).'
  },
  rename: {
    object: 'Верни объект с переименованными ключами.',
    entries: 'Верни массив пар [key, value] в стабильном порядке.',
    options: 'Используй options.mapping и верни новый объект.',
    callback: 'Передай объект с новыми ключами в done(...).'
  },
  merge: {
    object: 'Верни глубоко объединённый объект.',
    summary: 'Верни объект { merged, changes }.',
    options: 'Используй options.patch и верни объединённый объект.',
    callback: 'Передай результат слияния в done(...).'
  },
  flatten: {
    object: 'Верни плоский объект с путями через точку.',
    entries: 'Верни массив пар [path, value].',
    summary: 'Верни объект { flat, count }.',
    callback: 'Передай плоский объект в done(...).'
  }
};

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pickDifficultyProfile(difficulty) {
  return DIFFICULTY_PROFILE[difficulty] || DIFFICULTY_PROFILE.easy;
}

function normalizeConstraints(constraints = []) {
  return Array.from(new Set(constraints.map((item) => String(item)).filter(Boolean))).sort();
}

function renderConstraints(constraints = []) {
  return normalizeConstraints(constraints)
    .map((key) => CONSTRAINT_TEXT[key])
    .filter(Boolean)
    .join(' ');
}

function makeVariantId(logicType, structureType, contextType, rng) {
  return `${CATEGORY}-${logicType}-${structureType}-${contextType}-${rng.int(0, 100000)}`;
}

function pickFamily(rng, difficulty) {
  return rng.weighted(FAMILY_WEIGHTS[difficulty] || FAMILY_WEIGHTS.easy) || 'pick';
}

function pickStructure(rng, difficulty, logicType) {
  const profile = STRUCTURE_WEIGHTS[difficulty] && STRUCTURE_WEIGHTS[difficulty][logicType];
  return rng.weighted(profile || []) || 'object';
}

function createTask(parts) {
  const context = parts.context || { id: parts.contextType || 'general', title: parts.contextTitle || 'значений' };
  const logicType = parts.logicType || parts.family || 'general';
  const structureType = parts.structureType || 'object';
  const variantId = parts.variantId || `${CATEGORY}-${parts.family || logicType}-${logicType}-${structureType}-${context.id}`;

  return buildVariantTask({
    category: CATEGORY,
    difficulty: parts.difficulty,
    seed: variantId,
    title: parts.title,
    prompt: parts.prompt,
    signature: parts.signature,
    starterBody: parts.starterBody,
    solutionBody: parts.solutionBody,
    hints: parts.hints,
    explanation: parts.explanation,
    tests: parts.tests,
    strategy: 'simple',
    context,
    family: parts.family || logicType,
    logicType,
    structureType,
    tags: parts.tags || [],
    meta: {
      ...(parts.meta || {}),
      family: parts.family || logicType,
      logicType,
      structureType,
      contextType: context.id,
      constraints: normalizeConstraints(parts.constraints),
      variantId
    }
  });
}

function makeTitle(rng, logicType, details) {
  return pickVariant(rng, TITLES[logicType])(details);
}

function makePrompt(rng, logicType, details) {
  return pickVariant(rng, PROMPTS[logicType])(details);
}

function pickFields(source, keys) {
  const result = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = source[key];
    }
  }
  return result;
}

function renameFields(source, mapping) {
  const result = {};
  for (const [targetKey, sourceKey] of Object.entries(mapping)) {
    result[targetKey] = source[sourceKey];
  }
  return result;
}

function deepMerge(left, right) {
  const result = Array.isArray(left) ? left.slice() : { ...left };
  for (const [key, value] of Object.entries(right)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = Array.isArray(value) ? cloneJson(value) : value;
    }
  }
  return result;
}

function flattenObject(value, path = '', out = {}) {
  for (const [key, child] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (isPlainObject(child)) {
      flattenObject(child, nextPath, out);
    } else {
      out[nextPath] = child;
    }
  }
  return out;
}

function countLeaves(value) {
  if (Array.isArray(value)) {
    return 1;
  }
  if (isPlainObject(value)) {
    return Object.values(value).reduce((acc, child) => acc + countLeaves(child), 0);
  }
  return 1;
}

function countMissingLeaves(user, defaults) {
  if (!isPlainObject(defaults)) {
    return 0;
  }

  let total = 0;
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const hasValue = user && Object.prototype.hasOwnProperty.call(user, key) && user[key] !== undefined && user[key] !== null;
    if (!hasValue) {
      total += countLeaves(defaultValue);
      continue;
    }
    total += countMissingLeaves(user[key], defaultValue);
  }
  return total;
}

function buildIdentityCard(rng, profile, context) {
  const name = sampleName(rng);
  const card = {
    name,
    city: sampleCity(rng),
    role: rng.pick(['developer', 'designer', 'analyst', 'tester']),
    active: rng.bool(),
    email: sampleEmail(rng, name),
    score: rng.int(profile.minScore, profile.maxScore),
    level: rng.int(1, 9)
  };

  if (context.id === 'account') {
    card.plan = rng.pick(['free', 'pro', 'team']);
  }

  if (context.id === 'ticket') {
    card.priority = rng.int(1, 5);
    card.status = rng.pick(['open', 'pending', 'closed']);
  }

  return card;
}

function buildDefaultsBundle(rng, profile, context) {
  if (profile.minDepth === 1) {
    const defaults = {
      name: sampleName(rng),
      city: sampleCity(rng),
      role: rng.pick(['developer', 'designer', 'analyst']),
      active: rng.bool(),
      plan: rng.pick(['free', 'pro', 'team'])
    };

    const user = {
      name: defaults.name,
      active: rng.bool()
    };

    return { defaults, user, expected: deepMerge(defaults, user), filled: countMissingLeaves(user, defaults) };
  }

  const defaults = {
    profile: {
      name: sampleName(rng),
      city: sampleCity(rng),
      role: rng.pick(['developer', 'designer', 'analyst']),
      email: sampleEmail(rng)
    },
    settings: {
      theme: rng.pick(['dark', 'light', 'solar']),
      locale: rng.pick(['en-US', 'ru-RU', 'de-DE']),
      notifications: {
        email: rng.bool(),
        push: rng.bool()
      }
    },
    limits: {
      daily: rng.int(10, 100),
      monthly: rng.int(100, 1000)
    }
  };

  const user = {
    profile: {
      name: defaults.profile.name
    },
    settings: {
      notifications: {
        push: rng.bool()
      }
    }
  };

  if (context.id === 'product') {
    defaults.catalog = {
      currency: rng.pick(['USD', 'EUR', 'RUB']),
      tax: rng.int(0, 25)
    };
    user.catalog = {
      currency: defaults.catalog.currency
    };
  }

  return { defaults, user, expected: deepMerge(defaults, user), filled: countMissingLeaves(user, defaults) };
}

function buildRenameBundle(rng, context, profile) {
  const source = {
    userName: sampleName(rng),
    userCity: sampleCity(rng),
    userEmail: sampleEmail(rng),
    userRole: rng.pick(['developer', 'designer', 'analyst', 'tester']),
    userScore: rng.int(profile.minScore, profile.maxScore)
  };

  if (context.id === 'payload') {
    source.createdAt = `2026-04-${rng.int(10, 19)}`;
  }

  const mapping = {
    name: 'userName',
    city: 'userCity',
    email: 'userEmail',
    role: 'userRole'
  };

  if (context.id === 'card') {
    mapping.score = 'userScore';
  }

  const expected = renameFields(source, mapping);
  return { source, mapping, expected };
}

function buildMergeBundle(rng, context, profile) {
  const base = {
    profile: {
      name: sampleName(rng),
      city: sampleCity(rng),
      role: rng.pick(['developer', 'designer', 'analyst']),
      active: rng.bool()
    },
    settings: {
      theme: rng.pick(['dark', 'light', 'solar']),
      locale: rng.pick(['en-US', 'ru-RU', 'de-DE']),
      notifications: {
        email: rng.bool(),
        push: rng.bool()
      }
    },
    stats: {
      score: rng.int(profile.minScore, profile.maxScore),
      streak: rng.int(1, 20)
    }
  };

  const patch = {
    profile: {
      city: sampleCity(rng),
      active: rng.bool()
    },
    settings: {
      notifications: {
        push: rng.bool()
      }
    },
    stats: {
      score: rng.int(profile.maxScore, profile.maxScore + 200)
    }
  };

  if (context.id === 'workspace') {
    base.workspace = {
      name: `${sampleWords(rng, 1)[0]}-${sampleText(rng, 3)}`,
      pinned: rng.bool()
    };
    patch.workspace = {
      pinned: true
    };
  }

  return {
    base,
    patch,
    expected: deepMerge(base, patch),
    changes: countLeaves(patch)
  };
}

function buildFlattenBundle(rng, context, profile) {
  const source = {
    profile: {
      name: sampleName(rng),
      city: sampleCity(rng),
      role: rng.pick(['developer', 'designer', 'analyst']),
      active: rng.bool()
    },
    settings: {
      theme: rng.pick(['dark', 'light', 'solar']),
      locale: rng.pick(['en-US', 'ru-RU', 'de-DE']),
      notifications: {
        email: rng.bool(),
        push: rng.bool()
      }
    },
    stats: {
      score: rng.int(profile.minScore, profile.maxScore),
      streak: rng.int(1, 20)
    },
    tags: sampleWords(rng, rng.int(2, 4))
  };

  if (context.id === 'catalog') {
    source.catalog = {
      name: sampleWords(rng, 2).join('-'),
      pricing: {
        currency: rng.pick(['USD', 'EUR', 'RUB']),
        amount: rng.int(10, 200)
      }
    };
  }

  const flat = flattenObject(source);
  const entries = Object.entries(flat).sort(([left], [right]) => left.localeCompare(right));
  return { source, flat, entries, count: entries.length };
}

function buildPickTask(difficulty, rng) {
  const profile = pickDifficultyProfile(difficulty);
  const context = pickVariant(rng, CONTEXTS.pick);
  const structureType = pickStructure(rng, difficulty, 'pick');
  const source = buildIdentityCard(rng, profile, context);
  const keys = unique(rng.sample(['name', 'city', 'role', 'active', 'email', 'score', 'level', 'plan', 'priority', 'status'], rng.int(2, 4)));
  const expected = pickFields(source, keys);
  const variantId = makeVariantId('pick', structureType, context.id, rng);
  const constraintsByStructure = {
    object: ['one-pass', 'no-mutation', 'object-result', 'preserve-order'],
    summary: ['one-pass', 'no-mutation', 'object-result', 'preserve-order'],
    options: ['one-pass', 'no-mutation', 'object-result', 'options-api'],
    callback: ['one-pass', 'no-mutation', 'callback']
  };

  const details = {
    context,
    dataPreview: preview(source),
    goal: GOALS.pick[structureType],
    constraintsText: renderConstraints(constraintsByStructure[structureType])
  };

  switch (structureType) {
    case 'object':
      return createTask({
        difficulty,
        logicType: 'pick',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'pick', { context, structureType }),
        prompt: makePrompt(rng, 'pick', details),
        signature: 'solve(source, keys)',
        starterBody: ['return source;'],
        solutionBody: [
          'const result = {};',
          'for (const key of keys) {',
          '  if (Object.prototype.hasOwnProperty.call(source, key)) {',
          '    result[key] = source[key];',
          '  }',
          '}',
          'return result;'
        ],
        hints: ['Собери новый объект и не меняй исходный.', 'Проверь наличие ключа через hasOwnProperty.'],
        explanation: `Выбор полей из ${context.title}.`,
        tests: [
          { args: [source, keys], expected },
          { args: [{ a: 1, b: 2, c: 3 }, ['a', 'c']], expected: { a: 1, c: 3 } }
        ],
        tags: ['pick', context.id, structureType]
      });

    case 'summary':
      return createTask({
        difficulty,
        logicType: 'pick',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'pick', { context, structureType }),
        prompt: makePrompt(rng, 'pick', details),
        signature: 'solve(source, keys)',
        starterBody: ['return { selected: {}, count: 0 };'],
        solutionBody: [
          'const selected = {};',
          'for (const key of keys) {',
          '  if (Object.prototype.hasOwnProperty.call(source, key)) {',
          '    selected[key] = source[key];',
          '  }',
          '}',
          'return { selected, count: Object.keys(selected).length };'
        ],
        hints: ['Верни и объект, и количество выбранных полей.', 'count можно получить через Object.keys(selected).length.'],
        explanation: `Сводка выбранных полей для ${context.title}.`,
        tests: [
          { args: [source, keys], expected: { selected: expected, count: Object.keys(expected).length } },
          { args: [{ name: 'Ada', city: 'Berlin', role: 'dev' }, ['name', 'role']], expected: { selected: { name: 'Ada', role: 'dev' }, count: 2 } }
        ],
        tags: ['pick', context.id, structureType]
      });

    case 'options':
      return createTask({
        difficulty,
        logicType: 'pick',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'pick', { context, structureType }),
        prompt: makePrompt(rng, 'pick', details),
        signature: 'solve(source, options)',
        starterBody: ['return source;'],
        solutionBody: [
          'const keys = Array.isArray(options && options.keys) ? options.keys : [];',
          'const result = {};',
          'for (const key of keys) {',
          '  if (Object.prototype.hasOwnProperty.call(source, key)) {',
          '    result[key] = source[key];',
          '  }',
          '}',
          'return result;'
        ],
        hints: ['Ключи приходят в options.keys.', 'Нужно вернуть только указанные поля.'],
        explanation: `API-версия для ${context.title}.`,
        tests: [
          { args: [source, { keys }], expected },
          { args: [{ name: 'Ada', city: 'Rome', active: true }, { keys: ['name', 'active'] }], expected: { name: 'Ada', active: true } }
        ],
        tags: ['pick', context.id, structureType]
      });

    case 'callback':
      return createTask({
        difficulty,
        logicType: 'pick',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'pick', { context, structureType }),
        prompt: makePrompt(rng, 'pick', details),
        signature: 'solve(source, keys, done)',
        starterBody: ['return source;'],
        solutionBody: [
          'const result = {};',
          'for (const key of keys) {',
          '  if (Object.prototype.hasOwnProperty.call(source, key)) {',
          '    result[key] = source[key];',
          '  }',
          '}',
          'done(result);',
          'return result;'
        ],
        hints: ['done должен получить уже собранный объект.', 'Возвращаемое значение можно оставить тем же объектом.'],
        explanation: `Callback-вариант для ${context.title}.`,
        tests: [
          {
            args: [source, keys, { __fn: 'record', key: 'done', returnValue: expected }],
            expected,
            expectCollected: { done: [expected] }
          },
          {
            args: [{ name: 'Ada', city: 'Rome', role: 'dev' }, ['name', 'city'], { __fn: 'record', key: 'done', returnValue: { name: 'Ada', city: 'Rome' } }],
            expected: { name: 'Ada', city: 'Rome' },
            expectCollected: { done: [{ name: 'Ada', city: 'Rome' }] }
          }
        ],
        tags: ['pick', context.id, structureType]
      });

    default:
      return buildPickTask('easy', rng);
  }
}

function buildDefaultsTask(difficulty, rng) {
  const profile = pickDifficultyProfile(difficulty);
  const context = pickVariant(rng, CONTEXTS.defaults);
  const structureType = pickStructure(rng, difficulty, 'defaults');
  const bundle = buildDefaultsBundle(rng, profile, context);
  const variantId = makeVariantId('defaults', structureType, context.id, rng);
  const constraintsByStructure = {
    object: ['no-mutation', 'object-result', 'deep-merge'],
    summary: ['no-mutation', 'object-result', 'deep-merge'],
    options: ['no-mutation', 'object-result', 'options-api', 'deep-merge'],
    callback: ['no-mutation', 'callback', 'deep-merge']
  };

  const details = {
    context,
    dataPreview: preview({ user: bundle.user, defaults: bundle.defaults }),
    goal: GOALS.defaults[structureType],
    constraintsText: renderConstraints(constraintsByStructure[structureType])
  };

  switch (structureType) {
    case 'object':
      return createTask({
        difficulty,
        logicType: 'defaults',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'defaults', { context, structureType }),
        prompt: makePrompt(rng, 'defaults', details),
        signature: 'solve(user, defaults)',
        starterBody: ['return user;'],
        solutionBody: ['return deepMerge(defaults, user);'],
        hints: ['Defaults должны лечь первыми.', 'Потом поверх них накладывай user.'],
        explanation: `Заполнение пропусков для ${context.title}.`,
        tests: [
          { args: [bundle.user, bundle.defaults], expected: bundle.expected },
          { args: [{ name: 'Ada' }, { name: 'Unknown', role: 'student' }], expected: { name: 'Ada', role: 'student' } }
        ],
        tags: ['defaults', context.id, structureType]
      });

    case 'summary':
      return createTask({
        difficulty,
        logicType: 'defaults',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'defaults', { context, structureType }),
        prompt: makePrompt(rng, 'defaults', details),
        signature: 'solve(user, defaults)',
        starterBody: ['return { merged: user, filled: 0 };'],
        solutionBody: [
          'const merged = deepMerge(defaults, user);',
          'let filled = 0;',
          'const countLeaves = (value) => {',
          '  if (Array.isArray(value)) {',
          '    return 1;',
          '  }',
          '  if (value && typeof value === "object") {',
          '    return Object.values(value).reduce((acc, child) => acc + countLeaves(child), 0);',
          '  }',
          '  return 1;',
          '};',
          'const countMissing = (current, fallback) => {',
          '  if (!fallback || typeof fallback !== "object" || Array.isArray(fallback)) {',
          '    return 0;',
          '  }',
          '  let total = 0;',
          '  for (const [key, value] of Object.entries(fallback)) {',
          '    const hasValue = current && Object.prototype.hasOwnProperty.call(current, key) && current[key] !== undefined && current[key] !== null;',
          '    if (!hasValue) {',
          '      total += countLeaves(value);',
          '      continue;',
          '    }',
          '    total += countMissing(current[key], value);',
          '  }',
          '  return total;',
          '};',
          'filled = countMissing(user, defaults);',
          'return { merged, filled };'
        ],
        hints: ['Сначала посчитай merged, потом filled.', 'filled показывает, сколько значений пришло из defaults.'],
        explanation: `Сводка для ${context.title}.`,
        tests: [
          { args: [bundle.user, bundle.defaults], expected: { merged: bundle.expected, filled: bundle.filled } },
          { args: [{ name: 'Ada' }, { name: 'Unknown', role: 'student' }], expected: { merged: { name: 'Ada', role: 'student' }, filled: 1 } }
        ],
        tags: ['defaults', context.id, structureType]
      });

    case 'options':
      return createTask({
        difficulty,
        logicType: 'defaults',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'defaults', { context, structureType }),
        prompt: makePrompt(rng, 'defaults', details),
        signature: 'solve(user, options)',
        starterBody: ['return user;'],
        solutionBody: [
          'const defaults = options && options.defaults ? options.defaults : {};',
          'return deepMerge(defaults, user);'
        ],
        hints: ['defaults приходят во втором аргументе.', 'Сначала defaults, потом user.'],
        explanation: `API с options для ${context.title}.`,
        tests: [
          { args: [bundle.user, { defaults: bundle.defaults }], expected: bundle.expected },
          { args: [{ theme: 'light' }, { defaults: { theme: 'dark', locale: 'ru-RU' } }], expected: { theme: 'light', locale: 'ru-RU' } }
        ],
        tags: ['defaults', context.id, structureType]
      });

    case 'callback':
      return createTask({
        difficulty,
        logicType: 'defaults',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'defaults', { context, structureType }),
        prompt: makePrompt(rng, 'defaults', details),
        signature: 'solve(user, defaults, done)',
        starterBody: ['return user;'],
        solutionBody: [
          'const result = deepMerge(defaults, user);',
          'done(result);',
          'return result;'
        ],
        hints: ['done должен получить итоговый объект.', 'Возвращай тот же результат из функции.'],
        explanation: `Callback-вариант для ${context.title}.`,
        tests: [
          {
            args: [bundle.user, bundle.defaults, { __fn: 'record', key: 'done', returnValue: bundle.expected }],
            expected: bundle.expected,
            expectCollected: { done: [bundle.expected] }
          },
          {
            args: [{ theme: 'light' }, { theme: 'dark', locale: 'ru-RU' }, { __fn: 'record', key: 'done', returnValue: { theme: 'light', locale: 'ru-RU' } }],
            expected: { theme: 'light', locale: 'ru-RU' },
            expectCollected: { done: [{ theme: 'light', locale: 'ru-RU' }] }
          }
        ],
        tags: ['defaults', context.id, structureType]
      });

    default:
      return buildDefaultsTask('easy', rng);
  }
}

function buildRenameTask(difficulty, rng) {
  const profile = pickDifficultyProfile(difficulty);
  const context = pickVariant(rng, CONTEXTS.rename);
  const structureType = pickStructure(rng, difficulty, 'rename');
  const bundle = buildRenameBundle(rng, context, profile);
  const variantId = makeVariantId('rename', structureType, context.id, rng);
  const constraintsByStructure = {
    object: ['no-mutation', 'object-result', 'preserve-order'],
    entries: ['no-mutation', 'object-result', 'preserve-order'],
    options: ['no-mutation', 'object-result', 'options-api'],
    callback: ['no-mutation', 'callback']
  };

  const details = {
    context,
    dataPreview: preview({ source: bundle.source, mapping: bundle.mapping }),
    goal: GOALS.rename[structureType],
    constraintsText: renderConstraints(constraintsByStructure[structureType])
  };

  switch (structureType) {
    case 'object':
      return createTask({
        difficulty,
        logicType: 'rename',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'rename', { context, structureType }),
        prompt: makePrompt(rng, 'rename', details),
        signature: 'solve(source, mapping)',
        starterBody: ['return source;'],
        solutionBody: [
          'const result = {};',
          'for (const [targetKey, sourceKey] of Object.entries(mapping)) {',
          '  result[targetKey] = source[sourceKey];',
          '}',
          'return result;'
        ],
        hints: ['Проверь пары target -> source.', 'Новый объект собирай по ключам mapping.'],
        explanation: `Переименование ключей для ${context.title}.`,
        tests: [
          { args: [bundle.source, bundle.mapping], expected: bundle.expected },
          { args: [{ first: 1, second: 2 }, { a: 'first', b: 'second' }], expected: { a: 1, b: 2 } }
        ],
        tags: ['rename', context.id, structureType]
      });

    case 'entries':
      return createTask({
        difficulty,
        logicType: 'rename',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'rename', { context, structureType }),
        prompt: makePrompt(rng, 'rename', details),
        signature: 'solve(source, mapping)',
        starterBody: ['return [];'],
        solutionBody: [
          'const result = [];',
          'for (const [targetKey, sourceKey] of Object.entries(mapping)) {',
          '  result.push([targetKey, source[sourceKey]]);',
          '}',
          'return result.sort(([left], [right]) => left.localeCompare(right));'
        ],
        hints: ['Сначала собери пары, потом отсортируй по targetKey.', 'Порядок должен быть стабильным.'],
        explanation: `Версия с entries для ${context.title}.`,
        tests: [
          { args: [bundle.source, bundle.mapping], expected: Object.entries(bundle.expected).sort(([left], [right]) => left.localeCompare(right)) },
          { args: [{ first: 1, second: 2 }, { a: 'first', b: 'second' }], expected: [['a', 1], ['b', 2]] }
        ],
        tags: ['rename', context.id, structureType]
      });

    case 'options':
      return createTask({
        difficulty,
        logicType: 'rename',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'rename', { context, structureType }),
        prompt: makePrompt(rng, 'rename', details),
        signature: 'solve(source, options)',
        starterBody: ['return source;'],
        solutionBody: [
          'const mapping = options && options.mapping ? options.mapping : {};',
          'const result = {};',
          'for (const [targetKey, sourceKey] of Object.entries(mapping)) {',
          '  result[targetKey] = source[sourceKey];',
          '}',
          'return result;'
        ],
        hints: ['mapping приходит в options.', 'Используй те же пары target -> source.'],
        explanation: `API-версия для ${context.title}.`,
        tests: [
          { args: [bundle.source, { mapping: bundle.mapping }], expected: bundle.expected },
          { args: [{ first: 1, second: 2 }, { mapping: { a: 'first', b: 'second' } }], expected: { a: 1, b: 2 } }
        ],
        tags: ['rename', context.id, structureType]
      });

    case 'callback':
      return createTask({
        difficulty,
        logicType: 'rename',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'rename', { context, structureType }),
        prompt: makePrompt(rng, 'rename', details),
        signature: 'solve(source, mapping, done)',
        starterBody: ['return source;'],
        solutionBody: [
          'const result = {};',
          'for (const [targetKey, sourceKey] of Object.entries(mapping)) {',
          '  result[targetKey] = source[sourceKey];',
          '}',
          'done(result);',
          'return result;'
        ],
        hints: ['done должен получить переименованный объект.', 'Возвращаемое значение можно оставить тем же объектом.'],
        explanation: `Callback-вариант для ${context.title}.`,
        tests: [
          {
            args: [bundle.source, bundle.mapping, { __fn: 'record', key: 'done', returnValue: bundle.expected }],
            expected: bundle.expected,
            expectCollected: { done: [bundle.expected] }
          },
          {
            args: [{ first: 1, second: 2 }, { a: 'first', b: 'second' }, { __fn: 'record', key: 'done', returnValue: { a: 1, b: 2 } }],
            expected: { a: 1, b: 2 },
            expectCollected: { done: [{ a: 1, b: 2 }] }
          }
        ],
        tags: ['rename', context.id, structureType]
      });

    default:
      return buildRenameTask('easy', rng);
  }
}

function buildMergeTask(difficulty, rng) {
  const profile = pickDifficultyProfile(difficulty);
  const context = pickVariant(rng, CONTEXTS.merge);
  const structureType = pickStructure(rng, difficulty, 'merge');
  const bundle = buildMergeBundle(rng, context, profile);
  const variantId = makeVariantId('merge', structureType, context.id, rng);
  const constraintsByStructure = {
    object: ['no-mutation', 'object-result', 'recursive', 'deep-merge'],
    summary: ['no-mutation', 'object-result', 'recursive', 'deep-merge'],
    options: ['no-mutation', 'object-result', 'options-api', 'recursive', 'deep-merge'],
    callback: ['no-mutation', 'callback', 'recursive', 'deep-merge']
  };

  const details = {
    context,
    dataPreview: preview({ base: bundle.base, patch: bundle.patch }),
    goal: GOALS.merge[structureType],
    constraintsText: renderConstraints(constraintsByStructure[structureType])
  };

  switch (structureType) {
    case 'object':
      return createTask({
        difficulty,
        logicType: 'merge',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'merge', { context, structureType }),
        prompt: makePrompt(rng, 'merge', details),
        signature: 'solve(base, patch)',
        starterBody: ['return base;'],
        solutionBody: ['return deepMerge(base, patch);'],
        hints: ['Сначала копируй base, потом накладывай patch.', 'Вложенные объекты нужно сливать рекурсивно.'],
        explanation: `Глубокое слияние для ${context.title}.`,
        tests: [
          { args: [bundle.base, bundle.patch], expected: bundle.expected },
          { args: [{ a: { b: 1 } }, { a: { c: 2 } }], expected: { a: { b: 1, c: 2 } } }
        ],
        tags: ['merge', context.id, structureType]
      });

    case 'summary':
      return createTask({
        difficulty,
        logicType: 'merge',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'merge', { context, structureType }),
        prompt: makePrompt(rng, 'merge', details),
        signature: 'solve(base, patch)',
        starterBody: ['return { merged: base, changes: 0 };'],
        solutionBody: [
          'const merged = deepMerge(base, patch);',
          'const changes = countLeaves(patch);',
          'return { merged, changes };'
        ],
        hints: ['changes можно считать как число листьев в patch.', 'merged должен содержать результат глубокого слияния.'],
        explanation: `Сводка обновления для ${context.title}.`,
        tests: [
          { args: [bundle.base, bundle.patch], expected: { merged: bundle.expected, changes: bundle.changes } },
          { args: [{ a: { b: 1 } }, { a: { c: 2, d: 3 } }], expected: { merged: { a: { b: 1, c: 2, d: 3 } }, changes: 2 } }
        ],
        tags: ['merge', context.id, structureType]
      });

    case 'options':
      return createTask({
        difficulty,
        logicType: 'merge',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'merge', { context, structureType }),
        prompt: makePrompt(rng, 'merge', details),
        signature: 'solve(base, options)',
        starterBody: ['return base;'],
        solutionBody: [
          'const patch = options && options.patch ? options.patch : {};',
          'return deepMerge(base, patch);'
        ],
        hints: ['patch приходит во втором аргументе.', 'Не забудь сохранить исходный объект неизменным.'],
        explanation: `API-версия глубокого слияния для ${context.title}.`,
        tests: [
          { args: [bundle.base, { patch: bundle.patch }], expected: bundle.expected },
          { args: [{ a: { b: 1 } }, { patch: { a: { c: 2 } } }], expected: { a: { b: 1, c: 2 } } }
        ],
        tags: ['merge', context.id, structureType]
      });

    case 'callback':
      return createTask({
        difficulty,
        logicType: 'merge',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'merge', { context, structureType }),
        prompt: makePrompt(rng, 'merge', details),
        signature: 'solve(base, patch, done)',
        starterBody: ['return base;'],
        solutionBody: [
          'const result = deepMerge(base, patch);',
          'done(result);',
          'return result;'
        ],
        hints: ['done должен получить merged-объект.', 'Возвращай тот же result из функции.'],
        explanation: `Callback-вариант глубокого слияния для ${context.title}.`,
        tests: [
          {
            args: [bundle.base, bundle.patch, { __fn: 'record', key: 'done', returnValue: bundle.expected }],
            expected: bundle.expected,
            expectCollected: { done: [bundle.expected] }
          },
          {
            args: [{ a: { b: 1 } }, { a: { c: 2 } }, { __fn: 'record', key: 'done', returnValue: { a: { b: 1, c: 2 } } }],
            expected: { a: { b: 1, c: 2 } },
            expectCollected: { done: [{ a: { b: 1, c: 2 } }] }
          }
        ],
        tags: ['merge', context.id, structureType]
      });

    default:
      return buildMergeTask('easy', rng);
  }
}

function buildFlattenTask(difficulty, rng) {
  const profile = pickDifficultyProfile(difficulty);
  const context = pickVariant(rng, CONTEXTS.flatten);
  const structureType = pickStructure(rng, difficulty, 'flatten');
  const bundle = buildFlattenBundle(rng, context, profile);
  const variantId = makeVariantId('flatten', structureType, context.id, rng);
  const constraintsByStructure = {
    object: ['no-mutation', 'object-result', 'recursive', 'preserve-order'],
    entries: ['no-mutation', 'object-result', 'recursive', 'preserve-order'],
    summary: ['no-mutation', 'object-result', 'recursive', 'preserve-order'],
    callback: ['no-mutation', 'callback', 'recursive', 'preserve-order']
  };

  const details = {
    context,
    dataPreview: preview(bundle.source),
    goal: GOALS.flatten[structureType],
    constraintsText: renderConstraints(constraintsByStructure[structureType])
  };

  switch (structureType) {
    case 'object':
      return createTask({
        difficulty,
        logicType: 'flatten',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'flatten', { context, structureType }),
        prompt: makePrompt(rng, 'flatten', details),
        signature: 'solve(source)',
        starterBody: ['return source;'],
        solutionBody: [
          'const result = {};',
          'const walk = (value, path = "") => {',
          '  for (const [key, child] of Object.entries(value)) {',
          '    const nextPath = path ? `${path}.${key}` : key;',
          '    if (child && typeof child === "object" && !Array.isArray(child)) {',
          '      walk(child, nextPath);',
          '    } else {',
          '      result[nextPath] = child;',
          '    }',
          '  }',
          '};',
          'walk(source);',
          'return result;'
        ],
        hints: ['Проходи по вложенным объектам рекурсивно.', 'Пути удобно собирать через `${path}.${key}`.'],
        explanation: `Плоская карта путей для ${context.title}.`,
        tests: [
          { args: [bundle.source], expected: bundle.flat },
          { args: [{ a: { b: 1, c: { d: 2 } } }], expected: { 'a.b': 1, 'a.c.d': 2 } }
        ],
        tags: ['flatten', context.id, structureType]
      });

    case 'entries':
      return createTask({
        difficulty,
        logicType: 'flatten',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'flatten', { context, structureType }),
        prompt: makePrompt(rng, 'flatten', details),
        signature: 'solve(source)',
        starterBody: ['return [];'],
        solutionBody: [
          'const flat = flattenObject(source);',
          'return Object.entries(flat).sort(([left], [right]) => left.localeCompare(right));'
        ],
        hints: ['Сначала создай плоский объект, потом преврати его в entries.', 'Сортировка делает результат стабильным.'],
        explanation: `Версия с entries для ${context.title}.`,
        tests: [
          { args: [bundle.source], expected: bundle.entries },
          { args: [{ a: { b: 1, c: { d: 2 } } }], expected: [['a.b', 1], ['a.c.d', 2]] }
        ],
        tags: ['flatten', context.id, structureType]
      });

    case 'summary':
      return createTask({
        difficulty,
        logicType: 'flatten',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'flatten', { context, structureType }),
        prompt: makePrompt(rng, 'flatten', details),
        signature: 'solve(source)',
        starterBody: ['return { flat: {}, count: 0 };'],
        solutionBody: [
          'const flat = flattenObject(source);',
          'return { flat, count: Object.keys(flat).length };'
        ],
        hints: ['count можно взять через Object.keys(flat).length.', 'flat должен хранить пути через точку.'],
        explanation: `Сводка развернутого объекта для ${context.title}.`,
        tests: [
          { args: [bundle.source], expected: { flat: bundle.flat, count: bundle.count } },
          { args: [{ a: { b: 1, c: { d: 2 } } }], expected: { flat: { 'a.b': 1, 'a.c.d': 2 }, count: 2 } }
        ],
        tags: ['flatten', context.id, structureType]
      });

    case 'callback':
      return createTask({
        difficulty,
        logicType: 'flatten',
        structureType,
        contextType: context.id,
        variantId,
        constraints: constraintsByStructure[structureType],
        title: makeTitle(rng, 'flatten', { context, structureType }),
        prompt: makePrompt(rng, 'flatten', details),
        signature: 'solve(source, done)',
        starterBody: ['return source;'],
        solutionBody: [
          'const flat = flattenObject(source);',
          'done(flat);',
          'return flat;'
        ],
        hints: ['done должен получить плоский объект.', 'Возвращай тот же flat из функции.'],
        explanation: `Callback-вариант для ${context.title}.`,
        tests: [
          {
            args: [bundle.source, { __fn: 'record', key: 'done', returnValue: bundle.flat }],
            expected: bundle.flat,
            expectCollected: { done: [bundle.flat] }
          },
          {
            args: [{ a: { b: 1, c: { d: 2 } } }, { __fn: 'record', key: 'done', returnValue: { 'a.b': 1, 'a.c.d': 2 } }],
            expected: { 'a.b': 1, 'a.c.d': 2 },
            expectCollected: { done: [{ 'a.b': 1, 'a.c.d': 2 }] }
          }
        ],
        tags: ['flatten', context.id, structureType]
      });

    default:
      return buildFlattenTask('easy', rng);
  }
}

function buildObjectsTask(difficulty, rng) {
  const normalizedDifficulty = DIFFICULTY_PROFILE[difficulty] ? difficulty : 'easy';
  const family = pickFamily(rng, normalizedDifficulty);

  switch (family) {
    case 'pick':
      return buildPickTask(normalizedDifficulty, rng);
    case 'defaults':
      return buildDefaultsTask(normalizedDifficulty, rng);
    case 'rename':
      return buildRenameTask(normalizedDifficulty, rng);
    case 'merge':
      return buildMergeTask(normalizedDifficulty, rng);
    case 'flatten':
      return buildFlattenTask(normalizedDifficulty, rng);
    default:
      return buildPickTask('easy', rng);
  }
}

const OBJECTS_VARIATION_PROFILES = {
  pick: {
    answerFormats: [
      { value: 'object', text: 'Верни объект с выбранными полями.' },
      { value: 'entries', text: 'Верни массив пар [ключ, значение].' },
      { value: 'summary', text: 'Верни короткую сводку без лишних полей.' }
    ],
    thinkingStyles: [
      { value: 'select', text: 'Сначала выбери нужные поля, потом собери ответ.' },
      { value: 'project', text: 'Думай как проекция: только нужные данные и ничего лишнего.' },
      { value: 'filter', text: 'Отфильтруй структуру, затем оформи итог.' }
    ]
  },
  defaults: {
    answerFormats: [
      { value: 'object', text: 'Верни итоговый объект.' },
      { value: 'summary', text: 'Верни объект-резюме с изменениями.' },
      { value: 'patch', text: 'Верни результат как применённый патч.' }
    ],
    thinkingStyles: [
      { value: 'merge', text: 'Сначала слей источники, потом проверь, что ничего не потерял.' },
      { value: 'fill', text: 'Сначала найди пустоты, потом подставь значения по умолчанию.' },
      { value: 'compare', text: 'Сопоставь два слоя данных перед финальным ответом.' }
    ]
  },
  rename: {
    answerFormats: [
      { value: 'object', text: 'Верни объект с переименованными ключами.' },
      { value: 'entries', text: 'Верни entries с новыми именами.' },
      { value: 'mapping', text: 'Сохрани пары ключ-значение в новой схеме имен.' }
    ],
    thinkingStyles: [
      { value: 'remap', text: 'Сначала сопоставь старые и новые ключи, потом перенеси значения.' },
      { value: 'relabel', text: 'Переименуй поля без потери смысла.' },
      { value: 'translate', text: 'Думай как перевод схемы: имя меняется, данные остаются.' }
    ]
  },
  merge: {
    answerFormats: [
      { value: 'object', text: 'Верни слитый объект.' },
      { value: 'summary', text: 'Верни объект-резюме с итоговыми полями.' },
      { value: 'patch', text: 'Покажи итог как результат последовательного патча.' }
    ],
    thinkingStyles: [
      { value: 'merge', text: 'Сначала обдумай приоритеты, потом объединяй слои.' },
      { value: 'preserve', text: 'Не теряй уже существующие значения при слиянии.' },
      { value: 'patch', text: 'Применяй изменения как последовательный патч.' }
    ]
  },
  flatten: {
    answerFormats: [
      { value: 'object', text: 'Верни плоский объект.' },
      { value: 'entries', text: 'Верни список путей и значений.' },
      { value: 'paths', text: 'Оформи ответ как карту путей.' }
    ],
    thinkingStyles: [
      { value: 'flatten', text: 'Сначала разверни вложенность в путь, потом запиши листья.' },
      { value: 'recurse', text: 'Иди вглубь рекурсией и собирай путь по цепочке.' },
      { value: 'linearize', text: 'Преобразуй дерево в плоское представление без потерь.' }
    ]
  }
};

function buildObjectsVariation(logicType, structureType, variantId, contextType) {
  const profile = OBJECTS_VARIATION_PROFILES[logicType] || OBJECTS_VARIATION_PROFILES.pick;
  const answerFormat = pickVariantByKey(`${variantId}:${logicType}:${structureType}:format`, profile.answerFormats);
  const thinkingStyle = pickVariantByKey(`${variantId}:${logicType}:${contextType}:thinking`, profile.thinkingStyles);

  return {
    answerFormat: answerFormat ? answerFormat.value : structureType,
    thinkingStyle: thinkingStyle ? thinkingStyle.value : logicType,
    variationNotes: unique([answerFormat && answerFormat.text, thinkingStyle && thinkingStyle.text])
  };
}

function createTask(parts) {
  const context = parts.context || { id: parts.contextType || 'general', title: parts.contextTitle || 'значений' };
  const logicType = parts.logicType || parts.family || 'general';
  const structureType = parts.structureType || 'object';
  const variantId = parts.variantId || `${CATEGORY}-${parts.family || logicType}-${logicType}-${structureType}-${context.id}`;
  const variation = buildObjectsVariation(logicType, structureType, variantId, context.id);
  const answerFormat = parts.answerFormat || variation.answerFormat;
  const thinkingStyle = parts.thinkingStyle || variation.thinkingStyle;
  const variationNotes = unique([...(Array.isArray(parts.variationNotes) ? parts.variationNotes : []), ...variation.variationNotes]);

  return buildVariantTask({
    category: CATEGORY,
    difficulty: parts.difficulty,
    seed: variantId,
    title: parts.title,
    prompt: parts.prompt,
    signature: parts.signature,
    starterBody: parts.starterBody,
    solutionBody: parts.solutionBody,
    hints: parts.hints,
    explanation: parts.explanation,
    tests: parts.tests,
    strategy: 'simple',
    context,
    family: parts.family || logicType,
    logicType,
    structureType,
    answerFormat,
    thinkingStyle,
    variationNotes,
    tags: parts.tags || [],
    meta: {
      ...(parts.meta || {}),
      family: parts.family || logicType,
      logicType,
      structureType,
      answerFormat,
      thinkingStyle,
      contextType: context.id,
      constraints: normalizeConstraints(parts.constraints),
      variationNotes,
      variantId
    }
  });
}

module.exports = {
  buildObjectsTask
};
