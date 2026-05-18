# Деплой на любой сервер

Сервер — обычный Docker контейнер. PostgreSQL — любой (Neon, Supabase, Railway Postgres, самохостинг).

## Минимальные требования

- Node.js 22+ (или Docker)
- PostgreSQL 15+
- 256MB RAM

## Переезд с Railway на другой хост

### 1. Подготовь новую базу данных

Создай PostgreSQL инстанс (Neon, Supabase, или свой). Сохрани connection string.

### 2. Перенеси переменные окружения

Обязательные:
```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=<минимум 32 символа, любая строка>
JWT_REFRESH_SECRET=<другая строка, минимум 32 символа>
NODE_ENV=production
CORS_ORIGIN=null  # Electron file:// origin. Для web-клиента добавь домен через запятую.
```

Опциональные (фичи работают без них):
```env
GEMINI_API_KEY=     # AI hints/breakdown
RESEND_API_KEY=     # email
SENTRY_DSN=         # error tracking
STRIPE_SECRET_KEY=  # платежи
STRIPE_PRO_PRICE_ID=
STRIPE_WEBHOOK_SECRET=  # обязательно для Stripe webhook в production
APP_URL=https://your-domain.com
```

### 3. Деплой через Docker

```bash
cd server
cp .env.example .env   # заполни переменные
docker compose up -d   # запуск

# Первый запуск — создай таблицы
docker compose exec app npm run db:push
```

### 4. Обнови URL в Electron-приложении

Два варианта:

**a) Через localStorage (без пересборки):**
```
Открой приложение → DevTools (F12) → Console:
localStorage.setItem('jt.server.url', 'https://your-new-server.com')
location.reload()
```

**b) Через пересборку:**
В `studingJS/src/renderer/api/config.mjs` смени `DEFAULT_API_BASE`.
Затем `npm run dist`.

### 5. Проверь работу

```bash
curl https://your-new-server.com/health
# → {"status":"ok","ts":"..."}
```

## Платформы для деплоя

| Платформа | Сложность | Цена | Ссылка |
|-----------|-----------|------|--------|
| **Railway** | Просто | $5/мес | railway.app |
| **Render** | Просто | Бесплатно (sleep) | render.com |
| **Fly.io** | Средне | Бесплатно | fly.io |
| **VPS (Hetzner)** | Сложно | €4/мес | hetzner.com |
| **DigitalOcean** | Средне | $6/мес | digitalocean.com |

## База данных

| Платформа | Бесплатно | Ссылка |
|-----------|-----------|--------|
| **Neon** | 0.5 GB | neon.tech |
| **Supabase** | 0.5 GB | supabase.com |
| **Railway Postgres** | Входит в план | railway.app |
