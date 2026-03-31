create table if not exists lesson_configs (
  id text primary key,
  phase text not null,
  mode text not null,
  sort_order integer not null,
  title text not null,
  goal text not null,
  payload jsonb not null,
  published_at timestamptz
);

create table if not exists remedial_lesson_configs (
  id text primary key,
  title text not null,
  focus text not null,
  payload jsonb not null
);

create table if not exists audio_asset_configs (
  id text primary key,
  lesson_id text not null,
  usage_type text not null,
  provider text not null,
  asset_url text not null
);

create table if not exists project_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_guest_id uuid,
  owner_user_id uuid references auth.users(id) on delete cascade,
  lesson_id text not null,
  snapshot jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists project_snapshots_user_lesson_idx
  on project_snapshots (owner_user_id, lesson_id)
  where owner_user_id is not null;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_session_id text not null unique,
  status text not null,
  product_code text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null,
  status text not null,
  granted_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists entitlements_user_product_idx
  on entitlements (user_id, product_code);
