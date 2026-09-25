package domain

// Technician — монтажник.
type Technician struct {
	ID        int64  `json:"id"`
	FullName  string `json:"fullName"`
	Phone     string `json:"phone"`
	Active    bool   `json:"active"` // false = уволен (soft-delete)
	CreatedAt string `json:"createdAt"`
}

// TechnicianCreate — данные для создания монтажника.
type TechnicianCreate struct {
	FullName string `json:"fullName"`
	Phone    string `json:"phone"`
}

// TechnicianUpdate — данные для обновления монтажника.
// Поля-указатели: nil — не менять.
type TechnicianUpdate struct {
	FullName *string `json:"fullName"`
	Phone    *string `json:"phone"`
	Active   *bool   `json:"active"`
}
