-- +goose Up
-- +goose StatementBegin
-- Связываем наряды с монтажниками по FK.
alter table work_orders add column technician_id bigint;

-- Переносим executor (ФИО) -> technician_id по совпадению имени.
update work_orders wo
set technician_id = t.id
from technicians t
where wo.executor = t.full_name;

-- Заменяем текстовую колонку на FK.
alter table work_orders drop column executor;
alter table work_orders
    add constraint work_orders_technician_fk
    foreign key (technician_id) references technicians (id) on delete restrict;
create index work_orders_technician_id_idx on work_orders (technician_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
alter table work_orders add column executor text;
update work_orders wo
set executor = t.full_name
from technicians t
where wo.technician_id = t.id;
alter table work_orders drop column technician_id;
-- +goose StatementEnd
