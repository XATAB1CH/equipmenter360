-- name: ListOrders :many
select number, address, work_type, client, phone, executor, date, status, comment
from work_orders
order by number desc;

-- name: GetOrder :one
select number, address, work_type, client, phone, executor, date, status, comment
from work_orders
where number = sqlc.arg(number);

-- name: CreateOrder :one
insert into work_orders (number, address, work_type, client, phone, executor, date, status, comment)
values (sqlc.arg(number),
        sqlc.arg(address),
        sqlc.arg(work_type),
        sqlc.arg(client),
        sqlc.arg(phone),
        sqlc.narg(executor),
        sqlc.arg(date),
        sqlc.arg(status),
        sqlc.arg(comment))
returning number, address, work_type, client, phone, executor, date, status, comment;

-- name: UpdateOrder :one
update work_orders
set executor = sqlc.narg(executor),
    status   = sqlc.arg(status)
where number = sqlc.arg(number)
returning number, address, work_type, client, phone, executor, date, status, comment;

-- name: NextOrderNumber :one
-- Следующий номер наряда: max(number)+1 с zero-pad до 5 знаков.
select lpad((coalesce(max(number)::int, 0) + 1)::text, 5, '0') as next_number
from work_orders;
