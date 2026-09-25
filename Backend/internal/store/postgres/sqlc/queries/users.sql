-- Пользователи (аутентификация).

-- name: GetUserByLogin :one
select id, login, password_hash, full_name, role, technician_id
from users
where login = sqlc.arg(login);

-- name: GetUserByID :one
select id, login, password_hash, full_name, role, technician_id
from users
where id = sqlc.arg(id);
