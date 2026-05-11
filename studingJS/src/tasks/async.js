const { buildTask, pickVariant, preview, sampleWords, sampleName, sampleCity, sampleNumbers } = require('../engine/taskShared');

function buildAsyncTask(difficulty, rng) {
  const create = (spec) => buildTask({
    category: 'async',
    difficulty,
    strategy: 'async',
    async: true,
    ...spec
  });

  switch (difficulty) {
    case 'easy': {
      return pickVariant(rng, [
        () => {
          const user = { name: sampleName(rng), city: sampleCity(rng) };
          return create({
            title: 'Профиль пользователя',
            prompt: 'Дана async-функция loadUser(). Дождись пользователя и верни строку "NAME from CITY", где имя в верхнем регистре.',
            signature: 'solve(loadUser)',
            starterBody: [
              'const user = loadUser();',
              'return user;'
            ],
            solutionBody: [
              'const user = await loadUser();',
              'return `${user.name.toUpperCase()} from ${user.city}`;'
            ],
            hints: ['Нужно дождаться Promise через `await`.', 'Имя можно преобразовать через `toUpperCase`.'],
            explanation: 'Задача показывает, как из async-функции получить готовую строку на основе загруженных данных.',
            tests: [
              { args: [{ __fn: 'asyncValue', value: user, key: 'load-user' }], expected: `${user.name.toUpperCase()} from ${user.city}` },
              { args: [{ __fn: 'asyncValue', value: { name: 'Ada', city: 'Oslo' }, key: 'load-ada' }], expected: 'ADA from Oslo' }
            ],
            tags: ['await', 'profile']
          });
        },
        () => {
          const values = sampleNumbers(rng, 2, 1, 10);
          return create({
            title: 'Сумма двух загрузок',
            prompt: `Даны две async-функции loadA/loadB. Дождись обеих и верни их сумму.`,
            signature: 'solve(loadA, loadB)',
            starterBody: [
              'const a = loadA();',
              'const b = loadB();',
              'return a + b;'
            ],
            solutionBody: [
              'const [a, b] = await Promise.all([loadA(), loadB()]);',
              'return a + b;'
            ],
            hints: ['`Promise.all` ждёт обе загрузки сразу.', 'Потом просто сложи результаты.'],
            explanation: 'Это базовая практика на параллельное ожидание нескольких Promise.',
            tests: [
              { args: [{ __fn: 'asyncValue', value: values[0], key: 'a' }, { __fn: 'asyncValue', value: values[1], key: 'b' }], expected: values[0] + values[1] },
              { args: [{ __fn: 'asyncValue', value: 7, key: 'a2' }, { __fn: 'asyncValue', value: 5, key: 'b2' }], expected: 12 }
            ],
            tags: ['promise-all', 'sum']
          });
        },
        () => {
          const text = sampleWords(rng, 2).join(' ');
          return create({
            title: 'Преобразование текста',
            prompt: 'Дана async-функция loadText(). Дождись строки, убери лишние пробелы и верни её в верхнем регистре.',
            signature: 'solve(loadText)',
            starterBody: [
              'const text = loadText();',
              'return text;'
            ],
            solutionBody: [
              'const text = await loadText();',
              'return text.trim().replace(/\\s+/g, " ").toUpperCase();'
            ],
            hints: ['Сначала дождись строки, потом обработай её как обычный текст.', 'Комбинация `trim`, regex и `toUpperCase` решает задачу.'],
            explanation: 'Async-часть здесь только в получении данных, а сама трансформация синхронная.',
            tests: [
              { args: [{ __fn: 'asyncValue', value: `  ${text}  `, key: 'load-text' }], expected: text.toUpperCase() },
              { args: [{ __fn: 'asyncValue', value: '   hello   world ', key: 'load-text-2' }], expected: 'HELLO WORLD' }
            ],
            tags: ['await', 'string']
          });
        }
      ])();
    }
    case 'medium': {
      return pickVariant(rng, [
        () => {
          const numbers = sampleNumbers(rng, 3, 1, 9);
          return create({
            title: 'Параллельный сбор',
            prompt: 'Даны async-функции, которые возвращают числа. Дождись их параллельно и верни массив результатов в исходном порядке.',
            signature: 'solve(loaders)',
            starterBody: [
              'const results = [];',
              'for (const loader of loaders) {',
              '  results.push(loader());',
              '}',
              'return results;'
            ],
            solutionBody: [
              'return Promise.all(loaders.map((loader) => loader()));'
            ],
            hints: ['`Promise.all` сохраняет порядок исходного массива.', 'Не нужно ждать каждый loader по отдельности.'],
            explanation: 'Здесь важно не потерять порядок и не сделать ненужную последовательность.',
            tests: [
              { args: [[{ __fn: 'asyncValue', value: numbers[0], key: 'l1' }, { __fn: 'asyncValue', value: numbers[1], key: 'l2' }, { __fn: 'asyncValue', value: numbers[2], key: 'l3' }]], expected: numbers },
              { args: [[{ __fn: 'asyncValue', value: 1, key: 'a' }, { __fn: 'asyncValue', value: 2, key: 'b' }]], expected: [1, 2] }
            ],
            tags: ['promise-all', 'ordering']
          });
        },
        () => {
          const primary = { __fn: 'asyncReject', message: 'offline', key: 'primary' };
          const backup = { __fn: 'asyncValue', value: rng.int(10, 20), key: 'backup' };
          return create({
            title: 'Первый успешный источник',
            prompt: 'Даны primary и backup. Верни результат первого успешного источника, а если первый упал - используй второй.',
            signature: 'solve(primary, backup)',
            starterBody: [
              'const value = await primary();',
              'return value;'
            ],
            solutionBody: [
              'try {',
              '  return await primary();',
              '} catch (error) {',
              '  return await backup();',
              '}'
            ],
            hints: ['Обработай ошибку через `try/catch`.', 'Если первый источник упал, сразу переходи ко второму.'],
            explanation: 'Это уже практика на надёжный fallback при работе с сетью или внешними сервисами.',
            tests: [
              { args: [primary, backup], expected: backup.value },
              { args: [{ __fn: 'asyncValue', value: 42, key: 'ok' }, { __fn: 'asyncValue', value: 7, key: 'fallback' }], expected: 42 }
            ],
            tags: ['fallback', 'retry']
          });
        },
        () => {
          const a = sampleName(rng);
          const b = sampleCity(rng);
          return create({
            title: 'Последовательный пайплайн',
            prompt: 'Даны две async-функции: первая загружает пользователя, вторая принимает объект и возвращает финальную строку. Соедини их последовательно.',
            signature: 'solve(loadUser, formatUser)',
            starterBody: [
              'const user = loadUser();',
              'return formatUser(user);'
            ],
            solutionBody: [
              'const user = await loadUser();',
              'return await formatUser(user);'
            ],
            hints: ['Сначала дождись первого результата.', 'Потом передай его во вторую async-функцию.'],
            explanation: 'Пайплайн из нескольких async-этапов часто встречается в приложениях с загрузкой данных.',
            tests: [
              {
                args: [
                  { __fn: 'asyncValue', value: { name: a, city: b }, key: 'load-user' },
                  { __fn: 'asyncValue', value: `${a.toUpperCase()} from ${b}`, key: 'format-user' }
                ],
                expected: `${a.toUpperCase()} from ${b}`
              }
            ],
            tags: ['pipeline', 'await']
          });
        }
      ])();
    }
    case 'hard': {
      return pickVariant(rng, [
        () => {
          const first = { __fn: 'asyncReject', message: 'timeout', key: 'first' };
          const second = { __fn: 'asyncValue', value: rng.int(1, 9), key: 'second' };
          const third = { __fn: 'asyncValue', value: rng.int(10, 20), key: 'third' };
          return create({
            title: 'Retry с fallback',
            prompt: 'Даны три источника данных. Попробуй первый, затем второй, затем третий и верни первый успешно загруженный результат.',
            signature: 'solve(first, second, third)',
            starterBody: [
              'return await first();'
            ],
            solutionBody: [
              'for (const loader of [first, second, third]) {',
              '  try {',
              '    return await loader();',
              '  } catch (error) {',
              '    // try next loader',
              '  }',
              '}',
              'throw new Error("All loaders failed");'
            ],
            hints: ['Используй цикл по списку загрузчиков.', 'Внутри делай `try/catch` и переходи к следующему.'],
            explanation: 'Это типичный паттерн надёжного получения данных из нескольких источников.',
            tests: [
              { args: [first, second, third], expected: second.value },
              { args: [{ __fn: 'asyncReject', message: 'x', key: 'a' }, { __fn: 'asyncValue', value: 7, key: 'b' }, { __fn: 'asyncValue', value: 9, key: 'c' }], expected: 7 }
            ],
            tags: ['retry', 'fallback']
          });
        },
        () => {
          const values = sampleNumbers(rng, rng.int(4, 6), 1, 9);
          return create({
            title: 'Слияние результатов',
            prompt: 'Дан массив async-функций. Дождись их всех, а затем верни сумму результатов.',
            signature: 'solve(loaders)',
            starterBody: [
              'return loaders[0]();'
            ],
            solutionBody: [
              'const values = await Promise.all(loaders.map((loader) => loader()));',
              'return values.reduce((acc, value) => acc + value, 0);'
            ],
            hints: ['Сначала дождись всех значений.', 'Потом сложи их как обычный массив.'],
            explanation: 'Задача смешивает асинхронный сбор данных и обычную агрегацию.',
            tests: [
              { args: [[
                { __fn: 'asyncValue', value: values[0], key: 'a' },
                { __fn: 'asyncValue', value: values[1], key: 'b' },
                { __fn: 'asyncValue', value: values[2], key: 'c' }
              ]], expected: values.slice(0, 3).reduce((acc, value) => acc + value, 0) },
              { args: [[{ __fn: 'asyncValue', value: 2, key: 'x' }, { __fn: 'asyncValue', value: 3, key: 'y' }]], expected: 5 }
            ],
            tags: ['aggregate', 'async']
          });
        }
      ])();
    }
    case 'expert': {
      return pickVariant(rng, [
        () => {
          const loaders = [
            { __fn: 'asyncReject', message: 'a', key: 'a' },
            { __fn: 'asyncReject', message: 'b', key: 'b' },
            { __fn: 'asyncValue', value: sampleName(rng), key: 'c' }
          ];
          return create({
            title: 'Первый успех',
            prompt: 'Дан массив async-функций. Верни результат первой успешно завершившейся.',
            signature: 'solve(loaders)',
            starterBody: [
              'return loaders[0]();'
            ],
            solutionBody: [
              'return new Promise((resolve, reject) => {',
              '  let remaining = loaders.length;',
              '  let finished = false;',
              '  for (const loader of loaders) {',
              '    Promise.resolve()',
              '      .then(() => loader())',
              '      .then((value) => {',
              '        if (!finished) {',
              '          finished = true;',
              '          resolve(value);',
              '        }',
              '      })',
              '      .catch(() => {',
              '        remaining -= 1;',
              '        if (remaining === 0 && !finished) {',
              '          reject(new Error("All loaders failed"));',
              '        }',
              '      });',
              '  }',
              '});'
            ],
            hints: ['Нужно дождаться первой успешной ветки.', 'Не забудь обработать ситуацию, когда все источники упали.'],
            explanation: 'Это уже серьёзная практика на гонку источников данных и управление результатом.',
            tests: [
              { args: [loaders], expected: loaders[2].value },
              { args: [[{ __fn: 'asyncReject', message: 'x', key: 'x' }, { __fn: 'asyncValue', value: 'ok', key: 'ok' }]], expected: 'ok' }
            ],
            tags: ['race', 'success']
          });
        }
      ])();
    }
    default:
      return buildAsyncTask('easy', rng);
  }
}

module.exports = {
  buildAsyncTask
};
