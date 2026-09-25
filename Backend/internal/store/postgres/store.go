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

// Store — Postgres-хранилище нарядов.
type Store struct {
	q *sqlc.Queries
}

// NewStore создаёт хранилище поверх пула соединений.
func NewStore(db *pgxpool.Pool) *Store {
	return &Store{q: sqlc.New(db)}
}

func (s *Store) List(ctx context.Context) ([]*domain.WorkOrder, error) {
	rows, err := s.q.ListOrders(ctx)
	if err != nil {
		return nil, fmt.Errorf("list orders: %w", err)
	}

	out := make([]*domain.WorkOrder, 0, len(rows))
	for _, r := range rows {
		out = append(out, orderFromRow(r.Number, r.Address, r.WorkType, r.Client, r.Phone, r.Executor, r.Date, r.Status, r.Comment))
	}
	return out, nil
}

func (s *Store) Get(ctx context.Context, number string) (*domain.WorkOrder, error) {
	r, err := s.q.GetOrder(ctx, number)
	if err != nil {
		return nil, parseError(err)
	}
	return orderFromRow(r.Number, r.Address, r.WorkType, r.Client, r.Phone, r.Executor, r.Date, r.Status, r.Comment), nil
}

func (s *Store) Create(ctx context.Context, o *domain.WorkOrder) (*domain.WorkOrder, error) {
	r, err := s.q.CreateOrder(ctx, sqlc.CreateOrderParams{
		Number:   o.ID,
		Address:  o.Address,
		WorkType: o.WorkType,
		Client:   o.Client,
		Phone:    o.Phone,
		Executor: o.Executor,
		Date:     dateToPg(o.Date),
		Status:   string(o.Status),
		Comment:  o.Comment,
	})
	if err != nil {
		return nil, fmt.Errorf("create order: %w", err)
	}
	return orderFromRow(r.Number, r.Address, r.WorkType, r.Client, r.Phone, r.Executor, r.Date, r.Status, r.Comment), nil
}

func (s *Store) Update(ctx context.Context, o *domain.WorkOrder) (*domain.WorkOrder, error) {
	r, err := s.q.UpdateOrder(ctx, sqlc.UpdateOrderParams{
		Number:   o.ID,
		Executor: o.Executor,
		Status:   string(o.Status),
	})
	if err != nil {
		return nil, parseError(err)
	}
	return orderFromRow(r.Number, r.Address, r.WorkType, r.Client, r.Phone, r.Executor, r.Date, r.Status, r.Comment), nil
}

func (s *Store) NextNumber(ctx context.Context) (string, error) {
	n, err := s.q.NextOrderNumber(ctx)
	if err != nil {
		return "", fmt.Errorf("next order number: %w", err)
	}
	return n, nil
}

// parseError сопоставляет ошибки pgx доменным.
func parseError(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound
	}
	return err
}
