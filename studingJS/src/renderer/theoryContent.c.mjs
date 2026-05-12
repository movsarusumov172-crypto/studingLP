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
  },
  {
    id: 'dynamic-memory',
    title: 'Динамическая память: malloc/free',
    shortTitle: 'malloc/free',
    simpleExplanation: 'Динамическая память нужна, когда размер данных неизвестен при компиляции. malloc/calloc/realloc выделяют память в куче, free возвращает её системе. В C за эту память отвечаешь ты.',
    howItWorks: 'malloc возвращает void* на блок байт или NULL. calloc дополнительно зануляет память. realloc меняет размер блока и может перенести его в другое место. После free указатель становится dangling — его нельзя разыменовывать.',
    syntax: [
      'int *a = malloc(n * sizeof *a);',
      'if (a == NULL) { /* обработать ошибку */ }',
      'int *z = calloc(n, sizeof *z);',
      'int *tmp = realloc(a, new_n * sizeof *a);',
      'free(a);\na = NULL;'
    ],
    examples: [
      { title: 'Простой', note: 'Массив с размером из переменной.', code: 'int *nums = malloc(n * sizeof *nums);\nif (!nums) return 1;\nfor (int i = 0; i < n; i++) nums[i] = i * i;\nfree(nums);' },
      { title: 'Средний', note: 'realloc через временный указатель.', code: 'int *tmp = realloc(nums, cap * 2 * sizeof *nums);\nif (!tmp) {\n  free(nums);\n  return 1;\n}\nnums = tmp;\ncap *= 2;' },
      { title: 'Реальный', note: 'Узел linked list живёт в куче.', code: 'typedef struct Node { int value; struct Node *next; } Node;\nNode *node = malloc(sizeof *node);\nif (!node) return NULL;\nnode->value = value;\nnode->next = head;' }
    ],
    commonMistakes: [
      'Не проверяют malloc на NULL и сразу пишут в память.',
      'Теряют старый указатель при неудачном realloc: p = realloc(p, size).',
      'Освобождают память дважды или используют указатель после free.'
    ],
    importantNuances: [
      'Пиши sizeof *ptr, а не sizeof(Type): меньше риска ошибиться при смене типа.',
      'free(NULL) безопасен, поэтому зануление указателя упрощает cleanup.',
      'Каждый успешный malloc/calloc/realloc должен иметь понятного владельца и путь к free.'
    ],
    checklist: [
      'Проверяю результат выделения памяти.',
      'Использую временный указатель для realloc.',
      'Освобождаю все ветки выхода из функции.',
      'После free не читаю и не пишу через старый указатель.'
    ],
    practiceHint: 'Сделай динамический массив: grow через realloc, push, pop и cleanup без утечек.',
    practiceCategory: 'arrays'
  },
  {
    id: 'headers-preprocessor',
    title: 'Заголовки и preprocessor',
    shortTitle: 'Заголовки',
    simpleExplanation: '.h файлы объявляют публичный интерфейс: типы, константы, прототипы функций. Preprocessor обрабатывает #include, #define и условную компиляцию до настоящей компиляции C-кода.',
    howItWorks: '#include буквально подставляет содержимое файла. Include guard или #pragma once защищают от повторного включения. Макросы не знают типов, поэтому их нужно писать осторожно и с лишними скобками.',
    syntax: [
      '#ifndef USER_H\n#define USER_H\n\nint load_user(int id);\n\n#endif',
      '#include <stdio.h>\n#include "user.h"',
      '#define MAX(a, b) ((a) > (b) ? (a) : (b))',
      '#ifdef DEBUG\nfprintf(stderr, "debug\\n");\n#endif',
      'static inline int square(int x) { return x * x; }'
    ],
    examples: [
      { title: 'Простой', note: 'Прототип в заголовке, реализация в .c.', code: '// math_utils.h\n#ifndef MATH_UTILS_H\n#define MATH_UTILS_H\nint add(int a, int b);\n#endif\n\n// math_utils.c\nint add(int a, int b) { return a + b; }' },
      { title: 'Средний', note: 'Макрос должен защищать аргументы скобками.', code: '#define SQUARE(x) ((x) * (x))\nint n = SQUARE(a + 1); // (a + 1) * (a + 1)' },
      { title: 'Реальный', note: 'Feature flag для отладочного кода.', code: '#ifdef DEBUG\n#define LOG(msg) fprintf(stderr, "[debug] %s\\n", msg)\n#else\n#define LOG(msg) ((void)0)\n#endif' }
    ],
    commonMistakes: [
      'Кладут определения обычных функций в .h и получают duplicate symbols.',
      'Пишут макросы без скобок: #define SQUARE(x) x*x.',
      'Забывают include guard и ловят повторные объявления.'
    ],
    importantNuances: [
      '<stdio.h> ищется в системных путях, "file.h" — сначала рядом с текущим файлом.',
      'В .h лучше держать интерфейс, а детали реализации прятать в .c.',
      'Макрос вычисляет аргументы как текст: MAX(i++, j++) может увеличить переменную дважды.'
    ],
    checklist: [
      'У каждого .h есть include guard или #pragma once.',
      'В заголовке только нужный публичный API.',
      'Макросы оборачивают параметры и весь результат в скобки.',
      'Не использую макрос там, где подходит enum, const или static inline.'
    ],
    practiceHint: 'Разбей маленькую программу на main.c, utils.c и utils.h, затем собери их одной командой gcc.',
    practiceCategory: 'functions'
  },
  {
    id: 'file-io',
    title: 'Файловый ввод/вывод',
    shortTitle: 'Файлы',
    simpleExplanation: 'Файлы в C открывают через fopen и получают FILE*. Потом читают/пишут через fprintf, fscanf, fgets, fread, fwrite. После работы файл нужно закрыть через fclose.',
    howItWorks: 'fopen возвращает NULL при ошибке. Текстовый режим удобен для строк, бинарный — для байтов и структур с явным форматом. Чтение всегда нужно проверять по возвращаемому значению, а не по надежде, что файл правильный.',
    syntax: [
      'FILE *f = fopen("data.txt", "r");',
      'if (f == NULL) { perror("data.txt"); return 1; }',
      'char line[256];\nwhile (fgets(line, sizeof line, f)) { /* ... */ }',
      'fprintf(f, "%d\\n", value);',
      'fclose(f);'
    ],
    examples: [
      { title: 'Простой', note: 'Чтение файла построчно.', code: 'FILE *f = fopen("input.txt", "r");\nif (!f) return 1;\nchar line[128];\nwhile (fgets(line, sizeof line, f)) {\n  printf("%s", line);\n}\nfclose(f);' },
      { title: 'Средний', note: 'Запись отчёта в текстовый файл.', code: 'FILE *out = fopen("report.txt", "w");\nif (!out) return 1;\nfor (int i = 0; i < n; i++)\n  fprintf(out, "%d\\n", values[i]);\nfclose(out);' },
      { title: 'Реальный', note: 'Бинарное чтение с проверкой количества элементов.', code: 'int items[16];\nFILE *f = fopen("items.bin", "rb");\nif (!f) return 1;\nsize_t got = fread(items, sizeof items[0], 16, f);\nif (got < 16 && ferror(f)) perror("read");\nfclose(f);' }
    ],
    commonMistakes: [
      'Не проверяют fopen и получают NULL dereference.',
      'Используют fscanf без проверки результата и работают с мусором.',
      'Забывают fclose — данные могут не сброситься на диск.'
    ],
    importantNuances: [
      'fgets безопаснее gets: gets удалён из стандарта и не знает размер буфера.',
      'feof становится true только после неудачной попытки чтения, поэтому цикл строят вокруг fgets/fread.',
      'Для переносимого бинарного формата не записывай struct как есть: padding и endian могут отличаться.'
    ],
    checklist: [
      'Проверяю FILE* после fopen.',
      'Проверяю результат чтения и записи.',
      'Закрываю файл на всех ветках выхода.',
      'Выбираю текстовый или бинарный режим осознанно.'
    ],
    practiceHint: 'Напиши программу, которая читает числа из файла, считает сумму и пишет результат в другой файл.',
    practiceCategory: 'strings'
  },
  {
    id: 'enums-unions-flags',
    title: 'enum, union и битовые флаги',
    shortTitle: 'enum/flags',
    simpleExplanation: 'enum даёт имена целым константам. union хранит разные поля в одной и той же памяти. Битовые флаги упаковывают несколько boolean-состояний в одно целое число.',
    howItWorks: 'enum обычно совместим с int. В union активным считается только то поле, которое ты последним записал и правильно интерпретируешь. Флаги включают через |, проверяют через &, выключают через & ~.',
    syntax: [
      'typedef enum { RED, GREEN, BLUE } Color;',
      'typedef union { int i; float f; unsigned char bytes[4]; } Value;',
      'enum { FLAG_READ = 1 << 0, FLAG_WRITE = 1 << 1 };',
      'flags |= FLAG_READ;      // включить',
      'if (flags & FLAG_WRITE) { /* есть право */ }',
      'flags &= ~FLAG_READ;     // выключить'
    ],
    examples: [
      { title: 'Простой', note: 'enum делает switch читаемым.', code: 'typedef enum { STATE_IDLE, STATE_RUN, STATE_ERROR } State;\nswitch (state) {\ncase STATE_IDLE: break;\ncase STATE_RUN: run(); break;\ncase STATE_ERROR: reset(); break;\n}' },
      { title: 'Средний', note: 'Флаги прав доступа.', code: 'enum { CAN_READ = 1 << 0, CAN_WRITE = 1 << 1, CAN_EXEC = 1 << 2 };\nunsigned perms = CAN_READ | CAN_WRITE;\nif (perms & CAN_WRITE) save();' },
      { title: 'Реальный', note: 'Tagged union: тип рядом с данными.', code: 'typedef enum { VAL_INT, VAL_FLOAT } Kind;\ntypedef struct {\n  Kind kind;\n  union { int i; float f; } data;\n} Value;\nif (v.kind == VAL_INT) printf("%d\\n", v.data.i);' }
    ],
    commonMistakes: [
      'Читают не то поле union, которое записали, и получают непереносимое поведение.',
      'Сравнивают флаги через == вместо проверки bits & FLAG.',
      'Задают флаги как 0, 1, 2, 3 вместо степеней двойки.'
    ],
    importantNuances: [
      'Для набора флагов используй unsigned типы: сдвиги и маски предсказуемее.',
      'enum хорош для состояний, но компилятор не всегда запретит чужое int-значение.',
      'Tagged union безопаснее голого union: сначала проверяешь kind, потом читаешь нужное поле.'
    ],
    checklist: [
      'Использую enum для именованных состояний.',
      'Для флагов задаю значения через 1 << n.',
      'Проверяю флаг через (flags & FLAG) != 0.',
      'У union храню отдельный tag, если данные приходят извне или живут долго.'
    ],
    practiceHint: 'Сделай набор прав доступа через битовые флаги: read/write/exec, включение, выключение и проверка.',
    practiceCategory: 'objects'
  },
  {
    id: 'compilation-ub',
    title: 'Компиляция и undefined behavior',
    shortTitle: 'Компиляция/UB',
    simpleExplanation: 'C сначала препроцессится, потом компилируется в объектные файлы, потом линкуется в программу. Undefined behavior — ситуация, где стандарт C не обещает вообще ничего: программа может работать, падать или тихо ломаться.',
    howItWorks: 'Компилятор оптимизирует код, предполагая что UB не происходит. Поэтому выход за массив, signed overflow, use-after-free и неверные printf-форматы могут превращаться в странные баги. Предупреждения и sanitizers ловят часть проблем рано.',
    syntax: [
      'gcc -std=c11 -Wall -Wextra -Wpedantic main.c util.c -o app',
      'gcc -c util.c -o util.o\ngcc main.o util.o -o app',
      'gcc -g -fsanitize=address,undefined main.c -o app',
      './app',
      'valgrind ./app   // если доступен'
    ],
    examples: [
      { title: 'Простой', note: 'Сборка из двух .c файлов.', code: 'gcc -Wall -Wextra main.c math_utils.c -o trainer\n./trainer' },
      { title: 'Средний', note: 'Типичный UB: выход за границы.', code: 'int a[3] = {1, 2, 3};\nprintf("%d\\n", a[3]); // UB: индексы только 0..2' },
      { title: 'Реальный', note: 'Sanitizer быстро показывает проблему памяти.', code: 'gcc -g -fsanitize=address,undefined main.c -o app\n./app\n// отчёт укажет место use-after-free или overflow' }
    ],
    commonMistakes: [
      'Игнорируют warnings, хотя компилятор уже показывает реальный баг.',
      'Думают "у меня работает" после UB — на другой оптимизации может сломаться.',
      'Путают compile error, link error и runtime error.'
    ],
    importantNuances: [
      '-Wall -Wextra не включают вообще все предупреждения, но это хороший минимум.',
      'Link error часто значит: есть прототип, но нет реализации или объектный файл не передали линкеру.',
      'UB отличается от unspecified behavior: при UB компилятор ничем не ограничен.'
    ],
    checklist: [
      'Собираю с -Wall -Wextra и читаю предупреждения.',
      'Понимаю разницу между препроцессингом, компиляцией и линковкой.',
      'Запускаю sanitizer для задач с памятью и указателями.',
      'Не оправдываю UB тем, что пример один раз сработал.'
    ],
    practiceHint: 'Собери маленький проект из двух файлов, специально поймай warning, link error и sanitizer-ошибку.',
    practiceCategory: 'functions'
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
