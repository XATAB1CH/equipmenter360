# syntax=docker/dockerfile:1

# ─── Стадия сборки ────────────────────────────────────────────────────────────
FROM golang:1.26-alpine AS build

WORKDIR /src

# Сначала только зависимости — для кэширования слоёв.
COPY go.mod go.sum ./
RUN go mod download

# Затем исходники и сборка статического бинаря.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# ─── Финальный образ ──────────────────────────────────────────────────────────
# distroless/static-debian12: без shell, не root (nonroot), только бинарь.
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

COPY --from=build /out/server /app/server
COPY config.docker.yaml /app/config.yaml
# Статика фронта из стейджа frontend (см. docker-compose: собирается из ../Frontend).
COPY --from=frontend /src/dist /app/static

EXPOSE 8080

ENTRYPOINT ["/app/server"]
CMD ["-config", "/app/config.yaml"]
