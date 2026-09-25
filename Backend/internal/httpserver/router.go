package httpserver

import (
	_ "embed"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/antondemidov/montazh360/internal/auth"
	"github.com/antondemidov/montazh360/internal/domain"
	"github.com/antondemidov/montazh360/internal/service"
)

// openapiSpec — встроенный в бинарь OpenAPI-контракт (api/oapi.yaml).
// Копия лежит рядом с этим файлом, чтобы работать в контейнере без исходников.
//
//go:embed oapi.yaml
var openapiSpec []byte

// NewRouter собирает маршруты API и раздачу статики фронта.
//
// Все пути /api/* обрабатываются здесь; остальные отдают файлы из staticDir
// (собранный фронт) с fallback на index.html для клиентского роутинга.
// jwt — менеджер токенов; svc нужен middleware для загрузки пользователя.
func NewRouter(h *Handler, staticDir string, jwtMgr *auth.Manager, svc *service.Service) http.Handler {
	mux := http.NewServeMux()

	// Публичные ручки (без аутентификации).
	mux.HandleFunc("GET /api/healthz", healthzHandler)
	mux.HandleFunc("POST /api/auth/login", h.login)
	mux.HandleFunc("GET /api/openapi.yaml", openapiSpecHandler)
	mux.HandleFunc("GET /api/docs", swaggerUIHandler)

	// Защищённые ручки: JWT + роли.
	dispatcherOnly := func(fn http.HandlerFunc) http.Handler {
		return authMiddleware(jwtMgr, svc, requireRole(domain.RoleDispatcher)(fn))
	}
	anyAuth := func(fn http.HandlerFunc) http.Handler {
		return authMiddleware(jwtMgr, svc, fn)
	}

	// Текущий пользователь.
	mux.Handle("GET /api/auth/me", anyAuth(http.HandlerFunc(h.me)))

	// Наряды: читать могут все аутентифицированные (роль фильтрует в service),
	// создавать — только диспетчер, обновлять — диспетчер и монтажник (со своими).
	mux.Handle("GET /api/orders", anyAuth(http.HandlerFunc(h.listOrders)))
	mux.Handle("POST /api/orders", dispatcherOnly(http.HandlerFunc(h.createOrder)))
	mux.Handle("PATCH /api/orders/{id}", anyAuth(http.HandlerFunc(h.updateOrder)))

	// Монтажники: читать — все (для селектов), управлять — только диспетчер.
	mux.Handle("GET /api/technicians", anyAuth(http.HandlerFunc(h.listTechnicians)))
	mux.Handle("POST /api/technicians", dispatcherOnly(http.HandlerFunc(h.createTechnician)))
	mux.Handle("PUT /api/technicians/{id}", dispatcherOnly(http.HandlerFunc(h.updateTechnician)))
	mux.Handle("DELETE /api/technicians/{id}", dispatcherOnly(http.HandlerFunc(h.deleteTechnician)))

	// Отчёты и справочники — все аутентифицированные.
	mux.Handle("GET /api/reports/summary", anyAuth(http.HandlerFunc(h.reportSummary)))
	mux.Handle("GET /api/meta", anyAuth(http.HandlerFunc(h.getMeta)))

	// Статика фронта + SPA-fallback.
	mux.Handle("/", spaHandler(staticDir))

	return mux
}

// openapiSpecHandler отдаёт встроенный контракт API.
func openapiSpecHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/yaml; charset=utf-8")
	_, _ = w.Write(openapiSpec)
}

// swaggerUIHandler отдаёт страницу Swagger UI, подключённую к /api/openapi.yaml.
// Используется CDN, поэтому работает только при доступе в интернет.
func swaggerUIHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(swaggerUIPage))
}

// spaHandler отдаёт статические файлы; для неизвестных не-API путей —
// index.html (клиентский роутинг SPA).
func spaHandler(staticDir string) http.Handler {
	fileServer := http.FileServer(http.Dir(staticDir))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Подстраховка: /api/* сюда доходить не должно, но на всякий случай.
		if strings.HasPrefix(r.URL.Path, "/api/") {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "ресурс не найден"})
			return
		}

		// Если файл существует — отдаём его, иначе — index.html.
		path := filepath.Join(staticDir, filepath.Clean(r.URL.Path))
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}
		if _, err := fs.Stat(os.DirFS(staticDir), "index.html"); err != nil {
			// Фронт ещё не собран — подсказываем, как это сделать.
			http.Error(w, "фронтенд не собран: выполните `npm run build` в ../Frontend", http.StatusServiceUnavailable)
			return
		}
		http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
	})
}

// swaggerUIPage — минимальная обвязка Swagger UI.
const swaggerUIPage = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Монтаж 360 — API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/openapi.yaml',
      dom_id: '#swagger-ui',
    });
  </script>
</body>
</html>`
