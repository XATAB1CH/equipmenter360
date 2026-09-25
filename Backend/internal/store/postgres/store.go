// Package postgres реализует store.Store поверх PostgreSQL и sqlc.
package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/antondemidov/montazh360/internal/domain"
	"github.com/antondemidov/montazh360/internal/store/postgres/sqlc"
)

// Store — Postgres-хранилище.
type Store struct {
	q *sqlc.Queries
}

// NewStore создаёт хранилище поверх пула соединений.
func NewStore(db *pgxpool.Pool) *Store {
	return &Store{q: sqlc.New(db)}
}

// ─── Наряды ──────────────────────────────────────────────────────────────────

func (s *Store) List(ctx context.Context) ([]*domain.WorkOrder, error) {
	rows, err := s.q.ListOrders(ctx)
	if err != nil {
		return nil, fmt.Errorf("list orders: %w", err)
	}
	out := make([]*domain.WorkOrder, 0, len(rows))
	for _, r := range rows {
		out = append(out, orderFromRow(r.Number, r.Address, r.WorkType, r.Client, r.Phone, r.TechnicianID, r.Executor, r.Date, r.Status, r.Comment))
	}
	return out, nil
}

func (s *Store) ListByTechnician(ctx context.Context, technicianID int64) ([]*domain.WorkOrder, error) {
	rows, err := s.q.ListOrdersByTechnician(ctx, &technicianID)
	if err != nil {
		return nil, fmt.Errorf("list orders by technician: %w", err)
	}
	out := make([]*domain.WorkOrder, 0, len(rows))
	for _, r := range rows {
		out = append(out, orderFromRow(r.Number, r.Address, r.WorkType, r.Client, r.Phone, r.TechnicianID, r.Executor, r.Date, r.Status, r.Comment))
	}
	return out, nil
}

func (s *Store) Get(ctx context.Context, number string) (*domain.WorkOrder, error) {
	r, err := s.q.GetOrder(ctx, number)
	if err != nil {
		return nil, parseError(err)
	}
	return orderFromRow(r.Number, r.Address, r.WorkType, r.Client, r.Phone, r.TechnicianID, r.Executor, r.Date, r.Status, r.Comment), nil
}

func (s *Store) Create(ctx context.Context, o *domain.WorkOrder) (*domain.WorkOrder, error) {
	r, err := s.q.CreateOrder(ctx, sqlc.CreateOrderParams{
		Number:       o.ID,
		Address:      o.Address,
		WorkType:     o.WorkType,
		Client:       o.Client,
		Phone:        o.Phone,
		TechnicianID: o.ExecutorID,
		Date:         dateToPg(o.Date),
		Status:       string(o.Status),
		Comment:      o.Comment,
	})
	if err != nil {
		return nil, fmt.Errorf("create order: %w", err)
	}
	// CreateOrder не делает JOIN — дочитываем с именем исполнителя.
	return s.Get(ctx, r.Number)
}

func (s *Store) Update(ctx context.Context, o *domain.WorkOrder) (*domain.WorkOrder, error) {
	r, err := s.q.UpdateOrder(ctx, sqlc.UpdateOrderParams{
		Number:       o.ID,
		TechnicianID: o.ExecutorID,
		Status:       string(o.Status),
	})
	if err != nil {
		return nil, parseError(err)
	}
	return s.Get(ctx, r.Number)
}

func (s *Store) NextNumber(ctx context.Context) (string, error) {
	n, err := s.q.NextOrderNumber(ctx)
	if err != nil {
		return "", fmt.Errorf("next order number: %w", err)
	}
	return n, nil
}

// ─── Монтажники ───────────────────────────────────────────────────────────────

func (s *Store) ListTechnicians(ctx context.Context) ([]*domain.Technician, error) {
	rows, err := s.q.ListTechnicians(ctx)
	if err != nil {
		return nil, fmt.Errorf("list technicians: %w", err)
	}
	out := make([]*domain.Technician, 0, len(rows))
	for _, r := range rows {
		out = append(out, technicianFromModel(r))
	}
	return out, nil
}

func (s *Store) ListActiveTechnicians(ctx context.Context) ([]*domain.Technician, error) {
	rows, err := s.q.ListActiveTechnicians(ctx)
	if err != nil {
		return nil, fmt.Errorf("list active technicians: %w", err)
	}
	out := make([]*domain.Technician, 0, len(rows))
	for _, r := range rows {
		out = append(out, technicianFromModel(r))
	}
	return out, nil
}

func (s *Store) GetTechnician(ctx context.Context, id int64) (*domain.Technician, error) {
	r, err := s.q.GetTechnician(ctx, id)
	if err != nil {
		return nil, parseError(err)
	}
	return technicianFromModel(r), nil
}

func (s *Store) CreateTechnician(ctx context.Context, in domain.TechnicianCreate) (*domain.Technician, error) {
	r, err := s.q.CreateTechnician(ctx, sqlc.CreateTechnicianParams{
		FullName: in.FullName,
		Phone:    in.Phone,
	})
	if err != nil {
		return nil, fmt.Errorf("create technician: %w", err)
	}
	return technicianFromModel(r), nil
}

func (s *Store) UpdateTechnician(ctx context.Context, id int64, in domain.TechnicianUpdate) (*domain.Technician, error) {
	r, err := s.q.UpdateTechnician(ctx, sqlc.UpdateTechnicianParams{
		FullName: in.FullName,
		Phone:    in.Phone,
		Active:   in.Active,
		ID:       id,
	})
	if err != nil {
		return nil, parseError(err)
	}
	return technicianFromModel(r), nil
}

func (s *Store) DeleteTechnician(ctx context.Context, id int64) error {
	if err := s.q.DeleteTechnician(ctx, id); err != nil {
		return parseError(err)
	}
	return nil
}

func (s *Store) CountOrdersByTechnician(ctx context.Context, id int64) (int, error) {
	n, err := s.q.CountOrdersByTechnician(ctx, &id)
	if err != nil {
		return 0, fmt.Errorf("count orders by technician: %w", err)
	}
	return int(n), nil
}

// ─── Пользователи ─────────────────────────────────────────────────────────────

func (s *Store) GetUserByLogin(ctx context.Context, login string) (*domain.User, string, error) {
	r, err := s.q.GetUserByLogin(ctx, login)
	if err != nil {
		return nil, "", parseError(err)
	}
	return &domain.User{
		ID:           r.ID,
		Login:        r.Login,
		FullName:     r.FullName,
		Role:         domain.Role(r.Role),
		TechnicianID: r.TechnicianID,
	}, r.PasswordHash, nil
}

func (s *Store) GetUserByID(ctx context.Context, id int64) (*domain.User, error) {
	r, err := s.q.GetUserByID(ctx, id)
	if err != nil {
		return nil, parseError(err)
	}
	return &domain.User{
		ID:           r.ID,
		Login:        r.Login,
		FullName:     r.FullName,
		Role:         domain.Role(r.Role),
		TechnicianID: r.TechnicianID,
	}, nil
}

// ─── Отчёты ───────────────────────────────────────────────────────────────────

func (s *Store) OrdersSummary(ctx context.Context, dateFrom, dateTo string) (domain.ReportSummary, error) {
	r, err := s.q.OrdersSummaryByPeriod(ctx, sqlc.OrdersSummaryByPeriodParams{
		DateFrom: dateToPg(dateFrom),
		DateTo:   dateToPg(dateTo),
	})
	if err != nil {
		return domain.ReportSummary{}, fmt.Errorf("orders summary: %w", err)
	}
	return domain.ReportSummary{
		Total:     int(r.Total),
		Done:      int(r.Done),
		InWork:    int(r.Inwork),
		Cancelled: int(r.Cancelled),
		Created:   int(r.Created),
		Assigned:  int(r.Assigned),
	}, nil
}

func (s *Store) LoadByTechnician(ctx context.Context, dateFrom, dateTo string) ([]domain.TechLoad, error) {
	rows, err := s.q.LoadByTechnician(ctx, sqlc.LoadByTechnicianParams{
		DateFrom: dateToPg(dateFrom),
		DateTo:   dateToPg(dateTo),
	})
	if err != nil {
		return nil, fmt.Errorf("load by technician: %w", err)
	}
	out := make([]domain.TechLoad, 0, len(rows))
	for _, r := range rows {
		out = append(out, domain.TechLoad{
			TechnicianID: r.ID,
			FullName:     r.FullName,
			Total:        int(r.Total),
			Done:         int(r.Done),
			InWork:       int(r.Inwork),
		})
	}
	return out, nil
}

// parseError сопоставляет ошибки pgx доменным.
func parseError(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}
	return err
}
