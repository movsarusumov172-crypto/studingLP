import { buildTheoryTopicList as helperList, buildTheoryTopicHtml as helperHtml } from './theoryHelpers.mjs';

export const LANGUAGE_LABEL = 'C теория';

export const THEORY_TOPICS = [
  {
    id: 'variables',
    title: 'Переменные и типы',
    shortTitle: 'Переменные',
    simpleExplanation: 'C — статически типизирован. Каждая переменная имеет конкретный тип, объявленный заранее. Нет автоматической инициализации — локальные переменные содержат мусор пока не присвоишь значение.',
    howItWorks: 'Компилятор выделяет память на стеке при объявлении. Размер типа зависит от платформы (int — обычно 4 байта). sizeof() возвращает точный размер.',
    syntax: [
      'int x = 10;',
      'float pi = 3.14f;',
      'char c = \'A\';',
      'unsigned int n = 255u;',
      'long long big = 1000000000LL;',
      'const int MAX = 100;'
    ],
    examples: [
      { title: 'Простой', note: 'Базовые типы.', code: 'int age = 21;\nfloat height = 1.75f;\nchar grade = \'A\';\nprintf("%d %.2f %c\\n", age, height, grade);' },
      { title: 'Средний', note: 'sizeof для проверки размера.', code: 'printf("int: %zu bytes\\n", sizeof(int));\nprintf("long: %zu bytes\\n", sizeof(long));' },
      { title: 'Реальный', note: 'Переполнение — тихая катастрофа.', code: 'unsigned char x = 255;\nx++; // x = 0, не ошибка!\nprintf("%d\\n", x);' }
    ],
    commonMistakes: [
      'Используют неинициализированную переменную — undefined behavior.',
      'Путают int и unsigned int при сравнении — подписанность меняет результат.',
      'Забывают суффиксы: 3.14 — double, 3.14f — float.'
    ],
    importantNuances: [
      'int минимум 16 бит, на 64-битных — обычно 32.',
      'size_t — правильный тип для размеров и индексов.',
      'Целочисленное деление: 5/2 = 2, не 2.5.'
    ],
    checklist: [
      'Всегда инициализирую переменные.',
      'Знаю размеры основных типов.',
      'Понимаю переполнение целых.',
      'Использую const для неизменяемых значений.'
    ],
    practiceHint: 'C-задачи начинаются с правильных типов и арифметики.',
    practiceCategory: 'arrays'
  },
  {
    id: 'pointers',
    title: 'Указатели',
    shortTitle: 'Указатели',
    simpleExplanation: 'Указатель хранит адрес памяти другой переменной. & берёт адрес, * разыменовывает (получает значение по адресу). Указатели — главная суперсила C и главный источник ошибок.',
    howItWorks: 'Стек и куча — разные области памяти. Локальные переменные — стек. malloc — куча. Указатель на локальную переменную становится dangling после возврата из функции.',
    syntax: [
      'int x = 10;\nint *p = &x;   // p хранит адрес x',
      '*p = 20;       // x теперь 20',
      'printf("%p\\n", (void*)p);  // адрес',
      'int *arr = malloc(10 * sizeof(int));',
      'free(arr);',
      'arr = NULL;    // хорошая практика'
    ],
    examples: [
      { title: 'Простой', note: 'Swap через указатели.', code: 'void swap(int *a, int *b) {\n  int tmp = *a;\n  *a = *b;\n  *b = tmp;\n}\nswap(&x, &y);' },
      { title: 'Средний', note: 'Указатель на указатель.', code: 'int x = 5;\nint *p = &x;\nint **pp = &p;\n**pp = 42; // x = 42' },
      { title: 'Реальный', note: 'NULL проверка обязательна.', code: 'int *buf = malloc(size * sizeof(int));\nif (buf == NULL) {\n  fprintf(stderr, "OOM\\n");\n  return -1;\n}' }
    ],
    commonMistakes: [
      'Разыменовывают NULL — segfault.',
      'Возвращают указатель на локальную переменную — dangling pointer.',
      'Забывают free() — утечка памяти.'
    ],
    importantNuances: [
      'Указатель сам по себе — просто число (адрес).',
      'Void* — универсальный указатель, требует каст при разыменовании.',
      'const int *p — нельзя менять *p. int * const p — нельзя менять p.'
    ],
    checklist: [
      'Всегда проверяю указатель на NULL перед разыменованием.',
      'Каждый malloc имеет свой free.',
      'После free устанавливаю указатель в NULL.',
      'Не возвращаю указатели на локальные переменные.'
    ],
    practiceHint: 'Задачи на массивы в C — прямая работа с указателями.',
    practiceCategory: 'arrays'
  },
  {
    id: 'arrays-strings',
    title: 'Массивы и строки',
    shortTitle: 'Массивы',
    simpleExplanation: 'Массив в C — непрерывный блок памяти. Имя массива — это указатель на первый элемент. Строки — массивы char с нулевым терминатором \'\\0\' в конце.',
    howItWorks: 'Нет проверки границ — выход за пределы это UB. strlen не включает \'\\0\'. strcpy/strcat могут переполнить буфер — используй strncpy/strncat.',
    syntax: [
      'int arr[5] = {1, 2, 3, 4, 5};',
      'arr[0] = 10;',
      'char s[] = "hello";  // 6 байт: h,e,l,l,o,\\0',
      'char buf[64];\nstrncpy(buf, src, sizeof(buf) - 1);\nbuf[sizeof(buf)-1] = \'\\0\';',
      'strlen(s)  // длина без \\0'
    ],
    examples: [
      { title: 'Простой', note: 'Перебор массива.', code: 'int arr[] = {5, 3, 1, 4, 2};\nint n = sizeof(arr) / sizeof(arr[0]);\nfor (int i = 0; i < n; i++)\n  printf("%d ", arr[i]);' },
      { title: 'Средний', note: 'Передача массива в функцию.', code: 'void reverse(int *arr, int n) {\n  for (int i = 0; i < n/2; i++) {\n    int tmp = arr[i];\n    arr[i] = arr[n-1-i];\n    arr[n-1-i] = tmp;\n  }\n}' },
      { title: 'Реальный', note: 'Безопасная работа со строками.', code: 'char dest[32];\nsnprintf(dest, sizeof(dest), "Hello, %s!", name);\n// snprintf всегда добавляет \\0' }
    ],
    commonMistakes: [
      'Забывают место для \'\\0\' — char s[5] = "hello" — UB.',
      'Передают массив в функцию и берут sizeof — получают размер указателя, не массива.',
      'Используют strcpy вместо strncpy — переполнение буфера.'
    ],
    importantNuances: [
      'sizeof(arr)/sizeof(arr[0]) — надёжный способ получить длину массива.',
      'Многомерный массив: int m[3][4] — строка-мажорный порядок.',
      'snprintf предпочтительнее sprintf — всегда безопасен.'
    ],
    checklist: [
      'Всегда слежу за границами массива.',
      'Использую snprintf вместо sprintf.',
      'Знаю sizeof трюк для длины статического массива.',
      'Не забываю \\0 в конце строки.'
    ],
    practiceHint: 'Алгоритмы на C — сортировки, поиск, строковые задачи.',
    practiceCategory: 'algorithms'
  },
  {
    id: 'functions',
    title: 'Функции',
    shortTitle: 'Функции',
    simpleExplanation: 'В C параметры передаются по значению. Для изменения переменной из вызывающего кода — передай указатель. Функции нужно объявить (или определить) до первого использования.',
    howItWorks: 'Прототип (объявление) описывает сигнатуру без тела. Определение — тело. Рекурсия работает, но стек ограничен. Указатели на функции — первоклассные объекты для callback.',
    syntax: [
      'int add(int a, int b);          // прототип',
      'int add(int a, int b) { return a + b; }',
      'void update(int *x) { *x += 1; }',
      'int (*compare)(int, int);       // указатель на функцию',
      'qsort(arr, n, sizeof(int), cmp);'
    ],
    examples: [
      { title: 'Простой', note: 'Передача по указателю.', code: 'void increment(int *n) { (*n)++; }\nint x = 5;\nincrement(&x);\nprintf("%d\\n", x); // 6' },
      { title: 'Средний', note: 'Функция-компаратор для qsort.', code: 'int cmp(const void *a, const void *b) {\n  return (*(int*)a - *(int*)b);\n}\nqsort(arr, n, sizeof(int), cmp);' },
      { title: 'Реальный', note: 'Указатель на функцию как callback.', code: 'typedef int (*Predicate)(int);\nvoid filter(int *arr, int n, int *out, int *cnt, Predicate pred) {\n  for (int i = 0; i < n; i++)\n    if (pred(arr[i])) out[(*cnt)++] = arr[i];\n}' }
    ],
    commonMistakes: [
      'Вызывают функцию до объявления — компилятор не знает типы.',
      'Возвращают указатель на локальную переменную — dangling.',
      'Путают (*p)++ и *p++ — разные операции.'
    ],
    importantNuances: [
      'static функция — видна только в своём .c файле.',
      'inline — подсказка компилятору, не гарантия.',
      'va_list для функций с переменным числом аргументов (printf-стиль).'
    ],
    checklist: [
      'Объявляю прототипы в .h файлах.',
      'Передаю указатели когда нужно изменить значение.',
      'Умею использовать функции как аргументы (callback).',
      'Понимаю стековые ограничения рекурсии.'
    ],
    practiceHint: 'Алгоритмы в C требуют понимания функций и указателей одновременно.',
    practiceCategory: 'functions'
  },
  {
    id: 'structs',
    title: 'Структуры и typedef',
    shortTitle: 'Структуры',
    simpleExplanation: 'struct объединяет данные разных типов. typedef даёт удобный псевдоним. Структуры передаются по значению (копируются) — для больших структур используй указатель.',
    howItWorks: 'Поля структуры могут быть выровнены компилятором (padding). Стрелка -> разыменовывает указатель и обращается к полю.',
    syntax: [
      'typedef struct {\n  char name[50];\n  int  age;\n} User;',
      'User u = {"Alex", 21};',
      'User *p = &u;\np->age = 22;        // p->age = (*p).age',
      'printf("%s %d\\n", u.name, u.age);'
    ],
    examples: [
      { title: 'Простой', note: 'Создание и доступ.', code: 'typedef struct { int x, y; } Point;\nPoint p = {3, 4};\nprintf("(%d, %d)\\n", p.x, p.y);' },
      { title: 'Средний', note: 'Функция принимает указатель на struct.', code: 'float distance(const Point *a, const Point *b) {\n  int dx = a->x - b->x;\n  int dy = a->y - b->y;\n  return sqrtf(dx*dx + dy*dy);\n}' },
      { title: 'Реальный', note: 'Массив структур.', code: 'User users[100];\nfor (int i = 0; i < n; i++)\n  printf("%s\\n", users[i].name);' }
    ],
    commonMistakes: [
      'Передают большую struct по значению — ненужное копирование.',
      'Забывают -> при работе с указателем на struct.',
      'Не учитывают padding при сериализации в бинарный формат.'
    ],
    importantNuances: [
      '__attribute__((packed)) убирает padding — для протоколов.',
      'Самореференсные struct возможны только через указатель (linked list).',
      'Инициализация нулём: User u = {0};'
    ],
    checklist: [
      'Использую typedef для удобства.',
      'Передаю большие struct через указатель.',
      'Понимаю -> vs . для доступа к полям.',
      'Умею инициализировать struct через литерал.'
    ],
    practiceHint: 'Задачи на объекты отражают работу со структурами.',
    practiceCategory: 'objects'
  }
];

const TOPIC_INDEX = new Map(THEORY_TOPICS.map((t) => [t.id, t]));

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
    practiceCategory: topic.practiceCategory || 'arrays',
    practiceLabel: topic.practiceHint || topic.title
  };
}

export function buildTheoryTopicList(activeId) {
  return helperList(THEORY_TOPICS, activeId);
}

export function buildTheoryTopicHtml(topic) {
  return helperHtml(topic, LANGUAGE_LABEL);
}
