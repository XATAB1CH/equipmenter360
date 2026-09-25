// Package auth реализует выпуск и проверку JWT для аутентификации.
package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/antondemidov/montazh360/internal/domain"
)

// Manager управляет JWT-токенами.
type Manager struct {
	secret []byte
	ttl    time.Duration
}

// NewManager создаёт менеджер с секретом и временем жизни токена.
func NewManager(secret string, ttl time.Duration) *Manager {
	return &Manager{secret: []byte(secret), ttl: ttl}
}

// Claims — полезная нагрузка токена.
type Claims struct {
	UserID       int64       `json:"uid"`
	Role         domain.Role `json:"role"`
	TechnicianID *int64      `json:"tid,omitempty"`
	jwt.RegisteredClaims
}

// Issue выпускает подписанный токен для пользователя.
func (m *Manager) Issue(user *domain.User) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:       user.ID,
		Role:         user.Role,
		TechnicianID: user.TechnicianID,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.Login,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(m.ttl)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(m.secret)
}

// Parse проверяет токен и возвращает claims.
func (m *Manager) Parse(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("неожиданный алгоритм подписи: %v", t.Header["alg"])
		}
		return m.secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("невалидный токен")
	}
	return claims, nil
}
