package httpserver

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/antondemidov/montazh360/internal/domain"
)

// errorResponse — единый формат ошибки API (см. oapi.yaml #/components/schemas/Error).
type errorResponse struct {
	Error string `json:"error"`
}

// writeJSON сериализует v в JSON и отвечает со статусом code.
func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	// Ошибку кодирования после WriteHeader уже не отдать клиенту — игнорируем осознанно.
	_ = json.NewEncoder(w).Encode(v)
}

// writeError отвечает JSON-ошибкой с нужным статусом.
// Доменные ошибки маппятся на HTTP-коды; остальное — 500.
func writeError(w http.ResponseWriter, err error) {
	var ve *domain.ValidationError
	switch {
	case errors.Is(err, domain.ErrNotFound):
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "наряд не найден"})
	case errors.As(err, &ve):
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: ve.Message})
	default:
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "внутренняя ошибка сервера"})
	}
}

// decodeJSON разбирает тело запроса в v. При ошибке возвращает доменную
// ошибку валидации с понятным сообщением.
func decodeJSON(r *http.Request, v any) error {
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(v); err != nil {
		return domain.NewValidation("некорректный JSON: " + err.Error())
	}
	return nil
}

// decodeOrderUpdate разбирает тело PATCH-запроса, отличая «поле не передано»
// от «поле передано как null» (важно для снятия исполнителя).
func decodeOrderUpdate(r *http.Request) (domain.OrderUpdate, error) {
	var raw map[string]json.RawMessage
	if err := decodeJSON(r, &raw); err != nil {
		return domain.OrderUpdate{}, err
	}

	var upd domain.OrderUpdate

	if rawExec, ok := raw["executor"]; ok {
		upd.ExecutorSet = true
		if string(rawExec) != "null" {
			var name string
			if err := json.Unmarshal(rawExec, &name); err != nil {
				return domain.OrderUpdate{}, domain.NewValidation("поле executor должно быть строкой или null")
			}
			upd.Executor = &name
		}
	}

	if rawStatus, ok := raw["status"]; ok {
		if string(rawStatus) == "null" {
			return domain.OrderUpdate{}, domain.NewValidation("поле status не может быть null")
		}
		var st domain.Status
		if err := json.Unmarshal(rawStatus, &st); err != nil {
			return domain.OrderUpdate{}, domain.NewValidation("поле status должно быть строкой")
		}
		upd.Status = &st
	}

	if len(raw) == 0 {
		return domain.OrderUpdate{}, domain.NewValidation("тело запроса пустое: укажите executor и/или status")
	}

	return upd, nil
}

// healthzHandler — ручка живости.
func healthzHandler(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
