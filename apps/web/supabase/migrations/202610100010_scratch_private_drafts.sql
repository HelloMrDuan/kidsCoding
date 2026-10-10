-- Scratch project bytes only, not verified scores or arbitrary user-owned public files.
-- Archive is base64 text for the current single lesson (<5MB .sb3).
create table public.scratch_practice_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check (lesson_id = 'G3-U1-L02'),
  archive_base64 text not null check (char_length(archive_base64) between 400 and 6666668),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.scratch_practice_drafts enable row level security;
revoke all on public.scratch_practice_drafts from public, anon;
grant select, insert, update, delete on public.scratch_practice_drafts to authenticated;
create policy "scratch_read_own" on public.scratch_practice_drafts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "scratch_insert_own" on public.scratch_practice_drafts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "scratch_update_own" on public.scratch_practice_drafts
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "scratch_delete_own" on public.scratch_practice_drafts
  for delete to authenticated using ((select auth.uid()) = user_id);
