package domain

// Role — роль пользователя.
type Role string

const (
	RoleDispatcher Role = "dispatcher" // диспетчер — полный доступ
	RoleMontazhnik Role = "montazhnik" // монтажник — свои наряды
)

// Valid сообщает, является ли значение допустимой ролью.
func (r Role) Valid() bool {
	return r == RoleDispatcher || r == RoleMontazhnik
}

// User — пользователь системы (без пароля, для выдачи наружу).
type User struct {
	ID           int64  `json:"id"`
	Login        string `json:"login"`
	FullName     string `json:"fullName"`
	Role         Role   `json:"role"`
	TechnicianID *int64 `json:"technicianId"` // для роли montazhnik
}

// Credentials — логин/пароль для входа.
type Credentials struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}
