-- Отчёты за период (по дате создания наряда).

-- name: OrdersSummaryByPeriod :one
-- Счётчики по статусам за период. Границы: [date_from, date_to] включительно.
select
    count(*) filter (where true)                    as total,
    count(*) filter (where status = 'done')         as done,
    count(*) filter (where status = 'inwork')       as inwork,
    count(*) filter (where status = 'cancelled')    as cancelled,
    count(*) filter (where status = 'created')      as created,
    count(*) filter (where status = 'assigned')     as assigned
from work_orders
where date between sqlc.arg(date_from)::date and sqlc.arg(date_to)::date;

-- name: LoadByTechnician :many
-- Загрузка монтажников за период.
select
    t.id,
    t.full_name,
    count(wo.*)                                   as total,
    count(wo.*) filter (where wo.status = 'done')   as done,
    count(wo.*) filter (where wo.status = 'inwork') as inwork
from technicians t
join work_orders wo on wo.technician_id = t.id
    and wo.date between sqlc.arg(date_from)::date and sqlc.arg(date_to)::date
group by t.id, t.full_name
order by t.full_name;
