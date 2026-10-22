\set ON_ERROR_STOP on
-- TQ-013: disposable PostgreSQL check of migration 202610220011_child_privacy_rls.sql.
-- Mimics Supabase's auth.uid()/roles. Real Supabase verification remains CLOUD-103.
create schema auth;
-- Roles are cluster-wide; CI may already have created them for scratch-cloud-rls.sql.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
end $$;
grant usage on schema public, auth to authenticated, anon;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant execute on function auth.uid() to authenticated, anon;
insert into auth.users(id) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
-- Pre-RLS schema exactly as shipped, then default grants like Supabase gives API roles.
\ir ../supabase/migrations/202603300001_initial.sql
\ir ../supabase/migrations/202603310002_family_launch.sql
\ir ../supabase/migrations/202603310003_admin_curriculum_and_ai.sql
\ir ../supabase/migrations/202604020004_ai_runtime_settings.sql
\ir ../supabase/migrations/202604020005_admin_bootstrap_events.sql
\ir ../supabase/migrations/202604020006_cn_payment_hardening.sql
grant all on all tables in schema public to anon, authenticated;
-- Data written by the service role (table owner here) before the migration.
insert into child_profiles(user_id,display_name,age_band,recommended_start_level) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','A','age_6_8','starter'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','B','age_9_12','foundation');
insert into progress_records(user_id,lesson_id,status) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','lesson-01-forest-hello','completed'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','lesson-01-forest-hello','completed');
insert into project_snapshots(owner_user_id,lesson_id,snapshot) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','lesson-03-forest-story','{"blocks":[]}'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','lesson-03-forest-story','{"blocks":[]}');
insert into guest_snapshots(guest_id,onboarding,progress,updated_at) values
 ('11111111-1111-4111-8111-111111111111','{"ageBand":"age_6_8","answers":[{"questionId":"q1"}]}','{}',now()),
 ('22222222-2222-4222-8222-222222222222','{"ageBand":"age_6_8"}','{}',now() - interval '31 days');
\ir ../supabase/migrations/202610220011_child_privacy_rls.sql

-- Every pre-existing table now has RLS.
do $$
declare missing text;
begin
  select string_agg(relname, ',') into missing from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if missing is not null then raise exception 'RLS missing on: %', missing; end if;
end $$;

-- A sees only A.
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$
begin
  if (select count(*) from child_profiles) <> 1 or (select display_name from child_profiles) <> 'A' then
    raise exception 'A child_profiles not owner-only';
  end if;
  if (select count(*) from progress_records) <> 1 then raise exception 'A progress leak'; end if;
  if (select count(*) from project_snapshots) <> 1 then raise exception 'A snapshot leak'; end if;
end $$;
-- A cannot write directly (writes are server/service-role only).
do $$
declare blocked boolean := false;
begin
  begin
    insert into progress_records(user_id,lesson_id,status)
      values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','lesson-02-forest-greeting','completed');
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'authenticated can insert progress directly'; end if;
end $$;
-- guest_snapshots is not readable by signed-in users.
do $$
declare blocked boolean := false;
begin
  begin
    perform 1 from guest_snapshots;
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'authenticated can read guest_snapshots'; end if;
end $$;
reset role;

-- B sees only B; no session sees nothing.
set role authenticated;
set request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$
begin
  if (select display_name from child_profiles) <> 'B' or (select count(*) from child_profiles) <> 1 then
    raise exception 'B sees other child profile';
  end if;
end $$;
reset role;
set role anon;
do $$
declare blocked boolean := false;
begin
  begin
    perform 1 from child_profiles;
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'anon can read child_profiles'; end if;
  blocked := false;
  begin
    insert into guest_snapshots(guest_id,onboarding,progress)
      values ('33333333-3333-4333-8333-333333333333','{}','{}');
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'anon can write guest_snapshots'; end if;
end $$;
reset role;

-- Answers scrubbed; retention purge removes only stale rows; API roles cannot call it.
do $$
begin
  if exists (select 1 from guest_snapshots where onboarding ? 'answers') then
    raise exception 'assessment answers not scrubbed';
  end if;
  if public.purge_stale_guest_snapshots(30) <> 1 then raise exception 'purge count wrong'; end if;
  if (select count(*) from guest_snapshots) <> 1 then raise exception 'fresh guest row deleted'; end if;
  if has_function_privilege('authenticated','public.purge_stale_guest_snapshots(integer)','EXECUTE')
     or has_function_privilege('anon','public.purge_stale_guest_snapshots(integer)','EXECUTE') then
    raise exception 'API roles may call purge';
  end if;
end $$;
\echo 'child privacy RLS verified'
