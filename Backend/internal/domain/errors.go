package domain

import "errors"

// Доменные ошибки. Транспортный слой сопоставляет их HTTP-статусам.
var (
	// ErrNotFound — наряд с таким id не найден (→ 404).
	ErrNotFound = errors.New("не найдено")
	// ErrValidation — данные запроса не прошли валидацию (→ 400).
	ErrValidation = errors.New("ошибка валидации")
)

// ValidationError — ошибка валидации с понятным сообщением для клиента.
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string { return e.Message }

// NewValidation создаёт ошибку валидации, обёрнутую в ErrValidation,
// чтобы errors.Is(err, ErrValidation) возвращал true.
func NewValidation(message string) error {
	return &ValidationError{Message: message}
}
