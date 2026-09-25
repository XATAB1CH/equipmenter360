# Монтаж 360

Веб-приложение для управления нарядами на монтажные работы: диспетчер создаёт наряды, назначает монтажников, отслеживает статусы и смотрит отчёты.

Стек: **React 19 + Vite + Tailwind** (фронт) · **Go 1.26 + net/http** (бэк) · **PostgreSQL 16 + sqlc + goose** (данные) · **Docker Compose** (запуск).

## Быстрый старт (всё в Docker)

Нужен только запущенный Docker. Одна команда собирает фронт и бэк и поднимает весь стек:

```bash
docker compose up -d --build
```

Открыть:
- **Приложение** — http://localhost:8080 (фронт + API на одном порту)
- **Swagger UI** — http://localhost:8080/api/docs
- **OpenAPI-контракт** — http://localhost:8080/api/openapi.yaml

Управление:

```bash
docker compose ps           # статус контейнеров
docker compose logs -f app  # логи бэкенда
docker compose down         # остановить (данные сохранятся)
docker compose down -v      # остановить и удалить данные БД (чистый сброс)
```

Что происходит при старте: поднимается Postgres → становится healthy → собирается образ фронта → образ бэкенда (с фронтом внутри) → бэкенд применяет goose-миграции (создаёт таблицу и сид-данные) и слушает `:8080`.

## Структура

```
docker-compose.yml      весь стек: db + frontend-build + app
Frontend/               React + Vite + Tailwind (UI, 5 экранов)
  src/api.ts            клиент API (fetch к /api)
  Dockerfile            собирает фронт в dist/ (стейдж для app)
Backend/                Go-сервер
  cmd/server/           точка входа (config → БД → миграции → HTTP)
  internal/
    config/             загрузка config.yaml (env-подстановка)
    domain/             доменная модель (WorkOrder, Status)
    store/              интерфейс Store + postgres-реализация (sqlc)
    service/            бизнес-логика (валидация, переходы статусов)
    httpserver/         HTTP-хендлеры, роутер, SPA-статика, Swagger UI
  migrations/           goose-миграции (применяются при старте)
  api/oapi.yaml         OpenAPI 3.0 контракт
  config.yaml           конфиг для локального запуска
  config.docker.yaml    конфиг для контейнера
  Dockerfile            multi-stage сборка бэкенда (+ статика фронта)
```

Архитектура бэкенда — упрощённый вариант слоёв Garnet: `httpserver → service → store (интерфейс) ← domain`.

## API

| Метод | Путь               | Описание                                   |
|-------|--------------------|--------------------------------------------|
| GET   | `/api/orders`      | список нарядов (новые сверху)              |
| POST  | `/api/orders`      | создать наряд (номер/статус/дата — сервер) |
| PATCH | `/api/orders/{id}` | назначить/снять исполнителя, сменить статус |
| GET   | `/api/meta`        | справочники типов работ и монтажников      |
| GET   | `/api/healthz`     | проверка живости                           |

Примеры:

```bash
curl localhost:8080/api/orders

curl -X POST localhost:8080/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"address":"ул. Ленина, д. 1","workType":"Монтаж кабеля","client":"Иванов И.И.","phone":"+7 900 111-22-33"}'

# назначить исполнителя (статус -> assigned)
curl -X PATCH localhost:8080/api/orders/00143 \
  -H 'Content-Type: application/json' -d '{"executor":"Петров Д.Н."}'
```

## Локальная разработка (без Docker для бэка/фронта)

Удобно для живой перезагрузки. БД всё равно в Docker:

```bash
# 1. БД
docker compose up -d db

# 2. Бэкенд (из Backend/, миграции применятся сам)
cd Backend && go run ./cmd/server

# 3. Фронт с hot-reload (из Frontend/, проксирует /api на :8080)
cd Frontend && npm install && npm run dev   # http://localhost:5173
```

> Локальный бэк использует `Backend/config.yaml` (БД на `localhost:5433`). Порт 5433, а не 5432, чтобы не конфликтовать с локальным Postgres, если он установлен.

## Полезное

```bash
# перегенерировать sqlc-код после изменения запросов в Backend/internal/store/postgres/sqlc/queries/
cd Backend && sqlc generate

# создать новую миграцию
cd Backend && goose -dir migrations create add_something sql

# psql в контейнер БД
docker exec -it montazh360-db psql -U montazh -d montazh360
```

## Дорожная карта

- [ ] Аутентификация (сейчас экран логина — заглушка)
- [ ] Серверные отчёты (`GET /api/reports/summary`; пока считает фронт)
- [ ] Роли пользователей (диспетчер / монтажник)
