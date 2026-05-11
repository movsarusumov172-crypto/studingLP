const { buildTask, pickVariant, preview, sampleWords, sampleNumbers, sampleName } = require('../engine/taskShared');

function buildDomTask(difficulty, rng) {
  const create = (spec) => buildTask({
    category: 'dom',
    difficulty,
    strategy: 'dom',
    ...spec
  });

  const makeStatusFixture = (text = 'Черновик') => ({
    body: [
      {
        tag: 'div',
        id: 'status',
        className: 'status',
        text
      }
    ]
  });

  switch (difficulty) {
    case 'easy': {
      return pickVariant(rng, [
        () => {
          return create({
            title: 'Изменение текста',
            prompt: 'На странице есть элемент #status. Измени его текст на "Готово" и добавь класс is-ready.',
            signature: 'solve(document)',
            starterBody: [
              'const status = document.getElementById("status");',
              'status.textContent = "Черновик";'
            ],
            solutionBody: [
              'const status = document.getElementById("status");',
              'status.textContent = "Готово";',
              'status.classList.add("is-ready");'
            ],
            hints: ['Сначала найди элемент через `getElementById`.', 'Потом обнови `textContent` и добавь класс через `classList.add`.'],
            explanation: 'Базовая DOM-задача: найти элемент и обновить текст с состоянием.',
            tests: [
              {
                fixture: makeStatusFixture(),
                assertions: [
                  { target: 'status', type: 'text', equals: 'Готово' },
                  { target: 'status', type: 'classContains', value: 'is-ready' }
                ]
              }
            ],
            tags: ['text', 'class']
          });
        },
        () => {
          const query = `${sampleWords(rng, 2).join(' ')}`;
          return create({
            title: 'Синхронизация ввода',
            prompt: `На странице есть input #query и span #preview. Заполни input значением ${JSON.stringify(query)} и отрази его в preview в верхнем регистре.`,
            signature: 'solve(document)',
            starterBody: [
              'const input = document.getElementById("query");',
              'const preview = document.getElementById("preview");'
            ],
            solutionBody: [
              'const input = document.getElementById("query");',
              'const preview = document.getElementById("preview");',
              `input.value = ${JSON.stringify(query)};`,
              'preview.textContent = input.value.trim().toUpperCase();'
            ],
            hints: ['Можно проставить значение прямо в `input.value`.', 'После этого обнови `preview.textContent`.'],
            explanation: 'Такие задачи учат связывать input и отображение результата.',
            tests: [
              {
                fixture: {
                  body: [
                    { tag: 'input', id: 'query', className: 'query', value: '' },
                    { tag: 'span', id: 'preview', className: 'preview', text: '' }
                  ]
                },
                assertions: [
                  { target: 'query', type: 'value', equals: query },
                  { target: 'preview', type: 'text', equals: query.trim().toUpperCase() }
                ]
              }
            ],
            tags: ['input', 'mirror']
          });
        },
        () => {
          return create({
            title: 'Состояние кнопки',
            prompt: 'На странице есть кнопка #toggle. Переведи её в активное состояние: текст должен стать ON, а класс - is-active.',
            signature: 'solve(document)',
            starterBody: [
              'const toggle = document.getElementById("toggle");'
            ],
            solutionBody: [
              'const toggle = document.getElementById("toggle");',
              'toggle.textContent = "ON";',
              'toggle.classList.add("is-active");'
            ],
            hints: ['Меняй и текст, и класс кнопки.', 'Для этого достаточно `textContent` и `classList.add`.'],
            explanation: 'Простейшая UI-задача: один элемент меняет визуальное состояние и текст.',
            tests: [
              {
                fixture: {
                  body: [
                    { tag: 'button', id: 'toggle', className: 'button', text: 'OFF' }
                  ]
                },
                assertions: [
                  { target: 'toggle', type: 'text', equals: 'ON' },
                  { target: 'toggle', type: 'classContains', value: 'is-active' }
                ]
              }
            ],
            tags: ['button', 'state']
          });
        }
      ])();
    }
    case 'medium': {
      return pickVariant(rng, [
        () => {
          const items = sampleWords(rng, rng.int(3, 5));
          return create({
            title: 'Рендер списка',
            prompt: `На странице есть контейнер #list. Верни туда список элементов из массива items = ${preview(items)} и запиши их в textContent через разделитель " | ".`,
            signature: 'solve(document, items)',
            starterBody: [
              'const list = document.getElementById("list");'
            ],
            solutionBody: [
              'const list = document.getElementById("list");',
              'list.textContent = items.join(" | ");',
              'for (const item of items) {',
              '  const li = document.createElement("li");',
              '  li.textContent = item;',
              '  list.appendChild(li);',
              '}'
            ],
            hints: ['Сначала обнови текст контейнера.', 'Потом можешь собрать дочерние элементы через `createElement`.'],
            explanation: 'Задача показывает базовый рендер списка в DOM.',
            tests: [
              {
                fixture: {
                  body: [
                    { tag: 'ul', id: 'list', className: 'list' }
                  ]
                },
                assertions: [
                  { target: 'list', type: 'text', equals: items.join(' | ') },
                  { target: 'list', type: 'childCount', equals: items.length }
                ]
              }
            ],
            tags: ['render', 'list']
          });
        },
        () => {
          const query = sampleWords(rng, 1)[0];
          const cards = [
            {
              id: 'card-0',
              tag: 'article',
              className: 'card',
              text: `${query} result`
            },
            {
              id: 'card-1',
              tag: 'article',
              className: 'card',
              text: `${sampleWords(rng, 1)[0]} item`
            },
            {
              id: 'card-2',
              tag: 'article',
              className: 'card',
              text: `${sampleWords(rng, 1)[0]} item`
            }
          ];
          return create({
            title: 'Фильтрация карточек',
            prompt: `На странице есть список карточек. Оставь видимыми только те, чей текст содержит ${JSON.stringify(query)}.`,
            signature: 'solve(document, query)',
            starterBody: [
              'const cards = document.querySelectorAll(".card");'
            ],
            solutionBody: [
              'const cards = document.querySelectorAll(".card");',
              'for (const card of cards) {',
              '  const visible = card.textContent.toLowerCase().includes(query.toLowerCase());',
              '  card.classList.toggle("hidden", !visible);',
              '}'
            ],
            hints: ['Сначала найди все карточки через `querySelectorAll`.', 'Потом добавляй или убирай класс `hidden`.'],
            explanation: 'Это практика на фильтрацию DOM-элементов и работу с классами.',
            tests: [
              {
                args: [query],
                fixture: {
                  body: [
                    { tag: 'input', id: 'search', value: query },
                    { tag: 'section', id: 'cards', children: cards }
                  ]
                },
                assertions: [
                  { target: 'card-0', type: 'classMissing', value: 'hidden' },
                  { target: 'card-1', type: 'classContains', value: 'hidden' },
                  { target: 'card-2', type: 'classContains', value: 'hidden' }
                ]
              }
            ],
            tags: ['filter', 'cards']
          });
        },
        () => {
          const tabs = sampleWords(rng, 3);
          const activeIndex = rng.int(0, 2);
          return create({
            title: 'Переключение вкладок',
            prompt: 'На странице есть три вкладки. Активной должна стать та, индекс которой передан во второй аргумент.',
            signature: 'solve(document, activeIndex)',
            starterBody: [
              'const tabs = document.querySelectorAll(".tab");'
            ],
            solutionBody: [
              'const tabs = document.querySelectorAll(".tab");',
              'tabs.forEach((tab, index) => {',
              '  tab.classList.toggle("is-active", index === activeIndex);',
              '});'
            ],
            hints: ['`querySelectorAll` вернёт коллекцию вкладок.', 'Сравни индекс каждой вкладки с activeIndex.'],
            explanation: 'Задача тренирует переключение UI-состояния на наборе однотипных элементов.',
            tests: [
              {
                fixture: {
                  body: [
                    {
                      tag: 'div',
                      id: 'tabs',
                      children: tabs.map((tab, index) => ({
                        tag: 'button',
                        id: `tab-${index}`,
                        className: 'tab',
                        text: tab
                      }))
                    }
                  ]
                },
                assertions: [
                  { target: `tab-${activeIndex}`, type: 'classContains', value: 'is-active' }
                ]
              }
            ],
            tags: ['tabs', 'toggle']
          });
        }
      ])();
    }
    case 'hard': {
      return pickVariant(rng, [
        () => {
          const scores = sampleNumbers(rng, 4, 1, 99);
          const topIndex = scores.indexOf(Math.max(...scores));
          return create({
            title: 'Сортировка лидеров',
            prompt: 'На странице есть список карточек с атрибутом data-score. Отсортируй их по score по убыванию и пометь лидера классом top.',
            signature: 'solve(document)',
            starterBody: [
              'const board = document.getElementById("board");'
            ],
            solutionBody: [
              'const board = document.getElementById("board");',
              'const cards = Array.from(board.children);',
              'cards.sort((a, b) => Number(b.getAttribute("data-score")) - Number(a.getAttribute("data-score")));',
              'board.textContent = "";',
              'for (const card of cards) {',
              '  board.appendChild(card);',
              '}',
              'if (cards[0]) {',
              '  cards[0].classList.add("top");',
              '}'
            ],
            hints: ['Сначала скопируй детей в массив.', 'Потом отсортируй и пересобери DOM в новом порядке.'],
            explanation: 'Эта задача сложнее, потому что нужно не только менять текст, но и перестраивать порядок элементов.',
            tests: [
              {
                fixture: {
                  body: [
                    {
                      tag: 'section',
                      id: 'board',
                      children: scores.map((score, index) => ({
                        tag: 'article',
                        id: `card-${index}`,
                        className: 'card',
                        attrs: { 'data-score': String(score) },
                        text: `${score}`
                      }))
                    }
                  ]
                },
                assertions: [
                  { target: 'board', type: 'childCount', equals: 4 },
                  { target: `card-${topIndex}`, type: 'classContains', value: 'top' }
                ]
              }
            ],
            tags: ['sort', 'leaderboard']
          });
        },
        () => {
          const todos = sampleWords(rng, 4).map((word, index) => ({
            tag: 'li',
            id: `todo-${index}`,
            className: index % 2 === 0 ? 'todo done' : 'todo',
            text: word
          }));
          return create({
            title: 'Счётчик задач',
            prompt: 'На странице есть список todo. Посчитай количество выполненных задач и запиши результат в #count.',
            signature: 'solve(document)',
            starterBody: [
              'const count = document.getElementById("count");'
            ],
            solutionBody: [
              'const doneCount = Array.from(document.querySelectorAll(".todo")).filter((item) => item.classList.contains("done")).length;',
              'const count = document.getElementById("count");',
              'count.textContent = String(doneCount);'
            ],
            hints: ['`querySelectorAll` + `filter` - удобная комбинация.', 'Потом записывай количество в текстовый узел.'],
            explanation: 'DOM-задача на подсчёт состояния списка элементов.',
            tests: [
              {
                fixture: {
                  body: [
                    { tag: 'span', id: 'count', text: '0' },
                    { tag: 'ul', id: 'todos', children: todos }
                  ]
                },
                assertions: [
                  { target: 'count', type: 'text', equals: '2' }
                ]
              }
            ],
            tags: ['count', 'todo']
          });
        }
      ])();
    }
    case 'expert': {
      return pickVariant(rng, [
        () => {
          const activeCount = rng.int(2, 4);
          const items = Array.from({ length: 5 }, (_, index) => ({
            tag: 'article',
            id: `item-${index}`,
            className: index < activeCount ? 'panel active' : 'panel',
            text: `Item ${index + 1}`
          }));
          return create({
            title: 'Панель статистики',
            prompt: 'На странице есть набор карточек. Посчитай активные элементы и отрази их число в #summary, а сам список упорядочь так, чтобы активные были первыми.',
            signature: 'solve(document)',
            starterBody: [
              'const summary = document.getElementById("summary");'
            ],
            solutionBody: [
              'const items = Array.from(document.querySelectorAll(".panel"));',
              'const active = items.filter((item) => item.classList.contains("active"));',
              'const inactive = items.filter((item) => !item.classList.contains("active"));',
              'const board = document.getElementById("board");',
              'board.textContent = "";',
              'for (const item of [...active, ...inactive]) {',
              '  board.appendChild(item);',
              '}',
              'const summary = document.getElementById("summary");',
              'summary.textContent = String(active.length);'
            ],
            hints: ['Сначала раздели элементы на активные и неактивные.', 'Потом пересобери DOM и обнови summary.'],
            explanation: 'Экспертный DOM-сценарий уже похож на реальную UI-логику с агрегацией и перестройкой.',
            tests: [
              {
                fixture: {
                  body: [
                    { tag: 'div', id: 'summary', text: '0' },
                    {
                      tag: 'section',
                      id: 'board',
                      children: items
                    }
                  ]
                },
                assertions: [
                  { target: 'summary', type: 'text', equals: String(activeCount) },
                  { target: 'board', type: 'childCount', equals: 5 }
                ]
              }
            ],
            tags: ['dashboard', 'reorder']
          });
        }
      ])();
    }
    default:
      return buildDomTask('easy', rng);
  }
}

module.exports = {
  buildDomTask
};
