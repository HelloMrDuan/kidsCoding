create table if not exists ai_runtime_settings (
  setting_key text primary key,
  default_provider_slot text not null check (default_provider_slot in ('primary', 'secondary')),
  default_model text not null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id) on delete set null
);
