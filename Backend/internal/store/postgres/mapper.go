package postgres

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/antondemidov/montazh360/internal/domain"
)

// orderFromRow собирает доменный наряд из колонок строки sqlc.
// Принимает значения по отдельности, чтобы один маппер подходил под
// все *Row-типы, которые генерирует sqlc (ListOrdersRow, GetOrderRow и т.д.).
func orderFromRow(number, address, workType, client, phone string, executor *string, date pgtype.Date, status, comment string) *domain.WorkOrder {
	return &domain.WorkOrder{
		ID:       number,
		Address:  address,
		WorkType: workType,
		Client:   client,
		Phone:    phone,
		Executor: executor,
		Date:     dateFromPg(date),
		Status:   domain.Status(status),
		Comment:  comment,
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
