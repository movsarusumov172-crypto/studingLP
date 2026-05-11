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

- [x] **Smart Session ("Ежедневная сессия")** — 4-5 задач автоматически: разминка → 2 слабые темы → закрепление → повторение SRS. Прогресс-бар в шапке задачи. Авто-переход на следующую задачу через 1.5с после solve. Кнопка "Следующая" = пропустить шаг. Итоговый экран с результатами.
- [x] **Thinking skill badges** — каждая задача помечается тегом навыка мышления (Async-мышление, Коллекции, Замыкания и т.д.) прямо в шапке
- [x] **Улучшенный разбор ошибок** — edge case detection, off-by-one detection, пустой return, тип ответа не тот — конкретные объяснения с советом
- [x] **Session summary** — после сессии: результаты, время, что решил/пропустил, следующий шаг ("на сегодня достаточно" или дата следующего повторения)

## Что сделано ✅

- [x] Electron app: генерация задач, Monaco IDE, XP, серии, SRS, достижения
- [x] 7 языковых ядер с полной генерацией и теорией
- [x] QA-верификация каждой задачи (async spawn)
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
- [x] Account modal с план-бейджем и управлением подпиской
- [x] Windows installer (.exe, NSIS, custom icon)
- [x] GitHub Release: https://github.com/movsarusumov172-crypto/studingLP/releases

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
