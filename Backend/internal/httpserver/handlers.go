// Package httpserver реализует HTTP-транспорт API «Монтаж 360».
// Слой маппит HTTP-запросы на вызовы сервиса и доменные ошибки на HTTP-статусы.
package httpserver

import (
	"context"
	"net/http"
	"strconv"

	"github.com/antondemidov/montazh360/internal/auth"
	"github.com/antondemidov/montazh360/internal/domain"
	"github.com/antondemidov/montazh360/internal/service"
)

// userGetter — минимальный интерфейс для middleware.
type userGetter interface {
	GetUser(ctx context.Context, id int64) (*domain.User, error)
}

// Handler — HTTP-хендлеры поверх бизнес-логики.
type Handler struct {
	svc *service.Service
	jwt *auth.Manager
}

// NewHandler создаёт набор хендлеров.
func NewHandler(svc *service.Service, jwt *auth.Manager) *Handler {
	return &Handler{svc: svc, jwt: jwt}
}

// ─── Аутентификация ───────────────────────────────────────────────────────────

// login — POST /api/auth/login. Выдаёт JWT по логину/паролю.
func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var creds domain.Credentials
	if err := decodeJSON(r, &creds); err != nil {
		writeError(w, err)
		return
	}
	user, err := h.svc.Authenticate(r.Context(), creds)
	if err != nil {
		writeError(w, err)
		return
	}
	token, err := h.jwt.Issue(user)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": user})
}

// me — GET /api/auth/me. Возвращает текущего пользователя.
func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, userFromContext(r.Context()))
}

// ─── Наряды ──────────────────────────────────────────────────────────────────

// listOrders — GET /api/orders.
func (h *Handler) listOrders(w http.ResponseWriter, r *http.Request) {
	orders, err := h.svc.ListOrders(r.Context(), userFromContext(r.Context()))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, orders)
}

// createOrder — POST /api/orders.
func (h *Handler) createOrder(w http.ResponseWriter, r *http.Request) {
	var in domain.OrderCreate
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, err)
		return
	}
	order, err := h.svc.CreateOrder(r.Context(), in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, order)
}

// updateOrder — PATCH /api/orders/{id}.
func (h *Handler) updateOrder(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	upd, err := decodeOrderUpdate(r)
	if err != nil {
		writeError(w, err)
		return
	}
	order, err := h.svc.UpdateOrder(r.Context(), id, upd, userFromContext(r.Context()))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, order)
}

// getMeta — GET /api/meta.
func (h *Handler) getMeta(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, h.svc.GetMeta())
}

// ─── Монтажники ───────────────────────────────────────────────────────────────

// listTechnicians — GET /api/technicians?active=true.
func (h *Handler) listTechnicians(w http.ResponseWriter, r *http.Request) {
	activeOnly := r.URL.Query().Get("active") == "true"
	techs, err := h.svc.ListTechnicians(r.Context(), activeOnly)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, techs)
}

// createTechnician — POST /api/technicians.
func (h *Handler) createTechnician(w http.ResponseWriter, r *http.Request) {
	var in domain.TechnicianCreate
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, err)
		return
	}
	tech, err := h.svc.CreateTechnician(r.Context(), in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, tech)
}

// updateTechnician — PUT /api/technicians/{id}.
func (h *Handler) updateTechnician(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, domain.NewValidation("некорректный id"))
		return
	}
	var in domain.TechnicianUpdate
	if err := decodeJSON(r, &in); err != nil {
		writeError(w, err)
		return
	}
	tech, err := h.svc.UpdateTechnician(r.Context(), id, in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, tech)
}

// deleteTechnician — DELETE /api/technicians/{id}.
func (h *Handler) deleteTechnician(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeError(w, domain.NewValidation("некорректный id"))
		return
	}
	if err := h.svc.DeleteTechnician(r.Context(), id); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ─── Отчёты ───────────────────────────────────────────────────────────────────

// reportSummary — GET /api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD.
func (h *Handler) reportSummary(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	from, to := q.Get("from"), q.Get("to")
	summary, err := h.svc.ReportSummary(r.Context(), from, to)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, summary)
}
