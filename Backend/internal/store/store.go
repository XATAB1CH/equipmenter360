// Package store описывает хранилище за интерфейсом.
// Реализация — Postgres (internal/store/postgres) поверх sqlc.
package store

import (
	"context"

	"github.com/antondemidov/montazh360/internal/domain"
)

// Store — контракт хранилища.
type Store interface {
	// ─── Наряды ───
	// List возвращает все наряды, новые сверху.
	List(ctx context.Context) ([]*domain.WorkOrder, error)
	// ListByTechnician возвращает наряды конкретного монтажника.
	ListByTechnician(ctx context.Context, technicianID int64) ([]*domain.WorkOrder, error)
	// Get возвращает наряд по номеру или domain.ErrNotFound.
	Get(ctx context.Context, number string) (*domain.WorkOrder, error)
	// Create сохраняет новый наряд.
	Create(ctx context.Context, o *domain.WorkOrder) (*domain.WorkOrder, error)
	// Update сохраняет изменения (исполнитель/статус), либо domain.ErrNotFound.
	Update(ctx context.Context, o *domain.WorkOrder) (*domain.WorkOrder, error)
	// NextNumber возвращает следующий номер наряда (zero-padded, 5 знаков).
	NextNumber(ctx context.Context) (string, error)

	// ─── Монтажники ───
	ListTechnicians(ctx context.Context) ([]*domain.Technician, error)
	ListActiveTechnicians(ctx context.Context) ([]*domain.Technician, error)
	GetTechnician(ctx context.Context, id int64) (*domain.Technician, error)
	CreateTechnician(ctx context.Context, in domain.TechnicianCreate) (*domain.Technician, error)
	UpdateTechnician(ctx context.Context, id int64, in domain.TechnicianUpdate) (*domain.Technician, error)
	DeleteTechnician(ctx context.Context, id int64) error
	CountOrdersByTechnician(ctx context.Context, id int64) (int, error)

	// ─── Пользователи ───
	GetUserByLogin(ctx context.Context, login string) (*domain.User, string, error)
	GetUserByID(ctx context.Context, id int64) (*domain.User, error)

	// ─── Отчёты ───
	OrdersSummary(ctx context.Context, dateFrom, dateTo string) (domain.ReportSummary, error)
	LoadByTechnician(ctx context.Context, dateFrom, dateTo string) ([]domain.TechLoad, error)
}
