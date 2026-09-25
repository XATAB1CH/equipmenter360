// Package domain содержит доменную модель нарядов «Монтаж 360».
// Слой не зависит ни от транспорта (HTTP), ни от хранилища.
package domain

// Status — статус наряда.
type Status string

const (
	StatusCreated   Status = "created"   // Создан
	StatusAssigned  Status = "assigned"  // Назначен исполнитель
	StatusInWork    Status = "inwork"    // В работе
	StatusDone      Status = "done"      // Выполнен
	StatusCancelled Status = "cancelled" // Отменён
)

// Valid сообщает, является ли значение допустимым статусом.
func (s Status) Valid() bool {
	switch s {
	case StatusCreated, StatusAssigned, StatusInWork, StatusDone, StatusCancelled:
		return true
	}
	return false
}

// WorkOrder — наряд на монтажные работы.
type WorkOrder struct {
	ID           string  `json:"id"`           // Номер наряда (zero-padded, 5 знаков)
	Address      string  `json:"address"`      // Адрес объекта
	WorkType     string  `json:"workType"`     // Тип работ
	Client       string  `json:"client"`       // ФИО клиента или название организации
	Phone        string  `json:"phone"`        // Телефон клиента
	Executor     *string `json:"executor"`     // ФИО монтажника (JOIN), null — не назначен
	ExecutorID   *int64  `json:"executorId"`   // ID монтажника (FK), null — не назначен
	Date         string  `json:"date"`         // Дата создания (YYYY-MM-DD)
	Status       Status  `json:"status"`       // Статус
	Comment      string  `json:"comment"`      // Комментарий
}

// OrderCreate — данные для создания наряда.
// id/status/executor/date проставляет сервер.
type OrderCreate struct {
	Address  string `json:"address"`
	WorkType string `json:"workType"`
	Client   string `json:"client"`
	Phone    string `json:"phone"`
	Comment  string `json:"comment"`
}

// OrderUpdate — частичное обновление наряда.
// Поля-указатели: nil означает «поле не передано, не менять».
type OrderUpdate struct {
	// ExecutorID — ID монтажника. nil — поле не передано.
	// Если ExecutorSet && ExecutorID == nil — исполнитель снимается.
	ExecutorID  *int64 `json:"executorId"`
	ExecutorSet bool   `json:"-"`
	// Status — новый статус. nil — поле не передано.
	Status *Status `json:"status"`
}

// Meta — справочники для выпадающих списков.
type Meta struct {
	WorkTypes []string `json:"workTypes"`
}

// WorkTypes — справочник типов работ.
var WorkTypes = []string{
	"Монтаж кабеля", "Замена оборудования", "Диагностика", "Техобслуживание",
	"Подключение абонента", "Аварийный выезд", "Плановая проверка",
}
