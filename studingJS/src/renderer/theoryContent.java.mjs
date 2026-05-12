import { buildTheoryTopicList as helperList, buildTheoryTopicHtml as helperHtml } from './theoryHelpers.mjs';

export const LANGUAGE_LABEL = 'Java теория';

export const THEORY_TOPICS = [
  {
    id: 'variables',
    title: 'Переменные и типы',
    shortTitle: 'Переменные',
    simpleExplanation: 'Java строго типизирована. Примитивы (int, double, boolean, char) хранятся по значению. Ссылочные типы (объекты) — по ссылке. var (Java 10+) выводит тип локальной переменной.',
    howItWorks: 'Примитивы не могут быть null. У каждого примитива есть wrapper-класс (int→Integer). Autoboxing автоматически конвертирует между ними. final — нельзя переприсвоить.',
    syntax: [
      'int x = 42;',
      'var name = "Alex";     // String, Java 10+',
      'final double PI = 3.14159;',
      'Integer boxed = 42;   // autoboxing',
      'int unboxed = boxed;  // unboxing'
    ],
    examples: [
      { title: 'Простой', note: 'Примитивы и их wrappers.', code: 'int n = 42;\nInteger obj = n;          // autoboxing\nString s = String.valueOf(n);\nSystem.out.println(s);    // "42"' },
      { title: 'Средний', note: 'var для локальных переменных.', code: 'var list = new ArrayList<String>();\nvar map = new HashMap<String, Integer>();\n// тип выводится компилятором' },
      { title: 'Реальный', note: 'Ловушка autoboxing.', code: 'Integer a = 1000, b = 1000;\nSystem.out.println(a == b);     // false! (ссылки)\nSystem.out.println(a.equals(b));// true  (значения)' }
    ],
    commonMistakes: [
      'Сравнивают Integer через == — сравнивает ссылки, не значения.',
      'NullPointerException при unboxing null: Integer n = null; int x = n; → NPE.',
      'Не понимают что String — reference type, но сравнивать надо через .equals().'
    ],
    importantNuances: [
      'Integer кэширует значения -128..127: Integer.valueOf(42) == Integer.valueOf(42) true.',
      'String pool: строковые литералы интернируются.',
      'Java 16+ records: record Point(int x, int y) {}'
    ],
    checklist: [
      'Знаю 8 примитивных типов.',
      'Всегда .equals() для объектов, не ==.',
      'Понимаю autoboxing и его overhead.',
      'Использую final для неизменяемых значений.'
    ],
    practiceHint: 'Java задачи — коллекции, алгоритмы, ООП.',
    practiceCategory: 'arrays'
  },
  {
    id: 'classes',
    title: 'Классы и объекты',
    shortTitle: 'Классы',
    simpleExplanation: 'Всё в Java — объект (кроме примитивов). Инкапсуляция: private поля + public методы. Геттеры и сеттеры обеспечивают контролируемый доступ. Lombok сокращает boilerplate.',
    howItWorks: 'Конструктор инициализирует объект. this() вызывает другой конструктор того же класса. super() — конструктор родителя. Объект создаётся в куче, ссылка — на стеке.',
    syntax: [
      'public class User {\n  private String name;\n  private int age;\n  public User(String name, int age) {\n    this.name = name;\n    this.age = age;\n  }\n  public String getName() { return name; }\n}',
      'var user = new User("Alex", 21);',
      'record Point(int x, int y) {}   // Java 16+'
    ],
    examples: [
      { title: 'Простой', note: 'Builder pattern.', code: 'public class Config {\n  private final int timeout;\n  private Config(Builder b) { timeout = b.timeout; }\n  public static class Builder {\n    int timeout = 30;\n    public Builder timeout(int t) { timeout = t; return this; }\n    public Config build() { return new Config(this); }\n  }\n}' },
      { title: 'Средний', note: 'Record для данных.', code: 'record Point(double x, double y) {\n  double distance() {\n    return Math.sqrt(x*x + y*y);\n  }\n}\nvar p = new Point(3, 4);\nSystem.out.println(p.distance()); // 5.0' },
      { title: 'Реальный', note: 'Полиморфизм.', code: 'interface Shape { double area(); }\nrecord Circle(double r) implements Shape {\n  public double area() { return Math.PI * r * r; }\n}\nShape s = new Circle(5);\nSystem.out.println(s.area());' }
    ],
    commonMistakes: [
      'Забывают @Override — опечатка в имени создаёт новый метод, не переопределение.',
      'Изменяемые объекты в коллекциях — неожиданные side effects.',
      'Не реализуют hashCode вместе с equals — HashMap сломается.'
    ],
    importantNuances: [
      'equals + hashCode — оба нужны для корректной работы с коллекциями.',
      'toString() для отладки — всегда переопределяй.',
      'sealed классы (Java 17+) ограничивают иерархию наследования.'
    ],
    checklist: [
      'Приватные поля + геттеры/сеттеры.',
      'Переопределяю equals + hashCode вместе.',
      '@Override на всех переопределённых методах.',
      'Знаю records для иммутабельных данных.'
    ],
    practiceHint: 'Задачи на объекты — прямо про классы и интерфейсы.',
    practiceCategory: 'objects'
  },
  {
    id: 'collections',
    title: 'Коллекции',
    shortTitle: 'Коллекции',
    simpleExplanation: 'Java Collections Framework: List, Set, Map, Queue. ArrayList — динамический массив. HashMap — хэш-таблица. LinkedHashMap — хэш + порядок вставки. TreeMap — сортированный.',
    howItWorks: 'Все коллекции обобщены через generics: List<String>. Интерфейс программирования: объявляй переменную как интерфейс (List, Map), не как реализацию (ArrayList). Итератор — безопасный обход с удалением.',
    syntax: [
      'List<Integer> list = new ArrayList<>();\nlist.add(1); list.get(0); list.remove(0);',
      'Map<String,Integer> map = new HashMap<>();\nmap.put("a", 1);\nmap.getOrDefault("b", 0);',
      'Set<String> set = new HashSet<>();\nset.add("x"); set.contains("x");',
      'List.of(1,2,3)     // immutable',
      'Map.of("a",1,"b",2) // immutable'
    ],
    examples: [
      { title: 'Простой', note: 'Частоты через Map.', code: 'var freq = new HashMap<Character, Integer>();\nfor (char c : s.toCharArray())\n  freq.merge(c, 1, Integer::sum);\nSystem.out.println(freq);' },
      { title: 'Средний', note: 'Группировка через computeIfAbsent.', code: 'var groups = new HashMap<String, List<Item>>();\nfor (var item : items)\n  groups.computeIfAbsent(item.category(), k -> new ArrayList<>())\n        .add(item);' },
      { title: 'Реальный', note: 'Immutable коллекции.', code: 'var nums = List.of(1, 2, 3);\nvar copy = new ArrayList<>(nums); // mutable копия\ncopy.add(4);' }
    ],
    commonMistakes: [
      'ConcurrentModificationException при изменении во время foreach — используй Iterator.remove().',
      'Используют HashMap когда нужен порядок — нужен LinkedHashMap.',
      'Игнорируют начальную ёмкость — HashMap(expectedSize / 0.75 + 1).'
    ],
    importantNuances: [
      'Collections.unmodifiableList — runtime защита, List.of — compile-time.',
      'Deque<T> лучше Stack<T> — Stack устарел.',
      'PriorityQueue — мин-куча по умолчанию, Comparator.reverseOrder() для макс.'
    ],
    checklist: [
      'Объявляю через интерфейс: List, Map, Set.',
      'getOrDefault/computeIfAbsent для безопасного доступа.',
      'Знаю когда HashMap vs LinkedHashMap vs TreeMap.',
      'Использую List.of/Map.of для immutable.'
    ],
    practiceHint: 'Алгоритмические задачи — через коллекции Java.',
    practiceCategory: 'arrays'
  },
  {
    id: 'streams',
    title: 'Stream API',
    shortTitle: 'Streams',
    simpleExplanation: 'Stream — конвейер операций над коллекцией. Ленивый: терминальная операция запускает весь конвейер. filter, map, reduce, collect — ключевые операции. Не путай с I/O стримами.',
    howItWorks: 'Промежуточные операции (filter, map, sorted) — ленивые, возвращают Stream. Терминальные (collect, forEach, reduce, count) — запускают конвейер и возвращают результат.',
    syntax: [
      'list.stream()\n  .filter(x -> x > 0)\n  .map(x -> x * 2)\n  .collect(Collectors.toList());',
      '.reduce(0, Integer::sum)',
      '.collect(Collectors.groupingBy(Item::category))',
      '.collect(Collectors.joining(", "))',
      'IntStream.range(0, 10)',
      '.parallel()   // параллельный стрим'
    ],
    examples: [
      { title: 'Простой', note: 'Filter + map + collect.', code: 'var result = numbers.stream()\n  .filter(n -> n % 2 == 0)\n  .map(n -> n * n)\n  .collect(Collectors.toList());' },
      { title: 'Средний', note: 'Группировка через Collectors.', code: 'var byCategory = items.stream()\n  .collect(Collectors.groupingBy(\n    Item::category,\n    Collectors.summingInt(Item::price)\n  ));' },
      { title: 'Реальный', note: 'flatMap для вложенных коллекций.', code: 'var allTags = articles.stream()\n  .flatMap(a -> a.tags().stream())\n  .distinct()\n  .sorted()\n  .collect(Collectors.toList());' }
    ],
    commonMistakes: [
      'Используют Stream повторно после терминальной операции — IllegalStateException.',
      'forEach вместо map для трансформации — не идиоматично.',
      'parallel() без понимания — на маленьких коллекциях медленнее.'
    ],
    importantNuances: [
      'toList() (Java 16+) — удобнее collect(Collectors.toList()).',
      'Optional — контейнер для nullable результата stream (findFirst, max).',
      'Collectors.teeing (Java 12+) — два коллектора параллельно.'
    ],
    checklist: [
      'Знаю filter, map, flatMap, reduce, collect.',
      'Понимаю ленивость стримов.',
      'Использую Optional для потенциально пустых результатов.',
      'Умею groupingBy для группировки.'
    ],
    practiceHint: 'Stream API — основной инструмент для задач на массивы в Java.',
    practiceCategory: 'arrays'
  },
  {
    id: 'interfaces',
    title: 'Интерфейсы и лямбды',
    shortTitle: 'Интерфейсы',
    simpleExplanation: 'Функциональный интерфейс — с одним абстрактным методом. Лямбды — компактная реализация функциональных интерфейсов. java.util.function: Function, Predicate, Consumer, Supplier — готовые интерфейсы.',
    howItWorks: 'Компилятор автоматически создаёт реализацию интерфейса из лямбды. Method references (ClassName::method) — ещё короче. default методы в интерфейсах (Java 8+) — реализация без нарушения контракта.',
    syntax: [
      'Predicate<Integer> isPositive = x -> x > 0;',
      'Function<String,Integer> len = String::length;',
      'Consumer<String> print = System.out::println;',
      'Supplier<List<String>> newList = ArrayList::new;',
      '@FunctionalInterface\ninterface Transformer<T> { T transform(T input); }'
    ],
    examples: [
      { title: 'Простой', note: 'Predicate для filter.', code: 'Predicate<String> nonEmpty = s -> !s.isEmpty();\nvar words = List.of("", "hello", "", "world");\nwords.stream().filter(nonEmpty).forEach(System.out::println);' },
      { title: 'Средний', note: 'Composition функций.', code: 'Function<Integer,Integer> doubler = x -> x * 2;\nFunction<Integer,Integer> adder = x -> x + 10;\nFunction<Integer,Integer> pipeline = doubler.andThen(adder);\nSystem.out.println(pipeline.apply(5)); // 20' },
      { title: 'Реальный', note: 'Сортировка через Comparator.', code: 'var sorted = users.stream()\n  .sorted(Comparator.comparing(User::age)\n    .thenComparing(User::name))\n  .collect(Collectors.toList());' }
    ],
    commonMistakes: [
      'Слишком сложные лямбды — вынеси в именованный метод.',
      'Захватывают non-effectively-final переменные в лямбде — ошибка компиляции.',
      'Не знают стандартные функциональные интерфейсы — изобретают велосипед.'
    ],
    importantNuances: [
      'Effectively final: переменная не изменяется после инициализации — можно захватить.',
      'BiFunction, BiPredicate, BiConsumer — для двух аргументов.',
      'UnaryOperator<T> = Function<T,T>, BinaryOperator<T> = BiFunction<T,T,T>.'
    ],
    checklist: [
      'Знаю Function, Predicate, Consumer, Supplier.',
      'Умею method references (Class::method).',
      'Понимаю composition через andThen/compose.',
      'Использую Comparator.comparing для сортировки.'
    ],
    practiceHint: 'Функции и замыкания в Java — через лямбды и функциональные интерфейсы.',
    practiceCategory: 'functions'
  },
  {
    id: 'exceptions',
    title: 'Исключения',
    shortTitle: 'Исключения',
    simpleExplanation: 'Исключения — способ сообщить об ошибке без кодов возврата. try/catch ловит ошибку, finally выполняется почти всегда. Checked exceptions надо объявлять через throws или обрабатывать.',
    howItWorks: 'throw создаёт исключение и поднимает его вверх по стеку. catch выбирает первый подходящий тип. try-with-resources автоматически закрывает AutoCloseable ресурсы: файлы, сокеты, потоки.',
    syntax: [
      'try {\n  risky();\n} catch (IOException e) {\n  log.error(e.getMessage());\n} finally {\n  cleanup();\n}',
      'void read() throws IOException { ... }',
      'throw new IllegalArgumentException("bad id");',
      'try (var in = Files.newInputStream(path)) {\n  // ресурс закроется сам\n}'
    ],
    examples: [
      { title: 'Простой', note: 'Проверка аргумента.', code: 'void setAge(int age) {\n  if (age < 0)\n    throw new IllegalArgumentException("age < 0");\n  this.age = age;\n}' },
      { title: 'Средний', note: 'Checked exception у файла.', code: 'String read(Path path) throws IOException {\n  return Files.readString(path);\n}' },
      { title: 'Реальный', note: 'Своя ошибка домена.', code: 'class NotEnoughMoneyException extends RuntimeException {\n  NotEnoughMoneyException(String msg) { super(msg); }\n}\n\nvoid withdraw(int amount) {\n  if (amount > balance) throw new NotEnoughMoneyException("low balance");\n}' }
    ],
    commonMistakes: [
      'Ловят Exception слишком широко — скрывают реальные причины ошибки.',
      'Пустой catch — программа молча ломается и теряется диагностика.',
      'Используют exceptions для обычной логики в цикле — это дорого и нечитабельно.'
    ],
    importantNuances: [
      'RuntimeException — unchecked: компилятор не требует catch/throws.',
      'IOException, SQLException — checked: контракт метода должен это показать.',
      'В catch сначала идут более конкретные типы, потом общие.'
    ],
    checklist: [
      'Бросаю IllegalArgumentException для плохих аргументов.',
      'Не глушу исключения без логирования или обработки.',
      'Использую try-with-resources для AutoCloseable.',
      'Разделяю checked и unchecked exceptions.'
    ],
    practiceHint: 'Ошибки и валидация — хорошая практика для задач на объекты и ввод.',
    practiceCategory: 'objects'
  },
  {
    id: 'generics',
    title: 'Generics',
    shortTitle: 'Generics',
    simpleExplanation: 'Generics позволяют писать типобезопасный код без cast: List<String>, Map<String, Integer>. Тип T задаётся при объявлении класса, метода или интерфейса.',
    howItWorks: 'В Java generics работают через type erasure: информация о T в основном стирается во время компиляции. Поэтому нельзя new T() и нельзя проверить obj instanceof List<String>.',
    syntax: [
      'class Box<T> {\n  private T value;\n  T get() { return value; }\n}',
      'static <T> T first(List<T> list) { return list.get(0); }',
      'List<? extends Number> readOnlyNumbers;',
      'List<? super Integer> integerSink;'
    ],
    examples: [
      { title: 'Простой', note: 'Контейнер без cast.', code: 'Box<String> box = new Box<>();\nbox.set("java");\nString value = box.get();' },
      { title: 'Средний', note: 'Generic method.', code: 'static <T> Optional<T> first(List<T> items) {\n  return items.isEmpty() ? Optional.empty() : Optional.of(items.get(0));\n}' },
      { title: 'Реальный', note: 'PECS для wildcard.', code: 'void copy(List<? extends Number> src, List<? super Number> dst) {\n  for (Number n : src) dst.add(n);\n}' }
    ],
    commonMistakes: [
      'Используют raw type List вместо List<String> — теряют типобезопасность.',
      'Пытаются создать new T() — из-за type erasure так нельзя.',
      'Путают extends и super в wildcard — коллекция становится неудобной для записи или чтения.'
    ],
    importantNuances: [
      'PECS: Producer Extends, Consumer Super.',
      'List<Integer> не является List<Number>, generics инвариантны.',
      'Diamond <> выводит тип справа: new ArrayList<String>() можно писать new ArrayList<>().'
    ],
    checklist: [
      'Не использую raw types.',
      'Понимаю type erasure и ограничения generics.',
      'Использую ? extends для чтения, ? super для записи.',
      'Пишу generic methods когда тип зависит от аргументов.'
    ],
    practiceHint: 'Generics чаще всего встречаются в коллекциях и переиспользуемых структурах данных.',
    practiceCategory: 'arrays'
  },
  {
    id: 'optional-null-safety',
    title: 'Optional и null safety',
    shortTitle: 'Optional',
    simpleExplanation: 'null означает отсутствие значения, но легко приводит к NullPointerException. Optional<T> делает отсутствие явным в API: значение есть или его нет.',
    howItWorks: 'Optional обычно возвращают из методов, где результат может отсутствовать. map/flatMap/filter позволяют обработать значение без if. orElse/orElseGet дают запасной вариант.',
    syntax: [
      'Optional<String> name = Optional.of("Ann");',
      'Optional<String> empty = Optional.empty();',
      'userOpt.map(User::email).orElse("n/a");',
      'value != null ? value : fallback',
      'Objects.requireNonNull(value, "value");'
    ],
    examples: [
      { title: 'Простой', note: 'Безопасный fallback.', code: 'String label = findName(id)\n  .orElse("unknown");' },
      { title: 'Средний', note: 'Цепочка без NPE.', code: 'String email = findUser(id)\n  .map(User::profile)\n  .map(Profile::email)\n  .orElse("no-email");' },
      { title: 'Реальный', note: 'Валидация входа.', code: 'Order create(User user) {\n  Objects.requireNonNull(user, "user");\n  return new Order(user.id());\n}' }
    ],
    commonMistakes: [
      'Вызывают optional.get() без isPresent — тот же риск, что и null.',
      'Кладут Optional в поля DTO — чаще это усложняет сериализацию и модели.',
      'Используют orElse(expensive()) — expensive выполнится даже когда значение есть.'
    ],
    importantNuances: [
      'orElseGet(() -> expensive()) ленивый, orElse(value) eager.',
      'Optional не заменяет валидацию входных параметров.',
      'Публичный API лучше явно документировать: null запрещён или допустим.'
    ],
    checklist: [
      'Возвращаю Optional из поиска, где результат может отсутствовать.',
      'Не вызываю get() без проверки.',
      'Использую orElseGet для дорогого fallback.',
      'Проверяю обязательные параметры через Objects.requireNonNull.'
    ],
    practiceHint: 'Задачи на поиск и фильтрацию хорошо тренируют Optional вместо null.',
    practiceCategory: 'functions'
  },
  {
    id: 'concurrency-basics',
    title: 'Основы многопоточности',
    shortTitle: 'Потоки',
    simpleExplanation: 'Многопоточность позволяет выполнять работу параллельно, но общие данные становятся опасными. Главное: не делить изменяемое состояние или защищать его.',
    howItWorks: 'Thread запускает код в отдельном потоке. ExecutorService управляет пулом потоков. synchronized, Lock и concurrent-коллекции защищают доступ к shared state.',
    syntax: [
      'Thread t = new Thread(() -> work());\nt.start();\nt.join();',
      'ExecutorService pool = Executors.newFixedThreadPool(4);',
      'Future<Integer> f = pool.submit(() -> 42);',
      'synchronized (lock) {\n  counter++;\n}',
      'CompletableFuture.supplyAsync(() -> load())'
    ],
    examples: [
      { title: 'Простой', note: 'Запуск потока.', code: 'Thread worker = new Thread(() -> System.out.println("work"));\nworker.start();\nworker.join();' },
      { title: 'Средний', note: 'Пул потоков.', code: 'var pool = Executors.newFixedThreadPool(4);\nFuture<Integer> future = pool.submit(() -> heavyCalc());\nInteger result = future.get();\npool.shutdown();' },
      { title: 'Реальный', note: 'AtomicInteger для счётчика.', code: 'var counter = new AtomicInteger();\nitems.parallelStream().forEach(item -> counter.incrementAndGet());\nSystem.out.println(counter.get());' }
    ],
    commonMistakes: [
      'Инкрементируют общий int из разных потоков — race condition.',
      'Забывают shutdown у ExecutorService — приложение не завершается.',
      'Держат lock во время долгого I/O — блокируют остальные потоки.'
    ],
    importantNuances: [
      'volatile даёт видимость изменений, но не делает операции атомарными.',
      'ConcurrentHashMap лучше synchronized HashMap для конкурентного доступа.',
      'CompletableFuture удобен для цепочек async-операций.'
    ],
    checklist: [
      'Не делю mutable state без защиты.',
      'Использую ExecutorService вместо ручного создания многих Thread.',
      'Закрываю пул через shutdown.',
      'Понимаю разницу atomic, synchronized и volatile.'
    ],
    practiceHint: 'Параллельность тренируется на задачах со счётчиками, очередями и async pipeline.',
    practiceCategory: 'async'
  },
  {
    id: 'records-sealed',
    title: 'Records и sealed типы',
    shortTitle: 'Records/sealed',
    simpleExplanation: 'record — короткий способ описать immutable data-класс. sealed ограничивает, кто может наследоваться от класса или реализовать интерфейс.',
    howItWorks: 'Record автоматически создаёт constructor, accessors, equals, hashCode и toString. Sealed hierarchy делает набор подтипов явным: permits перечисляет разрешённых наследников.',
    syntax: [
      'record Point(int x, int y) {}',
      'record User(String name, int age) {\n  User {\n    if (age < 0) throw new IllegalArgumentException();\n  }\n}',
      'sealed interface Shape permits Circle, Rect {}',
      'final class Circle implements Shape {}',
      'non-sealed class Rect implements Shape {}'
    ],
    examples: [
      { title: 'Простой', note: 'Data object без boilerplate.', code: 'record Point(int x, int y) {}\nvar p = new Point(3, 4);\nSystem.out.println(p.x());' },
      { title: 'Средний', note: 'Валидация в compact constructor.', code: 'record Email(String value) {\n  Email {\n    if (!value.contains("@")) throw new IllegalArgumentException("bad email");\n  }\n}' },
      { title: 'Реальный', note: 'Закрытая иерархия событий.', code: 'sealed interface Event permits Login, Logout {}\nrecord Login(String user) implements Event {}\nrecord Logout(String user) implements Event {}' }
    ],
    commonMistakes: [
      'Пытаются использовать record для изменяемой сущности — record лучше для value/data objects.',
      'Кладут mutable коллекцию в record и думают что он полностью immutable.',
      'Забывают final, sealed или non-sealed у наследников sealed-типа.'
    ],
    importantNuances: [
      'Record final по умолчанию и не может наследоваться от другого класса.',
      'Accessors у record называются name(), а не getName().',
      'Sealed типы хорошо работают с pattern matching и исчерпывающими проверками.'
    ],
    checklist: [
      'Использую record для небольших immutable данных.',
      'Проверяю инварианты в compact constructor.',
      'Защищаю mutable поля копиями, если они есть.',
      'Понимаю permits и требования к наследникам sealed.'
    ],
    practiceHint: 'Records удобны в задачах на точки, интервалы, DTO и результаты вычислений.',
    practiceCategory: 'objects'
  },
  {
    id: 'packages-build',
    title: 'Пакеты и сборка',
    shortTitle: 'Пакеты/build',
    simpleExplanation: 'package группирует классы и задаёт namespace. import подключает классы из других пакетов. Maven и Gradle собирают проект, скачивают зависимости и запускают тесты.',
    howItWorks: 'Путь файла должен соответствовать package: com.example.User лежит в com/example/User.java. Build tool читает pom.xml или build.gradle и строит lifecycle: compile, test, package.',
    syntax: [
      'package com.example.app;',
      'import java.util.List;',
      'import static java.util.Comparator.comparing;',
      'javac -d out src/com/example/App.java',
      'mvn test',
      'gradle build'
    ],
    examples: [
      { title: 'Простой', note: 'Класс в пакете.', code: 'package com.acme.shop;\n\npublic class Product {\n  private final String name;\n  public Product(String name) { this.name = name; }\n}' },
      { title: 'Средний', note: 'Maven dependency.', code: '<dependency>\n  <groupId>org.junit.jupiter</groupId>\n  <artifactId>junit-jupiter</artifactId>\n  <version>5.10.0</version>\n  <scope>test</scope>\n</dependency>' },
      { title: 'Реальный', note: 'Gradle application plugin.', code: 'plugins { id("application") }\n\napplication {\n  mainClass.set("com.acme.Main")\n}' }
    ],
    commonMistakes: [
      'Package не совпадает с папками — IDE и сборка начинают конфликтовать.',
      'Используют wildcard imports везде — хуже читается источник класса.',
      'Коммитят build/target как исходники — это артефакты сборки.'
    ],
    importantNuances: [
      'public class должен лежать в файле с тем же именем.',
      'default package не подходит для реальных проектов.',
      'Maven чаще декларативный, Gradle гибче и программируется через DSL.'
    ],
    checklist: [
      'Держу package и путь файла синхронными.',
      'Понимаю compile/test/package lifecycle.',
      'Отделяю production dependencies от test dependencies.',
      'Не храню артефакты сборки в исходниках.'
    ],
    practiceHint: 'Сборка важна для проектов с несколькими классами, тестами и внешними библиотеками.',
    practiceCategory: 'objects'
  },
  {
    id: 'annotations',
    title: 'Аннотации',
    shortTitle: 'Аннотации',
    simpleExplanation: 'Аннотации — метаданные для компилятора, инструментов и runtime-фреймворков. @Override проверяет переопределение, @Deprecated помечает устаревший API.',
    howItWorks: 'Аннотация может храниться только в исходниках, в class-файле или быть доступной через reflection. RetentionPolicy задаёт срок жизни, Target — где её можно ставить.',
    syntax: [
      '@Override\npublic String toString() { return "User"; }',
      '@Deprecated(forRemoval = true)',
      '@Retention(RetentionPolicy.RUNTIME)\n@Target(ElementType.METHOD)\n@interface RequiresRole {\n  String value();\n}',
      'method.getAnnotation(RequiresRole.class)'
    ],
    examples: [
      { title: 'Простой', note: '@Override ловит опечатки.', code: 'class User {\n  @Override\n  public String toString() {\n    return "User";\n  }\n}' },
      { title: 'Средний', note: 'Своя runtime-аннотация.', code: '@Retention(RetentionPolicy.RUNTIME)\n@Target(ElementType.TYPE)\n@interface Table {\n  String value();\n}\n\n@Table("users")\nclass User {}' },
      { title: 'Реальный', note: 'Поиск аннотации через reflection.', code: 'Table table = User.class.getAnnotation(Table.class);\nif (table != null) {\n  System.out.println(table.value());\n}' }
    ],
    commonMistakes: [
      'Забывают @Retention(RUNTIME), а потом ищут аннотацию через reflection.',
      'Используют аннотации как замену нормальной логике — становится трудно отлаживать.',
      'Игнорируют @Override — компилятор не помогает ловить ошибки переопределения.'
    ],
    importantNuances: [
      'SOURCE аннотации видны только компилятору и annotation processors.',
      'RUNTIME аннотации доступны через reflection, но reflection не бесплатен.',
      'Многие фреймворки Java (Spring, JPA, JUnit) строятся вокруг аннотаций.'
    ],
    checklist: [
      'Ставлю @Override на переопределённые методы.',
      'Понимаю RetentionPolicy SOURCE/CLASS/RUNTIME.',
      'Указываю Target для своих аннотаций.',
      'Не прячу бизнес-логику в магию аннотаций.'
    ],
    practiceHint: 'Аннотации полезны в задачах на reflection, тестовые фреймворки и конфигурацию.',
    practiceCategory: 'objects'
  },
  {
    id: 'io-files',
    title: 'Файлы и I/O',
    shortTitle: 'I/O',
    simpleExplanation: 'I/O в Java — работа с файлами, потоками байтов и текстом. Современный API — java.nio.file: Path, Files, StandardOpenOption.',
    howItWorks: 'Path описывает путь, Files выполняет операции. Для маленьких файлов удобны readString/writeString. Для больших данных используют stream/reader и try-with-resources.',
    syntax: [
      'Path path = Path.of("data.txt");',
      'String text = Files.readString(path);',
      'Files.writeString(path, "hello");',
      'try (var lines = Files.lines(path)) {\n  lines.forEach(System.out::println);\n}',
      'Files.createDirectories(Path.of("out/logs"));'
    ],
    examples: [
      { title: 'Простой', note: 'Прочитать текстовый файл.', code: 'Path path = Path.of("input.txt");\nString text = Files.readString(path);\nSystem.out.println(text);' },
      { title: 'Средний', note: 'Записать строки.', code: 'var lines = List.of("one", "two", "three");\nFiles.write(Path.of("out.txt"), lines, StandardCharsets.UTF_8);' },
      { title: 'Реальный', note: 'Стрим строк закрывается автоматически.', code: 'try (var lines = Files.lines(Path.of("log.txt"))) {\n  long errors = lines.filter(s -> s.contains("ERROR")).count();\n  System.out.println(errors);\n}' }
    ],
    commonMistakes: [
      'Не закрывают поток — файл остаётся занятым, данные могут не записаться.',
      'Читают огромный файл через readString — можно упереться в память.',
      'Склеивают пути строками через "/" — ломается переносимость.'
    ],
    importantNuances: [
      'try-with-resources закрывает Reader, Writer, Stream и другие AutoCloseable.',
      'Charset лучше указывать явно, особенно для обмена файлами.',
      'Files.lines ленивый и держит файл открытым до закрытия stream.'
    ],
    checklist: [
      'Использую Path.of и Files вместо ручной склейки путей.',
      'Закрываю ресурсы через try-with-resources.',
      'Выбираю readString только для небольших файлов.',
      'Указываю кодировку при чтении и записи текста.'
    ],
    practiceHint: 'I/O пригодится для задач на парсинг входных файлов, логов и отчётов.',
    practiceCategory: 'arrays'
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
