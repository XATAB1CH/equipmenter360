package domain

// ReportSummary — сводный отчёт за период.
type ReportSummary struct {
	Total     int              `json:"total"`
	Done      int              `json:"done"`
	InWork    int              `json:"inwork"`
	Cancelled int              `json:"cancelled"`
	Created   int              `json:"created"`
	Assigned  int              `json:"assigned"`
	ByTech    []TechLoad       `json:"byTechnician"`
}

// TechLoad — загрузка одного монтажника за период.
type TechLoad struct {
	TechnicianID int64  `json:"technicianId"`
	FullName     string `json:"fullName"`
	Total        int    `json:"total"`
	Done         int    `json:"done"`
	InWork       int    `json:"inwork"`
}
