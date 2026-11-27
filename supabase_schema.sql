-- Схема базы данных для игры «Пиксельный фронт» в Supabase (PostgreSQL)
-- Выполните этот SQL в Supabase -> SQL Editor
-- Работает с обычным публичным ключом (ANON KEY), SERVICE_ROLE_KEY не требуется!

create table if not exists public.players (
  slug text primary key,
  name text not null,
  salt text not null,
  password_hash text not null,
  coins integer not null default 0,
  rating integer not null default 0,
  wins integer not null default 0,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_players_rating on public.players (rating desc);

-- Отключаем RLS и выдаём права роли anon, чтобы всё работало по обычному ANON_KEY
alter table public.players disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.players to anon, authenticated;
