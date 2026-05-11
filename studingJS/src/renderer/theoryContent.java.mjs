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
