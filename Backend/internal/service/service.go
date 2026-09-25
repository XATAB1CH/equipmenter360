// Package service содержит бизнес-логику: валидацию входных данных,
// правила смены статусов и проверку прав доступа.
// Слой не знает ни об HTTP, ни о конкретной реализации хранилища.
package service

import (
	"context"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

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

// ─── Наряды ──────────────────────────────────────────────────────────────────

// ListOrders возвращает наряды с учётом роли: диспетчер — все, монтажник — свои.
func (s *Service) ListOrders(ctx context.Context, user *domain.User) ([]*domain.WorkOrder, error) {
	if user.Role == domain.RoleMontazhnik && user.TechnicianID != nil {
		return s.store.ListByTechnician(ctx, *user.TechnicianID)
	}
	return s.store.List(ctx)
}

// CreateOrder валидирует данные и создаёт наряд (только диспетчер).
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
		Date:     now().Format("2006-01-02"),
		Status:   domain.StatusCreated,
		Comment:  strings.TrimSpace(in.Comment),
	}
	return s.store.Create(ctx, order)
}

// UpdateOrder применяет частичное обновление с учётом бизнес-правил и прав роли.
func (s *Service) UpdateOrder(ctx context.Context, number string, upd domain.OrderUpdate, user *domain.User) (*domain.WorkOrder, error) {
	order, err := s.store.Get(ctx, number)
	if err != nil {
		return nil, err // ErrNotFound → 404
	}

	// Монтажник может менять статус только у своих нарядов и не может назначать.
	if user.Role == domain.RoleMontazhnik {
		if user.TechnicianID == nil || order.ExecutorID == nil || *order.ExecutorID != *user.TechnicianID {
			return nil, domain.ErrForbidden
		}
		if upd.ExecutorSet {
			return nil, domain.NewValidation("монтажник не может назначать исполнителя")
		}
	}

	// Смена исполнителя (назначение/снятие) — только диспетчер.
	if upd.ExecutorSet {
		if upd.ExecutorID != nil {
			if _, err := s.store.GetTechnician(ctx, *upd.ExecutorID); err != nil {
				return nil, domain.NewValidation("монтажник не найден")
			}
			order.ExecutorID = upd.ExecutorID
			order.Status = domain.StatusAssigned // назначили → «Назначен»
		} else {
			order.ExecutorID = nil // сняли → «Создан»
			order.Status = domain.StatusCreated
		}
	}

	// Явная смена статуса.
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
	return domain.Meta{WorkTypes: domain.WorkTypes}
}

// ─── Монтажники ───────────────────────────────────────────────────────────────

// ListTechnicians возвращает монтажников: для селекта — только активных, иначе всех.
func (s *Service) ListTechnicians(ctx context.Context, activeOnly bool) ([]*domain.Technician, error) {
	if activeOnly {
		return s.store.ListActiveTechnicians(ctx)
	}
	return s.store.ListTechnicians(ctx)
}

func (s *Service) CreateTechnician(ctx context.Context, in domain.TechnicianCreate) (*domain.Technician, error) {
	if strings.TrimSpace(in.FullName) == "" {
		return nil, domain.NewValidation("поле fullName обязательно")
	}
	in.FullName = strings.TrimSpace(in.FullName)
	in.Phone = strings.TrimSpace(in.Phone)
	return s.store.CreateTechnician(ctx, in)
}

func (s *Service) UpdateTechnician(ctx context.Context, id int64, in domain.TechnicianUpdate) (*domain.Technician, error) {
	if in.FullName != nil && strings.TrimSpace(*in.FullName) == "" {
		return nil, domain.NewValidation("поле fullName не может быть пустым")
	}
	return s.store.UpdateTechnician(ctx, id, in)
}

// DeleteTechnician удаляет монтажника, если у него нет нарядов (иначе 409).
func (s *Service) DeleteTechnician(ctx context.Context, id int64) error {
	if _, err := s.store.GetTechnician(ctx, id); err != nil {
		return err // 404
	}
	n, err := s.store.CountOrdersByTechnician(ctx, id)
	if err != nil {
		return err
	}
	if n > 0 {
		return domain.ErrConflict
	}
	return s.store.DeleteTechnician(ctx, id)
}

// ─── Аутентификация ───────────────────────────────────────────────────────────

// Authenticate проверяет логин/пароль и возвращает пользователя.
func (s *Service) Authenticate(ctx context.Context, creds domain.Credentials) (*domain.User, error) {
	user, hash, err := s.store.GetUserByLogin(ctx, strings.TrimSpace(creds.Login))
	if err != nil {
		return nil, domain.ErrUnauthorized
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(creds.Password)) != nil {
		return nil, domain.ErrUnauthorized
	}
	return user, nil
}

// GetUser возвращает пользователя по id (для /me).
func (s *Service) GetUser(ctx context.Context, id int64) (*domain.User, error) {
	return s.store.GetUserByID(ctx, id)
}

// ─── Отчёты ───────────────────────────────────────────────────────────────────

// ReportSummary считает сводный отчёт за период [dateFrom, dateTo].
func (s *Service) ReportSummary(ctx context.Context, dateFrom, dateTo string) (domain.ReportSummary, error) {
	if !validDate(dateFrom) || !validDate(dateTo) {
		return domain.ReportSummary{}, domain.NewValidation("некорректный период: ожидается YYYY-MM-DD")
	}
	summary, err := s.store.OrdersSummary(ctx, dateFrom, dateTo)
	if err != nil {
		return domain.ReportSummary{}, err
	}
	load, err := s.store.LoadByTechnician(ctx, dateFrom, dateTo)
	if err != nil {
		return domain.ReportSummary{}, err
	}
	summary.ByTech = load
	return summary, nil
}

// ─── Валидация ────────────────────────────────────────────────────────────────

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

func validDate(s string) bool {
	_, err := time.Parse("2006-01-02", s)
	return err == nil
}
