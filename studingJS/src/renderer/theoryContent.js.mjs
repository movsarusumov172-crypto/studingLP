import { buildTheoryTopicList as helperList, buildTheoryTopicHtml as helperHtml } from './theoryHelpers.mjs';

export const LANGUAGE_LABEL = 'JavaScript теория';

export const THEORY_TOPICS = [
  {
    id: 'variables',
    title: 'Переменные и область видимости',
    shortTitle: 'Переменные',
    simpleExplanation: 'let и const создают блочные переменные. var — функциональные, поднимаются вверх и дают сюрпризы. На практике: const по умолчанию, let когда нужно переприсваивать, var — никогда.',
    howItWorks: 'JS хранит переменные в лексическом окружении (замыкании). const не значит «неизменяемый» — объект через const всё равно мутируется. Означает лишь «нельзя переприсвоить саму привязку».',
    syntax: [
      'const name = "Alex";',
      'let count = 0;\ncount += 1;',
      'const obj = { x: 1 };\nobj.x = 2; // OK — мутация объекта',
      '{ let block = 1; } // block снаружи не виден'
    ],
    examples: [
      { title: 'Простой', note: 'const для примитива — нельзя переприсвоить.', code: 'const pi = 3.14;\n// pi = 3; → TypeError' },
      { title: 'Средний', note: 'let в цикле создаёт отдельный экземпляр на каждой итерации.', code: 'for (let i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}\n// 0, 1, 2 — не 3, 3, 3' },
      { title: 'Реальный', note: 'Деструктуризация + const — читаемо и безопасно.', code: 'const { name, age = 18 } = user;\nconsole.log(name, age);' }
    ],
    commonMistakes: [
      'Используют var в современном коде и получают hoisting-сюрпризы.',
      'Путают «нельзя переприсвоить const» с «нельзя мутировать».',
      'Объявляют let там где const достаточно — усложняет чтение.'
    ],
    importantNuances: [
      'Временная мёртвая зона: let/const существуют в блоке с самого начала, но до объявления — ReferenceError.',
      'var поднимается (hoisting) и инициализируется как undefined.',
      'Деструктуризация работает и в параметрах функций.'
    ],
    checklist: [
      'Знаю разницу let / const / var.',
      'Понимаю блочную область видимости.',
      'Не использую var.',
      'Могу деструктурировать объекты и массивы.'
    ],
    practiceHint: 'Попробуй задачи на closures — там видно как let и var ведут себя внутри циклов.',
    practiceCategory: 'closures'
  },
  {
    id: 'types',
    title: 'Типы и приведение',
    shortTitle: 'Типы',
    simpleExplanation: 'JS — динамически типизирован. Примитивы (number, string, boolean, null, undefined, symbol, bigint) хранятся по значению. Объекты — по ссылке. Неявное приведение типов — главный источник WTF в JS.',
    howItWorks: 'При операции между разными типами JS пытается привести их к общему. == делает coercion, === — никогда. typeof null === "object" — историческая ошибка.',
    syntax: [
      'typeof 42          // "number"',
      'typeof null        // "object" ← баг стандарта',
      'typeof undefined   // "undefined"',
      'Number("3")        // 3',
      'Boolean("")        // false',
      '"5" + 3            // "53" (string wins)',
      '"5" - 3            // 2  (numeric context)'
    ],
    examples: [
      { title: 'Простой', note: 'Всегда === для сравнения.', code: 'console.log(0 == false);  // true  ← ловушка\nconsole.log(0 === false); // false ← правильно' },
      { title: 'Средний', note: 'Проверка на null/undefined.', code: 'const val = null;\nif (val == null) console.log("null or undefined");\n// охватывает оба случая через coercion' },
      { title: 'Реальный', note: 'Явное приведение вместо надежды на JS.', code: 'const input = "42";\nconst num = Number(input);\nif (!Number.isNaN(num)) console.log(num * 2);' }
    ],
    commonMistakes: [
      'Используют == вместо === и получают неожиданные совпадения.',
      'Проверяют typeof null === "null" — не работает.',
      'Забывают что пустая строка, 0, null, undefined, NaN — всё falsy.'
    ],
    importantNuances: [
      'NaN !== NaN — используй Number.isNaN().',
      'null == undefined, но null !== undefined.',
      'Object.is() — самое строгое сравнение (отличает +0 от -0, NaN от NaN).'
    ],
    checklist: [
      'Знаю 7 примитивных типов.',
      'Всегда использую ===.',
      'Понимаю falsy-значения.',
      'Умею явно приводить типы.'
    ],
    practiceHint: 'Задачи на массивы часто требуют правильного приведения — попробуй filter с числовыми строками.',
    practiceCategory: 'arrays'
  },
  {
    id: 'functions',
    title: 'Функции и стрелки',
    shortTitle: 'Функции',
    simpleExplanation: 'В JS функции — объекты первого класса. Их можно передавать, возвращать, хранить в переменных. Стрелочные функции не имеют своего this и arguments — это ключевое различие.',
    howItWorks: 'Function declaration поднимается целиком. Function expression — только переменная (как let/const). Arrow function захватывает this из внешнего контекста — не создаёт свой.',
    syntax: [
      'function add(a, b) { return a + b; }',
      'const add = (a, b) => a + b;',
      'const add = (a, b) => { return a + b; };',
      'const double = x => x * 2;',
      'function greet(name = "World") { return `Hello, ${name}`; }',
      'function sum(...nums) { return nums.reduce((a, b) => a + b, 0); }'
    ],
    examples: [
      { title: 'Простой', note: 'Стрелка для коротких трансформаций.', code: 'const nums = [1, 2, 3];\nconst doubled = nums.map(x => x * 2);\n// [2, 4, 6]' },
      { title: 'Средний', note: 'Функция высшего порядка.', code: 'function multiplier(factor) {\n  return (num) => num * factor;\n}\nconst triple = multiplier(3);\nconsole.log(triple(5)); // 15' },
      { title: 'Реальный', note: 'Параметры по умолчанию + rest.', code: 'const log = (level = "info", ...msgs) =>\n  msgs.forEach(m => console.log(`[${level}]`, m));\nlog("warn", "timeout", "retry");' }
    ],
    commonMistakes: [
      'Используют стрелку как метод объекта — this будет не тем.',
      'Забывают return в теле {} стрелочной функции.',
      'Путают function declaration (поднимается) и expression (не поднимается).'
    ],
    importantNuances: [
      'Arrow function нельзя вызвать с new.',
      'arguments недоступен в стрелке — используй rest (...args).',
      'Методы объекта лучше писать через обычные функции или shorthand.'
    ],
    checklist: [
      'Знаю разницу declaration / expression / arrow.',
      'Понимаю захват this в стрелочных функциях.',
      'Умею использовать default и rest параметры.',
      'Могу создавать функции высшего порядка.'
    ],
    practiceHint: 'Задачи на функции и замыкания — идеально для закрепления.',
    practiceCategory: 'functions'
  },
  {
    id: 'arrays',
    title: 'Массивы и методы',
    shortTitle: 'Массивы',
    simpleExplanation: 'Массивы JS — объекты с числовыми ключами. Главные методы: map (трансформировать), filter (отобрать), reduce (свернуть), find (первый подходящий). Все они возвращают новый результат, не мутируя исходный.',
    howItWorks: 'map/filter/reduce принимают callback и работают последовательно по элементам. reduce аккумулирует значение через acc. flat и flatMap работают с вложенными массивами.',
    syntax: [
      'arr.map(x => x * 2)',
      'arr.filter(x => x > 0)',
      'arr.reduce((acc, x) => acc + x, 0)',
      'arr.find(x => x.id === id)',
      'arr.findIndex(x => x > 5)',
      'arr.some(x => x < 0)',
      'arr.every(x => x > 0)',
      '[...arr1, ...arr2]  // spread merge',
      'arr.flat(2)         // разворачивает вложения'
    ],
    examples: [
      { title: 'Простой', note: 'map + filter — типичная цепочка.', code: 'const nums = [1, -2, 3, -4];\nconst result = nums\n  .filter(x => x > 0)\n  .map(x => x * 10);\n// [10, 30]' },
      { title: 'Средний', note: 'reduce для подсчёта частот.', code: 'const words = ["a", "b", "a", "c", "b", "a"];\nconst freq = words.reduce((acc, w) => {\n  acc[w] = (acc[w] || 0) + 1;\n  return acc;\n}, {});\n// { a: 3, b: 2, c: 1 }' },
      { title: 'Реальный', note: 'Группировка объектов по полю.', code: 'const byCategory = items.reduce((acc, item) => {\n  (acc[item.category] ??= []).push(item);\n  return acc;\n}, {});' }
    ],
    commonMistakes: [
      'Мутируют массив внутри map — используют arr.push() вместо возврата нового значения.',
      'Забывают initialValue в reduce — ломается на пустом массиве.',
      'Используют for...in для массивов — перебирает ключи, не элементы.'
    ],
    importantNuances: [
      'splice мутирует массив, slice — нет.',
      'includes использует SameValueZero — находит NaN.',
      'indexOf не находит NaN.'
    ],
    checklist: [
      'Умею цеплять map/filter/reduce.',
      'Знаю разницу мутирующих и чистых методов.',
      'Использую spread для объединения.',
      'Могу писать reduce с нуля.'
    ],
    practiceHint: 'Задачи на массивы — прямой тренажёр этих методов.',
    practiceCategory: 'arrays'
  },
  {
    id: 'objects',
    title: 'Объекты и деструктуризация',
    shortTitle: 'Объекты',
    simpleExplanation: 'Объекты — это коллекции ключ-значение. В JS почти всё является объектом. Деструктуризация, spread, Object.keys/values/entries — базовый инструментарий.',
    howItWorks: 'Объекты хранятся по ссылке. Присваивание копирует ссылку, не значение. Object.assign и spread {...obj} делают поверхностную копию — вложенные объекты всё ещё разделяются.',
    syntax: [
      'const { a, b = 0 } = obj;          // деструктуризация с дефолтом',
      'const { a: alias } = obj;           // переименование',
      'const { x, ...rest } = obj;         // rest',
      'const merged = { ...obj1, ...obj2 };',
      'Object.keys(obj)',
      'Object.entries(obj)',
      'Object.fromEntries(entries)'
    ],
    examples: [
      { title: 'Простой', note: 'Деструктуризация в параметре функции.', code: 'function greet({ name, age = 0 }) {\n  return `${name}, ${age} лет`;\n}\ngreet({ name: "Misha", age: 21 });' },
      { title: 'Средний', note: 'Merge с перезаписью.', code: 'const defaults = { color: "blue", size: "M" };\nconst userPref = { size: "L" };\nconst config = { ...defaults, ...userPref };\n// { color: "blue", size: "L" }' },
      { title: 'Реальный', note: 'Object.entries для трансформации значений.', code: 'const prices = { apple: 1.5, banana: 0.8 };\nconst doubled = Object.fromEntries(\n  Object.entries(prices).map(([k, v]) => [k, v * 2])\n);' }
    ],
    commonMistakes: [
      'Думают что spread делает глубокую копию — нет, только поверхностную.',
      'Забывают что obj1 === obj2 проверяет ссылку, не значение.',
      'Используют delete вместо создания нового объекта без ключа.'
    ],
    importantNuances: [
      'Для глубокого клонирования: structuredClone(obj).',
      'Computed property names: { [key]: value }.',
      'Shorthand: { name } вместо { name: name }.'
    ],
    checklist: [
      'Умею деструктурировать с псевдонимами и дефолтами.',
      'Понимаю что spread — поверхностная копия.',
      'Умею Object.entries/fromEntries.',
      'Знаю structuredClone для глубокого клонирования.'
    ],
    practiceHint: 'Задачи на объекты — слияние, нормализация, diff объектов.',
    practiceCategory: 'objects'
  },
  {
    id: 'closures',
    title: 'Замыкания',
    shortTitle: 'Замыкания',
    simpleExplanation: 'Замыкание — функция, которая запоминает переменные из своего лексического окружения даже после того как внешняя функция вернулась. Это не магия — это просто доступ к переменной из внешнего scope.',
    howItWorks: 'Каждый вызов функции создаёт новое лексическое окружение. Внутренняя функция держит ссылку на него. Пока внутренняя функция жива — окружение не удаляется сборщиком мусора.',
    syntax: [
      'function counter() {\n  let count = 0;\n  return () => ++count;\n}',
      'const inc = counter();\ninc(); // 1\ninc(); // 2',
      '// Каждый вызов counter() — своё замыкание\nconst a = counter();\nconst b = counter();\na(); a(); // 1, 2\nb();      // 1'
    ],
    examples: [
      { title: 'Простой', note: 'Счётчик с приватным состоянием.', code: 'function makeCounter(start = 0) {\n  let n = start;\n  return {\n    inc: () => ++n,\n    dec: () => --n,\n    get: () => n\n  };\n}' },
      { title: 'Средний', note: 'Мемоизация через замыкание.', code: 'function memoize(fn) {\n  const cache = new Map();\n  return (...args) => {\n    const key = JSON.stringify(args);\n    if (!cache.has(key)) cache.set(key, fn(...args));\n    return cache.get(key);\n  };\n}' },
      { title: 'Реальный', note: 'Фабрика валидаторов.', code: 'const inRange = (min, max) =>\n  (val) => val >= min && val <= max;\nconst isAdult = inRange(18, 120);\nconsole.log(isAdult(21)); // true' }
    ],
    commonMistakes: [
      'Классический баг с var в цикле — все колбэки видят одну переменную.',
      'Утечка памяти: держат замыкание с большими объектами дольше чем нужно.',
      'Думают что каждое замыкание — это копия переменной. Нет, это ссылка.'
    ],
    importantNuances: [
      'let в цикле создаёт новый binding на каждой итерации — замыкания изолированы.',
      'IIFE (немедленно вызываемые функции) использовали для изоляции до let/const.',
      'Модули ES6 — это тоже замыкания, только на уровне файла.'
    ],
    checklist: [
      'Понимаю что замыкание — ссылка на окружение, не копия.',
      'Знаю баг с var в цикле и решение через let.',
      'Умею писать фабричные функции с приватным состоянием.',
      'Могу реализовать мемоизацию.'
    ],
    practiceHint: 'Задачи на closures — счётчики, кэши, фабрики. Именно там замыкания раскрываются.',
    practiceCategory: 'closures'
  },
  {
    id: 'async',
    title: 'Promise и async/await',
    shortTitle: 'Async',
    simpleExplanation: 'Promise — обёртка над асинхронным результатом: pending → fulfilled/rejected. async/await — синтаксический сахар над Promise, делает асинхронный код похожим на синхронный.',
    howItWorks: 'await приостанавливает выполнение async-функции до resolve Promise. Под капотом это генератор + Promise. Event loop обрабатывает microtask очередь (Promise.then) перед macrotask (setTimeout).',
    syntax: [
      'const p = new Promise((resolve, reject) => {\n  setTimeout(() => resolve(42), 1000);\n});',
      'p.then(val => console.log(val)).catch(err => console.error(err));',
      'async function load() {\n  const data = await fetchData();\n  return data;\n}',
      'const [a, b] = await Promise.all([fetch(url1), fetch(url2)]);',
      'const result = await Promise.allSettled([p1, p2]);'
    ],
    examples: [
      { title: 'Простой', note: 'try/catch с async/await.', code: 'async function getUser(id) {\n  try {\n    const res = await fetch(`/users/${id}`);\n    return await res.json();\n  } catch (err) {\n    console.error("Failed:", err);\n    return null;\n  }\n}' },
      { title: 'Средний', note: 'Promise.all — параллельно.', code: 'const [user, posts] = await Promise.all([\n  fetchUser(id),\n  fetchPosts(id)\n]);\n// оба запроса идут одновременно' },
      { title: 'Реальный', note: 'Retry с экспоненциальным backoff.', code: 'async function withRetry(fn, retries = 3, delay = 300) {\n  for (let i = 0; i < retries; i++) {\n    try { return await fn(); }\n    catch (err) {\n      if (i === retries - 1) throw err;\n      await new Promise(r => setTimeout(r, delay * 2 ** i));\n    }\n  }\n}' }
    ],
    commonMistakes: [
      'Забывают await — функция возвращает Promise, а не значение.',
      'Используют forEach с async — не ждёт завершения итераций.',
      'Не обрабатывают ошибки в Promise — UnhandledRejection.'
    ],
    importantNuances: [
      'Promise.all падает на первой ошибке. Promise.allSettled — собирает все результаты.',
      'async функция всегда возвращает Promise, даже если return синхронный.',
      'for...of с await работает последовательно, Promise.all — параллельно.'
    ],
    checklist: [
      'Понимаю три состояния Promise.',
      'Умею async/await с try/catch.',
      'Знаю разницу Promise.all / allSettled / race.',
      'Не использую forEach для async-итераций.'
    ],
    practiceHint: 'Задачи на async — retry, pipeline, concurrency. Идеальный тренажёр.',
    practiceCategory: 'async'
  },
  {
    id: 'dom',
    title: 'DOM и события',
    shortTitle: 'DOM',
    simpleExplanation: 'DOM — объектная модель HTML-документа. JS работает с ним через document. Главные операции: найти элемент, прочитать/изменить его свойства, слушать события.',
    howItWorks: 'Events всплывают (bubble) от целевого элемента вверх до document. addEventListener добавляет слушателей. Event delegation — один слушатель на родителе вместо тысячи на детях.',
    syntax: [
      'document.querySelector(".btn")',
      'document.querySelectorAll("li")',
      'el.textContent = "text";',
      'el.classList.add("active");',
      'el.classList.toggle("open");',
      'el.setAttribute("aria-hidden", "true");',
      'el.addEventListener("click", handler);',
      'el.removeEventListener("click", handler);'
    ],
    examples: [
      { title: 'Простой', note: 'Добавить/убрать класс по клику.', code: 'const btn = document.querySelector("#toggle");\nbtn.addEventListener("click", () => {\n  document.body.classList.toggle("dark");\n});' },
      { title: 'Средний', note: 'Event delegation — один listener на список.', code: 'list.addEventListener("click", (e) => {\n  const item = e.target.closest("li");\n  if (!item) return;\n  item.classList.toggle("done");\n});' },
      { title: 'Реальный', note: 'Рендер списка из данных.', code: 'function renderList(items, container) {\n  container.innerHTML = items\n    .map(item => `<li data-id="${item.id}">${item.name}</li>`)\n    .join("");\n}' }
    ],
    commonMistakes: [
      'Добавляют addEventListener в цикле без delegation — тысячи слушателей.',
      'Используют innerHTML для пользовательского ввода — XSS уязвимость.',
      'Забывают что querySelectorAll возвращает NodeList, а не Array.'
    ],
    importantNuances: [
      'event.stopPropagation() останавливает всплытие.',
      'event.preventDefault() отменяет дефолтное поведение (submit, follow link).',
      'NodeList можно spread-нуть в Array: [...nodeList].'
    ],
    checklist: [
      'Умею querySelector / querySelectorAll.',
      'Умею classList add/remove/toggle.',
      'Понимаю event delegation.',
      'Знаю про XSS при innerHTML с пользовательскими данными.'
    ],
    practiceHint: 'DOM-задачи тренируют именно эти паттерны: обновление UI, списки, события.',
    practiceCategory: 'dom'
  }
];

const TOPIC_INDEX = new Map(THEORY_TOPICS.map((t) => [t.id, t]));

const PRACTICE_ROUTES = {
  variables: 'closures',
  types: 'arrays',
  functions: 'functions',
  arrays: 'arrays',
  objects: 'objects',
  closures: 'closures',
  async: 'async',
  dom: 'dom'
};

export function getTheoryTopicById(id) {
  return (id ? TOPIC_INDEX.get(id) : null) ?? THEORY_TOPICS[0] ?? null;
}

export function getTheoryPracticeRoute(id) {
  const topic = getTheoryTopicById(id);
  if (!topic) return null;
  return {
    topicId: topic.id,
    topicTitle: topic.title,
    shortTitle: topic.shortTitle || topic.title,
    practiceCategory: topic.practiceCategory || PRACTICE_ROUTES[topic.id] || 'arrays',
    practiceLabel: topic.practiceHint || topic.title
  };
}

export function buildTheoryTopicList(activeId) {
  return helperList(THEORY_TOPICS, activeId);
}

export function buildTheoryTopicHtml(topic) {
  return helperHtml(topic, LANGUAGE_LABEL);
}
