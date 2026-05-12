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
    practiceCategory: 'collections'
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
    practiceCategory: 'collections'
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
    practiceCategory: 'collections'
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
    practiceCategory: 'algorithms'
  },
  {
    id: 'nullable-references',
    title: 'Nullable Reference Types',
    shortTitle: 'Nullable refs',
    simpleExplanation: 'Nullable Reference Types (C# 8+) заставляют явно отмечать где ссылка может быть null: string? может быть null, string — не должна. Это предупреждения компилятора, не runtime-защита.',
    howItWorks: 'Включается через <Nullable>enable</Nullable> или #nullable enable. Компилятор анализирует поток кода: после проверки на null переменная считается безопасной. Оператор ! отключает предупреждение только в конкретном месте.',
    syntax: [
      '#nullable enable',
      'string name = "Ann";',
      'string? nickname = null;',
      'int length = nickname?.Length ?? 0;',
      'ArgumentNullException.ThrowIfNull(name);',
      'var forced = nickname!.Length; // обещание компилятору'
    ],
    examples: [
      { title: 'Простой', note: 'Разделяем nullable и non-null.', code: 'string title = "Post";\nstring? subtitle = null;\nConsole.WriteLine(subtitle?.ToUpper() ?? "без подзаголовка");' },
      { title: 'Средний', note: 'Guard clause уточняет тип.', code: 'void PrintUser(User? user) {\n  if (user is null) return;\n  Console.WriteLine(user.Name); // user уже не null\n}' },
      { title: 'Реальный', note: 'ThrowIfNull для входных данных.', code: 'Order Create(User? user) {\n  ArgumentNullException.ThrowIfNull(user);\n  return new Order(user.Id);\n}' }
    ],
    commonMistakes: [
      'Ставят ! везде — скрывают проблему, а не исправляют контракт.',
      'Думают что string не может стать null в runtime — может, это только анализ компилятора.',
      'Не включают Nullable в проекте и теряют большую часть пользы.'
    ],
    importantNuances: [
      'Warnings nullable стоит лечить как ошибки в новом коде.',
      'Для DTO из внешних источников чаще нужны string? и валидация.',
      'required и init помогают создавать non-null свойства безопасно.'
    ],
    checklist: [
      'Включаю nullable reference types в проекте.',
      'Пишу ? только там где null реально допустим.',
      'Проверяю входные nullable значения перед использованием.',
      'Использую ! только когда инвариант доказан вне анализатора.'
    ],
    practiceHint: 'Тренируй безопасные проверки null на объектах и входных данных.',
    practiceCategory: 'strings'
  },
  {
    id: 'records',
    title: 'Records и value equality',
    shortTitle: 'Records',
    simpleExplanation: 'record — тип для данных. Он автоматически даёт value equality, Deconstruct, ToString и удобное копирование через with. Хорош для DTO, команд, настроек и неизменяемых моделей.',
    howItWorks: 'Record сравнивается по значениям свойств, а class по умолчанию — по ссылке. Positional record создаёт свойства из параметров конструктора. with создаёт копию с изменёнными полями.',
    syntax: [
      'public record UserDto(int Id, string Name);',
      'var user = new UserDto(1, "Ann");',
      'var renamed = user with { Name = "Kate" };',
      'public record class Order(int Id);',
      'public readonly record struct Point(double X, double Y);'
    ],
    examples: [
      { title: 'Простой', note: 'Две записи равны по данным.', code: 'record Point(int X, int Y);\nvar a = new Point(1, 2);\nvar b = new Point(1, 2);\nConsole.WriteLine(a == b); // true' },
      { title: 'Средний', note: 'with для безопасной копии.', code: 'record User(string Name, bool IsActive);\nvar user = new User("Ann", false);\nvar active = user with { IsActive = true };' },
      { title: 'Реальный', note: 'DTO для ответа API.', code: 'public record ProductResponse(\n  int Id,\n  string Name,\n  decimal Price\n);\nreturn new ProductResponse(product.Id, product.Name, product.Price);' }
    ],
    commonMistakes: [
      'Кладут изменяемые коллекции в record и ждут полной иммутабельности.',
      'Используют record для сущности с identity и сложным жизненным циклом.',
      'Переопределяют Equals вручную без реальной необходимости.'
    ],
    importantNuances: [
      'init-свойства можно задать при создании, но нельзя менять потом обычным set.',
      'record struct — value type, record class — reference type.',
      'Value equality учитывает тип record, не только набор свойств.'
    ],
    checklist: [
      'Использую records для данных без сложного поведения.',
      'Понимаю отличие value equality от reference equality.',
      'Не храню изменяемые коллекции без контроля.',
      'Использую with вместо мутации объекта.'
    ],
    practiceHint: 'Задачи на объекты удобно решать через маленькие records.',
    practiceCategory: 'collections'
  },
  {
    id: 'pattern-matching',
    title: 'Pattern Matching',
    shortTitle: 'Patterns',
    simpleExplanation: 'Pattern matching проверяет форму и тип значения. is, switch expression, property/list patterns делают ветвления короче и безопаснее, особенно когда вход может быть разных типов.',
    howItWorks: 'Компилятор сопоставляет значение с шаблоном сверху вниз. В switch expression первый подходящий case возвращает результат. Property pattern проверяет свойства, relational pattern — условия вида > 0.',
    syntax: [
      'if (obj is int n and > 0) { }',
      'var label = score switch { >= 90 => "A", _ => "B" };',
      'user is { IsActive: true, Role: "Admin" }',
      'items is [var first, ..]',
      'shape switch { Circle c => c.Radius, _ => 0 }'
    ],
    examples: [
      { title: 'Простой', note: 'is сразу даёт переменную нужного типа.', code: 'object value = 42;\nif (value is int n and > 0)\n  Console.WriteLine(n * 2);' },
      { title: 'Средний', note: 'switch expression вместо if-else.', code: 'string GetStatus(int code) => code switch {\n  >= 200 and < 300 => "ok",\n  >= 400 and < 500 => "client error",\n  _ => "other"\n};' },
      { title: 'Реальный', note: 'Property pattern для правил.', code: 'bool CanPublish(User user) => user is {\n  IsActive: true,\n  Role: "Editor" or "Admin"\n};' }
    ],
    commonMistakes: [
      'Забывают _ в switch expression — можно получить исключение на неожиданных данных.',
      'Ставят общий pattern выше частного — частный case никогда не выполнится.',
      'Делают слишком длинный switch вместо маленьких методов с понятными именами.'
    ],
    importantNuances: [
      'Порядок arms в switch важен: проверка идёт сверху вниз.',
      'Pattern matching не заменяет полиморфизм, когда поведение принадлежит самим типам.',
      'List patterns доступны в современных версиях C# и удобны для коротких массивов.'
    ],
    checklist: [
      'Использую is pattern вместо ручного cast.',
      'Добавляю fallback _ для неожиданных значений.',
      'Проверяю порядок pattern-веток.',
      'Не превращаю switch в огромную бизнес-таблицу.'
    ],
    practiceHint: 'Тренируй условия, классификацию данных и обработку разных типов.',
    practiceCategory: 'algorithms'
  },
  {
    id: 'delegates-events',
    title: 'Delegates, Func/Action и events',
    shortTitle: 'Delegates',
    simpleExplanation: 'Delegate — типизированная ссылка на метод. Func<T>, Action<T> и Predicate<T> закрывают большинство случаев. event — безопасная публикация уведомлений наружу.',
    howItWorks: 'Делегат хранит список методов для вызова. Лямбда компилируется в делегат или expression tree по контексту. event разрешает внешнему коду только подписку и отписку, но не прямой вызов.',
    syntax: [
      'delegate int Operation(int a, int b);',
      'Func<int, int, int> add = (a, b) => a + b;',
      'Action<string> log = Console.WriteLine;',
      'public event EventHandler? Saved;',
      'Saved?.Invoke(this, EventArgs.Empty);'
    ],
    examples: [
      { title: 'Простой', note: 'Func вместо отдельного delegate.', code: 'Func<int, int, int> op = (a, b) => a + b;\nConsole.WriteLine(op(2, 3)); // 5' },
      { title: 'Средний', note: 'Callback для фильтра.', code: 'IEnumerable<User> Filter(\n  IEnumerable<User> users,\n  Predicate<User> match\n) => users.Where(u => match(u));' },
      { title: 'Реальный', note: 'Событие после сохранения.', code: 'class Repository {\n  public event EventHandler? Saved;\n  public void Save() {\n    // запись в БД\n    Saved?.Invoke(this, EventArgs.Empty);\n  }\n}' }
    ],
    commonMistakes: [
      'Используют async void в обработчике без try/catch — исключение трудно контролировать.',
      'Не отписываются от событий долгоживущих объектов — возможна утечка памяти.',
      'Создают собственный delegate там где достаточно Func или Action.'
    ],
    importantNuances: [
      'event нельзя вызвать извне класса-владельца.',
      'Func возвращает значение, Action ничего не возвращает, Predicate возвращает bool.',
      'Для UI и доменных событий важен жизненный цикл подписчиков.'
    ],
    checklist: [
      'Выбираю Func/Action/Predicate для простых callback.',
      'Использую event для уведомлений наружу.',
      'Безопасно вызываю event через ?.Invoke.',
      'Помню про отписку от долгоживущих событий.'
    ],
    practiceHint: 'Делегаты помогают в задачах на функции, фильтры и callbacks.',
    practiceCategory: 'algorithms'
  },
  {
    id: 'exceptions',
    title: 'Исключения',
    shortTitle: 'Exceptions',
    simpleExplanation: 'Исключения — путь сообщить что операция не может продолжаться нормально. Лови конкретные типы, не глуши ошибки, освобождай ресурсы через using/finally.',
    howItWorks: 'throw прерывает текущий поток выполнения и ищет ближайший подходящий catch. finally выполняется и при успехе, и при ошибке. catch when фильтрует исключение без лишней логики внутри блока.',
    syntax: [
      'try { Work(); }',
      'catch (InvalidOperationException ex) { Log(ex); }',
      'catch (Exception ex) when (ShouldRetry(ex)) { }',
      'finally { Cleanup(); }',
      'throw new ArgumentException("Bad value", nameof(value));',
      'throw; // сохранить stack trace'
    ],
    examples: [
      { title: 'Простой', note: 'Кидаем точное исключение.', code: 'void SetAge(int age) {\n  if (age < 0)\n    throw new ArgumentOutOfRangeException(nameof(age));\n}' },
      { title: 'Средний', note: 'Ловим только ожидаемое.', code: 'try {\n  config = LoadConfig(path);\n}\ncatch (FileNotFoundException ex) {\n  logger.LogWarning(ex, "Config not found");\n  config = Config.Default;\n}' },
      { title: 'Реальный', note: 'Фильтр catch when.', code: 'catch (HttpRequestException ex)\n  when (ex.StatusCode == HttpStatusCode.NotFound) {\n  return null;\n}' }
    ],
    commonMistakes: [
      'catch (Exception) без логирования — ошибка исчезает.',
      'throw ex; сбрасывает stack trace, нужен просто throw;.',
      'Используют исключения для обычной логики в цикле — дорого и шумно.'
    ],
    importantNuances: [
      'ArgumentException и наследники — для неверных аргументов метода.',
      'OperationCanceledException обычно не считается ошибкой, если отмена ожидаема.',
      'В async методах исключение приходит при await, а не при создании Task.'
    ],
    checklist: [
      'Кидаю конкретные исключения с понятным сообщением.',
      'Ловлю только те ошибки, которые могу обработать.',
      'Использую throw; для повторного выброса.',
      'Не скрываю исключения без логирования или результата.'
    ],
    practiceHint: 'Практикуй валидацию, обработку файлов и сетевых ошибок.',
    practiceCategory: 'algorithms'
  },
  {
    id: 'di-async-streams',
    title: 'Dependency Injection и async streams',
    shortTitle: 'DI + streams',
    simpleExplanation: 'Dependency Injection передаёт зависимости извне, а не создаёт их внутри класса. IAsyncEnumerable<T> отдаёт данные постепенно через await foreach — удобно для потоков, БД и больших файлов.',
    howItWorks: 'DI-контейнер знает как создать сервисы и их зависимости. Lifetimes: Singleton живёт всё приложение, Scoped — запрос/операция, Transient — новый каждый раз. Async stream возвращает элементы по мере готовности и поддерживает CancellationToken.',
    syntax: [
      'builder.Services.AddScoped<IUserRepo, UserRepo>();',
      'public UsersService(IUserRepo repo) { _repo = repo; }',
      'async IAsyncEnumerable<User> ReadUsersAsync() { yield return user; }',
      'await foreach (var user in ReadUsersAsync()) { }',
      'await foreach (var user in stream.WithCancellation(ct)) { }'
    ],
    examples: [
      { title: 'Простой', note: 'Зависимость через конструктор.', code: 'class UsersService {\n  private readonly IUserRepo _repo;\n  public UsersService(IUserRepo repo) => _repo = repo;\n}' },
      { title: 'Средний', note: 'Регистрация сервиса.', code: 'builder.Services.AddScoped<IUserRepo, SqlUserRepo>();\nbuilder.Services.AddSingleton<IClock, SystemClock>();\nbuilder.Services.AddTransient<UsersService>();' },
      { title: 'Реальный', note: 'Потоковая обработка данных.', code: 'await foreach (var user in repo.ReadActiveAsync(ct)\n  .WithCancellation(ct)) {\n  await sender.SendAsync(user.Email, ct);\n}' }
    ],
    commonMistakes: [
      'Создают new HttpClient или repo внутри сервиса — DI теряет смысл.',
      'В Singleton кладут Scoped-зависимость — жизненные циклы конфликтуют.',
      'Забывают CancellationToken в async streams — долгую операцию нельзя отменить.'
    ],
    importantNuances: [
      'Constructor injection проще тестировать моками.',
      'IAsyncEnumerable<T> не хранит всё в памяти, если источник тоже потоковый.',
      'Scoped lifetime особенно важен для DbContext и request-сервисов.'
    ],
    checklist: [
      'Передаю зависимости через конструктор.',
      'Понимаю Singleton, Scoped и Transient.',
      'Использую await foreach для IAsyncEnumerable.',
      'Передаю CancellationToken в потоковые операции.'
    ],
    practiceHint: 'Тренируй сервисы, мокируемые зависимости и async pipeline.',
    practiceCategory: 'collections'
  },
  {
    id: 'generics',
    title: 'Generics и constraints',
    shortTitle: 'Generics',
    simpleExplanation: 'Generics позволяют писать типобезопасный код один раз для разных типов: List<T>, Dictionary<TKey,TValue>, Result<T>. Constraints ограничивают T, чтобы внутри метода были доступны нужные операции.',
    howItWorks: 'Компилятор проверяет типы на этапе компиляции. Для value types JIT создаёт специализированный код, для reference types часто переиспользует. where сообщает какие требования есть к типу.',
    syntax: [
      'class Box<T> { public T Value { get; init; } }',
      'T First<T>(IEnumerable<T> items) => items.First();',
      'where T : class',
      'where T : struct',
      'where T : new()',
      'where TKey : notnull'
    ],
    examples: [
      { title: 'Простой', note: 'Generic контейнер.', code: 'class Box<T> {\n  public T Value { get; }\n  public Box(T value) => Value = value;\n}\nvar box = new Box<int>(42);' },
      { title: 'Средний', note: 'Result<T> без object и cast.', code: 'record Result<T>(T? Value, string? Error) {\n  public bool IsOk => Error is null;\n}' },
      { title: 'Реальный', note: 'Constraint для фабрики.', code: 'T Create<T>() where T : new() {\n  return new T();\n}' }
    ],
    commonMistakes: [
      'Используют object вместо T — теряют типобезопасность и получают cast.',
      'Добавляют слишком жёсткий constraint заранее — переиспользование хуже.',
      'Забывают notnull для ключей Dictionary-подобных типов.'
    ],
    importantNuances: [
      'Generic invariance: List<string> не является List<object>.',
      'out T — covariance только для чтения, in T — contravariance для входа.',
      'default(T) может быть null для reference type и zero-value для value type.'
    ],
    checklist: [
      'Пишу generic там где тип должен сохраняться до результата.',
      'Использую constraints только по реальной нужде.',
      'Понимаю default(T) и nullable в generic-коде.',
      'Не заменяю generics на object.'
    ],
    practiceHint: 'Generics полезны в структурах данных, Result<T> и алгоритмах.',
    practiceCategory: 'algorithms'
  },
  {
    id: 'files-disposable',
    title: 'Файлы, using и IDisposable',
    shortTitle: 'Files',
    simpleExplanation: 'Файлы, потоки, соединения и таймеры надо освобождать. using/using var вызывает Dispose автоматически. await using делает то же для IAsyncDisposable.',
    howItWorks: 'IDisposable описывает синхронное освобождение ресурса. using превращается в try/finally с вызовом Dispose. Для асинхронного освобождения есть IAsyncDisposable и await using.',
    syntax: [
      'using var stream = File.OpenRead(path);',
      'using (var reader = new StreamReader(path)) { }',
      'var text = await File.ReadAllTextAsync(path, ct);',
      'await using var conn = await OpenConnectionAsync(ct);',
      'public void Dispose() { /* cleanup */ }'
    ],
    examples: [
      { title: 'Простой', note: 'Прочитать файл целиком.', code: 'string text = await File.ReadAllTextAsync(path, ct);\nConsole.WriteLine(text.Length);' },
      { title: 'Средний', note: 'using var для потока.', code: 'using var stream = File.OpenRead(path);\nusing var reader = new StreamReader(stream);\nvar firstLine = await reader.ReadLineAsync(ct);' },
      { title: 'Реальный', note: 'await using для async cleanup.', code: 'await using var tx = await db.BeginTransactionAsync(ct);\nawait SaveAsync(order, ct);\nawait tx.CommitAsync(ct);' }
    ],
    commonMistakes: [
      'Открывают Stream без using — файл остаётся заблокированным.',
      'Читают огромный файл через ReadAllText — память растёт резко.',
      'Смешивают sync и async I/O в одном горячем пути.'
    ],
    importantNuances: [
      'File.ReadLines лениво читает строки, ReadAllLines грузит всё сразу.',
      'Dispose не обязан удалять объект из памяти, он освобождает внешний ресурс.',
      'await using нужен только если тип реализует IAsyncDisposable.'
    ],
    checklist: [
      'Оборачиваю disposable-ресурсы в using или await using.',
      'Для больших файлов читаю потоково.',
      'Передаю CancellationToken в async I/O.',
      'Не держу файл открытым дольше нужного.'
    ],
    practiceHint: 'Практикуй чтение файлов, потоковую обработку и cleanup ресурсов.',
    practiceCategory: 'strings'
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
