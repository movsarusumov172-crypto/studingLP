# Диагностика проекта — 2026-05-13

## Короткий вывод

Проект в рабочем состоянии: фронт, Electron-часть, теория/практика, native runtime для C++/C#/Java, backend build и локальная сборка инсталлера проходят. Критических runtime-багов текущие проверки не нашли.

Главный риск сейчас не в UI, а в backend security/dependency слое и в хранении refresh token на стороне renderer.

## Что прошло

- `studingJS`: контракты теории/практики прошли для 94 тем.
- `studingJS`: smoke, variation, fallback, diversity, runtime timeout и QA-проверки прошли.
- C++/C#/Java runtime diagnostic: 39 решений проходят, 39 starter-шаблонов падают как ожидается.
- `server`: `npm run build` проходит.
- Инсталлер локально собирается: `studingJS/dist/JS Infinite Trainer Setup 1.0.0.exe`.
- Git-дерево после диагностики было чистым: `main...origin/main`.

## Найденные проблемы и риски

### 1. Backend dependencies: critical/high audit issues

`npm audit` в `server` нашел уязвимости уровня critical/high:

- `fast-jwt` через `@fastify/jwt`;
- `drizzle-orm`;
- `fast-uri` через Fastify dependency chain.

Не стоит запускать `npm audit fix --force` прямо в `main`: там есть breaking upgrades. Лучше завести отдельную ветку, обновить зависимости, проверить auth/progress/leaderboard и только потом вливать.

### 2. Refresh token хранится в renderer localStorage

Сейчас refresh/session токены живут в renderer-слое Electron. Это риск: если renderer будет скомпрометирован, токен можно украсть.

Лучшее направление: перенести refresh/session хранение в main process или secure storage, а renderer общается через IPC.

### 3. Pro/plan enforcement выглядит неполным на backend

В проекте есть `requirePlan`, но некоторые online/paid-like маршруты выглядят защищенными только через `authenticate`. Если Pro-фичи должны реально ограничиваться, это нужно закреплять сервером, а не только UI/localStorage.

Нужно решить продуктово:

- если фичи бесплатные — убрать ложное ощущение paywall;
- если фичи платные — добавить server-side enforcement.

### 4. Progress sync может перезатирать свежие данные

Progress sync выглядит как полная перезапись payload. При двух устройствах или двух сессиях старое состояние может затереть более свежее.

Лучшее направление: добавить merge/versioning по темам, timestamp/version fields или optimistic concurrency.

### 5. У backend нет нормального test script

`server` собирается через TypeScript, но нет полноценного тестового контура. Перед активным подключением бэка нужны хотя бы минимальные интеграционные тесты:

- register/login/refresh/logout;
- progress push/pull/merge;
- leaderboard access;
- plan/pro enforcement;
- health/db connectivity.

### 6. Инсталлер собирается без подписи

Сборка проходит, но signing skipped. Это не runtime-баг, но на Windows может появляться предупреждение при установке.

## Что рекомендую делать первым

1. Сделать отдельную ветку под backend dependency/security upgrade.
2. Обновить `@fastify/jwt`, Fastify-chain и `drizzle-orm`, проверить breaking changes.
3. Добавить минимальные backend integration tests.
4. Перенести refresh token из renderer `localStorage` в более безопасное хранение.
5. После этого уже спокойно расширять backend-фичи и синхронизацию прогресса.

## Координация для Codex и Claude Code

- Не трогать `server/.env` и не писать секреты в README.
- Не запускать force-fix зависимостей без отдельной ветки и проверки.
- Если работа идет над backend, начать с тестов auth/progress/plan, потому что там самый большой риск.
- Если работа идет над Electron security, держать токены вне renderer и прокидывать только безопасные IPC-действия.
