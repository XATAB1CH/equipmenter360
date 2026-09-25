// Package store описывает хранилище нарядов за интерфейсом.
// Реализация — Postgres (internal/store/postgres) поверх sqlc.
package store

import (
	"context"

	"github.com/antondemidov/montazh360/internal/domain"
)

// Store — контракт хранилища нарядов.
type Store interface {
	// List возвращает все наряды, новые сверху (по убыванию номера).
	List(ctx context.Context) ([]*domain.WorkOrder, error)
	// Get возвращает наряд по номеру или domain.ErrNotFound.
	Get(ctx context.Context, number string) (*domain.WorkOrder, error)
	// Create сохраняет новый наряд и возвращает его.
	Create(ctx context.Context, o *domain.WorkOrder) (*domain.WorkOrder, error)
	// Update сохраняет изменения существующего наряда (исполнитель/статус),
	// либо domain.ErrNotFound.
	Update(ctx context.Context, o *domain.WorkOrder) (*domain.WorkOrder, error)
	// NextNumber возвращает следующий доступный номер наряда (zero-padded, 5 знаков).
	NextNumber(ctx context.Context) (string, error)
}
