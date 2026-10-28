-- CLOUD-105: guardian consent records for children's private works.
-- One row per account per scope; the account holder (guardian) grants it.
-- Consent is recorded, never a gate on saves or binding.
create table if not exists public.guardian_consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  granted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, scope)
);

alter table public.guardian_consents enable row level security;

grant select, insert, update, delete on public.guardian_consents to authenticated;

create policy "guardian_consents_select_own" on public.guardian_consents
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "guardian_consents_insert_own" on public.guardian_consents
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "guardian_consents_update_own" on public.guardian_consents
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "guardian_consents_delete_own" on public.guardian_consents
  for delete to authenticated using ((select auth.uid()) = user_id);
