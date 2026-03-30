create extension if not exists pgcrypto;

create table if not exists guest_snapshots (
  guest_id uuid primary key,
  onboarding jsonb not null,
  progress jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists child_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  age_band text not null,
  recommended_start_level text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists progress_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  status text not null,
  stars integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists progress_records_user_lesson_idx
  on progress_records (user_id, lesson_id);

create table if not exists badge_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_type text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists badge_records_user_badge_idx
  on badge_records (user_id, badge_type);

create table if not exists card_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_definition_id text not null,
  source_type text not null,
  is_consumed boolean not null default false,
  reserved_for_redemption boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists card_records_user_card_source_idx
  on card_records (user_id, card_definition_id, source_type);
