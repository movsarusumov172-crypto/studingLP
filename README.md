# JS Infinite Trainer — Project Handoff

> Читай всё. Этот файл — полный контекст проекта. Без него начинать нельзя.

---

## Что это

**JS Infinite Trainer** — десктоп-приложение для Windows. Бесконечный тренажёр программирования с процедурной генерацией задач. Electron + Fastify backend + PostgreSQL.

**Продукт:** Пользователь решает задачи по коду, получает XP, строит серии. Задачи генерируются алгоритмически — не повторяются, не заканчиваются.

**Статус:** В стадии беты. Installer опубликован на GitHub Releases. Backend живёт на Railway.

---

## Монорепо структура

```
/
├── studingJS/          ← Electron-приложение (основной продукт)
│   ├── main.js         ← точка входа Electron (main process)
│   ├── preload.js      ← contextBridge — мост renderer ↔ main
│   ├── package.json    ← electron-builder конфиг
│   ├── scripts/
│   │   ├── build-monaco.mjs   ← бандлит Monaco editor
│   │   ├── create-icon.mjs    ← генерирует build/icon.ico (BMP, pure Node.js)
│   │   └── after-pack.cjs     ← electron-builder хук: встраивает иконку через rcedit
│   └── src/
│       ├── core/              ← ядро: taskEngine, kernelManager, reviewPlanner, taskQuality
│       ├── engine/            ← RNG, taskBuilder, variationProfile, utils
│       ├── kernels/           ← реализации для каждого языка (js, python, go, c, cpp, csharp, java)
│       ├── adapters/          ← тонкие обёртки над kernels/
│       ├── execution/         ← IPC-слой для запуска тестов
│       ├── runtime/           ← executor.js (VM sandbox), testRunner.js
│       ├── tasks/             ← генераторы задач по категориям (arrays, objects, functions, ...)
│       ├── tests/             ← тесты (smokeTest, taskQualityTest, и т.д.)
│       └── renderer/
│           ├── index.html     ← UI (единственная HTML-страница)
│           ├── app.js         ← весь UI-код (~3500 строк, ES module)
│           ├── styles.css     ← стили (dark theme, gold accent #d6b25a)
│           ├── api/           ← клиент к бэкенду
│           │   ├── config.mjs       ← API_BASE URL
│           │   ├── client.mjs       ← apiFetch с авто-рефрешем JWT
│           │   ├── auth.mjs         ← login, register, logout, restoreSession
│           │   ├── progress.mjs     ← syncProgress, fetchAndMergeProgress
│           │   ├── customTasks.mjs  ← syncCustomTask, fetchAndMergeCustomTasks
│           │   ├── billing.mjs      ← startCheckout, openBillingPortal
│           │   └── leaderboard.mjs  ← fetchLeaderboard
│           ├── theoryContent.mjs        ← теория Python
│           ├── theoryContent.js.mjs     ← теория JS
│           ├── theoryContent.go.mjs     ← теория Go
│           ├── theoryContent.c.mjs      ← теория C
│           ├── theoryContent.cpp.mjs    ← теория C++
│           ├── theoryContent.csharp.mjs ← теория C#
│           ├── theoryContent.java.mjs   ← теория Java
│           └── theoryHelpers.mjs        ← общие рендер-функции для теории
│
└── server/             ← Fastify backend (Node.js + TypeScript)
    ├── src/
    │   ├── index.ts            ← точка входа: Fastify + плагины + роуты
    │   ├── config.ts           ← env validation через zod
    │   ├── db/
    │   │   ├── schema.ts       ← Drizzle ORM схема всех таблиц
    │   │   ├── client.ts       ← Neon serverless коннект
    │   │   └── migrate.ts      ← npm run db:migrate
    │   ├── middleware/
    │   │   ├── authenticate.ts ← JWT verify preHandler
    │   │   └── requirePlan.ts  ← plan check (free/pro/team)
    │   ├── routes/
    │   │   ├── auth.ts         ← /auth/register, /login, /refresh, /logout, /me
    │   │   ├── progress.ts     ← GET/PUT /progress/:kernelId
    │   │   ├── custom-tasks.ts ← GET/PUT/DELETE /custom-tasks
    │   │   ├── leaderboard.ts  ← GET /leaderboard/:kernelId
    │   │   └── billing.ts      ← /billing/status, /checkout, /portal, /webhook
    │   └── services/
    │       ├── auth.service.ts         ← register, login, token rotation
    │       ├── progress.service.ts     ← upsert progress
    │       ├── custom-tasks.service.ts ← CRUD кастомных задач
    │       ├── stripe.service.ts       ← Stripe checkout, webhook handlers
    │       └── email.service.ts        ← Resend: welcome + Pro receipt emails
    ├── Dockerfile          ← Docker build (используется Railway)
    ├── railway.toml        ← Railway конфиг
    └── drizzle.config.ts   ← Drizzle Kit конфиг
```

---

## Стек

| Слой | Технология |
|------|-----------|
| Desktop | Electron 33, contextIsolation, sandbox=false |
| Editor | Monaco Editor (бандлится через esbuild) |
| UI | Vanilla JS ES modules, без фреймворка |
| Backend | Fastify 4, TypeScript, tsx (без компиляции в прод) |
| БД | PostgreSQL на Neon (serverless), Drizzle ORM |
| Auth | JWT (15 мин) + refresh token rotation (30 дней) |
| Email | Resend (опционально) |
| Платежи | Stripe (опционально) |
| Errors | Sentry (опционально) |
| Deploy | Railway (backend), GitHub Releases (installer) |

---

## Как запустить локально

### Electron-приложение
```bash
cd studingJS
npm install
npm start          # собирает Monaco + запускает Electron
npm run dist       # собирает installer (.exe)
```

### Backend
```bash
cd server
cp .env.example .env   # заполни DATABASE_URL минимум
npm install
npm run db:push        # создаёт таблицы в Neon
npm run dev            # tsx watch — горячая перезагрузка
```

### Переменные окружения (server/.env)
```env
DATABASE_URL=postgresql://...    # обязательно (Neon)
JWT_SECRET=...                   # обязательно (мин 32 символа)
JWT_REFRESH_SECRET=...           # обязательно (мин 32 символа)
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*

# Опциональные (без них соответствующие фичи молча отключаются):
RESEND_API_KEY=re_...            # email
SENTRY_DSN=https://...          # error tracking
STRIPE_SECRET_KEY=sk_live_...   # платежи
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=https://...railway.app
```

---

## База данных (PostgreSQL / Neon)

### Таблицы

**users**
```
id uuid PK | email text UNIQUE | password_hash text | plan enum(free,pro,team)
stripe_customer_id text | created_at | updated_at
```

**sessions** (refresh tokens)
```
id uuid PK | user_id FK | refresh_token text UNIQUE | expires_at timestamp | created_at
```
Лимит: 5 активных сессий на пользователя. Старые автоматически удаляются.

**progress**
```
id uuid PK | user_id FK | kernel_id text
xp | solved | attempted | correct | streak | best_streak
custom_tasks_created | daily_solved | boss_cleared
fastest_solve_ms | total_solve_time_ms bigint
solved_by_category jsonb | solved_by_difficulty jsonb | review_deck jsonb
updated_at
UNIQUE(user_id, kernel_id)
```

**subscriptions**
```
id uuid PK | user_id FK UNIQUE | stripe_subscription_id UNIQUE | stripe_price_id
status enum(active,canceled,past_due,trialing,incomplete)
current_period_end | cancel_at_period_end | created_at | updated_at
```

**custom_tasks**
```
id uuid PK | user_id FK | task_id text | kernel_id text | payload jsonb
created_at | updated_at
UNIQUE(user_id, task_id)
```
Лимит: 200 задач на пользователя на ядро.

---

## API эндпоинты

Все защищённые роуты требуют `Authorization: Bearer <accessToken>`.

```
POST /auth/register     { email, password } → { accessToken, refreshToken, plan }
POST /auth/login        { email, password } → { accessToken, refreshToken, plan }
POST /auth/refresh      { refreshToken }    → { accessToken, refreshToken, plan }
POST /auth/logout       [auth] { refreshToken? } → 204
GET  /me                [auth] → { id, email, plan, createdAt }

GET  /progress/:kernelId   [auth] → progress object | null
PUT  /progress/:kernelId   [auth] { xp, solved, ... } → progress object

GET  /custom-tasks          [auth] ?kernelId=js → { tasks: [] }
PUT  /custom-tasks/:taskId  [auth] { kernelId, payload } → task
DELETE /custom-tasks/:taskId [auth] → 204

GET  /leaderboard/:kernelId [auth] → { entries, callerRank, ... }

GET  /billing/status     [auth] → { plan, subscription, stripeConfigured }
POST /billing/checkout   [auth] → { url }  (Stripe Checkout URL)
POST /billing/portal     [auth] → { url }  (Stripe Customer Portal URL)
POST /billing/webhook    → 200  (Stripe events)
GET  /billing/success    → HTML
GET  /billing/cancel     → HTML
GET  /billing/portal-return → HTML

GET  /health → { status: 'ok', ts }
```

### Валидация прогресса (защита от читов)
```
xp ≤ 10_000_000 | solved ≤ 500_000 | streak ≤ 10_000
totalSolveTimeMs ≤ 365 дней в мс
```

### Rate limiting
- Глобально: 200 req/мин на IP
- `/auth/register`, `/auth/login`: 10 req/мин на IP

---

## Freemium модель

| Фича | Free | Pro |
|------|------|-----|
| Все 7 языков | ✅ | ✅ |
| Облачный бэкап прогресса | ✅ | ✅ |
| Кастомные задачи | ✅ | ✅ |
| Лидерборд | ❌ | ✅ |
| Друзья / дуэли | ❌ | ✅ (не реализовано) |
| Командный режим | ❌ | ✅ (не реализовано) |

**Цена Pro:** $6/мес (Stripe, не настроен в продакшне).

---

## Поддерживаемые языки (ядра)

| ID | Статус | Теория | Генерация задач |
|----|--------|--------|----------------|
| `js` | ✅ available | ✅ | ✅ полная |
| `python` | ✅ available | ✅ | ✅ полная |
| `go` | ✅ if go installed | ✅ | ✅ полная |
| `c` | ✅ if gcc installed | ✅ | ✅ полная |
| `cpp` | ✅ if g++ installed | ✅ | ✅ полная |
| `csharp` | ✅ if dotnet installed | ✅ | ✅ полная |
| `java` | ✅ if javac installed | ✅ | ✅ полная |
| `rust` | 🔲 planned | ❌ | ❌ |
| `web` | 🔲 planned | ❌ | ❌ |

---

## Архитектурные решения (важно знать)

### Electron security
- `contextIsolation: true`, `nodeIntegration: false` — стандарт
- `preload.js` экспонирует `window.appApi` через `contextBridge`
- CSP в `index.html` разрешает connect только к Railway API
- `sandbox: false` — нужен для `require()` в preload
- В `main.js` отключены Chromium background network features (SafeBrowsing, DNS prefetch и т.д.)

### Генерация задач
- Seeded PRNG (Mulberry32-like) в `engine/rng.js` — детерминированный
- QA-верификация каждой задачи: решение проходит тесты, стартовый код — нет
- Верификация асинхронная (spawn child process), не блокирует UI
- 5 попыток генерации → fallback → rescue chain — пользователь всегда получает задачу
- Глобальное состояние `usedSeeds`, `categoryWeights`, `recentTasks` в `core/taskEngine.js` — singleton

### Auth flow в клиенте
1. Старт → `restoreSession()` → `/auth/refresh` → обновляет `jt.auth.plan` в localStorage
2. `isLoggedIn()` = `Boolean(tokenStore.get())` — токен в памяти
3. `isPro()` = `localStorage.getItem('jt.auth.plan') !== 'free'`
4. `apiFetch()` авто-рефрешит токен при 401

### Progress sync (offline-first)
- Пишется в localStorage сразу
- Пушится на сервер fire-and-forget после каждого solve
- Pull при старте + merge (берёт max для числовых полей, min для fastestSolveMs)

### Monaco editor
- Бандлится в `src/renderer/monaco.bundle.js` через esbuild при `npm start`
- Workers настроены через `MonacoEnvironment.getWorker()`
- Auto-grow: слушает `onDidContentSizeChange`, выставляет высоту контейнера

---

## Деплой

### Backend (Railway)
```bash
cd server
railway login
railway up       # Dockerfile build, tsx src/index.ts
```
URL: `https://perfect-curiosity-production-b689.up.railway.app`
Проект: `perfect-curiosity` в аккаунте `movsarusumov172-crypto`

**После изменений схемы БД:**
```bash
npm run db:push   # применяет изменения на Neon
```

### Electron installer (Windows)
```bash
cd studingJS
npm run dist     # → dist/JS Infinite Trainer Setup 1.0.0.exe
```
Загрузить на GitHub Release через API или вручную.

**Иконка** генерируется автоматически в `predist` хуке через `scripts/create-icon.mjs`.
Встраивается в .exe через `scripts/after-pack.cjs` (вызывает rcedit из electron-builder cache).

---

## Что сделано ✅

**Приложение:**
- [x] Electron app: генерация задач, Monaco IDE, XP, серии, SRS, достижения
- [x] 7 языковых ядер с полной генерацией и теорией
- [x] Теория расширена до 94 тем (JS 14, Python 19, Go 12, C 10, C++ 13, C# 13, Java 13) — Codex
- [x] QA-верификация каждой задачи (async spawn)
- [x] Smart Session ("Ежедневная сессия") — 4-5 задач автоматически по слабым темам, прогресс-бар, session summary
- [x] Thinking skill badges — тег навыка мышления на каждой задаче
- [x] Улучшенный разбор ошибок — edge case, off-by-one, пустой return, тип не тот
- [x] Quieter UI — важные кнопки на виду, редкие в ⋯ overflow-меню
- [x] Account modal с план-бейджем и управлением подпиской
- [x] Windows installer (.exe, NSIS, custom icon)
- [x] GitHub Release: https://github.com/movsarusumov172-crypto/studingLP/releases

**Backend:**
- [x] Cloud auth: JWT + refresh token rotation + bcrypt
- [x] Progress sync: offline-first, merge стратегия
- [x] Custom tasks: CRUD локально + sync на бэке
- [x] Leaderboard (top-50, анонимизация email)
- [x] Stripe billing: checkout, webhook, portal (не настроен в прод)
- [x] Freemium: все языки бесплатно, лидерборд — Pro
- [x] Email: welcome + Pro receipt через Resend (не настроен)
- [x] Sentry: error tracking (не настроен)
- [x] Rate limiting: 200 req/min глобально, 10/min на auth
- [x] Security: input validation с max bounds, timing attack защита

## Что не сделано ❌

- [ ] AI hints (Claude API) — разбор ошибок при падении теста
- [ ] Friends / дуэли — соревнование 1v1
- [ ] Team mode — командный прогресс
- [ ] Code signing — сейчас Windows SmartScreen предупреждает
- [ ] Web-версия — только десктоп
- [ ] Rust и Web Stack ядра
- [ ] Admin dashboard

---

## Важные файлы — где что

| Что найти | Где |
|-----------|-----|
| Главный UI-код | `studingJS/src/renderer/app.js` |
| API к бэкенду | `studingJS/src/renderer/api/` |
| Генерация задач JS | `studingJS/src/core/taskEngine.js` |
| Теория по языкам | `studingJS/src/renderer/theoryContent.*.mjs` |
| VM-sandbox для кода | `studingJS/src/runtime/executor.js` |
| Все роуты бэкенда | `server/src/routes/` |
| БД схема | `server/src/db/schema.ts` |
| Auth логика | `server/src/services/auth.service.ts` |
| Stripe webhook | `server/src/services/stripe.service.ts` |
| Email шаблоны | `server/src/services/email.service.ts` |

---

## Текущая БД (prod, Neon)

```
users:        4 записи (1 pro — Email@gmail.com)
sessions:     8 активных
progress:     2 записи (python + js для одного юзера)
subscriptions: нет (Stripe не настроен)
custom_tasks:  нет
```

---

## Контекст разработки

- Проект начат и полностью написан в рамках одной сессии Claude Code
- Язык UI: русский (продукт для русскоязычной аудитории)
- Git: `https://github.com/movsarusumov172-crypto/studingLP` (приватный)
- Railway token: в Windows Credential Manager (git credential)
- Neon credentials: в `server/.env` (не в git)
- JWT secrets: сгенерированы случайно, хранятся в Railway + `server/.env`

---

## Change Log

Новые записи добавляются сверху. Этот раздел нужен, чтобы пользователь, Codex и Claude Code видели, какие изменения сделал Codex и как они проверялись.

### 2026-05-12 — Codex — topic-aware practice for all theory

**Request:** добавить практические задания под все новые темы теории и ускорить работу через трёх параллельных агентов.

**Changed files:**
- `README.md`
- `studingJS/package.json`
- `studingJS/src/kernels/c/index.js`
- `studingJS/src/kernels/cpp/index.js`
- `studingJS/src/kernels/csharp/index.js`
- `studingJS/src/kernels/go/index.js`
- `studingJS/src/kernels/java/index.js`
- `studingJS/src/kernels/js/index.js`
- `studingJS/src/kernels/python/index.js`
- `studingJS/src/renderer/theoryContent.c.mjs`
- `studingJS/src/renderer/theoryContent.cpp.mjs`
- `studingJS/src/renderer/theoryContent.csharp.mjs`
- `studingJS/src/renderer/theoryContent.go.mjs`
- `studingJS/src/renderer/theoryContent.java.mjs`
- `studingJS/src/renderer/theoryContent.js.mjs`
- `studingJS/src/renderer/theoryContent.mjs`
- `studingJS/src/tests/cppCsharpJavaTopicPracticeTest.js`
- `studingJS/src/tests/goCTopicPracticeTest.js`
- `studingJS/src/tests/jsPythonTopicPracticeTest.js`
- `studingJS/src/tests/theoryPracticeContractTest.js`

**What changed:**
- Каждая из 94 тем теории теперь передаёт `practiceTopicId`/`practiceTopicTitle` в языкoвой generator и получает topic-aware задачу вместо общей случайной практики.
- Добавлены topic practice paths для JS, Python, Go, C, C++, C#, Java с fallback на старую category-генерацию для неизвестных topic id.
- Синхронизированы `practiceCategory` в theory modules с фактическими категориями kernels, чтобы кнопка перехода из теории не вела в несуществующую или чужую категорию.
- Добавлен `npm run theory:practice`, который проверяет все language theory routes, category validity, topic meta и наличие tests.

**Verification:**
- `npm run theory:practice` — passed, 94 topics.
- `npm run theory:coverage` — passed, 94 topics across 7 languages.
- `node src/tests/jsPythonTopicPracticeTest.js` — passed, 14 JS + 19 Python topics with runner checks.
- `node src/tests/goCTopicPracticeTest.js` — passed, 22 Go/C topics.
- `node src/tests/cppCsharpJavaTopicPracticeTest.js` — passed, 39 C++/C#/Java topics.
- `npm run smoke` — passed, 200 generated JS tasks.
- `npm run tasks:contract` — passed.
- `npm run go:smoke` — passed.
- `npm run variation`, `npm run python:variation`, `npm run go:variation`, `npm run csharp:variation`, `npm run java:variation` — passed.
- `npm run theory:content` — passed.
- `node --check` for all changed kernels and `theoryPracticeContractTest.js` — passed.
- `npm run dist` — passed, NSIS installer rebuilt.
- `Get-FileHash -Algorithm SHA256 studingJS/dist/JS Infinite Trainer Setup 1.0.0.exe` — `21DFFD2A152F0D1DBAE6961947D813F159FF1B614CE23550CB6C3869B14E5225`.
- GitHub Release `v1.0.0` upload via GitHub API — passed; updated `JS.Infinite.Trainer.Setup.1.0.0.exe` and `JS.Infinite.Trainer.Setup.1.0.0.exe.blockmap`.
- `git diff --check` — passed; Git reported only CRLF warnings.

**Coordination notes:**
- Work was split by agents: JS/Python, Go/C, C++/C#/Java. Codex integrated shared route contract, package script, README, verification, git, installer, and release.
- Claude Code: if adding new theory topics, also add or map a topic-aware practice path and run `npm run theory:practice`; otherwise the bridge should fail before release.

### 2026-05-12 — Codex — expanded language theory coverage

**Request:** отправить по агенту на каждый язык, расширить теорию почти во всех языках, а в конце проверить самому.

**Changed files:**
- `README.md`
- `studingJS/package.json`
- `studingJS/src/renderer/theoryContent.c.mjs`
- `studingJS/src/renderer/theoryContent.cpp.mjs`
- `studingJS/src/renderer/theoryContent.csharp.mjs`
- `studingJS/src/renderer/theoryContent.go.mjs`
- `studingJS/src/renderer/theoryContent.java.mjs`
- `studingJS/src/renderer/theoryContent.js.mjs`
- `studingJS/src/renderer/theoryContent.mjs`
- `studingJS/src/tests/theoryCoverageTest.js`

**What changed:**
- Через параллельных агентов расширены theory topics по всем языкам: JS 8→14, Python 14→19, Go 6→12, C 5→10, C++ 5→13, C# 5→13, Java 5→13.
- Добавлены темы про модули, ошибки, event loop, декораторы, context managers, Go interfaces/context/generics, C memory/preprocessor/file I/O/UB, C++ move/exceptions/lambdas/build/concurrency, C# nullable/records/events/generics/disposable, Java exceptions/generics/Optional/concurrency/records/packages/annotations/files.
- Добавлен `npm run theory:coverage`, который проверяет минимальное число тем, обязательные поля, 3 examples и HTML-render для всех языков.

**Verification:**
- `npm run theory:coverage` — passed, 94 topics across 7 languages.
- `npm run theory:content` — passed.
- inline all-language import/render count — passed: js 14, python 19, go 12, c 10, cpp 13, csharp 13, java 13, total 94.
- `git diff --check -- studingJS/package.json studingJS/src/renderer/theoryContent*.mjs studingJS/src/tests/theoryCoverageTest.js` — passed; Git показал только CRLF warning.
- `npm run theory:scroll` — passed.
- `node --check src/renderer/app.js` — passed.
- `npm run smoke` — passed, 200 generated tasks.
- Playwright CLI layout audit — passed for 94 topics at `1280x720` and `390x760`: `badCount: 0`, `contentOverflow: 0`, `codeOverflowCount: 0`.

**Coordination notes:**
- Агенты редактировали только свои `theoryContent*.mjs`; README, package.json, coverage-тест, финальные проверки, commit/push, installer и release остаются за Codex.
- Временные Playwright audit-файлы и локальный static server удалены после проверки.

### 2026-05-12 — Codex — installer release refresh

**Request:** каждый раз после изменений пушить в git, обновлять installer и заменять installer в GitHub Release.

**Changed files:**
- `README.md`

**What changed:**
- Зафиксировано рабочее правило для Codex: после законченных правок проекта делать commit/push, пересобирать Windows installer и обновлять asset в GitHub Release.
- Запушен код фикса теорий в `main` commit `4b68109`.
- Пересобран `studingJS/dist/JS Infinite Trainer Setup 1.0.0.exe`.
- В GitHub Release `v1.0.0` заменены assets `JS.Infinite.Trainer.Setup.1.0.0.exe` и `JS.Infinite.Trainer.Setup.1.0.0.exe.blockmap`.

**Verification:**
- `npm run theory:scroll` — passed.
- `npm run theory:content` — passed.
- all theory modules inline import/render check — passed for 48 topics across 7 languages.
- `node --check src/renderer/app.js` — passed.
- `npm run smoke` — passed, 200 generated tasks.
- `npm run dist` — passed, NSIS installer built.
- GitHub Release API upload — passed for installer and blockmap.

**Coordination notes:**
- `gh auth status` is not logged in, but Git Credential Manager has a GitHub credential; release upload used it without printing the token.
- Следующим агентам: если меняете tracked project files, не останавливайтесь на локальном фиксе — нужен push, installer rebuild и release asset refresh.

### 2026-05-12 — Codex — theory card overflow fix

**Request:** пройтись по каждому окну теории во всех языках и починить сломанные карточки, включая JS “Функции и стрелки”.

**Changed files:**
- `README.md`
- `studingJS/src/renderer/styles.css`
- `studingJS/src/tests/theoryDrawerScrollTest.js`

**What changed:**
- Найден корень: длинные строки кода в `pre` заставляли CSS Grid-карточки расширяться шире окна теории.
- Карточки, блоки, колонки и nav-тексты теории теперь shrinkable через `min-width: 0`.
- Код в теории теперь переносится внутри карточки (`pre-wrap` + safe overflow), поэтому JS стрелочные функции и длинные Java/C#/Go примеры не раздвигают окно.
- Расширен `theory:scroll` контракт-тест, чтобы ловить регрессии layout overflow.

**Verification:**
- Playwright CLI layout audit по 48 темам / 7 языкам — passed: `badCount: 0`, `contentOverflow: 0`, `codeOverflowCount: 0` на `1280x720` и `390x760`.
- `npm run theory:scroll` — passed.
- `npm run theory:content` — passed.
- all theory modules inline import/render check — passed for 48 topics across js, python, go, c, cpp, csharp, java.
- `node --check src/renderer/app.js` — passed.
- `npm run smoke` — passed, 200 generated tasks.
- `git diff --check -- README.md studingJS/src/renderer/styles.css studingJS/src/tests/theoryDrawerScrollTest.js` — passed; Git показал только CRLF warning.

**Coordination notes:**
- Временные Playwright audit-файлы и локальный static server удалены после проверки.
- Если Claude Code или Codex дальше правят theory CSS, не убирать `min-width: 0`/`pre-wrap`: именно они держат длинный код внутри окон.

### 2026-05-12 — Codex — theory drawer bounds fix

**Request:** проверить и починить сломанные окна в разделах теории.

**Changed files:**
- `README.md`
- `studingJS/src/renderer/styles.css`

**What changed:**
- Найдено воспроизведение: `npm run theory:scroll` падал на контракте высоты theory drawer.
- Увеличен внешний зазор theory drawer с `12px` до `14px`.
- Панель теории теперь использует `width: min(880px, calc(100vw - 28px))` и `max-height: calc(100dvh - 28px)`, чтобы не вылезать за viewport и не ломать внутренний скролл.

**Verification:**
- `npm run theory:scroll` — passed.
- `npm run theory:content` — passed.
- all theory modules inline import/render check — passed for js, python, go, c, cpp, csharp, java.
- `node --check src/renderer/app.js` — passed.
- `git diff --check -- studingJS/src/renderer/styles.css` — passed; Git показал только CRLF warning.
- `npm run smoke` — passed, 200 generated tasks.

**Coordination notes:**
- Корень был в CSS sizing/scroll contract drawer, не в данных тем.
- Если дальше править theory UI, сначала прогонять `npm run theory:scroll`, потому что он ловит обрезание окна.

### 2026-05-12 — Codex — installer rebuild and git publish

**Request:** запушить изменения в git, обновить Windows installer и обновить его в GitHub.

**Changed files:**
- `README.md`
- `studingJS/src/renderer/app.js`
- `studingJS/src/renderer/index.html`
- `studingJS/src/renderer/styles.css`

**What changed:**
- Подготовлены UI-правки к публикации: overflow-меню, focus states, drop-up menu, cleanup `authUserEmail`, стабильный повторный импорт прогресса.
- Собран свежий Windows installer `studingJS/dist/JS Infinite Trainer Setup 1.0.0.exe`; `dist/` остается ignored и предназначен для GitHub Releases.

**Verification:**
- `npm run dist` — passed, installer rebuilt.
- `Get-FileHash -Algorithm SHA256 studingJS/dist/JS Infinite Trainer Setup 1.0.0.exe` — `BC610285782EAD2AEAA4210780FE6F7CE5C7656FB085E33FC5174C12FE5CE9E6`.
- GitHub Release `v1.0.0` upload via GitHub API — passed; updated `JS.Infinite.Trainer.Setup.1.0.0.exe` and `JS.Infinite.Trainer.Setup.1.0.0.exe.blockmap`.
- `git diff --check -- README.md studingJS/src/renderer/app.js studingJS/src/renderer/index.html studingJS/src/renderer/styles.css` — passed; Git показал только CRLF warning.
- duplicate `id` check for `studingJS/src/renderer/index.html` — passed.
- `Select-String ... authUserEmail` — no matches.
- `node --check src/renderer/app.js` — passed.
- `npm run smoke` — passed, 200 generated tasks.

**Coordination notes:**
- `gh` установлен, но не авторизован; для этого upload использован GitHub API через сохраненные git credentials.
- На будущее проще выполнить `gh auth login`, чтобы обновлять GitHub Releases обычной командой `gh release upload`.
- Не force-add `studingJS/dist/` в git: это build output, он игнорируется `studingJS/.gitignore` и по README должен жить в GitHub Releases.

### 2026-05-12 — Codex — follow-up UI audit fixes

**Request:** раздать агентам четыре найденных пункта по UI-аудиту и исправить каждый в своей зоне.

**Changed files:**
- `README.md`
- `studingJS/src/renderer/app.js`
- `studingJS/src/renderer/index.html`
- `studingJS/src/renderer/styles.css`

**What changed:**
- `importProgressInput` теперь очищается в `finally`, чтобы повторный выбор того же файла сработал после ошибки импорта.
- Удалена мертвая привязка `authUserEmail`; email остается доступен через окно аккаунта.
- Добавлен видимый `focus-visible` для кнопок и пунктов overflow-меню.
- Нижнее меню формы своей задачи открывается вверх через `drop-up`, чтобы меньше рисковать обрезанием в скролл-зоне.

**Verification:**
- `git diff --check -- README.md studingJS/src/renderer/app.js studingJS/src/renderer/index.html studingJS/src/renderer/styles.css` — passed; Git показал только CRLF warning.
- duplicate `id` check for `studingJS/src/renderer/index.html` — passed.
- `Select-String ... authUserEmail` — no matches.
- `node --check src/renderer/app.js` — passed.
- `npm run smoke` — passed, 200 generated tasks.

**Coordination notes:**
- Изменения делались тремя агентами по зонам: импорт прогресса, UI focus/drop-up, cleanup `authUserEmail`.
- Claude Code: если будешь продолжать overflow-меню, используй существующие классы `overflow-menu`, `overflow-menu-panel`, `drop-up`, а не создавай второй паттерн меню.

### 2026-05-11 — Codex — quieter UI actions

**Request:** уменьшить визуальный шум от множества кнопок: важные оставить на виду, редкие убрать в меню с тремя точками.

**Changed files:**
- `README.md`
- `studingJS/src/renderer/index.html`
- `studingJS/src/renderer/styles.css`
- `studingJS/src/renderer/app.js`

**What changed:**
- Основные действия оставлены на экране, а экспорт/импорт, ответ, сброс, копирование шаблона, seed, лидерборд и Pro перенесены в `⋯`.
- Режимы тренировки стали компактными тихими кнопками, без длинной визуальной простыни.
- Добавлен общий обработчик overflow-меню: закрытие при выборе действия, клике снаружи и Escape.

**Verification:**
- `git diff --check -- studingJS/src/renderer/index.html studingJS/src/renderer/styles.css studingJS/src/renderer/app.js` — passed; Git показал только CRLF warning.
- duplicate `id` check for `studingJS/src/renderer/index.html` — passed.
- `node --check src/renderer/app.js` — passed.
- `npm run smoke` — passed, 200 generated tasks.

**Coordination notes:**
- `id` существующих кнопок сохранены, поэтому старые обработчики событий продолжают работать.
- Claude Code: если будешь трогать эти зоны UI, не дублируй кнопки; лучше расширять существующие `overflow-menu`.

### 2026-05-11 — Codex — skill for README logging

**Request:** создать личный скилл Codex, который будет записывать будущие изменения в README для общей координации.

**Changed files:**
- `README.md`
- `C:/Users/SKM/.codex/skills/logging-project-changes/SKILL.md`
- `C:/Users/SKM/.codex/skills/logging-project-changes/agents/openai.yaml`

**What changed:**
- Добавлен раздел `Change Log` в существующий корневой README.
- Создан личный скилл `logging-project-changes`, который требует после будущих правок обновлять этот раздел.
- Удален отдельный `README_CHANGES.md`, потому что в проекте уже есть основной README.

**Verification:**
- `quick_validate.py logging-project-changes` — passed.

**Coordination notes:**
- Дальше Codex должен писать свои изменения сюда, в `README.md`, а не создавать отдельный файл журнала.
