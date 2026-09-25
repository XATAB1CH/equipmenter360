# Монтаж 360 — Backend

Go-сервер: отдаёт JSON API (`/api/*`) и собранный фронтенд. Хранилище — PostgreSQL (sqlc), миграции goose при старте.

**Общая документация и быстрый старт — в [корневом README](../README.md).**

## Запуск (локально, для разработки)

```bash
# БД в Docker (из корня проекта или отсюда)
docker compose up -d db          # если из корня
# или: docker compose -f ../docker-compose.yml up -d db

# сервер (миграции применятся автоматически)
go run ./cmd/server
```

Конфиг — `config.yaml` (БД на `localhost:5433`). Для контейнера используется `config.docker.yaml` (БД по имени сервиса `db`).

## Слои

`cmd/server` → `internal/httpserver` → `internal/service` → `internal/store` (интерфейс) ← `internal/domain`

- **config** — загрузка `config.yaml` с env-подстановкой `${VAR:default}` и `${VAR:-default}`
- **domain** — модель `WorkOrder`, `Status`, доменные ошибки
- **store** — интерфейс `Store` + реализация `postgres` поверх sqlc
- **service** — валидация, правила смены статусов, генерация номера
- **httpserver** — хендлеры, роутер (Go 1.22+ ServeMux), SPA-статика, Swagger UI

## Разработка

```bash
sqlc generate                                       # перегенерировать код из queries/*.sql
goose -dir migrations create add_something sql      # новая миграция
go build -o bin/server ./cmd/server                 # сборка
go vet ./...                                        # проверки
```

Контракт API — [api/oapi.yaml](api/oapi.yaml) (встроен в бинарь через `go:embed`, доступен на `/api/openapi.yaml`).
