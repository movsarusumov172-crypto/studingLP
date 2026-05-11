import { buildTheoryTopicList as helperList, buildTheoryTopicHtml as helperHtml } from './theoryHelpers.mjs';

export const LANGUAGE_LABEL = 'Go теория';

export const THEORY_TOPICS = [
  {
    id: 'variables',
    title: 'Переменные и типы',
    shortTitle: 'Переменные',
    simpleExplanation: 'Go — статически типизирован. Компилятор выводит тип через :=. Нулевые значения по умолчанию: 0, "", false, nil. Неиспользованные переменные — ошибка компиляции.',
    howItWorks: 'var объявляет с явным типом. := — краткое объявление с выводом типа, только внутри функций. Go строго разделяет объявление и присваивание.',
    syntax: [
      'var name string = "Alex"',
      'age := 21                    // вывод типа',
      'var x, y int = 1, 2',
      'const Pi = 3.14159',
      'var p *int                   // nil указатель'
    ],
    examples: [
      { title: 'Простой', note: 'Нулевые значения.', code: 'var n int\nvar s string\nvar b bool\nfmt.Println(n, s, b) // 0  false' },
      { title: 'Средний', note: 'Множественное присваивание.', code: 'a, b := 1, 2\na, b = b, a // swap без tmp\nfmt.Println(a, b) // 2 1' },
      { title: 'Реальный', note: 'Константы с iota.', code: 'const (\n  Small = iota\n  Medium\n  Large\n) // 0, 1, 2' }
    ],
    commonMistakes: [
      'Объявляют переменную и не используют — компилятор запрещает.',
      'Пытаются := снаружи функции — только var на уровне пакета.',
      'Путают == для сравнения строк (работает) и слайсов (не работает).'
    ],
    importantNuances: [
      'Нулевое значение — всегда безопасная инициализация.',
      'Типы числел: int, int8/16/32/64, uint, float32/64.',
      'Строки неизменяемы, []byte — изменяемы.'
    ],
    checklist: [
      'Знаю var vs :=.',
      'Понимаю нулевые значения.',
      'Умею объявлять константы.',
      'Не оставляю неиспользованные переменные.'
    ],
    practiceHint: 'Начни с задач на массивы/слайсы — там всё про типы Go.',
    practiceCategory: 'arrays'
  },
  {
    id: 'functions',
    title: 'Функции и возврат ошибок',
    shortTitle: 'Функции',
    simpleExplanation: 'Go функции возвращают несколько значений. Идиома: (result, error). Caller обязан проверить ошибку. Defer откладывает вызов до конца функции.',
    howItWorks: 'Множественный возврат — не кортеж, а отдельные значения. error — встроенный интерфейс. defer выполняется в LIFO-порядке при выходе из функции (даже при panic).',
    syntax: [
      'func add(a, b int) int { return a + b }',
      'func divide(a, b float64) (float64, error) {\n  if b == 0 { return 0, fmt.Errorf("div by zero") }\n  return a / b, nil\n}',
      'defer f.Close()              // выполнится при выходе из функции',
      'func variadic(nums ...int) int { /* */ }'
    ],
    examples: [
      { title: 'Простой', note: 'Проверка ошибки — обязательна.', code: 'result, err := divide(10, 2)\nif err != nil {\n  log.Fatal(err)\n}\nfmt.Println(result)' },
      { title: 'Средний', note: 'Named returns + defer.', code: 'func readFile(path string) (content string, err error) {\n  f, err := os.Open(path)\n  if err != nil { return }\n  defer f.Close()\n  // читаем...\n  return\n}' },
      { title: 'Реальный', note: 'Обёртка ошибки с контекстом.', code: 'if err != nil {\n  return fmt.Errorf("loadUser %d: %w", id, err)\n}' }
    ],
    commonMistakes: [
      'Игнорируют ошибку через _ когда она важна.',
      'Забывают что defer аргументы вычисляются сразу при вызове defer.',
      'Возвращают error через panic — не идиоматично.'
    ],
    importantNuances: [
      'errors.Is и errors.As для unwrap-цепочки ошибок.',
      'recover() работает только внутри defer.',
      'Функции — first-class: можно передавать как аргументы.'
    ],
    checklist: [
      'Всегда проверяю err != nil.',
      'Умею defer для cleanup.',
      'Знаю fmt.Errorf с %w для wrapping.',
      'Понимаю порядок выполнения defer.'
    ],
    practiceHint: 'Go-задачи часто строятся на функциях с обработкой ошибок.',
    practiceCategory: 'functions'
  },
  {
    id: 'slices',
    title: 'Слайсы и карты',
    shortTitle: 'Слайсы/Карты',
    simpleExplanation: 'Слайс — динамический вид на массив (длина + ёмкость + указатель). Карта (map) — хэш-таблица. Оба создаются через make или литерал.',
    howItWorks: 'append может перераспределить память и вернуть новый слайс. Поэтому append всегда присваивают обратно. При чтении из карты второе значение — bool (ok), показывает наличие ключа.',
    syntax: [
      's := []int{1, 2, 3}',
      's = append(s, 4)',
      's2 := s[1:3]             // слайс [2, 3]',
      'm := map[string]int{"a": 1}',
      'val, ok := m["key"]',
      'delete(m, "key")',
      's := make([]int, 5, 10)  // len=5, cap=10'
    ],
    examples: [
      { title: 'Простой', note: 'range по слайсу.', code: 'nums := []int{10, 20, 30}\nfor i, v := range nums {\n  fmt.Printf("%d: %d\\n", i, v)\n}' },
      { title: 'Средний', note: 'Подсчёт частот через map.', code: 'freq := make(map[string]int)\nfor _, w := range words {\n  freq[w]++\n}\nfmt.Println(freq)' },
      { title: 'Реальный', note: 'Фильтрация слайса без аллокации лишних данных.', code: 'filtered := s[:0]\nfor _, v := range s {\n  if v > 0 { filtered = append(filtered, v) }\n}' }
    ],
    commonMistakes: [
      'Не сохраняют результат append — теряют изменения.',
      'Читают из nil map — panic. Пишут в nil map — panic.',
      'Думают что slice-копия изолирована — нет, базовый массив общий.'
    ],
    importantNuances: [
      'copy(dst, src) делает настоящую копию данных.',
      'Карты не упорядочены — порядок итерации случаен.',
      'Нулевое значение слайса (nil) можно append-ить без make.'
    ],
    checklist: [
      'Всегда сохраняю результат append.',
      'Проверяю ok при чтении из карты.',
      'Умею copy для изолированной копии.',
      'Понимаю разницу len и cap.'
    ],
    practiceHint: 'Задачи на массивы и алгоритмы — основная область применения слайсов.',
    practiceCategory: 'arrays'
  },
  {
    id: 'structs',
    title: 'Структуры и методы',
    shortTitle: 'Структуры',
    simpleExplanation: 'Go не имеет классов. Структуры + методы = аналог. Receiver определяет на каком типе метод. Pointer receiver изменяет оригинал, value receiver работает с копией.',
    howItWorks: 'Методы привязываются к типу через receiver. Интерфейс — набор методов. Если тип реализует все методы интерфейса — он его удовлетворяет (duck typing, неявно).',
    syntax: [
      'type User struct {\n  Name string\n  Age  int\n}',
      'func (u *User) Greet() string {\n  return "Hi, " + u.Name\n}',
      'u := User{Name: "Alex", Age: 21}\nu.Greet()',
      'type Greeter interface {\n  Greet() string\n}'
    ],
    examples: [
      { title: 'Простой', note: 'Создание и метод.', code: 'type Rect struct { W, H float64 }\nfunc (r Rect) Area() float64 { return r.W * r.H }\nr := Rect{W: 3, H: 4}\nfmt.Println(r.Area()) // 12' },
      { title: 'Средний', note: 'Pointer receiver для изменения.', code: 'type Counter struct { n int }\nfunc (c *Counter) Inc() { c.n++ }\nfunc (c Counter) Val() int { return c.n }' },
      { title: 'Реальный', note: 'Имплементация интерфейса.', code: 'type Logger struct{}\nfunc (l Logger) Log(msg string) { fmt.Println("[LOG]", msg) }\n// Logger автоматически удовлетворяет io.Writer-подобным интерфейсам' }
    ],
    commonMistakes: [
      'Используют value receiver когда нужно изменить struct — изменение теряется.',
      'Смешивают pointer и value receivers на одном типе без причины.',
      'Забывают экспортировать поля (первая буква в верхнем регистре).'
    ],
    importantNuances: [
      'Встраивание (embedding) — композиция вместо наследования.',
      'Экспортированные поля — с большой буквы, приватные — с маленькой.',
      'Интерфейс error — просто { Error() string }.'
    ],
    checklist: [
      'Знаю разницу pointer vs value receiver.',
      'Умею объявлять интерфейсы.',
      'Понимаю что экспорт — через заглавную букву.',
      'Использую composition через embedding.'
    ],
    practiceHint: 'Задачи на объекты и closures хорошо переносятся на Go structs.',
    practiceCategory: 'objects'
  },
  {
    id: 'concurrency',
    title: 'Горутины и каналы',
    shortTitle: 'Горутины',
    simpleExplanation: 'goroutine — лёгкая «нить» управляемая рантаймом Go. channel — безопасная очередь между горутинами. Философия: не общайтесь через разделяемую память, разделяйте память через общение.',
    howItWorks: 'go func() запускает горутину. ch <- val отправляет, val := <-ch получает. Небуфферизованный канал блокирует отправителя пока нет получателя. sync.WaitGroup ждёт завершения набора горутин.',
    syntax: [
      'go func() { /* работает асинхронно */ }()',
      'ch := make(chan int)',
      'ch := make(chan int, 10)    // буфер 10',
      'ch <- 42                    // отправить',
      'val := <-ch                 // получить',
      'close(ch)',
      'for v := range ch { }      // читать до close'
    ],
    examples: [
      { title: 'Простой', note: 'WaitGroup для ожидания горутин.', code: 'var wg sync.WaitGroup\nfor i := 0; i < 5; i++ {\n  wg.Add(1)\n  go func(n int) {\n    defer wg.Done()\n    fmt.Println(n)\n  }(i)\n}\nwg.Wait()' },
      { title: 'Средний', note: 'Pipeline через каналы.', code: 'gen := func(nums ...int) <-chan int {\n  ch := make(chan int)\n  go func() {\n    for _, n := range nums { ch <- n }\n    close(ch)\n  }()\n  return ch\n}' },
      { title: 'Реальный', note: 'select для timeout.', code: 'select {\ncase res := <-ch:\n  fmt.Println(res)\ncase <-time.After(2 * time.Second):\n  fmt.Println("timeout")\n}' }
    ],
    commonMistakes: [
      'Утечка горутины — горутина заблокирована навсегда, никто не читает канал.',
      'Гонка данных через разделяемую переменную без мьютекса.',
      'Закрывают канал дважды — panic.'
    ],
    importantNuances: [
      'Только отправитель должен закрывать канал.',
      'sync.Mutex для защиты разделяемых данных.',
      'go vet и -race флаг находят гонки данных.'
    ],
    checklist: [
      'Умею запускать горутины.',
      'Знаю WaitGroup для синхронизации.',
      'Понимаю буфферизованные vs небуфферизованные каналы.',
      'Знаю select для мультиплексирования.'
    ],
    practiceHint: 'Задачи на async в Go — через каналы и горутины.',
    practiceCategory: 'async'
  },
  {
    id: 'errors',
    title: 'Обработка ошибок',
    shortTitle: 'Ошибки',
    simpleExplanation: 'В Go нет исключений. Ошибки — это обычные значения типа error. Функция возвращает (result, error), вызывающий проверяет. Это явно, многословно, но предсказуемо.',
    howItWorks: 'error — интерфейс с одним методом Error() string. errors.New и fmt.Errorf создают ошибки. fmt.Errorf с %w оборачивает ошибку для unwrapping. errors.Is/As разворачивают цепочку.',
    syntax: [
      'errors.New("something went wrong")',
      'fmt.Errorf("load user %d: %w", id, err)',
      'errors.Is(err, ErrNotFound)',
      'var myErr *MyError\nerrors.As(err, &myErr)',
      'type NotFoundError struct { ID int }\nfunc (e *NotFoundError) Error() string { return fmt.Sprintf("not found: %d", e.ID) }'
    ],
    examples: [
      { title: 'Простой', note: 'Sentinel error.', code: 'var ErrNotFound = errors.New("not found")\nfunc find(id int) (Item, error) {\n  if id < 0 { return Item{}, ErrNotFound }\n  return items[id], nil\n}' },
      { title: 'Средний', note: 'Тип ошибки для деталей.', code: 'type ValidationError struct {\n  Field   string\n  Message string\n}\nfunc (e *ValidationError) Error() string {\n  return e.Field + ": " + e.Message\n}' },
      { title: 'Реальный', note: 'Проверка конкретного типа ошибки.', code: 'var ve *ValidationError\nif errors.As(err, &ve) {\n  fmt.Println("Field:", ve.Field)\n}' }
    ],
    commonMistakes: [
      'Возвращают nil вместо ошибки «не нашли» — вызывающий не знает что нет данных.',
      'Игнорируют ошибки через _ там где это важно.',
      'Создают новую ошибку вместо оборачивания через %w — теряется контекст.'
    ],
    importantNuances: [
      'Panic только для программных ошибок (nil deref, out of bounds), не бизнес-ошибок.',
      'recover() можно использовать только в defer.',
      'Многие пакеты Go возвращают io.EOF как sentinel — это не ошибка, а сигнал конца.'
    ],
    checklist: [
      'Всегда проверяю err != nil.',
      'Оборачиваю ошибки через fmt.Errorf("%w").',
      'Знаю errors.Is и errors.As.',
      'Создаю типизированные ошибки когда нужно передать детали.'
    ],
    practiceHint: 'Большинство Go-задач требуют корректной обработки ошибок.',
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
