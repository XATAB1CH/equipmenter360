-- Наряды. executor — ФИО монтажника через LEFT JOIN (null, если не назначен).

-- name: ListOrders :many
select wo.number, wo.address, wo.work_type, wo.client, wo.phone,
       wo.technician_id, t.full_name as executor,
       wo.date, wo.status, wo.comment
from work_orders wo
left join technicians t on t.id = wo.technician_id
order by wo.number desc;

-- name: GetOrder :one
select wo.number, wo.address, wo.work_type, wo.client, wo.phone,
       wo.technician_id, t.full_name as executor,
       wo.date, wo.status, wo.comment
from work_orders wo
left join technicians t on t.id = wo.technician_id
where wo.number = sqlc.arg(number);

-- name: CreateOrder :one
insert into work_orders (number, address, work_type, client, phone, technician_id, date, status, comment)
values (sqlc.arg(number),
        sqlc.arg(address),
        sqlc.arg(work_type),
        sqlc.arg(client),
        sqlc.arg(phone),
        sqlc.narg(technician_id),
        sqlc.arg(date),
        sqlc.arg(status),
        sqlc.arg(comment))
returning number, address, work_type, client, phone, technician_id, date, status, comment;

-- name: UpdateOrder :one
update work_orders
set technician_id = sqlc.narg(technician_id),
    status        = sqlc.arg(status)
where number = sqlc.arg(number)
returning number, address, work_type, client, phone, technician_id, date, status, comment;

-- name: NextOrderNumber :one
-- Следующий номер наряда: max(number)+1 с zero-pad до 5 знаков.
select lpad((coalesce(max(number)::int, 0) + 1)::text, 5, '0') as next_number
from work_orders;

-- name: ListOrdersByTechnician :many
-- Наряды конкретного монтажника (для роли montazhnik).
select wo.number, wo.address, wo.work_type, wo.client, wo.phone,
       wo.technician_id, t.full_name as executor,
       wo.date, wo.status, wo.comment
from work_orders wo
left join technicians t on t.id = wo.technician_id
where wo.technician_id = sqlc.narg(technician_id)
order by wo.number desc;
