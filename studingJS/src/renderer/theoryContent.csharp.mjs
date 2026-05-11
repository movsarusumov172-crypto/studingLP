import { buildTheoryTopicList as helperList, buildTheoryTopicHtml as helperHtml } from './theoryHelpers.mjs';

export const LANGUAGE_LABEL = 'C# теория';

export const THEORY_TOPICS = [
  {
    id: 'variables',
    title: 'Переменные и типы',
    shortTitle: 'Переменные',
    simpleExplanation: 'C# строго типизирован. var выводит тип автоматически. Value types (int, struct) хранятся на стеке, reference types (class) — в куче. Nullable: int? допускает null.',
    howItWorks: 'Каждый тип наследует от object. Boxing — упаковка value type в object, unboxing — обратно. Nullable value types реализованы через Nullable<T>.',
    syntax: [
      'var x = 42;                    // int',
      'int? nullable = null;',
      'string s = "hello";            // ссылочный тип',
      'const double Pi = 3.14159;',
      'object obj = 42;               // boxing'
    ],
    examples: [
      { title: 'Простой', note: 'var и явные типы.', code: 'var name = "Alex";\nint age = 21;\nbool isReady = true;\nConsole.WriteLine($"{name}, {age}");' },
      { title: 'Средний', note: 'Nullable и null-coalescing.', code: 'int? score = null;\nint result = score ?? 0;       // 0 если null\nint safe = score ?? throw new Exception();' },
      { title: 'Реальный', note: 'Pattern matching (C# 9+).', code: 'object obj = 42;\nif (obj is int n && n > 0)\n  Console.WriteLine($"Positive: {n}");' }
    ],
    commonMistakes: [
      'NullReferenceException — самое частое исключение. Используй null-conditional ?.',
      'Boxing в горячих путях — снижает производительность.',
      'Путают == для строк (работает) и объектов (сравнивает ссылки).'
    ],
    importantNuances: [
      'string — immutable reference type, но ведёт себя как value при сравнении.',
      '?. (null-conditional) и ?? (null-coalescing) — основной способ защиты от null.',
      'C# 8+ Nullable Reference Types — включай через <Nullable>enable</Nullable>.'
    ],
    checklist: [
      'Использую var там где тип очевиден.',
      'Знаю разницу value/reference types.',
      'Защищаюсь от null через ?. и ??.',
      'Понимаю boxing/unboxing.'
    ],
    practiceHint: 'C# задачи — коллекции, LINQ, объекты.',
    practiceCategory: 'arrays'
  },
  {
    id: 'classes',
    title: 'Классы и методы',
    shortTitle: 'Классы',
    simpleExplanation: 'Классы — основа C#. Properties — умные поля с get/set. Конструкторы инициализируют объект. Records (C# 9+) — иммутабельные data-классы с value equality.',
    howItWorks: 'Методы — функции класса. Виртуальные методы override-ятся в наследниках. Интерфейсы — контракт без реализации (с C# 8 могут иметь default implementation).',
    syntax: [
      'class User {\n  public string Name { get; set; }\n  public int Age { get; init; }\n  public User(string name) => Name = name;\n}',
      'record Point(double X, double Y);',
      'interface IGreeter { string Greet(); }',
      'sealed class Singleton { }'
    ],
    examples: [
      { title: 'Простой', note: 'Auto-property и constructor.', code: 'class Product {\n  public string Name { get; set; }\n  public decimal Price { get; set; }\n  public Product(string name, decimal price) {\n    Name = name; Price = price;\n  }\n}' },
      { title: 'Средний', note: 'Record для immutable data.', code: 'record Point(double X, double Y);\nvar p1 = new Point(1, 2);\nvar p2 = p1 with { X = 5 }; // новый record\nConsole.WriteLine(p1 == p2); // false' },
      { title: 'Реальный', note: 'Полиморфизм.', code: 'abstract class Shape {\n  public abstract double Area();\n}\nclass Circle : Shape {\n  public double R { get; init; }\n  public override double Area() => Math.PI * R * R;\n}' }
    ],
    commonMistakes: [
      'Используют public fields вместо properties — нельзя добавить логику позже.',
      'Не переопределяют ToString — отладка становится неудобной.',
      'Забывают virtual на базовом методе — override не работает.'
    ],
    importantNuances: [
      'sealed предотвращает наследование, ускоряет virtual calls.',
      'static классы — только статические члены, нельзя инстанциировать.',
      'partial классы — разбивают класс на несколько файлов (генераторы кода).'
    ],
    checklist: [
      'Использую properties вместо public fields.',
      'Знаю разницу abstract/virtual/override.',
      'Умею records для иммутабельных данных.',
      'Понимаю sealed классы.'
    ],
    practiceHint: 'Задачи на объекты и структуры данных.',
    practiceCategory: 'objects'
  },
  {
    id: 'collections',
    title: 'Коллекции',
    shortTitle: 'Коллекции',
    simpleExplanation: 'List<T> — динамический массив. Dictionary<K,V> — хэш-таблица. HashSet<T> — уникальные элементы. Queue/Stack — очередь/стек. Все из System.Collections.Generic.',
    howItWorks: 'IEnumerable<T> — базовый интерфейс для всех коллекций. foreach работает с любым IEnumerable. LINQ добавляет Where/Select/GroupBy поверх IEnumerable.',
    syntax: [
      'var list = new List<int> { 1, 2, 3 };\nlist.Add(4);\nlist.Remove(1);',
      'var dict = new Dictionary<string,int>();\ndict["key"] = 42;\ndict.TryGetValue("key", out var val);',
      'var set = new HashSet<string>();\nset.Add("a"); set.Contains("a");'
    ],
    examples: [
      { title: 'Простой', note: 'List + foreach.', code: 'var nums = new List<int> { 3, 1, 4, 1, 5 };\nnums.Sort();\nforeach (var n in nums)\n  Console.Write($"{n} ");' },
      { title: 'Средний', note: 'Dictionary для частот.', code: 'var freq = new Dictionary<char, int>();\nforeach (var c in text)\n  freq[c] = freq.GetValueOrDefault(c, 0) + 1;' },
      { title: 'Реальный', note: 'CollectionsMarshal для hot path.', code: 'var scores = new List<int> { 5, 3, 8, 1 };\nscores.Sort();\nvar top3 = scores[^3..]; // range operator' }
    ],
    commonMistakes: [
      'Изменяют коллекцию во время foreach — InvalidOperationException.',
      'Используют ContainsKey вместо TryGetValue — двойной поиск.',
      'Не указывают начальную ёмкость List — лишние реаллокации.'
    ],
    importantNuances: [
      'SortedDictionary — B-tree O(log n), Dictionary — hash O(1).',
      'IReadOnlyList<T> — контракт только для чтения.',
      'Span<T> и Memory<T> — zero-copy slicing для горячих путей.'
    ],
    checklist: [
      'Знаю List, Dictionary, HashSet, Queue, Stack.',
      'Использую TryGetValue вместо ContainsKey + [].',
      'Понимаю IEnumerable как основу LINQ.',
      'Умею foreach безопасно.'
    ],
    practiceHint: 'Задачи на массивы и алгоритмы — через коллекции C#.',
    practiceCategory: 'arrays'
  },
  {
    id: 'linq',
    title: 'LINQ',
    shortTitle: 'LINQ',
    simpleExplanation: 'LINQ (Language Integrated Query) — запросы к коллекциям прямо в C# синтаксисе. Where фильтрует, Select трансформирует, GroupBy группирует. Ленивое выполнение — запрос не считается пока не пройдёт перечисление.',
    howItWorks: 'LINQ методы возвращают IEnumerable — они ленивы. ToList()/ToArray() форсируют вычисление. Одна и та же последовательность методов — два синтаксиса: метод-цепочки и query syntax.',
    syntax: [
      '// Method syntax\nvar result = nums.Where(x => x > 0).Select(x => x * 2);\n// Query syntax\nvar result = from x in nums where x > 0 select x * 2;',
      '.Where(predicate)',
      '.Select(transform)',
      '.GroupBy(keySelector)',
      '.OrderBy(key).ThenBy(key2)',
      '.First() / .FirstOrDefault()',
      '.ToList() / .ToArray() / .ToDictionary()'
    ],
    examples: [
      { title: 'Простой', note: 'Filter + transform.', code: 'var evens = nums\n  .Where(x => x % 2 == 0)\n  .Select(x => x * x)\n  .ToList();' },
      { title: 'Средний', note: 'GroupBy + aggregate.', code: 'var byCategory = items\n  .GroupBy(i => i.Category)\n  .Select(g => new {\n    Category = g.Key,\n    Count = g.Count(),\n    Total = g.Sum(i => i.Price)\n  });' },
      { title: 'Реальный', note: 'Join двух коллекций.', code: 'var result = orders\n  .Join(customers,\n    o => o.CustomerId,\n    c => c.Id,\n    (o, c) => new { c.Name, o.Total });' }
    ],
    commonMistakes: [
      'Многократно перечисляют IEnumerable — каждый раз выполняют запрос.',
      'Используют First() без проверки — InvalidOperationException на пустом.',
      'Делают LINQ внутри LINQ к БД — N+1 проблема.'
    ],
    importantNuances: [
      'AsParallel() — параллельный LINQ (PLINQ).',
      'Deferred execution: запрос строится, но не выполняется до итерации.',
      'EF Core LINQ транслирует в SQL — не весь C# доступен.'
    ],
    checklist: [
      'Знаю Where, Select, GroupBy, OrderBy, Join.',
      'Понимаю ленивое выполнение.',
      'Использую FirstOrDefault вместо First.',
      'Материализую через ToList() когда нужно.'
    ],
    practiceHint: 'LINQ — прямой путь к задачам на массивы и объекты.',
    practiceCategory: 'arrays'
  },
  {
    id: 'async',
    title: 'Async/Await',
    shortTitle: 'Async',
    simpleExplanation: 'async/await в C# — синтаксический сахар над Task. Метод с async возвращает Task или Task<T>. await освобождает поток пока ждёт — не блокирует.',
    howItWorks: 'Компилятор трансформирует async метод в state machine. Каждый await — потенциальная точка возврата управления. ConfigureAwait(false) предотвращает захват контекста синхронизации.',
    syntax: [
      'async Task<int> GetDataAsync() {\n  var result = await httpClient.GetAsync(url);\n  return await result.Content.ReadAsStringAsync();\n}',
      'await Task.WhenAll(task1, task2);',
      'await Task.WhenAny(task1, task2);',
      'var cts = new CancellationTokenSource();\nawait LongWork(cts.Token);'
    ],
    examples: [
      { title: 'Простой', note: 'Базовый async метод.', code: 'async Task<string> FetchAsync(string url) {\n  using var client = new HttpClient();\n  return await client.GetStringAsync(url);\n}' },
      { title: 'Средний', note: 'Параллельные задачи.', code: 'var tasks = urls.Select(url => FetchAsync(url));\nvar results = await Task.WhenAll(tasks);\n// все запросы параллельно' },
      { title: 'Реальный', note: 'Cancellation token.', code: 'async Task ProcessAsync(CancellationToken ct) {\n  await Task.Delay(5000, ct); // бросает OperationCanceledException\n  ct.ThrowIfCancellationRequested();\n}' }
    ],
    commonMistakes: [
      '.Result или .Wait() — deadlock в UI/ASP.NET контексте.',
      'async void — нельзя await, исключения не поймать.',
      'Не передают CancellationToken в длинные операции.'
    ],
    importantNuances: [
      'ValueTask<T> — для hot-path async без аллокации.',
      'IAsyncEnumerable<T> + await foreach — асинхронные стримы.',
      'ConfigureAwait(false) в library коде для избегания deadlock.'
    ],
    checklist: [
      'Никогда не использую .Result или .Wait().',
      'Возвращаю Task, не void (кроме event handlers).',
      'Передаю CancellationToken через всю цепочку.',
      'Знаю Task.WhenAll для параллельности.'
    ],
    practiceHint: 'Задачи на async — параллелизм, retry, pipeline.',
    practiceCategory: 'async'
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
