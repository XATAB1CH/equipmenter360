# Монтаж 360

Веб-приложение для управления нарядами на монтажные работы. Диспетчер создаёт наряды, назначает монтажников, смотрит отчёты; монтажник видит свои наряды и меняет их статус.

Стек: **React 19 + Vite + Tailwind** (фронт) · **Go 1.26 + net/http** (бэк) · **PostgreSQL 16 + sqlc + goose** (данные) · **JWT** (аутентификация) · **Docker Compose** (запуск).

## Быстрый старт (всё в Docker)

Нужен только запущенный Docker:

```bash
docker compose up -d --build
```

Открыть:
- **Приложение** — http://localhost:8080 (фронт + API на одном порту)
- **Swagger UI** — http://localhost:8080/api/docs
- **OpenAPI-контракт** — http://localhost:8080/api/openapi.yaml

### Вход

Аутентификация по JWT. Сид-пользователи (пароль у обоих — `password`):

| Логин        | Роль        | Доступ                                   |
|--------------|-------------|------------------------------------------|
| `dispatcher` | Диспетчер   | всё: наряды, монтажники, отчёты, настройки |
| `ivanov`     | Монтажник   | только свои наряды + смена их статуса    |

Управление стеком:

```bash
docker compose ps           # статус
docker compose logs -f app  # логи бэкенда
docker compose down         # остановить (данные сохранятся)
docker compose down -v      # остановить и удалить данные БД
```

При старте поднимается Postgres → собираются образы фронта и бэкенда → бэкенд применяет goose-миграции (таблицы + сид-данные) и слушает `:8080`.

## Возможности

- **Аутентификация** — JWT (Bearer), сессия восстанавливается по токену в localStorage.
- **Роли** — диспетчер (полный доступ) и монтажник (только свои наряды, смена статуса).
- **Наряды** — список с поиском/фильтром, создание, назначение исполнителя, смена статуса, отмена.
- **Монтажники** — отдельная вкладка с полным CRUD (создание, редактирование, увольнение, удаление). Удалить монтажника с нарядами нельзя (409).
- **Отчёты** — серверный отчёт за период: счётчики по статусам и загрузка монтажников.
- **Настройки** — переключение темы (светлая/тёмная), сохраняется локально.

## Структура

```
docker-compose.yml      весь стек: db + frontend-build + app
Frontend/               React + Vite + Tailwind
  src/api.ts            клиент API (fetch + JWT в localStorage)
  src/App.tsx           экраны: логин, наряды, монтажники, отчёты, настройки
  Dockerfile            сборка фронта в dist/ (стейдж для app)
Backend/                Go-сервер
  cmd/server/           точка входа (config → БД → миграции → HTTP)
  internal/
    auth/               выпуск и проверка JWT
    config/             загрузка config.yaml (env-подстановка)
    domain/             модели (WorkOrder, Technician, User, Role, Report)
    store/              интерфейс Store + postgres-реализация (sqlc)
    service/            бизнес-логика (валидация, статусы, права ролей)
    httpserver/         хендлеры, роутер, JWT-middleware, SPA-статика, Swagger
  migrations/           goose-миграции (work_orders, technicians, users)
  api/oapi.yaml         OpenAPI 3.0 контракт
  config.yaml           конфиг для локального запуска
  config.docker.yaml    конфиг для контейнера
  Dockerfile            multi-stage сборка бэкенда (+ статика фронта)
```

Архитектура бэкенда: `httpserver → service → store (интерфейс) ← domain`.

## API

Все ручки, кроме `/api/healthz` и `/api/auth/login`, требуют заголовок `Authorization: Bearer <token>`.

| Метод | Путь                      | Описание                                  | Роль       |
|-------|---------------------------|-------------------------------------------|------------|
| POST  | `/api/auth/login`         | вход, выдача JWT                          | —          |
| GET   | `/api/auth/me`            | текущий пользователь                      | любая      |
| GET   | `/api/orders`             | список нарядов (монтажник — свои)         | любая      |
| POST  | `/api/orders`             | создать наряд                             | dispatcher |
| PATCH | `/api/orders/{id}`        | назначить/снять исполнителя, статус       | любая*     |
| GET   | `/api/technicians`        | список монтажников (`?active=true`)       | любая      |
| POST  | `/api/technicians`        | создать монтажника                        | dispatcher |
| PUT   | `/api/technicians/{id}`   | обновить монтажника                       | dispatcher |
| DELETE| `/api/technicians/{id}`   | удалить (409, если есть наряды)           | dispatcher |
| GET   | `/api/reports/summary`    | отчёт за период (`?from=&to=`)            | любая      |
| GET   | `/api/meta`               | справочник типов работ                    | любая      |
| GET   | `/api/healthz`            | проверка живости                          | —          |

\* назначать исполнителя может только диспетчер; менять статус — диспетчер и монтажник (только свои наряды).

Примеры:

```bash
# вход
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"dispatcher","password":"password"}' | jq -r .token)

# список нарядов
curl -H "Authorization: Bearer $TOKEN" localhost:8080/api/orders

# создать монтажника
curl -X POST localhost:8080/api/technicians \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"fullName":"Сидоров И.П.","phone":"<PHONE_RU_28>"}'

# назначить исполнителя на наряд (по id монтажника)
curl -X PATCH localhost:8080/api/orders/00143 \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"executorId":4}'
```

## Локальная разработка (без Docker для бэка/фронта)

БД всё равно в Docker:

```bash
docker compose up -d db                          # 1. БД
cd Backend && go run ./cmd/server                # 2. бэкенд (миграции сами)
cd Frontend && npm install && npm run dev        # 3. фронт с hot-reload → :5173
```

> Локальный бэк использует `Backend/config.yaml` (БД на `localhost:5433`, а не 5432 — чтобы не конфликтовать с локальным Postgres).

## Полезное

```bash
# перегенерировать sqlc-код после изменения запросов в internal/store/postgres/sqlc/queries/
cd Backend && sqlc generate

# новая миграция
cd Backend && goose -dir migrations create add_something sql

# psql в контейнер БД
docker exec -it montazh360-db psql -U montazh -d montazh360
```

## Конфигурация

`Backend/config.yaml` (локально) и `Backend/config.docker.yaml` (контейнер) поддерживают env-подстановку `${VAR:default}` / `${VAR:-default}`:

```yaml
server:   { addr, staticDir }
database: { host, port, user, password, dbname, sslmode, poolMaxConns }
auth:     { secret, tokenTtlHours }   # JWT-секрет (JWT_SECRET) и время жизни токена
```

> В проде обязательно поменяйте `auth.secret` и пароли сид-пользователей.

## Дорожная карта

- [ ] Управление пользователями через UI (сейчас — только сид)
- [ ] Выгрузка отчётов (CSV/Excel)
- [ ] Уведомления монтажнику о новом наряде
