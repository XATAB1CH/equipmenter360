// Package httpserver реализует HTTP-транспорт API «Монтаж 360».
// Слой маппит HTTP-запросы на вызовы сервиса и доменные ошибки на HTTP-статусы.
package httpserver

import (
	"net/http"

	"github.com/antondemidov/montazh360/internal/domain"
	"github.com/antondemidov/montazh360/internal/service"
)

// Handler — HTTP-хендлеры поверх бизнес-логики.
type Handler struct {
	svc *service.Service
}

// NewHandler создаёт набор хендлеров.
func NewHandler(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

// listOrders — GET /api/orders.
func (h *Handler) listOrders(w http.ResponseWriter, r *http.Request) {
	orders, err := h.svc.ListOrders(r.Context())
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

	order, err := h.svc.UpdateOrder(r.Context(), id, upd)
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
