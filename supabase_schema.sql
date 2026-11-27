-- Схема базы данных для игры «Пиксельный фронт» в Supabase (PostgreSQL)
-- Выполните этот SQL в Supabase -> SQL Editor

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

create table if not exists public.parties (
  code text primary key,
  host_slug text not null,
  mode text not null default 'coop', -- 'coop' (союзники) | 'ffa' (каждый сам за себя)
  map_size integer not null default 0,
  diff integer not null default 1,
  status text not null default 'lobby', -- 'lobby' | 'playing' | 'ended'
  members jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id bigserial primary key,
  party_code text,
  mode text not null,
  winner_names text not null default '',
  duration_sec integer not null default 0,
  player_count integer not null default 1,
  created_at timestamptz not null default now()
);
