const { buildTask, pickVariant, preview, sampleNumbers, sampleWords, sampleName } = require('../engine/taskShared');

function buildClosuresTask(difficulty, rng) {
  const create = (spec) => buildTask({
    category: 'closures',
    difficulty,
    strategy: 'closure',
    ...spec
  });

  switch (difficulty) {
    case 'easy': {
      return pickVariant(rng, [
        () => {
          const start = rng.int(0, 5);
          return create({
            title: 'Счётчик',
            prompt: `Напиши фабрику счётчика, которая стартует с ${start} и при каждом вызове увеличивает значение на 1.`,
            signature: 'solve(start)',
            starterBody: [
              'let value = start;',
              'return () => value;'
            ],
            solutionBody: [
              'let value = start;',
              'return () => {',
              '  value += 1;',
              '  return value;',
              '};'
            ],
            hints: ['Состояние должно жить между вызовами.', 'Возвращай новую функцию из `solve`.'],
            explanation: 'Замыкание позволяет хранить приватную переменную между вызовами.',
            tests: [
              {
                args: [start],
                sequence: [
                  { input: [], expected: start + 1 },
                  { input: [], expected: start + 2 },
                  { input: [], expected: start + 3 }
                ]
              }
            ],
            tags: ['counter', 'factory']
          });
        },
        () => {
          const initial = rng.bool() ? true : false;
          return create({
            title: 'Переключатель',
            prompt: `Создай фабрику переключателя, которая стартует со значения ${initial} и меняет состояние на каждом вызове.`,
            signature: 'solve(initial)',
            starterBody: [
              'let state = initial;',
              'return () => state;'
            ],
            solutionBody: [
              'let state = initial;',
              'return () => {',
              '  state = !state;',
              '  return state;',
              '};'
            ],
            hints: ['Используй булевый флаг внутри замыкания.', 'Каждый вызов должен менять состояние.'],
            explanation: 'Это классическая задача на скрытое состояние.',
            tests: [
              {
                args: [initial],
                sequence: [
                  { input: [], expected: !initial },
                  { input: [], expected: initial },
                  { input: [], expected: !initial }
                ]
              }
            ],
            tags: ['toggle', 'state']
          });
        },
        () => {
          const start = rng.int(2, 6);
          const step = rng.int(1, 4);
          return create({
            title: 'Накопитель',
            prompt: `Создай функцию, которая хранит накопленное значение. Старт = ${start}, шаг = ${step}.`,
            signature: 'solve(start, step)',
            starterBody: [
              'let total = start;',
              'return (value) => total;'
            ],
            solutionBody: [
              'let total = start;',
              'return (value) => {',
              '  total += value + step;',
              '  return total;',
              '};'
            ],
            hints: ['Замыкание может помнить и несколько чисел.', 'Обновляй переменную на каждом вызове.'],
            explanation: 'Задача тренирует понимание того, как функция “видит” внешние переменные.',
            tests: [
              {
                args: [start, step],
                sequence: [
                  { input: [1], expected: start + 1 + step },
                  { input: [2], expected: start + 1 + step + 2 + step },
                  { input: [3], expected: start + 1 + step + 2 + step + 3 + step }
                ]
              }
            ],
            tags: ['accumulator', 'closure']
          });
        }
      ])();
    }
    case 'medium': {
      return pickVariant(rng, [
        () => {
          const limit = rng.int(2, 4);
          return create({
            title: 'Лимит вызовов',
            prompt: `Создай фабрику, которая принимает limit = ${limit} и позволяет вызывать значение не больше limit раз. После лимита возвращай null.`,
            signature: 'solve(limit)',
            starterBody: [
              'let used = 0;',
              'return (value) => value;'
            ],
            solutionBody: [
              'let used = 0;',
              'return (value) => {',
              '  if (used >= limit) {',
              '    return null;',
              '  }',
              '  used += 1;',
              '  return value;',
              '};'
            ],
            hints: ['Считай, сколько раз уже вызвали функцию.', 'После лимита верни `null`.'],
            explanation: 'Это полезная практика на закрытые счётчики и условия внутри замыкания.',
            tests: [
              {
                args: [limit],
                sequence: [
                  { input: [1], expected: 1 },
                  { input: [2], expected: 2 },
                  { input: [3], expected: limit > 2 ? 3 : null },
                  { input: [4], expected: null }
                ]
              }
            ],
            tags: ['limit', 'guard']
          });
        },
        () => {
          const names = sampleWords(rng, 3);
          return create({
            title: 'История значений',
            prompt: `Создай хранилище, которое запоминает переданные значения и возвращает последние ${names.length}.`,
            signature: 'solve(limit)',
            starterBody: [
              'const history = [];',
              'return (value) => history;'
            ],
            solutionBody: [
              'const history = [];',
              'return (value) => {',
              '  history.push(value);',
              '  return history.slice(-limit);',
              '};'
            ],
            hints: ['Храни массив внутри функции.', 'Возвращай только последние limit значений.'],
            explanation: 'Такие задачи похожи на мини-кэш или историю действий пользователя.',
            tests: [
              {
                args: [names.length],
                sequence: [
                  { input: [names[0]], expected: [names[0]] },
                  { input: [names[1]], expected: [names[0], names[1]] },
                  { input: [names[2]], expected: names.slice(-names.length) }
                ]
              }
            ],
            tags: ['history', 'cache']
          });
        },
        () => {
          const balance = rng.int(10, 20);
          const deposit = rng.int(3, 8);
          const withdraw = rng.int(1, 5);
          return create({
            title: 'Банковский счёт',
            prompt: `Создай объект счёта с балансом ${balance} и методами deposit/withdraw/getBalance.`,
            signature: 'solve(balance)',
            starterBody: [
              'return {',
              '  deposit(value) { return value; }',
              '};'
            ],
            solutionBody: [
              'let current = balance;',
              'return {',
              '  deposit(value) {',
              '    current += value;',
              '    return current;',
              '  },',
              '  withdraw(value) {',
              '    current -= value;',
              '    return current;',
              '  },',
              '  getBalance() {',
              '    return current;',
              '  }',
              '};'
            ],
            hints: ['Объект может замыкать скрытую переменную.', 'Методы счёта должны работать с одной и той же переменной.'],
            explanation: 'Это удобная форма замыкания, когда приватное состояние скрыто внутри объекта.',
            tests: [
              {
                args: [balance],
                sequence: [
                  { method: 'deposit', input: [deposit], expected: balance + deposit },
                  { method: 'withdraw', input: [withdraw], expected: balance + deposit - withdraw },
                  { method: 'getBalance', input: [], expected: balance + deposit - withdraw }
                ]
              }
            ],
            tags: ['bank', 'methods']
          });
        }
      ])();
    }
    case 'hard': {
      return pickVariant(rng, [
        () => {
          const values = sampleNumbers(rng, rng.int(5, 8), 1, 9);
          const expensive = { __fn: 'spyMultiply', value: rng.int(2, 5), key: 'expensive' };
          return create({
            title: 'Мемоизация',
            prompt: `Создай фабрику, которая кэширует результат вычисления для каждого аргумента. Внутрь передаётся expensive = ${preview(expensive)}.`,
            signature: 'solve(expensive)',
            starterBody: [
              'return (value) => expensive(value);'
            ],
            solutionBody: [
              'const cache = new Map();',
              'return (value) => {',
              '  if (cache.has(value)) {',
              '    return cache.get(value);',
              '  }',
              '  const result = expensive(value);',
              '  cache.set(value, result);',
              '  return result;',
              '};'
            ],
            hints: ['Храни результаты в `Map`.', 'Повторный вызов с тем же аргументом не должен дергать expensive снова.'],
            explanation: 'Мемоизация - один из самых полезных паттернов замыканий в реальной практике.',
            tests: [
              {
                args: [expensive],
                sequence: [
                  { input: [values[0]], expected: values[0] * expensive.value },
                  { input: [values[0]], expected: values[0] * expensive.value },
                  { input: [values[1]], expected: values[1] * expensive.value }
                ],
                expectCalls: {
                  expensive: 2
                }
              }
            ],
            tags: ['memo', 'cache']
          });
        },
        () => {
          const seed = sampleName(rng);
          return create({
            title: 'Event Bus',
            prompt: `Создай объект eventBus с методами on, off и emit. Состояние должно быть скрыто в замыкании.`,
            signature: 'solve()',
            starterBody: [
              'return {',
              '  on() {},',
              '  off() {},',
              '  emit() {}',
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
              '    const list = listeners.get(event) || [];',
              '    listeners.set(event, list.filter((item) => item !== handler));',
              '  },',
              '  emit(event, payload) {',
              '    for (const handler of listeners.get(event) || []) {',
              '      handler(payload);',
              '    }',
              '  }',
              '};'
            ],
            hints: ['Сохраняй список подписчиков внутри функции.', 'При `emit` вызывай все обработчики.'],
            explanation: 'Это уже ближе к реальному мини-фреймворку с закрытым состоянием.',
            tests: [
              {
                args: [],
                sequence: [
                  { method: 'on', input: ['ping', { __fn: 'collect', key: 'ping-log' }] },
                  { method: 'emit', input: ['ping', seed], expected: undefined },
                  { method: 'emit', input: ['ping', `${seed}-2`], expected: undefined }
                ],
                expectCollected: {
                  'ping-log': [seed, `${seed}-2`]
                }
              }
            ],
            tags: ['bus', 'listeners']
          });
        }
      ])();
    }
    case 'expert': {
      return pickVariant(rng, [
        () => {
          const start = rng.int(0, 10);
          return create({
            title: 'Состояние машины',
            prompt: `Создай объект-счетчик с методами inc, dec, reset и value. Начальное значение = ${start}.`,
            signature: 'solve(start)',
            starterBody: [
              'return {',
              '  inc() { return start; },',
              '  dec() { return start; },',
              '  reset() { return start; },',
              '  value() { return start; }',
              '};'
            ],
            solutionBody: [
              'let current = start;',
              'return {',
              '  inc() {',
              '    current += 1;',
              '    return current;',
              '  },',
              '  dec() {',
              '    current -= 1;',
              '    return current;',
              '  },',
              '  reset() {',
              '    current = start;',
              '    return current;',
              '  },',
              '  value() {',
              '    return current;',
              '  }',
              '};'
            ],
            hints: ['Нужно одно закрытое значение и несколько методов над ним.', 'Каждый метод должен возвращать актуальное состояние.'],
            explanation: 'Экспертная версия показывает, как на замыкании строится полноценный объект с приватным состоянием.',
            tests: [
              {
                args: [start],
                sequence: [
                  { method: 'inc', input: [], expected: start + 1 },
                  { method: 'inc', input: [], expected: start + 2 },
                  { method: 'dec', input: [], expected: start + 1 },
                  { method: 'reset', input: [], expected: start },
                  { method: 'value', input: [], expected: start }
                ]
              }
            ],
            tags: ['state', 'machine']
          });
        }
      ])();
    }
    default:
      return buildClosuresTask('easy', rng);
  }
}

module.exports = {
  buildClosuresTask
};
