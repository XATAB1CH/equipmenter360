package httpserver

import (
	"context"
	"net/http"
	"strings"

	"github.com/antondemidov/montazh360/internal/auth"
	"github.com/antondemidov/montazh360/internal/domain"
)

// ctxKey — ключ контекста для пользователя.
type ctxKey string

const userKey ctxKey = "user"

// userFromContext достаёт пользователя из контекста (nil, если нет).
func userFromContext(ctx context.Context) *domain.User {
	u, _ := ctx.Value(userKey).(*domain.User)
	return u
}

// withUser кладёт пользователя в контекст.
func withUser(ctx context.Context, u *domain.User) context.Context {
	return context.WithValue(ctx, userKey, u)
}

// authMiddleware — проверяет JWT в заголовке Authorization: Bearer <token>.
// При валидном токене кладёт пользователя в контекст, иначе 401.
func authMiddleware(tm *auth.Manager, svc userGetter, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, ok := bearerToken(r)
		if !ok {
			writeError(w, domain.ErrUnauthorized)
			return
		}
		claims, err := tm.Parse(token)
		if err != nil {
			writeError(w, domain.ErrUnauthorized)
			return
		}
		user, err := svc.GetUser(r.Context(), claims.UserID)
		if err != nil {
			writeError(w, domain.ErrUnauthorized)
			return
		}
		next.ServeHTTP(w, r.WithContext(withUser(r.Context(), user)))
	})
}

// requireRole — ограничивает доступ к хендлеру указанными ролями.
func requireRole(roles ...domain.Role) func(http.Handler) http.Handler {
	allowed := make(map[domain.Role]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := userFromContext(r.Context())
			if user == nil || !allowed[user.Role] {
				writeError(w, domain.ErrForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// bearerToken извлекает токен из заголовка Authorization.
func bearerToken(r *http.Request) (string, bool) {
	h := r.Header.Get("Authorization")
	if h == "" {
		return "", false
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || parts[1] == "" {
		return "", false
	}
	return parts[1], true
}
