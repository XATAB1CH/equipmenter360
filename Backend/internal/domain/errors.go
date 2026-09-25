package domain

import "errors"

// Доменные ошибки. Транспортный слой сопоставляет их HTTP-статусам.
var (
	// ErrNotFound — сущность с таким id не найдена (→ 404).
	ErrNotFound = errors.New("не найдено")
	// ErrValidation — данные запроса не прошли валидацию (→ 400).
	ErrValidation = errors.New("ошибка валидации")
	// ErrConflict — конфликт, например удаление монтажника с нарядами (→ 409).
	ErrConflict = errors.New("конфликт")
	// ErrUnauthorized — не аутентифицирован (→ 401).
	ErrUnauthorized = errors.New("не аутентифицирован")
	// ErrForbidden — нет прав на операцию (→ 403).
	ErrForbidden = errors.New("доступ запрещён")
)

// ValidationError — ошибка валидации с понятным сообщением для клиента.
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string { return e.Message }

// NewValidation создаёт ошибку валидации.
func NewValidation(message string) error {
	return &ValidationError{Message: message}
}
