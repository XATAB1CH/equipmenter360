-- +goose Up
-- +goose StatementBegin
create table work_orders
(
    id         bigserial primary key,
    number     text        not null unique,             -- номер наряда «00142»
    address    text        not null,
    work_type  text        not null,
    client     text        not null,
    phone      text        not null,
    executor   text,                                   -- ФИО монтажника, null = не назначен
    date       date        not null,                    -- дата создания
    status     text        not null default 'created'
        constraint work_orders_status_check
            check (status in ('created', 'assigned', 'inwork', 'done', 'cancelled')),
    comment    text        not null default '',
    created_at timestamptz not null default now()
);

create index work_orders_number_idx on work_orders (number desc);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
drop table work_orders;
-- +goose StatementEnd
