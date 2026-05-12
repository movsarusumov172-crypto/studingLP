import { buildTheoryTopicList as helperList, buildTheoryTopicHtml as helperHtml } from './theoryHelpers.mjs';

export const LANGUAGE_LABEL = 'C++ теория';

export const THEORY_TOPICS = [
  {
    id: 'variables',
    title: 'Переменные и типы',
    shortTitle: 'Переменные',
    simpleExplanation: 'C++ добавляет к C auto (вывод типа), ссылки (&), и nullptr вместо NULL. Современный C++ (11+) сильно удобнее старого. Используй auto там где тип очевиден, явный тип — где важна читаемость.',
    howItWorks: 'auto выводится компилятором во время компиляции — нет потери производительности. constexpr — вычисление во время компиляции. Uniform initialization {} предпочтительнее ().',
    syntax: [
      'auto x = 42;              // int',
      'auto s = std::string{"hello"};',
      'const auto pi = 3.14159;',
      'constexpr int MAX = 1000;',
      'int& ref = x;             // ссылка',
      'nullptr                   // вместо NULL'
    ],
    examples: [
      { title: 'Простой', note: 'auto в цикле.', code: 'std::vector<int> v = {1, 2, 3};\nfor (auto x : v)\n  std::cout << x << " ";' },
      { title: 'Средний', note: 'Structured bindings (C++17).', code: 'auto [key, val] = std::pair{42, "hello"s};\nstd::cout << key << " " << val;' },
      { title: 'Реальный', note: 'constexpr для compile-time.', code: 'constexpr int factorial(int n) {\n  return n <= 1 ? 1 : n * factorial(n-1);\n}\nstatic_assert(factorial(5) == 120);' }
    ],
    commonMistakes: [
      'Используют auto& когда нужна копия и наоборот.',
      'Путают ссылку и указатель — ссылка не может быть null и не переприсваивается.',
      'Игнорируют предупреждения компилятора об implicit narrowing.'
    ],
    importantNuances: [
      'auto& — ссылка, const auto& — const ссылка, auto&& — forwarding reference.',
      'Ссылка обязана быть инициализирована при объявлении.',
      '{} инициализация запрещает narrowing conversion — безопаснее ().'
    ],
    checklist: [
      'Использую auto когда тип очевиден из контекста.',
      'Знаю разницу ссылки и указателя.',
      'Использую nullptr вместо NULL.',
      'Использую constexpr для compile-time констант.'
    ],
    practiceHint: 'C++ задачи — алгоритмы, работа с векторами и строками.',
    practiceCategory: 'arrays'
  },
  {
    id: 'classes',
    title: 'Классы и ООП',
    shortTitle: 'Классы',
    simpleExplanation: 'Класс инкапсулирует данные и методы. RAII (Resource Acquisition Is Initialization) — объект захватывает ресурс в конструкторе, освобождает в деструкторе. Это основа безопасности C++.',
    howItWorks: 'Конструктор вызывается при создании, деструктор — при уничтожении (выход из scope, delete). Rule of Five: если нужен один из (деструктор, copy ctor, move ctor, copy=, move=) — нужны все.',
    syntax: [
      'class Foo {\npublic:\n  Foo(int x) : x_{x} {}\n  ~Foo() {}\n  int get() const { return x_; }\nprivate:\n  int x_;\n};',
      'Foo f{42};',
      'auto p = std::make_unique<Foo>(42);'
    ],
    examples: [
      { title: 'Простой', note: 'RAII: деструктор освобождает ресурс.', code: 'class File {\npublic:\n  File(const char* path) : f_(fopen(path,"r")) {}\n  ~File() { if(f_) fclose(f_); }\nprivate:\n  FILE* f_;\n};' },
      { title: 'Средний', note: 'Наследование и полиморфизм.', code: 'struct Shape {\n  virtual double area() const = 0;\n  virtual ~Shape() = default;\n};\nstruct Circle : Shape {\n  double r;\n  double area() const override { return 3.14*r*r; }\n};' },
      { title: 'Реальный', note: 'unique_ptr — RAII для динамической памяти.', code: 'auto p = std::make_unique<int[]>(100);\n// автоматически free при выходе из scope' }
    ],
    commonMistakes: [
      'Забывают virtual деструктор в базовом классе — UB при delete через базовый указатель.',
      'Нарушают Rule of Five — unexpected copying/moving поведение.',
      'Используют raw new/delete вместо make_unique/make_shared.'
    ],
    importantNuances: [
      'default и delete для управления компилятором-сгенерированными методами.',
      'final запрещает наследование от класса.',
      'override явно маркирует переопределение virtual — компилятор проверяет.'
    ],
    checklist: [
      'Использую RAII — ресурс в конструкторе/деструкторе.',
      'Всегда virtual деструктор в полиморфных базовых классах.',
      'Предпочитаю make_unique/make_shared сырым new.',
      'Знаю Rule of Five.'
    ],
    practiceHint: 'Объектные задачи — напрямую про классы и RAII.',
    practiceCategory: 'collections'
  },
  {
    id: 'stl',
    title: 'STL контейнеры',
    shortTitle: 'STL',
    simpleExplanation: 'STL — стандартная библиотека шаблонов. vector — динамический массив. map/unordered_map — дерево/хэш-таблица. Алгоритмы из <algorithm> работают с итераторами любых контейнеров.',
    howItWorks: 'Контейнеры управляют памятью самостоятельно. Итераторы — обобщённые указатели на элементы. Range-based for работает с любым контейнером через begin/end.',
    syntax: [
      'std::vector<int> v = {1,2,3};\nv.push_back(4);\nv.reserve(100);',
      'std::unordered_map<std::string,int> freq;\nfreq["hello"]++;',
      'std::sort(v.begin(), v.end());',
      'auto it = std::find(v.begin(), v.end(), 42);',
      'std::accumulate(v.begin(), v.end(), 0)'
    ],
    examples: [
      { title: 'Простой', note: 'vector + sort.', code: 'std::vector<int> v = {3,1,4,1,5};\nstd::sort(v.begin(), v.end());\nfor (int x : v) std::cout << x << " ";' },
      { title: 'Средний', note: 'Частоты через unordered_map.', code: 'std::unordered_map<char,int> freq;\nfor (char c : s) freq[c]++;\nfor (auto& [c, n] : freq)\n  std::cout << c << ":" << n << " ";' },
      { title: 'Реальный', note: 'Алгоритм с лямбдой.', code: 'auto it = std::max_element(v.begin(), v.end(),\n  [](const auto& a, const auto& b) {\n    return a.score < b.score;\n  });' }
    ],
    commonMistakes: [
      'Инвалидируют итераторы при push_back — происходит реаллокация.',
      'Используют [] в map когда надо find — [] создаёт элемент.',
      'Забывают что map упорядочен (O(log n)), unordered_map — нет (O(1) avg).'
    ],
    importantNuances: [
      'emplace_back эффективнее push_back — конструирует на месте.',
      'reserve предотвращает реаллокации если знаешь размер заранее.',
      'std::span (C++20) — non-owning view на массив/vector.'
    ],
    checklist: [
      'Знаю vector, map, unordered_map, set.',
      'Умею использовать алгоритмы из <algorithm>.',
      'Понимаю инвалидацию итераторов.',
      'Использую range-based for.'
    ],
    practiceHint: 'Большинство алгоритмических задач — про STL контейнеры.',
    practiceCategory: 'collections'
  },
  {
    id: 'templates',
    title: 'Шаблоны',
    shortTitle: 'Шаблоны',
    simpleExplanation: 'Шаблоны — обобщённое программирование. Один код работает для разных типов. Компилятор генерирует конкретную версию для каждого типа (инстанциирование).',
    howItWorks: 'template<typename T> параметризует функцию или класс. Компилятор вычитывает тип из аргументов (CTAD). Специализации позволяют особое поведение для конкретных типов.',
    syntax: [
      'template<typename T>\nT max(T a, T b) { return a > b ? a : b; }',
      'auto result = max(3, 5);     // T = int',
      'auto result = max(3.0, 5.0); // T = double',
      'template<typename T, typename U>\nauto add(T a, U b) -> decltype(a+b) { return a+b; }'
    ],
    examples: [
      { title: 'Простой', note: 'Шаблонная функция swap.', code: 'template<typename T>\nvoid mySwap(T& a, T& b) {\n  T tmp = std::move(a);\n  a = std::move(b);\n  b = std::move(tmp);\n}' },
      { title: 'Средний', note: 'Шаблонный класс Stack.', code: 'template<typename T>\nclass Stack {\n  std::vector<T> data_;\npublic:\n  void push(T v) { data_.push_back(std::move(v)); }\n  T pop() { auto v = data_.back(); data_.pop_back(); return v; }\n};' },
      { title: 'Реальный', note: 'Concepts (C++20) для ограничений.', code: 'template<std::integral T>\nT gcd(T a, T b) {\n  return b == 0 ? a : gcd(b, a % b);\n}' }
    ],
    commonMistakes: [
      'Кладут определение шаблона в .cpp — линкер не найдёт инстанциирование.',
      'Используют шаблон там где нужен runtime-полиморфизм (virtual).',
      'Не понимают что каждая инстанциация — отдельный код.'
    ],
    importantNuances: [
      'Шаблоны — compile-time, virtual — runtime. Разные инструменты.',
      'Explicit instantiation: template class Foo<int>; — явное инстанциирование.',
      'if constexpr (C++17) — compile-time ветвление в шаблонах.'
    ],
    checklist: [
      'Умею писать шаблонные функции.',
      'Знаю что определение шаблона — в заголовочном файле.',
      'Понимаю вывод типов компилятором.',
      'Знаю difference runtime vs compile-time полиморфизм.'
    ],
    practiceHint: 'Алгоритмические задачи хорошо обобщаются через шаблоны.',
    practiceCategory: 'algorithms'
  },
  {
    id: 'memory',
    title: 'Умные указатели',
    shortTitle: 'Умные указатели',
    simpleExplanation: 'unique_ptr — единственный владелец, автоматически удаляет. shared_ptr — разделяемое владение через счётчик ссылок. weak_ptr — наблюдатель без владения. Используй их — забудь про raw delete.',
    howItWorks: 'unique_ptr не копируется, только перемещается. shared_ptr копируется — счётчик растёт. Деструктор уменьшает счётчик, при 0 — delete. Циклические ссылки через shared_ptr — утечка; разрывай через weak_ptr.',
    syntax: [
      'auto p = std::make_unique<Foo>(args);',
      'auto s = std::make_shared<Foo>(args);',
      'std::shared_ptr<Foo> s2 = s;  // счётчик++',
      'std::weak_ptr<Foo> w = s;',
      'if (auto locked = w.lock()) { /* locked — shared_ptr */ }',
      'p.reset();                    // немедленное удаление'
    ],
    examples: [
      { title: 'Простой', note: 'unique_ptr в функции.', code: 'auto buf = std::make_unique<int[]>(1024);\n// автоматически free при выходе\nbuf[0] = 42;' },
      { title: 'Средний', note: 'Передача unique_ptr (move семантика).', code: 'void process(std::unique_ptr<Widget> w) {\n  w->run();\n}\nauto w = std::make_unique<Widget>();\nprocess(std::move(w)); // transfer ownership' },
      { title: 'Реальный', note: 'weak_ptr разрывает цикл.', code: 'struct Node {\n  std::shared_ptr<Node> next;\n  std::weak_ptr<Node> prev; // не создаёт цикл\n};' }
    ],
    commonMistakes: [
      'Создают shared_ptr из raw pointer дважды — два независимых счётчика, double free.',
      'Копируют unique_ptr — не компилируется, нужен move.',
      'Не проверяют weak_ptr.lock() — может вернуть nullptr.'
    ],
    importantNuances: [
      'make_unique/make_shared эффективнее и безопаснее чем new + конструктор.',
      'shared_ptr — не бесплатен: атомарный счётчик ссылок.',
      'enable_shared_from_this — для получения shared_ptr из this.'
    ],
    checklist: [
      'Использую make_unique/make_shared, не raw new.',
      'Передаю unique_ptr через std::move.',
      'Знаю когда weak_ptr разрывает циклы.',
      'Понимаю overhead shared_ptr.'
    ],
    practiceHint: 'Задачи на closures и объекты хорошо ложатся на умные указатели в C++.',
    practiceCategory: 'arrays'
  },
  {
    id: 'move-semantics',
    title: 'Move semantics',
    shortTitle: 'Move',
    simpleExplanation: 'Move semantics переносит ресурс вместо дорогого копирования. Это особенно важно для string, vector, unique_ptr и своих RAII-классов. std::move не двигает сам по себе — он разрешает выбрать move-конструктор или move-operator.',
    howItWorks: 'У объекта есть lvalue и rvalue контексты. Move-конструктор получает T&& и забирает внутренние ресурсы, оставляя источник валидным, но с неопределённым полезным содержимым. Компилятор часто сам применяет move или copy elision при возврате значения.',
    syntax: [
      'std::string a = "hello";\nstd::string b = std::move(a);',
      'class Buffer {\npublic:\n  Buffer(Buffer&& other) noexcept;\n  Buffer& operator=(Buffer&& other) noexcept;\n};',
      'void take(std::unique_ptr<Foo> p);\ntake(std::move(ptr));',
      'std::vector<std::string> v;\nv.push_back(std::move(name));'
    ],
    examples: [
      { title: 'Простой', note: 'Передача владения unique_ptr.', code: 'auto p = std::make_unique<int>(42);\nauto q = std::move(p);\n// p пустой, q владеет int' },
      { title: 'Средний', note: 'Move-конструктор для RAII ресурса.', code: 'class Handle {\n  int fd_ = -1;\npublic:\n  Handle(Handle&& other) noexcept : fd_{other.fd_} {\n    other.fd_ = -1;\n  }\n};' },
      { title: 'Реальный', note: 'emplace_back строит объект прямо в vector.', code: 'std::vector<std::string> names;\nnames.reserve(100);\nnames.emplace_back("Ada");\nstd::string tmp = "Bjarne";\nnames.push_back(std::move(tmp));' }
    ],
    commonMistakes: [
      'Используют объект после std::move как будто он не изменился.',
      'Не пишут noexcept для move-конструктора — vector может выбрать копирование.',
      'Пишут std::move при return local; часто это мешает copy elision.'
    ],
    importantNuances: [
      'std::move — это cast к rvalue reference, не операция перемещения.',
      'После move объект должен оставаться валидным: его можно уничтожить или присвоить заново.',
      'Rule of Zero лучше Rule of Five: пусть стандартные поля сами управляют ресурсами.'
    ],
    checklist: [
      'Понимаю lvalue/rvalue и T&&.',
      'Передаю unique_ptr только через std::move.',
      'Не читаю moved-from объект без нового присваивания.',
      'Помечаю move операции noexcept там где это честно.'
    ],
    practiceHint: 'Попробуй задачи с контейнерами объектов: добавление, возврат из функции, передача владения.',
    practiceCategory: 'strings'
  },
  {
    id: 'exceptions',
    title: 'Исключения',
    shortTitle: 'Исключения',
    simpleExplanation: 'Исключения — способ сообщить о невозможной ситуации выше по стеку. В C++ они особенно хорошо работают вместе с RAII: стек разматывается, деструкторы локальных объектов вызываются автоматически.',
    howItWorks: 'throw прерывает текущий поток выполнения. Ближайший подходящий catch получает исключение по типу. При размотке стека вызываются деструкторы всех уже созданных локальных объектов, поэтому ресурсы должны быть в RAII-объектах.',
    syntax: [
      'try {\n  risky();\n} catch (const std::exception& e) {\n  std::cerr << e.what();\n}',
      'throw std::runtime_error{"bad state"};',
      'catch (...) { /* крайний fallback */ }',
      'void f() noexcept;'
    ],
    examples: [
      { title: 'Простой', note: 'Проверка аргумента.', code: 'int divide(int a, int b) {\n  if (b == 0) throw std::invalid_argument{"division by zero"};\n  return a / b;\n}' },
      { title: 'Средний', note: 'RAII очистит ресурс при исключении.', code: 'void save(const std::string& path) {\n  std::ofstream out{path};\n  if (!out) throw std::runtime_error{"open failed"};\n  out << "data";\n} // файл закрыт даже при throw' },
      { title: 'Реальный', note: 'Ловим конкретное, неизвестное пробрасываем.', code: 'try {\n  parseConfig(text);\n} catch (const ParseError& e) {\n  showMessage(e.what());\n}' }
    ],
    commonMistakes: [
      'Бросают строки или int вместо std::exception-наследников.',
      'Ловят исключение по значению — происходит slicing.',
      'Глотают catch (...) без логирования или восстановления.'
    ],
    importantNuances: [
      'Лови по const reference: catch (const std::exception& e).',
      'Деструкторы не должны бросать исключения.',
      'noexcept важен для move operations и оптимизаций контейнеров.'
    ],
    checklist: [
      'Бросаю std::runtime_error, std::invalid_argument или свой тип от std::exception.',
      'Ловлю исключения по const reference.',
      'Держу ресурсы в RAII, не в голых указателях.',
      'Не использую исключения для обычного ветвления в горячем цикле.'
    ],
    practiceHint: 'Добавь обработку ошибок в задачи парсинга: пустой ввод, плохой формат, невозможное состояние.',
    practiceCategory: 'algorithms'
  },
  {
    id: 'lambdas',
    title: 'Лямбды',
    shortTitle: 'Лямбды',
    simpleExplanation: 'Лямбда — короткий функциональный объект прямо в месте использования. Её удобно передавать в sort, find_if, transform и свои callback-функции. Главное — понимать список захвата.',
    howItWorks: 'Компилятор превращает лямбду в безымянный класс с operator(). Захват [=] копирует внешние переменные, [&] берёт ссылки. mutable разрешает менять копии внутри лямбды.',
    syntax: [
      'auto add = [](int a, int b) { return a + b; };',
      '[x](int y) { return x + y; }',
      '[&sum](int x) { sum += x; }',
      '[ptr = std::move(p)] { ptr->run(); }',
      '[](const auto& a, const auto& b) { return a.id < b.id; }'
    ],
    examples: [
      { title: 'Простой', note: 'Сортировка по полю.', code: 'std::sort(users.begin(), users.end(),\n  [](const User& a, const User& b) {\n    return a.name < b.name;\n  });' },
      { title: 'Средний', note: 'Захват порога для фильтрации.', code: 'int limit = 10;\nauto it = std::find_if(v.begin(), v.end(),\n  [limit](int x) { return x > limit; });' },
      { title: 'Реальный', note: 'Move-only захват в C++14+.', code: 'auto task = [job = std::make_unique<Job>()]() {\n  job->run();\n};\ntask();' }
    ],
    commonMistakes: [
      'Используют [&] и возвращают лямбду наружу — ссылки висят.',
      'Захватывают this, а объект уже уничтожен к моменту вызова.',
      'Слишком много логики кладут в лямбду вместо отдельной функции.'
    ],
    importantNuances: [
      '[] — ничего не захватывать; это безопасный старт.',
      '[=] копирует переменные, но this исторически захватывается как указатель.',
      'generic lambda с auto в параметрах появилась в C++14.'
    ],
    checklist: [
      'Выбираю явный захват вместо широкого [=] или [&] для долгоживущих лямбд.',
      'Понимаю разницу copy capture и reference capture.',
      'Использую лямбды как comparator/predicate для STL.',
      'Не возвращаю лямбду со ссылками на локальные переменные.'
    ],
    practiceHint: 'Тренируй predicates: фильтрация, сортировка, подсчёт по условию.',
    practiceCategory: 'collections'
  },
  {
    id: 'iterators-algorithms',
    title: 'Итераторы и алгоритмы глубже',
    shortTitle: 'Алгоритмы+',
    simpleExplanation: 'Алгоритмы STL работают не с контейнерами напрямую, а с парами итераторов. Это позволяет одному sort/find/count_if работать с vector, deque, array и частью диапазона.',
    howItWorks: 'Итератор задаёт позицию, end указывает за последний элемент. Категория итератора определяет доступные операции: input, forward, bidirectional, random access. Алгоритмы часто возвращают итератор или меняют диапазон на месте.',
    syntax: [
      'auto first = v.begin();\nauto last = v.end();',
      'std::find(first, last, value);',
      'std::count_if(v.begin(), v.end(), pred);',
      'std::transform(in.begin(), in.end(), out.begin(), fn);',
      'std::remove_if(v.begin(), v.end(), pred);',
      'std::ranges::sort(v); // C++20'
    ],
    examples: [
      { title: 'Простой', note: 'Найти и проверить end.', code: 'auto it = std::find(v.begin(), v.end(), 42);\nif (it != v.end()) {\n  std::cout << "found";\n}' },
      { title: 'Средний', note: 'Erase-remove idiom.', code: 'v.erase(\n  std::remove_if(v.begin(), v.end(), [](int x) { return x < 0; }),\n  v.end()\n);' },
      { title: 'Реальный', note: 'transform в заранее подготовленный output.', code: 'std::vector<int> squares;\nsquares.resize(v.size());\nstd::transform(v.begin(), v.end(), squares.begin(),\n  [](int x) { return x * x; });' }
    ],
    commonMistakes: [
      'Разыменовывают end() — это позиция за последним элементом.',
      'Думают что remove_if удаляет элементы из vector; он только переставляет.',
      'Инвалидируют итератор erase/push_back и продолжают им пользоваться.'
    ],
    importantNuances: [
      'Для записи в пустой контейнер используй std::back_inserter.',
      'list не поддерживает random access, поэтому std::sort для list не подходит; есть list.sort().',
      'C++20 ranges часто читаются проще: std::ranges::find(v, x).'
    ],
    checklist: [
      'Всегда сравниваю итератор с end() перед разыменованием.',
      'Знаю erase-remove idiom.',
      'Понимаю что алгоритм может мутировать диапазон.',
      'Выбираю алгоритм STL вместо ручного цикла, когда он читабельнее.'
    ],
    practiceHint: 'Решай задачи на поиск, фильтрацию, сортировку и преобразование без ручных индексов.',
    practiceCategory: 'algorithms'
  },
  {
    id: 'build-model',
    title: 'Заголовки и модель сборки',
    shortTitle: 'Сборка',
    simpleExplanation: 'C++ компилирует каждый .cpp отдельно, а потом линкер собирает программу. Заголовки подключаются текстово через #include. Поэтому объявления обычно в .h/.hpp, определения обычных функций — в .cpp.',
    howItWorks: 'Препроцессор вставляет include в translation unit. Компилятор проверяет типы внутри одного translation unit. Линкер ищет ровно одно определение каждой обычной функции или глобальной переменной. Include guards защищают от повторного включения.',
    syntax: [
      '// math.hpp\n#pragma once\nint add(int a, int b);',
      '// math.cpp\n#include "math.hpp"\nint add(int a, int b) { return a + b; }',
      '// main.cpp\n#include "math.hpp"\nstd::cout << add(2, 3);',
      'g++ main.cpp math.cpp -o app'
    ],
    examples: [
      { title: 'Простой', note: 'Объявление в header, тело в cpp.', code: '// user.hpp\n#pragma once\nstruct User { std::string name; };\nstd::string format(const User& user);' },
      { title: 'Средний', note: 'Шаблон остаётся в header.', code: '// max.hpp\n#pragma once\ntemplate<typename T>\nT maxValue(T a, T b) {\n  return a < b ? b : a;\n}' },
      { title: 'Реальный', note: 'inline для маленькой функции в header.', code: '// ids.hpp\n#pragma once\ninline bool isValidId(int id) {\n  return id > 0;\n}' }
    ],
    commonMistakes: [
      'Кладут обычную не-inline функцию в header и получают multiple definition.',
      'Определяют шаблон только в .cpp и получают unresolved external.',
      'Забывают include guard или #pragma once.'
    ],
    importantNuances: [
      '#include <vector> ищет системный header, #include "x.hpp" — локальный.',
      'Forward declaration уменьшает зависимость от тяжёлых header-файлов.',
      'ODR: у сущности должно быть одно согласованное определение во всей программе.'
    ],
    checklist: [
      'Разделяю объявления и определения.',
      'Ставлю #pragma once или include guard в каждый header.',
      'Держу шаблоны и inline-функции в header.',
      'Понимаю роли compiler и linker.'
    ],
    practiceHint: 'Разбей маленькую программу на main.cpp, header и implementation-файл.',
    practiceCategory: 'arrays'
  },
  {
    id: 'strings-string-view',
    title: 'string и string_view',
    shortTitle: 'Строки',
    simpleExplanation: 'std::string владеет текстом. std::string_view только смотрит на чужую память и не копирует. Используй string для хранения, string_view для параметров чтения и быстрых срезов.',
    howItWorks: 'string управляет буфером и может менять размер. string_view хранит указатель и длину, но не гарантирует нуль-терминатор и не продлевает жизнь исходной строки. Это быстрый view, но с риском dangling.',
    syntax: [
      'std::string s = "hello";',
      'std::string_view v = s;',
      'void print(std::string_view text);',
      'auto part = std::string_view{s}.substr(1, 3);',
      'std::string owned{part};'
    ],
    examples: [
      { title: 'Простой', note: 'Параметр без копии.', code: 'void log(std::string_view msg) {\n  std::cout << msg << "\\n";\n}\nlog("ready");' },
      { title: 'Средний', note: 'Срез без выделения памяти.', code: 'std::string line = "key=value";\nauto pos = line.find("=");\nstd::string_view key{line.data(), pos};' },
      { title: 'Реальный', note: 'Хранить надо owning string.', code: 'struct User {\n  std::string name;\n};\nvoid setName(User& u, std::string_view name) {\n  u.name = std::string{name};\n}' }
    ],
    commonMistakes: [
      'Возвращают string_view на локальную string — висячая ссылка.',
      'Передают string_view в C API, где нужен нуль-терминированный const char*.',
      'Сохраняют string_view в объекте, хотя исходная строка живёт меньше.'
    ],
    importantNuances: [
      'string_view хорош для read-only параметров, не для владения.',
      'substr у string копирует, substr у string_view обычно нет.',
      'Для изменения текста нужен std::string или mutable buffer.'
    ],
    checklist: [
      'Использую std::string для хранения.',
      'Использую std::string_view для чтения без копии.',
      'Проверяю lifetime исходной строки.',
      'Не предполагаю что string_view заканчивается нулём.'
    ],
    practiceHint: 'Сделай парсер строк: split, trim, key=value без лишних копий.',
    practiceCategory: 'strings'
  },
  {
    id: 'enum-class',
    title: 'enum class',
    shortTitle: 'enum class',
    simpleExplanation: 'enum class — типобезопасное перечисление. В отличие от старого enum, значения не протекают в окружающую область и не превращаются неявно в int.',
    howItWorks: 'Каждое значение относится к своему enum-типу и пишется через Scope::Value. Можно указать underlying type, например std::uint8_t, если важен размер или формат данных.',
    syntax: [
      'enum class Color { Red, Green, Blue };',
      'Color c = Color::Red;',
      'if (c == Color::Red) {}',
      'enum class Status : std::uint8_t { Ok = 0, Error = 1 };',
      'auto raw = static_cast<int>(Status::Ok);'
    ],
    examples: [
      { title: 'Простой', note: 'Статус без магических чисел.', code: 'enum class LoginStatus { Success, BadPassword, Locked };\nLoginStatus status = LoginStatus::Success;' },
      { title: 'Средний', note: 'switch по enum class.', code: 'std::string label(Color c) {\n  switch (c) {\n    case Color::Red: return "red";\n    case Color::Green: return "green";\n    case Color::Blue: return "blue";\n  }\n  return "unknown";\n}' },
      { title: 'Реальный', note: 'Явный тип для бинарного протокола.', code: 'enum class PacketType : std::uint16_t {\n  Ping = 1,\n  Data = 2,\n  Close = 3\n};' }
    ],
    commonMistakes: [
      'Пытаются сравнить enum class с int без static_cast.',
      'Забывают префикс Type::Value.',
      'Используют старый enum там где нужна типобезопасность.'
    ],
    importantNuances: [
      'enum class не импортирует имена значений в текущий scope.',
      'Underlying type полезен для сериализации и экономии памяти.',
      'Для битовых флагов enum class требует явных operator| и operator&.'
    ],
    checklist: [
      'Использую enum class вместо старого enum по умолчанию.',
      'Пишу значения через Type::Value.',
      'Делаю static_cast только на границе с числовым API.',
      'Указываю underlying type когда важен размер.'
    ],
    practiceHint: 'Замени строки статусов в задаче на enum class и switch.',
    practiceCategory: 'algorithms'
  },
  {
    id: 'concurrency-basics',
    title: 'Основы concurrency',
    shortTitle: 'Concurrency',
    simpleExplanation: 'Concurrency в C++ — несколько задач могут выполняться независимо. std::thread запускает поток, std::mutex защищает общие данные, std::async удобен для задачи с результатом. Главное правило: shared mutable state требует синхронизации.',
    howItWorks: 'Потоки имеют общий адресный space, поэтому гонки данных приводят к undefined behavior. mutex даёт взаимное исключение, lock_guard освобождает mutex через RAII. future возвращает результат async-задачи или пробрасывает исключение.',
    syntax: [
      'std::thread t{[] { work(); }};\nt.join();',
      'std::mutex m;\nstd::lock_guard<std::mutex> lock{m};',
      'auto fut = std::async(std::launch::async, compute);\nauto value = fut.get();',
      'std::atomic<int> counter{0};\n++counter;'
    ],
    examples: [
      { title: 'Простой', note: 'Запустить поток и дождаться.', code: 'std::thread worker{[] {\n  std::cout << "work";\n}};\nworker.join();' },
      { title: 'Средний', note: 'Защита общего vector.', code: 'std::mutex m;\nstd::vector<int> data;\nvoid add(int x) {\n  std::lock_guard<std::mutex> lock{m};\n  data.push_back(x);\n}' },
      { title: 'Реальный', note: 'async возвращает результат.', code: 'auto fut = std::async(std::launch::async, [] {\n  return loadConfig();\n});\nConfig cfg = fut.get();' }
    ],
    commonMistakes: [
      'Забывают join или detach у std::thread — программа завершится через std::terminate.',
      'Читают и пишут одну переменную из разных потоков без mutex/atomic.',
      'Держат mutex слишком долго и случайно блокируют всю программу.'
    ],
    importantNuances: [
      'lock_guard проще и безопаснее ручных lock/unlock.',
      'atomic подходит для простых счётчиков и флагов, не заменяет mutex для сложных инвариантов.',
      'future::get вызывается один раз и пробрасывает исключение из async-задачи.'
    ],
    checklist: [
      'Каждый thread явно join/detach или обёрнут в RAII.',
      'Общий mutable state защищён mutex или atomic.',
      'Использую lock_guard/unique_lock вместо ручного unlock.',
      'Понимаю что data race в C++ — undefined behavior.'
    ],
    practiceHint: 'Сделай параллельную загрузку или подсчёт частот с безопасным объединением результата.',
    practiceCategory: 'algorithms'
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
