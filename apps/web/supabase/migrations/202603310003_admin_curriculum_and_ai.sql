alter table if exists lesson_configs
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

create table if not exists lesson_publications (
  lesson_id text primary key,
  phase text not null,
  mode text not null,
  sort_order integer not null,
  title text not null,
  goal text not null,
  payload jsonb not null,
  published_at timestamptz not null default timezone('utc', now()),
  published_by uuid references auth.users(id) on delete set null
);

create table if not exists lesson_publication_backups (
  lesson_id text primary key,
  phase text not null,
  mode text not null,
  sort_order integer not null,
  title text not null,
  goal text not null,
  payload jsonb not null,
  source_published_at timestamptz,
  backed_up_at timestamptz not null default timezone('utc', now()),
  backed_up_by uuid references auth.users(id) on delete set null
);

create table if not exists launch_curriculum_skeletons (
  lesson_id text primary key,
  stage text not null,
  lesson_objective text not null,
  new_concepts jsonb not null,
  depends_on jsonb not null,
  child_outcome text not null,
  difficulty_level integer not null,
  generated_at timestamptz not null default timezone('utc', now())
);
