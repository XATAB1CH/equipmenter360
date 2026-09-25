-- CRUD монтажников.

-- name: ListTechnicians :many
select id, full_name, phone, active, created_at
from technicians
order by full_name;

-- name: ListActiveTechnicians :many
-- Только действующие (для селекта назначения).
select id, full_name, phone, active, created_at
from technicians
where active = true
order by full_name;

-- name: GetTechnician :one
select id, full_name, phone, active, created_at
from technicians
where id = sqlc.arg(id);

-- name: CreateTechnician :one
insert into technicians (full_name, phone)
values (sqlc.arg(full_name), sqlc.arg(phone))
returning id, full_name, phone, active, created_at;

-- name: UpdateTechnician :one
update technicians
set full_name = coalesce(sqlc.narg(full_name), full_name),
    phone     = coalesce(sqlc.narg(phone), phone),
    active    = coalesce(sqlc.narg(active), active)
where id = sqlc.arg(id)
returning id, full_name, phone, active, created_at;

-- name: DeleteTechnician :exec
delete from technicians
where id = sqlc.arg(id);

-- name: CountOrdersByTechnician :one
-- Сколько нарядов ссылается на монтажника (для запрета удаления).
select count(*)
from work_orders
where technician_id = sqlc.arg(id);
