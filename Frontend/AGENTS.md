# Монтаж 360 — Frontend

Фронтенд системы управления нарядами для монтажных бригад. React 19 + Vite 8 + Tailwind CSS v4 + TypeScript. Изначально сгенерирован в Figma Make, сейчас — автономный проект.

## Запуск

Dev-сервер **не** запущен автоматически — поднимайте вручную:

```bash
npm install     # один раз
npm run dev     # http://localhost:5173
npm run build   # продакшн-сборка в dist/
npm run preview # предпросмотр собранной версии
```

> В проекте лежит `pnpm-lock.yaml` (артефакт Figma Make), но pnpm не обязателен — используем npm, lock-файл `package-lock.json`.

## Структура

- `src/main.tsx` — точка входа; импортирует `src/index.css` и монтирует `src/App.tsx` в `#root`
- `src/App.tsx` — весь UI (5 экранов: логин, список нарядов, создание, детальная карточка, отчёты) и навигация между ними
- `src/api.ts` — **слой данных**. Типы (`WorkOrder`, `NewOrder`, `Status`), константы (`WORK_TYPES`, `TECHNICIANS`) и асинхронные функции `listOrders` / `createOrder` / `updateOrder`. Сейчас — моки в памяти; при появлении Go-бэкенда их тела заменяются на `fetch('/api/...')`, сигнатуры не меняются
- `src/index.css` — глобальный CSS, импорт Tailwind v4 и тема (цвета, шрифт Inter)
- `index.html` — HTML-оболочка с `#root`; title/lang подставляются из `.figma/make/site.json`
- `vite.config.ts` — Vite + React + Tailwind v4, alias `@` → `src`, плагин метаданных, **proxy `/api` → `http://localhost:8080`** под будущий Go-сервер
- `.figma/make/site.json` — метаданные страницы (title «Монтаж 360», language «ru», description, robots)

## Стилизация

Tailwind CSS v4 через `@tailwindcss/vite` (см. `vite.config.ts`). В `src/index.css` — `@import 'tailwindcss';` и блок `@theme` с палитрой проекта. Конфиг-файл Tailwind/PostCSS не нужен. Пишите утилитарные классы прямо в JSX; глобальные стили и шрифты — в `src/index.css` (импорты `@import` — первыми).

## Интеграция с бэкендом (следующая задача)

План: один Go-сервер отдаёт и собранный фронт (`dist/`), и JSON API на `/api`. В dev фронт проксирует `/api` на `localhost:8080` (уже настроено). Поэтому все обращения к данным идут через `src/api.ts` — при подключении бэкенда меняем только его.
