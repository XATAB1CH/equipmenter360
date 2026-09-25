package postgres

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/antondemidov/montazh360/internal/domain"
	"github.com/antondemidov/montazh360/internal/store/postgres/sqlc"
)

// orderFromRow собирает доменный наряд из колонок строки sqlc.
func orderFromRow(number, address, workType, client, phone string, technicianID *int64, executor *string, date pgtype.Date, status, comment string) *domain.WorkOrder {
	return &domain.WorkOrder{
		ID:         number,
		Address:    address,
		WorkType:   workType,
		Client:     client,
		Phone:      phone,
		Executor:   executor,
		ExecutorID: technicianID,
		Date:       dateFromPg(date),
		Status:     domain.Status(status),
		Comment:    comment,
	}
}

// technicianFromModel маппит sqlc-модель монтажника в доменную.
func technicianFromModel(m *sqlc.Technician) *domain.Technician {
	return &domain.Technician{
		ID:        m.ID,
		FullName:  m.FullName,
		Phone:     m.Phone,
		Active:    m.Active,
		CreatedAt: m.CreatedAt.Time.Format("2006-01-02"),
	}
}

// dateFromPg конвертирует pgtype.Date в строку YYYY-MM-DD.
func dateFromPg(d pgtype.Date) string {
	if !d.Valid {
		return ""
	}
	return d.Time.Format("2006-01-02")
}

// dateToPg конвертирует строку YYYY-MM-DD в pgtype.Date.
func dateToPg(s string) pgtype.Date {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return pgtype.Date{}
	}
	return pgtype.Date{Time: t, Valid: true}
}
