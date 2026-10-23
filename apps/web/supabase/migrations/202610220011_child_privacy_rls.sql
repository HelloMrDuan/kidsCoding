-- TQ-013: children's privacy hardening for the initial / family-launch tables.
--
-- 1. Row level security on every table created before RLS was standard in this repo.
--    * Child data tables: the signed-in parent (auth.uid() = owner) may only READ their own
--      rows; all writes go through server routes with the service-role client
--      (bind-account, checkout, payment webhooks), which bypasses RLS.
--    * guest_snapshots: RLS on, NO anon/authenticated policy and no grants => service role only
--      (/api/guest and /api/bind-account use createAdminClient()).
--    * Admin/config tables: RLS on, no policy => service role only (all access is via
--      createAdminClient() in admin routes and the curriculum loader).
-- 2. Scrub assessment answers already stored in guest_snapshots (no longer uploaded).
-- 3. Retention: purge_stale_guest_snapshots() deletes guest snapshots not updated for 30 days.
--    The kc_guest_id cookie lives 30 days from first sync, so such rows are unreachable anyway.
--    Scheduling: see docs/roadmap/evidence/TQ-013/privacy-review.md (pg_cron when available,
--    otherwise a daily service-role job calling this function).
-- Real Supabase environment verification is CLOUD-103; this file is also exercised against a
-- disposable PostgreSQL in CI by apps/web/scripts/child-privacy-rls.sql.

-- ---------- child data tables: owner read-only ----------
alter table public.child_profiles enable row level security;
alter table public.progress_records enable row level security;
alter table public.badge_records enable row level security;
alter table public.card_records enable row level security;
alter table public.project_snapshots enable row level security;
alter table public.orders enable row level security;
alter table public.entitlements enable row level security;

revoke all on public.child_profiles, public.progress_records, public.badge_records,
  public.card_records, public.project_snapshots, public.orders, public.entitlements
  from public, anon, authenticated;
grant select on public.child_profiles, public.progress_records, public.badge_records,
  public.card_records, public.project_snapshots, public.orders, public.entitlements
  to authenticated;

create policy "child_profiles_read_own" on public.child_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "progress_records_read_own" on public.progress_records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "badge_records_read_own" on public.badge_records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "card_records_read_own" on public.card_records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "project_snapshots_read_own" on public.project_snapshots
  for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy "orders_read_own" on public.orders
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "entitlements_read_own" on public.entitlements
  for select to authenticated using ((select auth.uid()) = user_id);

-- ---------- service-role only ----------
alter table public.guest_snapshots enable row level security;
alter table public.lesson_configs enable row level security;
alter table public.remedial_lesson_configs enable row level security;
alter table public.audio_asset_configs enable row level security;
alter table public.lesson_publications enable row level security;
alter table public.lesson_publication_backups enable row level security;
alter table public.launch_curriculum_skeletons enable row level security;
alter table public.ai_runtime_settings enable row level security;
alter table public.admin_bootstrap_events enable row level security;

revoke all on public.guest_snapshots, public.lesson_configs, public.remedial_lesson_configs,
  public.audio_asset_configs, public.lesson_publications, public.lesson_publication_backups,
  public.launch_curriculum_skeletons, public.ai_runtime_settings, public.admin_bootstrap_events
  from public, anon, authenticated;

-- ---------- minimal collection: drop answers already uploaded ----------
update public.guest_snapshots
  set onboarding = onboarding - 'answers'
  where onboarding ? 'answers';

-- ---------- retention ----------
create index if not exists guest_snapshots_updated_at_idx
  on public.guest_snapshots (updated_at);

create or replace function public.purge_stale_guest_snapshots(retention_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  if retention_days is null or retention_days < 1 then
    raise exception 'retention_days must be >= 1';
  end if;
  delete from public.guest_snapshots
    where updated_at < timezone('utc', now()) - make_interval(days => retention_days);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_stale_guest_snapshots(integer) from public, anon, authenticated;

-- Schedule daily at 03:17 UTC when pg_cron is installed (Supabase: enable the extension in the
-- dashboard first). Without pg_cron this block is a no-op; run the function from a daily job.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge-stale-guest-snapshots',
      '17 3 * * *',
      'select public.purge_stale_guest_snapshots(30)'
    );
  end if;
end;
$$;
