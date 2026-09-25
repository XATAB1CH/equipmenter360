# Монтаж 360 — Backend

HTTP-сервер на Go для системы управления нарядами «Монтаж 360». Отдаёт JSON API (`/api/*`) и собранный фронтенд из `../Frontend/dist`. Хранилище — **PostgreSQL** (запросы через **sqlc**), миграции **goose** применяются при старте. БД поднимается в **docker-compose**.

## Архитектура

Упрощённый вариант сервиса Garnet (`~/Desktop/Garnet_local/actions`): те же слои, но без proto/gRPC/кодогена/DI-провайдера.

```
cmd/server/main.go        точка входа: config → подключение к БД → goose up → wiring → graceful shutdown
internal/
  config/                 загрузка config.yaml (yaml.v3) с env-подстановкой ${VAR:default}
  domain/                 доменная модель (WorkOrder, Status), справочники, доменные ошибки
  store/
    store.go              интерфейс Store (ctx + error)
    postgres/
      sqlc/queries/       sqlc-запросы (orders.sql)
      sqlc/               сгенерированный код (db.go, models.go, orders.sql.go)
      store.go            Postgres-реализация Store поверх sqlc.Queries
      mapper.go           маппинг sqlc-модели → domain.WorkOrder
  service/                бизнес-логика: валидация, правила смены статусов, генерация номера
  httpserver/             HTTP-транспорт: хендлеры, роутер, JSON-хелперы, SPA-статика, Swagger UI
migrations/               goose-миграции (встроены embed'ом, применяются при старте)
api/oapi.yaml             OpenAPI 3.0 контракт
config.yaml               параметры сервера и подключения к БД
docker-compose.yml        PostgreSQL 16
sqlc.yaml                 конфиг генерации sqlc
```

Поток зависимостей: `httpserver → service → store (интерфейс) ← domain`. Слои смотрят только вниз; домен ни от чего не зависит.

## Быстрый старт

```bash
# 1. поднять PostgreSQL (нужен запущенный Docker)
docker compose up -d db

# 2. запустить сервер (миграции применятся автоматически)
go run ./cmd/server
# или собрать и запустить
go build -o bin/server ./cmd/server && ./bin/server
```

Сервер слушает `:8080`. Полезные адреса:
- `GET http://localhost:8080/api/orders` — список нарядов
- `GET http://localhost:8080/api/docs` — Swagger UI
- `GET http://localhost:8080/api/openapi.yaml` — контракт
- `GET http://localhost:8080/api/healthz` — проверка живости
- `http://localhost:8080/` — фронтенд (нужно сначала собрать: `cd ../Frontend && npm run build`)

## Конфигурация

Файл `config.yaml` (путь переопределяется флагом `-config` или env `CONFIG`). Поддерживается подстановка `${VAR:default}`:

```yaml
server:
  addr: ${ADDR::8080}
  staticDir: ${STATIC_DIR:../Frontend/dist}
  openapiSpec: ${OPENAPI_SPEC:api/oapi.yaml}
database:
  host: ${DB_HOST:localhost}
  port: ${DB_PORT:5433}          # внешний порт docker-контейнера
  user: ${DB_USER:montazh}
  password: <PASSWORD_5>:-montazh}
  dbname: ${DB_NAME:montazh360}
  sslmode: ${DB_SSLMODE:disable}
  poolMaxConns: ${DB_POOL_MAX_CONNS:10}
```

> **Порт 5433**, а не 5432: на многих машинах локальный Postgres уже слушает 5432 и перехватывает `localhost`. Контейнер проброшен наружу на 5433 (`docker-compose.yml`).

## Работа с БД

```bash
docker compose up -d db        # поднять
docker compose down            # остановить
docker compose down -v         # остановить и УДАЛИТЬ данные (чистый сброс)
docker compose logs -f db      # логи Postgres

# psql внутрь контейнера
docker exec -it montazh360-db psql -U montazh -d montazh360
```

### Миграции (goose)

Лежат в `migrations/`, встроены в бинарь и применяются при старте сервера. Новая миграция:

```bash
goose -dir migrations create add_something sql
# отредактировать migrations/XXXXX_add_something.sql, пересобрать сервер
```

### Запросы (sqlc)

SQL-запросы — в `internal/store/postgres/sqlc/queries/orders.sql`. После изменения перегенерировать код:

```bash
sqlc generate
```

## API

Контракт — [api/oapi.yaml](api/oapi.yaml). Кратко:

| Метод | Путь                | Описание                               |
|-------|---------------------|----------------------------------------|
| GET   | `/api/orders`       | список нарядов (новые сверху)          |
| POST  | `/api/orders`       | создать наряд (номер/статус/дата — сервер) |
| PATCH | `/api/orders/{id}`  | назначить/снять исполнителя, статус    |
| GET   | `/api/meta`         | справочники типов работ и монтажников  |
| GET   | `/api/healthz`      | проверка живости                       |

Примеры:

```bash
curl localhost:8080/api/orders

curl -X POST localhost:8080/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"address":"ул. Пушкина, д. 1","workType":"Монтаж кабеля","client":"Иванов И.И.","phone":"+7 900 111-22-33"}'

# назначить исполнителя (статус -> assigned)
curl -X PATCH localhost:8080/api/orders/00143 -H 'Content-Type: application/json' -d '{"executor":"Петров Д.Н."}'
# снять исполнителя (статус -> created)
curl -X PATCH localhost:8080/api/orders/00143 -H 'Content-Type: application/json' -d '{"executor":null}'
# отменить
curl -X PATCH localhost:8080/api/orders/00143 -H 'Content-Type: application/json' -d '{"status":"cancelled"}'
```

## Точки расширения

- **Аутентификация**: middleware в `httpserver` + экран логина на фронте (сейчас заглушка).
- **Отчёты**: добавить `GET /api/reports/summary` и считать агрегаты на сервере (сейчас считает фронт).
- **Фронт → API**: переключить `Frontend/src/api.ts` с моков на `fetch('/api/...')`.
