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
  },
  {
    id: 'interfaces',
    title: 'Интерфейсы',
    shortTitle: 'Интерфейсы',
    simpleExplanation: 'Интерфейс в Go описывает поведение: какие методы должен иметь тип. Тип не пишет implements — он подходит автоматически, если набор методов совпал.',
    howItWorks: 'Интерфейс хранит динамический тип и значение. Маленькие интерфейсы обычно лучше больших: io.Reader, fmt.Stringer, error. Принимают интерфейс там, где нужна гибкость, возвращают конкретный тип там, где важны детали.',
    syntax: [
      'type Reader interface {\n  Read(p []byte) (n int, err error)\n}',
      'type Stringer interface {\n  String() string\n}',
      'var r io.Reader = file',
      'value, ok := x.(string)',
      'switch v := x.(type) { case string: fmt.Println(v) }',
      'var _ fmt.Stringer = User{}'
    ],
    examples: [
      { title: 'Простой', note: 'Тип удовлетворяет интерфейс без объявления.', code: 'type User struct { Name string }\nfunc (u User) String() string { return u.Name }\nvar s fmt.Stringer = User{Name: "Alex"}\nfmt.Println(s.String())' },
      { title: 'Средний', note: 'Функция зависит от поведения, а не от struct.', code: 'func printAll(r io.Reader) error {\n  data, err := io.ReadAll(r)\n  if err != nil { return err }\n  fmt.Println(string(data))\n  return nil\n}' },
      { title: 'Реальный', note: 'Проверка конкретного типа через type switch.', code: 'func describe(v any) string {\n  switch x := v.(type) {\n  case error:\n    return x.Error()\n  case fmt.Stringer:\n    return x.String()\n  default:\n    return fmt.Sprint(x)\n  }\n}' }
    ],
    commonMistakes: [
      'Создают большие интерфейсы заранее — ими тяжело пользоваться и тестировать.',
      'Возвращают interface{} там где можно вернуть конкретный тип.',
      'Не понимают typed nil: интерфейс с nil-указателем внутри сам не равен nil.'
    ],
    importantNuances: [
      'Пустой интерфейс interface{} сейчас обычно пишут как any.',
      'Метод с pointer receiver удовлетворяет интерфейс только для *T, не для T.',
      'Интерфейсы удобно объявлять рядом с потребителем, а не с реализацией.'
    ],
    checklist: [
      'Понимаю неявную реализацию интерфейса.',
      'Умею писать маленькие интерфейсы по поведению.',
      'Знаю type assertion и type switch.',
      'Проверяю typed nil в ошибках и интерфейсах.'
    ],
    practiceHint: 'Тренируй интерфейсы на задачах с разными источниками данных: строки, файлы, буферы.',
    practiceCategory: 'objects'
  },
  {
    id: 'defer-panic-recover',
    title: 'defer, panic и recover',
    shortTitle: 'defer/panic',
    simpleExplanation: 'defer откладывает вызов до выхода из функции. panic аварийно прерывает обычный поток. recover может перехватить panic, но только внутри deferred-функции.',
    howItWorks: 'Отложенные вызовы выполняются в обратном порядке. Аргументы defer вычисляются сразу, а тело выполняется позже. panic раскручивает стек и запускает defer. recover останавливает panic, если вызван прямо из defer.',
    syntax: [
      'defer file.Close()',
      'defer func() { fmt.Println("done") }()',
      'panic("invalid state")',
      'defer func() {\n  if r := recover(); r != nil { fmt.Println(r) }\n}()',
      'defer mu.Unlock()'
    ],
    examples: [
      { title: 'Простой', note: 'Cleanup рядом с ресурсом.', code: 'f, err := os.Open(path)\nif err != nil { return err }\ndefer f.Close()\nreturn process(f)' },
      { title: 'Средний', note: 'Порядок LIFO.', code: 'defer fmt.Println("first")\ndefer fmt.Println("second")\nfmt.Println("body")\n// body, second, first' },
      { title: 'Реальный', note: 'Граница восстановления для worker.', code: 'func safeRun(job func()) {\n  defer func() {\n    if r := recover(); r != nil { log.Println("panic:", r) }\n  }()\n  job()\n}' }
    ],
    commonMistakes: [
      'Используют panic вместо возврата error для ожидаемых ошибок.',
      'Забывают что defer в цикле накопит много отложенных вызовов.',
      'Пытаются recover вне defer — он ничего не перехватывает.'
    ],
    importantNuances: [
      'defer полезен для Unlock, Close, Rollback и восстановления инвариантов.',
      'recover не должен скрывать баги без логирования и понятной границы.',
      'Аргументы defer фиксируются в момент объявления defer.'
    ],
    checklist: [
      'Ставлю defer сразу после успешного получения ресурса.',
      'Понимаю LIFO-порядок defer.',
      'Не заменяю error на panic в обычной логике.',
      'Использую recover только на границах приложения или worker.'
    ],
    practiceHint: 'Попробуй написать функцию, которая открывает файл, блокирует mutex и гарантированно освобождает оба ресурса.',
    practiceCategory: 'functions'
  },
  {
    id: 'packages-modules',
    title: 'Пакеты и модули',
    shortTitle: 'Пакеты',
    simpleExplanation: 'Пакет группирует файлы одной директории. Модуль описывает проект и зависимости через go.mod. Экспорт в Go зависит от регистра: Name видно снаружи, name приватен для пакета.',
    howItWorks: 'Каждый файл начинается с package. Импорт указывает путь пакета, не имя файла. go mod init создаёт модуль, go mod tidy синхронизирует зависимости. Команда go build строит пакет или модуль.',
    syntax: [
      'go mod init example.com/app',
      'go mod tidy',
      'package users',
      'import "fmt"',
      'import (\n  "context"\n  "net/http"\n)',
      'func NewService() *Service { return &Service{} }'
    ],
    examples: [
      { title: 'Простой', note: 'Один пакет main для запуска.', code: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("hello")\n}' },
      { title: 'Средний', note: 'Экспортируемый конструктор и приватное поле.', code: 'package users\n\ntype Service struct { repo Repository }\nfunc NewService(repo Repository) *Service {\n  return &Service{repo: repo}\n}' },
      { title: 'Реальный', note: 'Алиас импорта для конфликта имён.', code: 'import (\n  jsoniter "github.com/json-iterator/go"\n)\n\nvar json = jsoniter.ConfigCompatibleWithStandardLibrary' }
    ],
    commonMistakes: [
      'Называют package по имени файла, а не по смыслу директории.',
      'Делают всё экспортируемым и ломают инкапсуляцию.',
      'Редактируют go.mod вручную без go mod tidy и получают лишние зависимости.'
    ],
    importantNuances: [
      'В одной директории не смешивают разные package, кроме *_test пакета.',
      'internal/ запрещает импорт извне родительского дерева.',
      'cmd/app часто используют для точки входа, а бизнес-код кладут в отдельные пакеты.'
    ],
    checklist: [
      'Понимаю package, module и import path.',
      'Знаю правило экспорта через заглавную букву.',
      'Умею запускать go mod tidy.',
      'Держу публичный API маленьким.'
    ],
    practiceHint: 'Разбей небольшую программу на main, пакет с логикой и пакет с тестами.',
    practiceCategory: 'functions'
  },
  {
    id: 'context-cancellation',
    title: 'Context и отмена',
    shortTitle: 'Context',
    simpleExplanation: 'context.Context передаёт дедлайн, отмену и request-scoped значения. Его используют, чтобы остановить работу горутин, запросов и операций ввода-вывода.',
    howItWorks: 'Context передают первым аргументом: ctx context.Context. WithCancel даёт ручную отмену, WithTimeout и WithDeadline отменяют по времени. Операции слушают ctx.Done() и возвращают ctx.Err().',
    syntax: [
      'func Load(ctx context.Context, id int) (User, error)',
      'ctx := context.Background()',
      'ctx, cancel := context.WithTimeout(ctx, 2*time.Second)\ndefer cancel()',
      'select {\ncase <-ctx.Done(): return ctx.Err()\ncase v := <-ch: return v, nil\n}',
      'req = req.WithContext(ctx)'
    ],
    examples: [
      { title: 'Простой', note: 'Timeout для операции.', code: 'ctx, cancel := context.WithTimeout(context.Background(), time.Second)\ndefer cancel()\nuser, err := repo.Load(ctx, id)' },
      { title: 'Средний', note: 'Worker выходит по отмене.', code: 'for {\n  select {\n  case <-ctx.Done():\n    return ctx.Err()\n  case job := <-jobs:\n    handle(job)\n  }\n}' },
      { title: 'Реальный', note: 'HTTP-запрос с контекстом.', code: 'req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)\nif err != nil { return err }\nresp, err := http.DefaultClient.Do(req)' }
    ],
    commonMistakes: [
      'Не вызывают cancel — таймеры и ресурсы живут дольше нужного.',
      'Хранят context в struct вместо передачи параметром.',
      'Кладут в context обычные параметры функции вместо request-scoped данных.'
    ],
    importantNuances: [
      'context.Background() — корневой контекст для main, init и тестов.',
      'context.TODO() временно помечает место, где настоящий контекст ещё не протянут.',
      'Значения в context должны быть маленькими и жить только в рамках запроса.'
    ],
    checklist: [
      'Передаю ctx первым параметром.',
      'Всегда вызываю cancel после WithCancel/WithTimeout.',
      'Слушаю ctx.Done() в долгих операциях.',
      'Возвращаю ctx.Err() при отмене.'
    ],
    practiceHint: 'Сделай worker pool, который останавливается по timeout и не оставляет горутины висеть.',
    practiceCategory: 'async'
  },
  {
    id: 'generics',
    title: 'Generics',
    shortTitle: 'Generics',
    simpleExplanation: 'Generics позволяют писать функции и типы с параметрами типа. Это убирает дублирование, когда алгоритм одинаковый, а тип данных разный.',
    howItWorks: 'Параметры типа пишутся в квадратных скобках. Constraint ограничивает допустимые типы и операции. any значит любой тип. comparable нужен для == и ключей map.',
    syntax: [
      'func First[T any](items []T) (T, bool)',
      'type Set[T comparable] map[T]struct{}',
      'func Max[T Ordered](a, b T) T',
      'func Map[T, R any](items []T, fn func(T) R) []R',
      'type Ordered interface { ~int | ~float64 | ~string }'
    ],
    examples: [
      { title: 'Простой', note: 'Первый элемент любого слайса.', code: 'func First[T any](items []T) (T, bool) {\n  if len(items) == 0 {\n    var zero T\n    return zero, false\n  }\n  return items[0], true\n}' },
      { title: 'Средний', note: 'Set для сравнимых типов.', code: 'type Set[T comparable] map[T]struct{}\nfunc (s Set[T]) Add(v T) { s[v] = struct{}{} }\nfunc (s Set[T]) Has(v T) bool { _, ok := s[v]; return ok }' },
      { title: 'Реальный', note: 'Общий Map без interface{} и type assertions.', code: 'func Map[T, R any](items []T, fn func(T) R) []R {\n  out := make([]R, 0, len(items))\n  for _, item := range items { out = append(out, fn(item)) }\n  return out\n}' }
    ],
    commonMistakes: [
      'Используют generics там, где обычный интерфейс проще.',
      'Забывают zero value для T и пытаются вернуть nil для любого типа.',
      'Слишком широко задают constraint и теряют доступ к нужным операциям.'
    ],
    importantNuances: [
      'Generics хороши для контейнеров, алгоритмов и type-safe helpers.',
      'Интерфейсы описывают поведение, generics описывают форму данных и операций.',
      '~int в constraint разрешает пользовательские типы с базовым типом int.'
    ],
    checklist: [
      'Умею писать параметр типа [T any].',
      'Знаю comparable для map/set и сравнения.',
      'Понимаю разницу generics и интерфейсов.',
      'Возвращаю zero value корректно для любого T.'
    ],
    practiceHint: 'Перепиши несколько helper-функций для слайсов так, чтобы они работали с любым типом.',
    practiceCategory: 'arrays'
  },
  {
    id: 'testing',
    title: 'Тестирование',
    shortTitle: 'Тесты',
    simpleExplanation: 'Go имеет встроенный пакет testing. Тесты лежат в *_test.go, функции называются TestXxx. Обычно используют table-driven tests: набор входов и ожидаемых результатов.',
    howItWorks: 'go test запускает тесты пакета. t.Fatal останавливает текущий тест, t.Errorf помечает ошибку и продолжает. t.Run создаёт под-тесты. Бенчмарки начинаются с Benchmark и запускаются через -bench.',
    syntax: [
      'func TestAdd(t *testing.T) { }',
      'go test ./...',
      'go test -run TestAdd',
      't.Run("case name", func(t *testing.T) { })',
      'if got != want { t.Fatalf("got %v, want %v", got, want) }',
      'func BenchmarkAdd(b *testing.B) { }'
    ],
    examples: [
      { title: 'Простой', note: 'Обычный unit test.', code: 'func TestAdd(t *testing.T) {\n  got := Add(2, 3)\n  if got != 5 {\n    t.Fatalf("got %d, want 5", got)\n  }\n}' },
      { title: 'Средний', note: 'Table-driven тест.', code: 'cases := []struct{ a, b, want int }{\n  {2, 3, 5},\n  {-1, 1, 0},\n}\nfor _, tc := range cases {\n  got := Add(tc.a, tc.b)\n  if got != tc.want { t.Errorf("got %d, want %d", got, tc.want) }\n}' },
      { title: 'Реальный', note: 'Под-тесты с именами кейсов.', code: 'for _, tc := range cases {\n  tc := tc\n  t.Run(tc.name, func(t *testing.T) {\n    got := Parse(tc.input)\n    if got != tc.want { t.Fatalf("got %v, want %v", got, tc.want) }\n  })\n}' }
    ],
    commonMistakes: [
      'Пишут тесты без понятного сообщения об ошибке.',
      'Делают тест зависимым от порядка map или текущего времени.',
      'Не проверяют ошибку, хотя тестируют негативный сценарий.'
    ],
    importantNuances: [
      't.Helper() улучшает строку ошибки в тестовых helper-функциях.',
      'Пакет name_test тестирует публичный API как внешний пользователь.',
      'go test -race помогает ловить гонки в конкурентном коде.'
    ],
    checklist: [
      'Знаю файл *_test.go и функции TestXxx.',
      'Умею table-driven tests.',
      'Пишу понятные got/want сообщения.',
      'Запускаю go test ./... перед изменениями в Go-проекте.'
    ],
    practiceHint: 'Возьми любую функцию парсинга или подсчёта и покрой её table-driven тестами.',
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
