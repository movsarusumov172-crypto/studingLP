const PYTHON_THEORY_TOPICS = [
  {
    id: 'variables',
    title: 'Переменные',
    shortTitle: 'Переменные',
    simpleExplanation: 'Переменная — это имя, под которым ты хранишь значение. В Python это не коробка, а ссылка на объект.',
    howItWorks: 'Python сначала вычисляет правую часть, получает объект и связывает с ним имя слева. Потом это имя можно переназначить на другой объект.',
    syntax: [
      'name = "Alex"',
      'age = 21',
      'is_ready = True',
      'a, b = 1, 2'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Имя хранит строку, и мы можем её сразу вывести.',
        code: `name = "Misha"\nprint(name)`
      },
      {
        title: 'Средний',
        note: 'Значение можно обновлять через само себя.',
        code: `points = 10\npoints = points + 5\nprint(points)`
      },
      {
        title: 'Реальный',
        note: 'Понятные имена помогают читать код без догадок.',
        code: `user_name = "Anna"\ntask_count = 12\nprint(f"{user_name}: {task_count} задач")`
      }
    ],
    commonMistakes: [
      'Путают присваивание `=` и сравнение `==`.',
      'Используют слишком короткие и непонятные имена вроде `x1` или `tmp2`.',
      'Перезаписывают переменную и забывают, что старое значение уже потеряно.'
    ],
    importantNuances: [
      'Имена чувствительны к регистру: `age`, `Age` и `AGE` — это разные переменные.',
      'Тип принадлежит значению, а не имени переменной.',
      'В Python принято использовать `snake_case`.'
    ],
    checklist: [
      'Понимаю, что переменная — это имя для значения.',
      'Умею присваивать значение через `=`.',
      'Могу читать и обновлять переменные без путаницы.',
      'Даю переменным понятные имена.'
    ],
    practiceHint: 'Теперь попробуй создать несколько переменных и собрать из них простое сообщение или расчёт.'
  },
  {
    id: 'types',
    title: 'Типы данных',
    shortTitle: 'Типы данных',
    simpleExplanation: 'Тип данных показывает, что это за значение и какие операции с ним можно делать.',
    howItWorks: 'Python хранит тип у самого объекта. Одна и та же переменная может сначала ссылаться на число, а потом на строку, потому что имя не обязано иметь один тип навсегда.',
    syntax: [
      'type(42)',
      'int("10")',
      'str(123)',
      'bool(1)',
      'list((1, 2, 3))'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Проверяем тип значения.',
        code: `value = 3.14\nprint(type(value))`
      },
      {
        title: 'Средний',
        note: 'Преобразуем строку в число перед вычислением.',
        code: `price = "99"\ntotal = int(price) + 1\nprint(total)`
      },
      {
        title: 'Реальный',
        note: 'Сначала приводим типы, потом считаем.',
        code: `count = "5"\nprice = 120\nprint(price * int(count))`
      }
    ],
    commonMistakes: [
      'Пытаются сложить строку и число без преобразования.',
      'Забывают, что `True` и `False` тоже отдельный тип.',
      'Думают, что `type()` меняет значение. Он только показывает тип.'
    ],
    importantNuances: [
      'Есть изменяемые типы: списки, словари, множества.',
      'Есть неизменяемые: числа, строки, кортежи.',
      'Преобразование типов помогает не ломать вычисления и ввод пользователя.'
    ],
    checklist: [
      'Знаю основные типы Python.',
      'Умею смотреть на тип через `type()`.',
      'Умею преобразовывать значения.',
      'Понимаю разницу между числом, строкой и булевым значением.'
    ],
    practiceHint: 'Теперь попробуй принять строку, преобразовать её в число и использовать в вычислениях.'
  },
  {
    id: 'conditionals',
    title: 'Условные конструкции',
    shortTitle: 'Условия',
    simpleExplanation: 'Условие помогает программе выбрать ветку поведения: сделать одно, если правда, и другое, если нет.',
    howItWorks: 'Python вычисляет логическое выражение и идёт либо в `if`, либо в `elif`, либо в `else`. Срабатывает только первая подходящая ветка.',
    syntax: [
      'if score >= 80:\n    print("Отлично")',
      'elif score >= 60:\n    print("Нормально")',
      'else:\n    print("Нужно подтянуть")',
      'if not is_ready:\n    print("Ждём")'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Проверяем возраст.',
        code: `age = 18\nif age >= 18:\n    print("Доступ разрешён")\nelse:\n    print("Нельзя")`
      },
      {
        title: 'Средний',
        note: 'Разбиваем оценки на уровни.',
        code: `score = 73\nif score >= 90:\n    print("A")\nelif score >= 70:\n    print("B")\nelse:\n    print("C")`
      },
      {
        title: 'Реальный',
        note: 'Используем условия как защиту от плохих данных.',
        code: `email = ""\nif not email:\n    print("Заполни email")`
      }
    ],
    commonMistakes: [
      'Забывают двоеточие после `if`, `elif` и `else`.',
      'Путают `=` и `==`.',
      'Ломают отступы, из-за чего Python не понимает структуру.'
    ],
    importantNuances: [
      'В `if` можно писать сложные условия с `and`, `or`, `not`.',
      'Python останавливается на первой подходящей ветке.',
      'Сначала проверяй более частые и более специфичные случаи.'
    ],
    checklist: [
      'Умею строить ветвление с `if/elif/else`.',
      'Понимаю, как читаются логические выражения.',
      'Не путаю сравнение и присваивание.',
      'Следую отступам и двоеточиям.'
    ],
    practiceHint: 'Теперь попробуй написать условие, которое выбирает одно из трёх сообщений по числу.'
  },
  {
    id: 'loops',
    title: 'Циклы',
    shortTitle: 'Циклы',
    simpleExplanation: 'Цикл нужен, чтобы повторять действия без копипаста.',
    howItWorks: '`for` проходит по элементам, а `while` повторяет блок, пока условие остаётся истинным. Цикл удобен, когда у тебя много однотипных шагов.',
    syntax: [
      'for item in items:\n    print(item)',
      'for i in range(5):\n    print(i)',
      'while attempts < 3:\n    attempts += 1',
      'break',
      'continue'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Печатаем числа через `range()`.',
        code: `for i in range(3):\n    print(i)`
      },
      {
        title: 'Средний',
        note: 'Считаем сумму списка.',
        code: `numbers = [1, 2, 3, 4]\ntotal = 0\nfor number in numbers:\n    total += number\nprint(total)`
      },
      {
        title: 'Реальный',
        note: 'Повторяем попытку, пока пользователь не введёт корректное значение.',
        code: `attempts = 0\nwhile attempts < 3:\n    attempts += 1\n    print("Пробуем ещё раз")`
      }
    ],
    commonMistakes: [
      'Создают бесконечный `while`, забыв изменить условие.',
      'Пытаются изменять список, который одновременно обходят.',
      'Считают, что `range(5)` даёт числа от 1 до 5. На самом деле от 0 до 4.'
    ],
    importantNuances: [
      '`for` в Python любит итерируемые объекты: списки, строки, словари, генераторы.',
      '`break` останавливает цикл, `continue` пропускает текущую итерацию.',
      'Для номера элемента используй `enumerate()`.'
    ],
    checklist: [
      'Умею использовать `for` и `while`.',
      'Понимаю, когда нужен `break` или `continue`.',
      'Могу пройтись по списку и посчитать что-то.',
      'Не создаю бесконечные циклы случайно.'
    ],
    practiceHint: 'Теперь попробуй пройтись по списку и посчитать количество или сумму элементов.'
  },
  {
    id: 'functions',
    title: 'Функции',
    shortTitle: 'Функции',
    simpleExplanation: 'Функция — это маленькая программа внутри программы. Один раз написал, много раз использовал.',
    howItWorks: 'Когда функция вызывается, Python создаёт отдельный локальный контекст, передаёт аргументы и возвращает результат через `return`.',
    syntax: [
      'def add(a, b):\n    return a + b',
      'def greet(name="friend"):\n    print(f"Hi, {name}")',
      'result = add(2, 3)'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Функция печатает приветствие.',
        code: `def greet(name):\n    print(f"Привет, {name}")\n\ngreet("Misha")`
      },
      {
        title: 'Средний',
        note: 'Функция возвращает сумму.',
        code: `def add(a, b):\n    return a + b\n\nprint(add(2, 5))`
      },
      {
        title: 'Реальный',
        note: 'Функция нормализует данные и возвращает готовый результат.',
        code: `def normalize_text(text):\n    return text.strip().lower()\n\nprint(normalize_text("  Python  "))`
      }
    ],
    commonMistakes: [
      'Забывают `return` и получают `None`.',
      'Путают параметры функции и аргументы вызова.',
      'Делают одну огромную функцию вместо нескольких маленьких.'
    ],
    importantNuances: [
      'Функция должна делать одну понятную вещь.',
      'Ранний `return` часто делает код проще.',
      'Хорошие имена функций читаются как действия: `build_report`, `normalize_input`.'
    ],
    checklist: [
      'Умею объявлять и вызывать функцию.',
      'Понимаю вход и выход функции.',
      'Знаю, когда нужен `return`.',
      'Могу разнести задачу на маленькие функции.'
    ],
    practiceHint: 'Теперь попробуй написать функцию, которая принимает данные, обрабатывает их и возвращает результат.'
  },
  {
    id: 'lists',
    title: 'Списки',
    shortTitle: 'Списки',
    simpleExplanation: 'Список — это упорядоченная и изменяемая коллекция значений. Очень похоже на массив.',
    howItWorks: 'Список хранит элементы по порядку. К каждому элементу можно обратиться по индексу, добавить новый, удалить лишний или пройти по всем элементам в цикле.',
    syntax: [
      'numbers = [1, 2, 3]',
      'numbers.append(4)',
      'first = numbers[0]',
      'slice_part = numbers[1:3]'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Создаём и читаем список.',
        code: `items = ["apple", "banana", "pear"]\nprint(items[0])`
      },
      {
        title: 'Средний',
        note: 'Добавляем и удаляем значения.',
        code: `scores = [10, 20]\nscores.append(30)\nscores.pop(0)\nprint(scores)`
      },
      {
        title: 'Реальный',
        note: 'Собираем чистый список только из нужных значений.',
        code: `numbers = [1, -2, 3, -4]\npositive = [n for n in numbers if n > 0]\nprint(positive)`
      }
    ],
    commonMistakes: [
      'Путают индекс и значение.',
      'Выходят за границы списка.',
      'Забывают, что список изменяемый.'
    ],
    importantNuances: [
      'Срезы создают новый список.',
      'Если два имени ссылаются на один список, изменение видно через оба.',
      'List comprehension часто делает код короче и чище.'
    ],
    checklist: [
      'Умею создавать список.',
      'Умею читать элементы по индексу.',
      'Знаю базовые методы `append`, `pop`, `remove`.',
      'Могу обойти список и отфильтровать данные.'
    ],
    practiceHint: 'Теперь попробуй взять список, отфильтровать его и собрать новый результат.'
  },
  {
    id: 'dicts',
    title: 'Словари',
    shortTitle: 'Словари',
    simpleExplanation: 'Словарь хранит пары `ключ → значение`. Это удобно, когда нужно быстро искать данные по имени.',
    howItWorks: 'Python берёт ключ, находит по нему значение и возвращает его. Ключи должны быть неизменяемыми и уникальными.',
    syntax: [
      'user = {"name": "Ada", "age": 32}',
      'user["name"]',
      'user.get("city", "unknown")',
      'for key, value in user.items():\n    print(key, value)'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Читаем данные профиля.',
        code: `profile = {"name": "Max", "level": 3}\nprint(profile["name"])`
      },
      {
        title: 'Средний',
        note: 'Считаем частоту символов.',
        code: `text = "banana"\ncounts = {}\nfor char in text:\n    counts[char] = counts.get(char, 0) + 1\nprint(counts)`
      },
      {
        title: 'Реальный',
        note: 'Храним настройки приложения.',
        code: `settings = {"theme": "dark", "autosave": True}\nif settings.get("autosave"):\n    print("Сохраняем автоматически")`
      }
    ],
    commonMistakes: [
      'Ожидают, что отсутствующий ключ всегда есть.',
      'Используют изменяемый объект как ключ.',
      'Пишут сложные вложенные словари без структуры.'
    ],
    importantNuances: [
      'Для безопасного чтения используй `get()`.',
      'Словари отлично подходят для конфигов, счётчиков и профилей.',
      'Новые ключи можно добавлять прямо через присваивание.'
    ],
    checklist: [
      'Понимаю, что словарь хранит пары ключ-значение.',
      'Умею читать и писать значения по ключу.',
      'Знаю `get()`, `items()`, `keys()`, `values()`.',
      'Могу использовать словарь как счётчик или конфиг.'
    ],
    practiceHint: 'Теперь попробуй собрать словарь из данных и пройтись по его парам.'
  },
  {
    id: 'tuples',
    title: 'Кортежи',
    shortTitle: 'Кортежи',
    simpleExplanation: 'Кортеж — это упорядоченный и неизменяемый набор значений. Удобен, когда данные не должны меняться.',
    howItWorks: 'Кортеж работает как список без права на изменение. Его удобно использовать для координат, фиксированных записей и множественного возврата.',
    syntax: [
      'point = (10, 20)',
      'single = (42,)',
      'x, y = point',
      'return a, b'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Координаты точки.',
        code: `point = (10, 20)\nprint(point[0])`
      },
      {
        title: 'Средний',
        note: 'Функция возвращает сразу два значения.',
        code: `def split_name(full_name):\n    first, last = full_name.split()\n    return first, last\n\nname = split_name("Ada Lovelace")\nprint(name)`
      },
      {
        title: 'Реальный',
        note: 'Кортеж удобен для неизменяемых записей.',
        code: `color = ("red", 255, 0, 0)\nprint(color)`
      }
    ],
    commonMistakes: [
      'Забывают запятую в однoэлементном кортеже.',
      'Пытаются менять кортеж как список.',
      'Путают кортеж с обычной группировкой в скобках.'
    ],
    importantNuances: [
      'Кортеж полезен, когда нужна защита от случайных изменений.',
      'Распаковка делает код очень читаемым.',
      'Часто кортеж — хороший формат для возврата нескольких значений.'
    ],
    checklist: [
      'Понимаю, зачем нужен кортеж.',
      'Знаю, что он неизменяемый.',
      'Умею распаковывать значения.',
      'Не путаю кортеж с круглой скобкой.'
    ],
    practiceHint: 'Теперь попробуй вернуть из функции несколько значений и распаковать их.'
  },
  {
    id: 'strings',
    title: 'Строки',
    shortTitle: 'Строки',
    simpleExplanation: 'Строка — это текст. С ней можно читать, резать, чистить, склеивать и форматировать данные.',
    howItWorks: 'Строка в Python неизменяемая. Любая операция вроде `.strip()` или `.replace()` создаёт новую строку, а не меняет старую.',
    syntax: [
      'text = "Hello"',
      'name = f"Hi, {user}"',
      'parts = text.split(" ")',
      '"-".join(parts)'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Считаем длину и печатаем текст.',
        code: `message = "Python"\nprint(len(message))`
      },
      {
        title: 'Средний',
        note: 'Чистим пробелы и меняем регистр.',
        code: `raw = "  Hello World  "\nclean = raw.strip().lower()\nprint(clean)`
      },
      {
        title: 'Реальный',
        note: 'Собираем текст через f-string.',
        code: `name = "Alex"\nscore = 87\nprint(f"{name} набрал {score} баллов")`
      }
    ],
    commonMistakes: [
      'Пытаются изменить строку “на месте”.',
      'Забывают про кавычки и экранирование.',
      'Склеивают строки и числа без преобразования.'
    ],
    importantNuances: [
      'f-string — самый удобный способ собирать строки из данных.',
      'Методы строк возвращают новые строки.',
      '`split()` и `join()` часто идут парой.'
    ],
    checklist: [
      'Понимаю, что строка — это текст.',
      'Умею чистить и форматировать строку.',
      'Знаю `strip`, `split`, `join`, `replace`.',
      'Могу собрать сообщение через f-string.'
    ],
    practiceHint: 'Теперь попробуй взять текст, почистить его и красиво вывести результат.'
  },
  {
    id: 'exceptions',
    title: 'Исключения',
    shortTitle: 'Исключения',
    simpleExplanation: 'Исключение — это ошибка, которую можно перехватить и обработать, чтобы программа не падала внезапно.',
    howItWorks: 'Код внутри `try` выполняется обычным способом. Если возникает ошибка, управление переходит в `except`. Блок `finally` срабатывает всегда.',
    syntax: [
      'try:\n    value = int(text)\nexcept ValueError:\n    print("Неверный ввод")',
      'try:\n    ...\nexcept Exception as error:\n    print(error)',
      'raise ValueError("Плохие данные")'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Ловим ошибку преобразования.',
        code: `text = "abc"\ntry:\n    number = int(text)\nexcept ValueError:\n    print("Это не число")`
      },
      {
        title: 'Средний',
        note: 'Делим без падения программы.',
        code: `def safe_divide(a, b):\n    try:\n        return a / b\n    except ZeroDivisionError:\n        return 0`
      },
      {
        title: 'Реальный',
        note: 'Проверяем данные и объясняем проблему явно.',
        code: `def parse_age(text):\n    if not text:\n        raise ValueError("Возраст пустой")\n    return int(text)`
      }
    ],
    commonMistakes: [
      'Ловят слишком общий `except` и скрывают настоящую проблему.',
      'Съедают ошибку и не сообщают пользователю, что пошло не так.',
      'Используют исключения вместо нормальной логики проверки.'
    ],
    importantNuances: [
      'Лови конкретные ошибки, а не всё подряд.',
      '`finally` полезен для закрытия ресурсов и очистки.',
      'Иногда лучше проверить условие заранее, чем ловить исключение.'
    ],
    checklist: [
      'Знаю, как писать `try/except`.',
      'Понимаю, зачем нужен `finally`.',
      'Умею бросать свои ошибки через `raise`.',
      'Не прячу проблемы за слишком широким `except`.'
    ],
    practiceHint: 'Теперь попробуй обработать плохой ввод и вернуть понятное сообщение вместо падения.'
  },
  {
    id: 'closures',
    title: 'Замыкания',
    shortTitle: 'Замыкания',
    simpleExplanation: 'Замыкание — это функция, которая помнит переменные из внешней функции даже после её завершения.',
    howItWorks: 'Внутренняя функция захватывает внешние переменные из ближайшей области видимости. Поэтому она может использовать их позже, как личное состояние.',
    syntax: [
      'def outer(x):\n    def inner(y):\n        return x + y\n    return inner',
      'counter = make_counter()',
      'nonlocal value'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Фабрика возвращает функцию.',
        code: `def make_multiplier(factor):\n    def multiply(value):\n        return value * factor\n    return multiply\n\nby_two = make_multiplier(2)\nprint(by_two(5))`
      },
      {
        title: 'Средний',
        note: 'Замыкание хранит счётчик.',
        code: `def make_counter():\n    count = 0\n    def inc():\n        nonlocal count\n        count += 1\n        return count\n    return inc`
      },
      {
        title: 'Реальный',
        note: 'Полезно для кэша и состояния.',
        code: `def make_logger(prefix):\n    def log(message):\n        print(f"[{prefix}] {message}")\n    return log`
      }
    ],
    commonMistakes: [
      'Ожидают, что внешняя переменная “скопируется”, а не будет захвачена.',
      'Забывают `nonlocal`, если хотят менять значение из внешней функции.',
      'Пишут closure там, где достаточно обычной функции.'
    ],
    importantNuances: [
      'Замыкание часто используют для фабрик, кэша, счётчиков и небольшого состояния.',
      'Это удобный способ спрятать данные внутрь функции.',
      'Если логика стала слишком большой, лучше перейти к классу.'
    ],
    checklist: [
      'Понимаю, что функция может помнить внешние переменные.',
      'Умею писать простое замыкание.',
      'Знаю, зачем нужен `nonlocal`.',
      'Могу применить closure для состояния или фабрики.'
    ],
    practiceHint: 'Теперь попробуй создать функцию-фабрику, которая возвращает настроенную внутреннюю функцию.'
  },
  {
    id: 'lambda',
    title: 'Lambda-функции',
    shortTitle: 'Lambda',
    simpleExplanation: 'Lambda — это короткая анонимная функция для простых операций в одну строку.',
    howItWorks: 'Python создаёт функцию без имени, которая сразу возвращает выражение. Она хороша там, где нужна маленькая операция, а не отдельный блок кода.',
    syntax: [
      'lambda x: x * 2',
      'lambda a, b: a + b',
      'sorted(items, key=lambda item: item["score"])'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Умножаем число.',
        code: `double = lambda x: x * 2\nprint(double(4))`
      },
      {
        title: 'Средний',
        note: 'Сортируем по полю.',
        code: `users = [{"name": "A", "score": 10}, {"name": "B", "score": 5}]\nusers_sorted = sorted(users, key=lambda user: user["score"])\nprint(users_sorted)`
      },
      {
        title: 'Реальный',
        note: 'Короткая функция как ключ сортировки.',
        code: `tasks = [{"title": "A", "priority": 2}, {"title": "B", "priority": 1}]\nprint(sorted(tasks, key=lambda task: task["priority"]))`
      }
    ],
    commonMistakes: [
      'Пихают в lambda слишком сложную логику.',
      'Считают lambda полноценной заменой `def`.',
      'Пишут нечитаемые вложенные lambda.'
    ],
    importantNuances: [
      'Lambda хороша только для короткой и простой операции.',
      '`def` почти всегда лучше, если кода больше одной строки.',
      'Чаще всего lambda используют как `key=` или для простого колбэка.'
    ],
    checklist: [
      'Понимаю, что lambda — это короткая функция.',
      'Знаю, где её использовать уместно.',
      'Не злоупотребляю lambda там, где нужен `def`.',
      'Могу написать `key=lambda ...` для сортировки.'
    ],
    practiceHint: 'Теперь попробуй отсортировать список словарей с помощью `lambda` как ключа.'
  },
  {
    id: 'imports',
    title: 'Импорт модулей',
    shortTitle: 'Импорт',
    simpleExplanation: 'Модули помогают переиспользовать код: ты подключаешь готовые инструменты вместо того, чтобы писать их заново.',
    howItWorks: 'Python находит модуль, загружает его один раз и даёт доступ к его функциям, классам и константам. Так код становится структурнее.',
    syntax: [
      'import math',
      'from collections import Counter',
      'import os as operating_system',
      'from my_module import helper'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Подключаем стандартный модуль.',
        code: `import math\nprint(math.sqrt(25))`
      },
      {
        title: 'Средний',
        note: 'Берём нужный объект из модуля.',
        code: `from collections import Counter\nprint(Counter("banana"))`
      },
      {
        title: 'Реальный',
        note: 'Разделяем код на файлы и импортируем помощники.',
        code: `from helper import normalize_name\nprint(normalize_name("  Alex  "))`
      }
    ],
    commonMistakes: [
      'Создают файл с именем, совпадающим с модулем из стандартной библиотеки.',
      'Используют слишком много `from ... import *`.',
      'Забывают, что модуль выполняется при первом импорте.'
    ],
    importantNuances: [
      'Импортируй только то, что реально нужно.',
      '`if __name__ == "__main__":` помогает отделить запуск файла от импорта.',
      'Хорошая структура модулей делает проект понятнее и меньше.'
    ],
    checklist: [
      'Понимаю, зачем нужны модули.',
      'Умею использовать `import` и `from ... import ...`.',
      'Знаю, зачем нужен `as`.',
      'Могу разнести код по файлам.'
    ],
    practiceHint: 'Теперь попробуй вынести маленькую функцию в отдельный модуль и импортировать её обратно.'
  },
  {
    id: 'oop',
    title: 'Основы ООП',
    shortTitle: 'ООП',
    simpleExplanation: 'Класс — это шаблон, а объект — конкретный экземпляр этого шаблона. Так удобно связывать данные и поведение.',
    howItWorks: 'Класс описывает, какие свойства и методы будут у объекта. Когда создаётся экземпляр, Python вызывает `__init__` и наполняет его данными.',
    syntax: [
      'class User:\n    def __init__(self, name):\n        self.name = name',
      'user = User("Ada")',
      'def speak(self):\n    print(self.name)'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Создаём объект и читаем его поле.',
        code: `class User:\n    def __init__(self, name):\n        self.name = name\n\nuser = User("Alex")\nprint(user.name)`
      },
      {
        title: 'Средний',
        note: 'Метод объекта делает действие.',
        code: `class BankAccount:\n    def __init__(self, balance=0):\n        self.balance = balance\n\n    def deposit(self, amount):\n        self.balance += amount`
      },
      {
        title: 'Реальный',
        note: 'Объект хранит состояние и поведение вместе.',
        code: `class Task:\n    def __init__(self, title, done=False):\n        self.title = title\n        self.done = done\n\n    def mark_done(self):\n        self.done = True`
      }
    ],
    commonMistakes: [
      'Забывают `self` в методах.',
      'Смешивают свойства класса и свойства объекта.',
      'Начинают писать класс там, где хватило бы функции или словаря.'
    ],
    importantNuances: [
      'ООП нужно, когда данные и поведение естественно живут вместе.',
      'Сначала думай о простом решении, а потом усложняй до класса.',
      'Не делай “класс ради класса”.'
    ],
    checklist: [
      'Понимаю, что класс — это шаблон.',
      'Знаю, что объект — это экземпляр класса.',
      'Умею писать `__init__` и методы.',
      'Понимаю, когда класс действительно уместен.'
    ],
    practiceHint: 'Теперь попробуй создать свой класс и добавить в него пару полезных методов.'
  },
  {
    id: 'comprehensions-generators',
    title: 'Comprehensions и генераторы',
    shortTitle: 'Comprehensions',
    simpleExplanation: 'Comprehension собирает коллекцию коротко, а генератор отдаёт значения по одному и не хранит всё сразу.',
    howItWorks: 'Python выполняет выражение слева для каждого элемента из `for` и может пропускать лишнее через `if`. Круглые скобки создают генератор, который вычисляет следующий элемент только при обходе.',
    syntax: [
      '[x * 2 for x in numbers]',
      '{word: len(word) for word in words}',
      '(line.strip() for line in lines)',
      '[x for x in numbers if x > 0]'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Собираем квадраты чисел.',
        code: `numbers = [1, 2, 3]\nsquares = [n * n for n in numbers]\nprint(squares)`
      },
      {
        title: 'Средний',
        note: 'Фильтруем и сразу преобразуем.',
        code: `names = ["Ada", "", "Bob"]\nclean = [name.lower() for name in names if name]\nprint(clean)`
      },
      {
        title: 'Реальный',
        note: 'Генератор читает данные лениво.',
        code: `rows = ["  one  ", "  two  "]\nclean_rows = (row.strip() for row in rows)\nfor row in clean_rows:\n    print(row)`
      }
    ],
    commonMistakes: [
      'Делают comprehension слишком длинным и нечитаемым.',
      'Путают список `[...]` и генератор `(...)`.',
      'Ожидают, что генератор можно пройти много раз.'
    ],
    importantNuances: [
      'List comprehension хорош для готового списка, generator expression — для потока значений.',
      'Dict comprehension собирает словарь, set comprehension — множество.',
      'Если логика сложная, обычный цикл понятнее.'
    ],
    checklist: [
      'Умею собрать список через comprehension.',
      'Понимаю разницу между списком и генератором.',
      'Могу добавить фильтр `if` внутри comprehension.',
      'Не превращаю короткую запись в головоломку.'
    ],
    practiceHint: 'Теперь попробуй взять список чисел, отфильтровать лишнее и собрать новую коллекцию.',
    practiceCategory: 'lists'
  },
  {
    id: 'decorators',
    title: 'Декораторы',
    shortTitle: 'Декораторы',
    simpleExplanation: 'Декоратор оборачивает функцию и добавляет поведение вокруг её вызова без изменения самой функции.',
    howItWorks: 'Запись `@decorator` равна присваиванию `func = decorator(func)`. Декоратор получает функцию, возвращает новую функцию-обёртку и может выполнить код до или после оригинального вызова.',
    syntax: [
      '@timer\ndef load_data():\n    ...',
      'def decorator(func):\n    def wrapper(*args, **kwargs):\n        return func(*args, **kwargs)\n    return wrapper',
      'from functools import wraps'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Печатаем сообщение перед вызовом.',
        code: `def announce(func):\n    def wrapper():\n        print("Старт")\n        return func()\n    return wrapper\n\n@announce\ndef run():\n    print("Работаем")`
      },
      {
        title: 'Средний',
        note: 'Передаём любые аргументы в исходную функцию.',
        code: `def debug(func):\n    def wrapper(*args, **kwargs):\n        print(args, kwargs)\n        return func(*args, **kwargs)\n    return wrapper`
      },
      {
        title: 'Реальный',
        note: '`wraps` сохраняет имя и документацию функции.',
        code: `from functools import wraps\n\ndef logged(func):\n    @wraps(func)\n    def wrapper(*args, **kwargs):\n        print(f"call {func.__name__}")\n        return func(*args, **kwargs)\n    return wrapper`
      }
    ],
    commonMistakes: [
      'Забывают вернуть `wrapper` из декоратора.',
      'Не прокидывают `*args` и `**kwargs`, ломая функции с параметрами.',
      'Не используют `functools.wraps`, и имя функции теряется.'
    ],
    importantNuances: [
      'Декоратор выполняется при объявлении функции, а обёртка — при вызове.',
      'Декораторы удобны для логирования, проверки доступа, кеша и замера времени.',
      'Слишком много декораторов усложняет чтение потока выполнения.'
    ],
    checklist: [
      'Понимаю, что `@decorator` заменяет функцию обёрткой.',
      'Умею написать wrapper с `*args` и `**kwargs`.',
      'Знаю, зачем нужен `functools.wraps`.',
      'Использую декоратор только для сквозной логики.'
    ],
    practiceHint: 'Теперь попробуй написать декоратор, который печатает имя функции перед её вызовом.',
    practiceCategory: 'functions'
  },
  {
    id: 'context-managers-files',
    title: 'Context managers и файлы',
    shortTitle: 'Context managers',
    simpleExplanation: 'Контекстный менеджер гарантирует подготовку и уборку ресурса. Для файлов это значит: открыл, поработал, закрыл автоматически.',
    howItWorks: 'Блок `with` вызывает вход в контекст, выполняет тело и затем вызывает выход из контекста даже при ошибке. Поэтому файлы, соединения и блокировки не остаются открытыми случайно.',
    syntax: [
      'with open("data.txt", encoding="utf-8") as file:\n    text = file.read()',
      'with open("out.txt", "w", encoding="utf-8") as file:\n    file.write("ok")',
      'from contextlib import contextmanager'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Читаем весь файл безопасно.',
        code: `with open("notes.txt", encoding="utf-8") as file:\n    text = file.read()\nprint(text)`
      },
      {
        title: 'Средний',
        note: 'Пишем строки без ручного `close()`.',
        code: `items = ["one", "two"]\nwith open("out.txt", "w", encoding="utf-8") as file:\n    for item in items:\n        file.write(item + "\\n")`
      },
      {
        title: 'Реальный',
        note: 'Свой контекст удобно делать через `contextmanager`.',
        code: `from contextlib import contextmanager\n\n@contextmanager\ndef section(name):\n    print(f"start {name}")\n    try:\n        yield\n    finally:\n        print(f"end {name}")`
      }
    ],
    commonMistakes: [
      'Открывают файл без `with` и забывают закрыть его.',
      'Не указывают `encoding`, а потом ловят проблемы с кириллицей.',
      'Читают огромный файл целиком, хотя можно пройтись по строкам.'
    ],
    importantNuances: [
      '`with` закрывает ресурс даже если внутри блока возникло исключение.',
      'Режим `"w"` перезаписывает файл, `"a"` дописывает в конец.',
      'Для больших файлов лучше читать построчно: `for line in file`.'
    ],
    checklist: [
      'Умею открывать файл через `with open(...) as file`.',
      'Понимаю режимы чтения, записи и дозаписи.',
      'Помню про `encoding="utf-8"`.',
      'Не держу ресурсы открытыми дольше нужного.'
    ],
    practiceHint: 'Теперь попробуй прочитать строки, почистить их и записать результат в другой файл.',
    practiceCategory: 'strings'
  },
  {
    id: 'typing-dataclasses',
    title: 'Typing и dataclasses',
    shortTitle: 'Typing/dataclass',
    simpleExplanation: 'Аннотации типов объясняют, какие данные ожидает код, а `dataclass` быстро создаёт удобный класс для хранения данных.',
    howItWorks: 'Типы в Python чаще всего подсказывают человеку, IDE и проверяющим инструментам. `@dataclass` по аннотациям создаёт `__init__`, красивый вывод и сравнение объектов.',
    syntax: [
      'def add(a: int, b: int) -> int:\n    return a + b',
      'from dataclasses import dataclass',
      '@dataclass\nclass User:\n    name: str\n    age: int'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Аннотации делают контракт функции явным.',
        code: `def format_score(name: str, score: int) -> str:\n    return f"{name}: {score}"`
      },
      {
        title: 'Средний',
        note: 'Список и словарь тоже можно описывать типами.',
        code: `def count_tags(tags: list[str]) -> dict[str, int]:\n    result = {}\n    for tag in tags:\n        result[tag] = result.get(tag, 0) + 1\n    return result`
      },
      {
        title: 'Реальный',
        note: 'Dataclass заменяет много шаблонного кода.',
        code: `from dataclasses import dataclass\n\n@dataclass\nclass Task:\n    title: str\n    done: bool = False\n\ntask = Task("Учить Python")`
      }
    ],
    commonMistakes: [
      'Думают, что аннотации автоматически запрещают неправильный тип во время выполнения.',
      'Используют изменяемое значение по умолчанию вместо `field(default_factory=...)`.',
      'Пишут dataclass для поведения, хотя он лучше подходит для данных.'
    ],
    importantNuances: [
      'Аннотации помогают читать код и ловить ошибки статическими проверками.',
      'Для опционального значения используй `str | None` или `Optional[str]`.',
      'В dataclass можно добавлять методы, если они относятся к данным объекта.'
    ],
    checklist: [
      'Умею писать типы аргументов и результата функции.',
      'Понимаю, что типы в Python обычно не проверяются сами по себе.',
      'Могу создать простой `@dataclass`.',
      'Помню про осторожность с изменяемыми значениями по умолчанию.'
    ],
    practiceHint: 'Теперь попробуй описать dataclass для задачи или пользователя и написать функцию с аннотациями.',
    practiceCategory: 'dicts'
  },
  {
    id: 'async-await',
    title: 'Async/await',
    shortTitle: 'Async',
    simpleExplanation: 'Async/await помогает писать код, который ждёт ввод-вывод без блокировки всего потока выполнения.',
    howItWorks: '`async def` создаёт корутину. Она реально выполняется, когда её ждут через `await` или запускают в event loop. Пока одна корутина ждёт, event loop может дать время другой.',
    syntax: [
      'async def load():\n    return 42',
      'result = await load()',
      'asyncio.run(main())',
      'await asyncio.gather(task1(), task2())'
    ],
    examples: [
      {
        title: 'Простой',
        note: 'Корутину запускают через event loop.',
        code: `import asyncio\n\nasync def main():\n    await asyncio.sleep(1)\n    print("Готово")\n\nasyncio.run(main())`
      },
      {
        title: 'Средний',
        note: 'Несколько ожиданий можно выполнить вместе.',
        code: `import asyncio\n\nasync def load(name):\n    await asyncio.sleep(1)\n    return name\n\nasync def main():\n    result = await asyncio.gather(load("a"), load("b"))\n    print(result)`
      },
      {
        title: 'Реальный',
        note: 'Ошибки в async-коде ловятся обычным `try/except`.',
        code: `async def safe_load(fetch):\n    try:\n        return await fetch()\n    except TimeoutError:\n        return None`
      }
    ],
    commonMistakes: [
      'Вызывают async-функцию без `await` и получают объект coroutine.',
      'Используют блокирующий `time.sleep()` внутри async-кода вместо `asyncio.sleep()`.',
      'Думают, что async ускоряет вычисления на CPU.'
    ],
    importantNuances: [
      'Async полезен для сети, файловых ожиданий, таймеров и большого числа одновременных операций.',
      '`await` можно использовать только внутри `async def`.',
      'Для тяжёлых вычислений нужны процессы, потоки или оптимизация алгоритма, а не один только async.'
    ],
    checklist: [
      'Понимаю разницу между корутиной и её результатом.',
      'Умею запускать async-код через `asyncio.run()`.',
      'Знаю, когда нужен `await`.',
      'Не смешиваю блокирующие вызовы с async-кодом без необходимости.'
    ],
    practiceHint: 'Теперь попробуй запустить две async-операции параллельно через `asyncio.gather()`.',
    practiceCategory: 'functions'
  }
];

const THEORY_INDEX = new Map(PYTHON_THEORY_TOPICS.map((topic) => [topic.id, topic]));
const THEORY_PRACTICE_ROUTES = {
  variables: { practiceCategory: 'variables' },
  types: { practiceCategory: 'variables' },
  conditionals: { practiceCategory: 'conditionals' },
  loops: { practiceCategory: 'loops' },
  functions: { practiceCategory: 'functions' },
  lists: { practiceCategory: 'lists' },
  dicts: { practiceCategory: 'dicts' },
  tuples: { practiceCategory: 'lists' },
  strings: { practiceCategory: 'strings' },
  exceptions: { practiceCategory: 'functions' },
  closures: { practiceCategory: 'functions' },
  lambda: { practiceCategory: 'functions' },
  imports: { practiceCategory: 'functions' },
  oop: { practiceCategory: 'functions' },
  'comprehensions-generators': { practiceCategory: 'lists' },
  decorators: { practiceCategory: 'functions' },
  'context-managers-files': { practiceCategory: 'strings' },
  'typing-dataclasses': { practiceCategory: 'dicts' },
  'async-await': { practiceCategory: 'functions' }
};

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderList(items, className = 'theory-bullets') {
  if (!Array.isArray(items) || items.length === 0) {
    return '';
  }

  return `<ul class="${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderSyntaxBlock(snippets) {
  if (!Array.isArray(snippets) || snippets.length === 0) {
    return '';
  }

  return `
    <section class="theory-block">
      <div class="theory-block-label">Синтаксис</div>
      ${snippets.map((snippet) => `<pre class="theory-code"><code>${escapeHtml(snippet)}</code></pre>`).join('')}
    </section>
  `;
}

function renderExamples(examples) {
  if (!Array.isArray(examples) || examples.length === 0) {
    return '';
  }

  return `
    <section class="theory-block">
      <div class="theory-block-label">Примеры</div>
      <div class="theory-example-grid">
        ${examples.map((example) => `
          <article class="theory-example-card">
            <div class="theory-example-title">${escapeHtml(example.title)}</div>
            <div class="theory-example-note">${escapeHtml(example.note || '')}</div>
            <pre class="theory-code"><code>${escapeHtml(example.code)}</code></pre>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function buildTheoryTopicList(activeId = PYTHON_THEORY_TOPICS[0]?.id) {
  return PYTHON_THEORY_TOPICS.map((topic, index) => `
    <button
      type="button"
      class="theory-topic-button ${topic.id === activeId ? 'active' : ''}"
      data-theory-topic="${escapeHtml(topic.id)}"
      aria-pressed="${topic.id === activeId ? 'true' : 'false'}"
    >
      <span class="theory-topic-index">${String(index + 1).padStart(2, '0')}</span>
      <span class="theory-topic-copy">
        <strong>${escapeHtml(topic.title)}</strong>
        <small>${escapeHtml(topic.shortTitle)}</small>
      </span>
    </button>
  `).join('');
}

function buildTheoryTopicHtml(topicOrId) {
  const topic = typeof topicOrId === 'string' ? getTheoryTopicById(topicOrId) : topicOrId;
  if (!topic) {
    return '<div class="theory-empty">Тема не найдена.</div>';
  }

  return `
    <article class="theory-topic-card">
      <div class="theory-topic-topline">
        <div>
          <div class="eyebrow">Python теория</div>
          <h3>${escapeHtml(topic.title)}</h3>
        </div>
        <div class="theory-practice-pill">Готово к практике</div>
      </div>

      <section class="theory-block">
        <div class="theory-block-label">Просто</div>
        <p class="theory-lead">${escapeHtml(topic.simpleExplanation)}</p>
      </section>

      <section class="theory-block">
        <div class="theory-block-label">Как это работает</div>
        <p>${escapeHtml(topic.howItWorks)}</p>
      </section>

      ${renderSyntaxBlock(topic.syntax)}
      ${renderExamples(topic.examples)}

      <section class="theory-block theory-columns">
        <div>
          <div class="theory-block-label">Частые ошибки</div>
          ${renderList(topic.commonMistakes, 'theory-bullets danger')}
        </div>
        <div>
          <div class="theory-block-label">Важные нюансы</div>
          ${renderList(topic.importantNuances, 'theory-bullets')}
        </div>
      </section>

      <section class="theory-block theory-columns">
        <div>
          <div class="theory-block-label">Мини-чеклист</div>
          ${renderList(topic.checklist, 'theory-bullets success')}
        </div>
        <div class="theory-practice-card">
          <div class="theory-block-label">Переход к практике</div>
          <p>${escapeHtml(topic.practiceHint)}</p>
        </div>
      </section>
    </article>
  `;
}

function getTheoryTopicById(id) {
  if (!id) {
    return PYTHON_THEORY_TOPICS[0] || null;
  }

  return THEORY_INDEX.get(id) || PYTHON_THEORY_TOPICS[0] || null;
}

function getTheoryPracticeRoute(id) {
  const topic = getTheoryTopicById(id);
  if (!topic) {
    return null;
  }

  const route = THEORY_PRACTICE_ROUTES[topic.id] || THEORY_PRACTICE_ROUTES.variables;
  return {
    topicId: topic.id,
    topicTitle: topic.title,
    shortTitle: topic.shortTitle || topic.title,
    practiceCategory: route.practiceCategory,
    practiceLabel: topic.practiceHint || topic.title
  };
}

export const LANGUAGE_LABEL = 'Python теория';
export const THEORY_TOPICS = PYTHON_THEORY_TOPICS;

export {
  PYTHON_THEORY_TOPICS,
  buildTheoryTopicHtml,
  buildTheoryTopicList,
  getTheoryPracticeRoute,
  getTheoryTopicById
};
