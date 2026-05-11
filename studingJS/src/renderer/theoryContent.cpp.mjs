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
    practiceCategory: 'objects'
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
    practiceCategory: 'algorithms'
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
    practiceCategory: 'closures'
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
