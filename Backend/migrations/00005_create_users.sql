-- +goose Up
-- +goose StatementBegin
create table users
(
    id            bigserial primary key,
    login         text        not null unique,
    password_hash text        not null,             -- bcrypt
    full_name     text        not null,
    role          text        not null
        constraint users_role_check check (role in ('dispatcher', 'montazhnik')),
    technician_id bigint references technicians (id) on delete set null,  -- для роли montazhnik
    created_at    timestamptz not null default now()
);

-- Сид-пользователи (пароль — bcrypt от «password»; сменить в проде!).
-- dispatcher / password — полный доступ
-- ivanov / password — монтажник, привязан к technicians.full_name = 'Иванов А.С.'
insert into users (login, password_hash, full_name, role, technician_id)
values
    ('dispatcher',
     '$2a$10$vaNbPmJabawD8fHqi68Mu.7gcuAb4n3ye4UbJM6k.XO2H27y7DnkG',
     'Диспетчер', 'dispatcher', null),
    ('ivanov',
     '$2a$10$vaNbPmJabawD8fHqi68Mu.7gcuAb4n3ye4UbJM6k.XO2H27y7DnkG',
     'Иванов А.С.', 'montazhnik',
     (select id from technicians where full_name = 'Иванов А.С.' limit 1));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
drop table users;
-- +goose StatementEnd
