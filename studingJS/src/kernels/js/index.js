const taskEngine = require('../../generation');

const JS_KERNEL_META = {
  id: 'js',
  title: 'JavaScript',
  shortTitle: 'JS',
  family: 'web',
  editorLanguage: 'javascript',
  strategies: ['simple', 'closure', 'async', 'dom'],
  strategyLabels: {
    simple: 'Обычная',
    closure: 'Замыкание',
    async: 'Async',
    dom: 'DOM'
  },
  description: 'Полноценное ядро с бесконечной генерацией задач, тестами и sandbox-проверкой в vm.',
  status: 'available',
  available: true,
  accent: '#7dd3fc'
};

function wrapTask(task) {
  return {
    ...task,
    kernelId: JS_KERNEL_META.id,
    kernelTitle: JS_KERNEL_META.title,
    kernelFamily: JS_KERNEL_META.family,
    editorLanguage: JS_KERNEL_META.editorLanguage
  };
}

function topicMeta(topicId, topicTitle, extra = {}) {
  return {
    ...extra,
    practiceTopicId: topicId,
    practiceTopicTitle: topicTitle
  };
}

function buildJsTopicTask(options = {}) {
  const topicId = typeof options.practiceTopicId === 'string' ? options.practiceTopicId.trim() : '';
  const topicTitle = typeof options.practiceTopicTitle === 'string' && options.practiceTopicTitle.trim()
    ? options.practiceTopicTitle.trim()
    : topicId;
  const difficulty = Array.isArray(options.difficulties) && options.difficulties.includes(options.focusDifficulty)
    ? options.focusDifficulty
    : 'easy';
  const seed = taskEngine.resolveSeed(options);

  const makeTask = (parts) => taskEngine.buildTaskFromParts({
    ...parts,
    difficulty,
    seed: `${seed}:${topicId}`,
    kernelId: JS_KERNEL_META.id,
    tags: [topicId, ...(parts.tags || [])],
    meta: topicMeta(topicId, topicTitle, parts.meta)
  });

  switch (topicId) {
    case 'variables':
      return makeTask({
        category: 'objects',
        title: 'Деструктуризация профиля',
        prompt: `Практика темы "${topicTitle}". Из объекта пользователя достань name и age, если age не передан — используй 18. Верни строку "name:age".`,
        signature: 'solve(user)',
        starterBody: ['return "";'],
        solutionBody: ['const { name, age = 18 } = user;', 'return `${name}:${age}`;'],
        hints: ['Используй destructuring с default value.', 'Шаблонная строка поможет собрать ответ.'],
        explanation: `${topicTitle}: задача закрепляет const, область данных и деструктуризацию.`,
        tests: [
          { args: [{ name: 'Mila', age: 21 }], expected: 'Mila:21' },
          { args: [{ name: 'Oleg' }], expected: 'Oleg:18' }
        ],
        tags: ['destructuring', 'defaults']
      });
    case 'types':
      return makeTask({
        category: 'functions',
        title: 'Безопасное приведение к числу',
        prompt: `Практика темы "${topicTitle}". Преобразуй value в число. Если получается NaN, верни null, иначе верни число, умноженное на 2.`,
        signature: 'solve(value)',
        starterBody: ['return value;'],
        solutionBody: ['const number = Number(value);', 'return Number.isNaN(number) ? null : number * 2;'],
        hints: ['Number(value) делает явное приведение.', 'Number.isNaN проверяет именно NaN.'],
        explanation: `${topicTitle}: явное приведение безопаснее неявного сравнения.`,
        tests: [
          { args: ['21'], expected: 42 },
          { args: ['oops'], expected: null }
        ],
        tags: ['types', 'coercion']
      });
    case 'functions':
      return makeTask({
        category: 'functions',
        title: 'Фабрика множителя',
        prompt: `Практика темы "${topicTitle}". Верни массив numbers, где каждый элемент умножен на factor через маленькую функцию-трансформер.`,
        signature: 'solve(numbers, factor)',
        starterBody: ['return numbers;'],
        solutionBody: ['const multiply = (value) => value * factor;', 'return numbers.map(multiply);'],
        hints: ['Создай стрелочную функцию.', 'Передай её в map.'],
        explanation: `${topicTitle}: стрелки и функции высшего порядка хорошо видны в map.`,
        tests: [
          { args: [[1, 2, 3], 3], expected: [3, 6, 9] },
          { args: [[-1, 4], 2], expected: [-2, 8] }
        ],
        tags: ['arrow', 'map']
      });
    case 'arrays':
      return makeTask({
        category: 'arrays',
        title: 'Положительные x10',
        prompt: `Практика темы "${topicTitle}". Оставь только положительные числа и умножь каждое на 10.`,
        signature: 'solve(numbers)',
        starterBody: ['return [];'],
        solutionBody: ['return numbers.filter((value) => value > 0).map((value) => value * 10);'],
        hints: ['Сначала filter, потом map.', 'Ноль не положительный.'],
        explanation: `${topicTitle}: цепочка filter + map — базовый массивный паттерн.`,
        tests: [
          { args: [[1, -2, 3, 0]], expected: [10, 30] },
          { args: [[-5, 2, 4]], expected: [20, 40] }
        ],
        tags: ['filter', 'map']
      });
    case 'objects':
      return makeTask({
        category: 'objects',
        title: 'Merge настроек',
        prompt: `Практика темы "${topicTitle}". Объедини defaults и userOptions так, чтобы пользовательские поля перезаписывали базовые.`,
        signature: 'solve(defaults, userOptions)',
        starterBody: ['return defaults;'],
        solutionBody: ['return { ...defaults, ...userOptions };'],
        hints: ['Spread справа перезаписывает одинаковые ключи.', 'Не мутируй defaults.'],
        explanation: `${topicTitle}: object spread удобен для настройки конфигов.`,
        tests: [
          { args: [{ color: 'blue', size: 'M' }, { size: 'L' }], expected: { color: 'blue', size: 'L' } },
          { args: [{ retries: 1 }, { timeout: 500 }], expected: { retries: 1, timeout: 500 } }
        ],
        tags: ['object-spread', 'merge']
      });
    case 'closures':
      return makeTask({
        category: 'closures',
        title: 'Счётчик из замыкания',
        prompt: `Практика темы "${topicTitle}". Создай счётчик с приватным состоянием и верни результаты последовательных inc-вызовов.`,
        signature: 'solve(start)',
        starterBody: ['return [];'],
        solutionBody: [
          'let value = start;',
          'const inc = () => {',
          '  value += 1;',
          '  return value;',
          '};',
          'return [inc(), inc(), inc()];'
        ],
        hints: ['value должен жить во внешней области.', 'inc замыкается на value.'],
        explanation: `${topicTitle}: внутренняя функция хранит доступ к переменной после создания.`,
        tests: [
          { args: [0], expected: [1, 2, 3] },
          { args: [5], expected: [6, 7, 8] }
        ],
        tags: ['closure', 'state']
      });
    case 'async':
      return makeTask({
        category: 'async',
        title: 'Promise.all порядок',
        prompt: `Практика темы "${topicTitle}". На входе массив promise-like значений. Дождись всех через Promise.all и верни сумму.`,
        signature: 'solve(values)',
        async: true,
        starterBody: ['return 0;'],
        solutionBody: ['const resolved = await Promise.all(values);', 'return resolved.reduce((sum, value) => sum + value, 0);'],
        hints: ['Promise.all сохраняет порядок результатов.', 'После await работай с обычным массивом.'],
        explanation: `${topicTitle}: Promise.all запускает ожидание набора задач как единый шаг.`,
        tests: [
          { args: [[1, 2, 3]], expected: 6 },
          { args: [[4, 5]], expected: 9 }
        ],
        tags: ['promise-all', 'async-await'],
        meta: { async: true }
      });
    case 'dom':
      return makeTask({
        category: 'dom',
        title: 'HTML списка',
        prompt: `Практика темы "${topicTitle}". Сымитируй renderList: из items собери строку li с data-id и именем.`,
        signature: 'solve(items)',
        starterBody: ['return "";'],
        solutionBody: ['return items.map((item) => `<li data-id="${item.id}">${item.name}</li>`).join("");'],
        hints: ['DOM-рендер часто начинается с данных.', 'join("") склеит HTML без запятых.'],
        explanation: `${topicTitle}: задача тренирует преобразование данных в разметку.`,
        tests: [
          { args: [[{ id: 1, name: 'Ada' }, { id: 2, name: 'Lin' }]], expected: '<li data-id="1">Ada</li><li data-id="2">Lin</li>' },
          { args: [[{ id: 'x', name: 'Node' }]], expected: '<li data-id="x">Node</li>' }
        ],
        tags: ['render', 'html']
      });
    case 'classes-prototypes':
      return makeTask({
        category: 'objects',
        title: 'Метод класса Counter',
        prompt: `Практика темы "${topicTitle}". Смоделируй Counter: начиная со start, верни значения трёх вызовов inc().`,
        signature: 'solve(start)',
        starterBody: ['return [];'],
        solutionBody: [
          'class Counter {',
          '  constructor(value) { this.value = value; }',
          '  inc() { this.value += 1; return this.value; }',
          '}',
          'const counter = new Counter(start);',
          'return [counter.inc(), counter.inc(), counter.inc()];'
        ],
        hints: ['Метод использует this.value.', 'Экземпляр хранит состояние между вызовами.'],
        explanation: `${topicTitle}: class кладёт методы на общий прототип и хранит состояние в экземпляре.`,
        tests: [
          { args: [0], expected: [1, 2, 3] },
          { args: [10], expected: [11, 12, 13] }
        ],
        tags: ['class', 'prototype']
      });
    case 'modules':
      return makeTask({
        category: 'objects',
        title: 'Переименование импортов',
        prompt: `Практика темы "${topicTitle}". Даны два объекта-модуля с полем readFile. Достань оба поля с переименованием, как в import alias, и верни массив значений.`,
        signature: 'solve(fsModule, configModule)',
        starterBody: ['return [];'],
        solutionBody: [
          'const { readFile: readText } = fsModule;',
          'const { readFile: readConfig } = configModule;',
          'return [readText, readConfig];'
        ],
        hints: ['Деструктуризация умеет переименовывать поля.', 'Это похоже на import { readFile as readText }.'],
        explanation: `${topicTitle}: alias помогает избежать конфликта имён.`,
        tests: [
          { args: [{ readFile: 'text:app' }, { readFile: 'cfg:app' }], expected: ['text:app', 'cfg:app'] },
          { args: [{ readFile: 'user.txt' }, { readFile: 'settings.json' }], expected: ['user.txt', 'settings.json'] }
        ],
        tags: ['modules', 'alias']
      });
    case 'errors':
      return makeTask({
        category: 'functions',
        title: 'Безопасное деление',
        prompt: `Практика темы "${topicTitle}". Верни результат деления, но если делитель 0 — верни строку "Division by zero" через try/catch.`,
        signature: 'solve(a, b)',
        starterBody: ['return a / b;'],
        solutionBody: [
          'try {',
          '  if (b === 0) throw new Error("Division by zero");',
          '  return a / b;',
          '} catch (error) {',
          '  return error.message;',
          '}'
        ],
        hints: ['Сначала брось ошибку на b === 0.', 'catch получает объект ошибки.'],
        explanation: `${topicTitle}: ожидаемые сбои удобно переводить в управляемый результат.`,
        tests: [
          { args: [10, 2], expected: 5 },
          { args: [10, 0], expected: 'Division by zero' }
        ],
        tags: ['try-catch', 'throw']
      });
    case 'map-set':
      return makeTask({
        category: 'arrays',
        title: 'Уникальные теги через Set',
        prompt: `Практика темы "${topicTitle}". Удали дубликаты из массива tags, сохранив порядок первых появлений.`,
        signature: 'solve(tags)',
        starterBody: ['return tags;'],
        solutionBody: ['return [...new Set(tags)];'],
        hints: ['Set хранит только уникальные значения.', 'Spread превратит Set обратно в массив.'],
        explanation: `${topicTitle}: Set — короткий способ дедупликации примитивов.`,
        tests: [
          { args: [['js', 'css', 'js', 'html']], expected: ['js', 'css', 'html'] },
          { args: [[1, 1, 2, 3, 2]], expected: [1, 2, 3] }
        ],
        tags: ['set', 'dedupe']
      });
    case 'event-loop':
      return makeTask({
        category: 'async',
        title: 'Очередь event loop',
        prompt: `Практика темы "${topicTitle}". Даны события с типом sync, microtask или macrotask. Верни порядок выполнения: sync → microtask → macrotask, сохраняя порядок внутри типа.`,
        signature: 'solve(events)',
        starterBody: ['return events.map((event) => event.label);'],
        solutionBody: [
          'const order = { sync: 0, microtask: 1, macrotask: 2 };',
          'return events',
          '  .map((event, index) => ({ ...event, index }))',
          '  .sort((left, right) => order[left.type] - order[right.type] || left.index - right.index)',
          '  .map((event) => event.label);'
        ],
        hints: ['Сначала идут синхронные операции.', 'Promise callbacks — microtask, setTimeout — macrotask.'],
        explanation: `${topicTitle}: сортировка моделирует приоритет очередей event loop.`,
        tests: [
          { args: [[{ type: 'sync', label: '1' }, { type: 'macrotask', label: '2' }, { type: 'microtask', label: '3' }, { type: 'sync', label: '4' }]], expected: ['1', '4', '3', '2'] },
          { args: [[{ type: 'macrotask', label: 'timeout' }, { type: 'microtask', label: 'then' }]], expected: ['then', 'timeout'] }
        ],
        tags: ['event-loop', 'queue']
      });
    case 'iterators-generators':
      return makeTask({
        category: 'algorithms',
        title: 'Range как генератор',
        prompt: `Практика темы "${topicTitle}". Сгенерируй массив чисел от 0 до n - 1 через generator function.`,
        signature: 'solve(n)',
        starterBody: ['return [];'],
        solutionBody: [
          'function* range(limit) {',
          '  for (let index = 0; index < limit; index += 1) {',
          '    yield index;',
          '  }',
          '}',
          'return [...range(n)];'
        ],
        hints: ['function* создаёт генератор.', 'yield отдаёт значения по одному.'],
        explanation: `${topicTitle}: генератор лениво производит последовательность, а spread собирает её.`,
        tests: [
          { args: [4], expected: [0, 1, 2, 3] },
          { args: [1], expected: [0] }
        ],
        tags: ['generator', 'iterator']
      });
    default:
      return null;
  }
}

module.exports = {
  ...JS_KERNEL_META,
  getCategories() {
    return taskEngine.CATEGORY_META;
  },
  getDifficulties() {
    return taskEngine.DIFFICULTIES;
  },
  async generateTask(options = {}) {
    const topicTask = buildJsTopicTask(options);
    if (topicTask) {
      return wrapTask(topicTask);
    }
    return wrapTask(
      await taskEngine.generateTask({
        ...options,
        kernelId: JS_KERNEL_META.id
      })
    );
  },
  runTaskTests(task, userCode) {
    return taskEngine.runTaskTests(task, userCode);
  },
  getProgressSummary(progress = {}) {
    return taskEngine.getProgressSummary(progress);
  },
  buildAchievements(progress = {}) {
    return taskEngine.buildAchievements(progress);
  },
  createCustomTaskTemplate() {
    return {
      ...taskEngine.createCustomTaskTemplate(),
      kernelId: JS_KERNEL_META.id,
      kernelTitle: JS_KERNEL_META.title,
      editorLanguage: JS_KERNEL_META.editorLanguage
    };
  },
  normalizeCustomTask(task) {
    const normalized = taskEngine.normalizeCustomTask(task);
    return normalized
      ? {
          ...normalized,
          kernelId: normalized.kernelId || JS_KERNEL_META.id,
          kernelTitle: JS_KERNEL_META.title,
          editorLanguage: JS_KERNEL_META.editorLanguage
        }
      : null;
  }
};
