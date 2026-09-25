-- +goose Up
-- +goose StatementBegin
create table technicians
(
    id         bigserial primary key,
    full_name  text        not null,
    phone      text        not null default '',
    active     boolean     not null default true,   -- false = уволен (soft-delete)
    created_at timestamptz not null default now()
);

-- Наполняем из тех ФИО, что уже встречаются в нарядах, плюс известный справочник.
insert into technicians (full_name)
select distinct executor
from work_orders
where executor is not null
union
select t.name
from (values
    ('Иванов А.С.'), ('Петров Д.Н.'), ('Сидоров В.К.'), ('Козлов М.Р.'), ('Новиков Е.П.')
) as t(name)
on conflict do nothing;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
drop table technicians;
-- +goose StatementEnd
