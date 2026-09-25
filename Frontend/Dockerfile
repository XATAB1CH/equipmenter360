# syntax=docker/dockerfile:1

# Собирает фронтенд в dist/. Используется как build-стейдж из Backend/Dockerfile —
# сам по себе не запускается (фронт раздаёт backend-сервер с единого порта).
# Имя стейджа (frontend) используется в Backend/Dockerfile: FROM frontend.
FROM node:22-alpine AS frontend

WORKDIR /src

# Сначала манифесты — для кэширования слоя с зависимостями.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Затем исходники и сборка.
COPY . .
RUN npm run build

# Результат — /src/dist
