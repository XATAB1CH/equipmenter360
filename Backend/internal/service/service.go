// Package service содержит бизнес-логику работы с нарядами:
// валидацию входных данных и правила смены статусов.
// Слой не знает ни об HTTP, ни о конкретной реализации хранилища.
package service

import (
	"context"
	"strings"
	"time"

	"github.com/antondemidov/montazh360/internal/domain"
	"github.com/antondemidov/montazh360/internal/store"
)

// now — источник текущей даты; вынесен в переменную для подмены в тестах.
var now = time.Now //nolint:gochecknoglobals // точка расширения для тестов

// Service — бизнес-логика поверх хранилища.
type Service struct {
	store store.Store
}

// New создаёт сервис поверх хранилища.
func New(s store.Store) *Service {
	return &Service{store: s}
}

// ListOrders возвращает все наряды, новые сверху.
func (s *Service) ListOrders(ctx context.Context) ([]*domain.WorkOrder, error) {
	return s.store.List(ctx)
}

// CreateOrder валидирует данные и создаёт наряд.
// Сервер проставляет номер, status=created, executor=null и текущую дату создания.
func (s *Service) CreateOrder(ctx context.Context, in domain.OrderCreate) (*domain.WorkOrder, error) {
	if err := validateCreate(in); err != nil {
		return nil, err
	}

	number, err := s.store.NextNumber(ctx)
	if err != nil {
		return nil, err
	}

	order := &domain.WorkOrder{
		ID:       number,
		Address:  strings.TrimSpace(in.Address),
		WorkType: strings.TrimSpace(in.WorkType),
		Client:   strings.TrimSpace(in.Client),
		Phone:    strings.TrimSpace(in.Phone),
		Executor: nil,
		Date:     now().Format("2006-01-02"),
		Status:   domain.StatusCreated,
		Comment:  strings.TrimSpace(in.Comment),
	}
	return s.store.Create(ctx, order)
}

// UpdateOrder применяет частичное обновление с учётом бизнес-правил смены статусов.
func (s *Service) UpdateOrder(ctx context.Context, number string, upd domain.OrderUpdate) (*domain.WorkOrder, error) {
	order, err := s.store.Get(ctx, number)
	if err != nil {
		return nil, err // ErrNotFound → 404 в транспорте
	}

	// Смена исполнителя.
	if upd.ExecutorSet {
		if upd.Executor != nil {
			name := strings.TrimSpace(*upd.Executor)
			if name == "" {
				return nil, domain.NewValidation("исполнитель не может быть пустой строкой")
			}
			order.Executor = &name
			order.Status = domain.StatusAssigned // назначили → статус «Назначен»
		} else {
			order.Executor = nil // сняли → статус «Создан»
			order.Status = domain.StatusCreated
		}
	}

	// Явная смена статуса (например, отмена).
	if upd.Status != nil {
		if !upd.Status.Valid() {
			return nil, domain.NewValidation("недопустимый статус: " + string(*upd.Status))
		}
		order.Status = *upd.Status
	}

	return s.store.Update(ctx, order)
}

// GetMeta возвращает справочники для выпадающих списков.
func (s *Service) GetMeta() domain.Meta {
	return domain.Meta{
		WorkTypes:   domain.WorkTypes,
		Technicians: domain.Technicians,
	}
}

// validateCreate проверяет обязательные поля при создании наряда.
func validateCreate(in domain.OrderCreate) error {
	switch {
	case strings.TrimSpace(in.Address) == "":
		return domain.NewValidation("поле address обязательно")
	case strings.TrimSpace(in.WorkType) == "":
		return domain.NewValidation("поле workType обязательно")
	case strings.TrimSpace(in.Client) == "":
		return domain.NewValidation("поле client обязательно")
	case strings.TrimSpace(in.Phone) == "":
		return domain.NewValidation("поле phone обязательно")
	}
	return nil
}
