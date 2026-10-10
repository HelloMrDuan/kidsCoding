-- Private drafts only; never store client-claimed scores as certified progress.
create table if not exists public.python_practice_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check (lesson_id in ('P0-U1-L02', 'P0-U1-L03')),
  source text not null check (char_length(source) <= 5000),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.python_practice_drafts enable row level security;

revoke all on public.python_practice_drafts from anon;
grant select, insert, update, delete on public.python_practice_drafts to authenticated;

create policy "practice_drafts_read_own"
  on public.python_practice_drafts
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "practice_drafts_insert_own"
  on public.python_practice_drafts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "practice_drafts_update_own"
  on public.python_practice_drafts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "practice_drafts_delete_own"
  on public.python_practice_drafts
  for delete to authenticated
  using ((select auth.uid()) = user_id);
