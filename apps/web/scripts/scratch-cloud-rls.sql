\set ON_ERROR_STOP on
-- Disposable PostgreSQL test environment with Supabase's auth.uid() contract.
create schema auth;
create role authenticated nologin;
create role anon nologin;
grant usage on schema public, auth to authenticated;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant execute on function auth.uid() to authenticated;
insert into auth.users(id) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
\ir ../supabase/migrations/202610100010_scratch_private_drafts.sql
-- A writes their own project using the actual RLS policy.
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
insert into public.scratch_practice_drafts (user_id,lesson_id,archive_base64)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','G3-U1-L02',repeat('A',400));
do $$
begin
  if (select count(*) from public.scratch_practice_drafts) <> 1 then
    raise exception 'Account A cannot read its own draft';
  end if;
end $$;
reset role;
-- B cannot read or mutate A, but can store a separate B project.
set role authenticated;
set request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$
declare blocked boolean:=false; changed integer;
begin
  if exists(select 1 from public.scratch_practice_drafts) then
    raise exception 'RLS leaked account A archive to B';
  end if;
  begin
    insert into public.scratch_practice_drafts(user_id,lesson_id,archive_base64)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','G3-U1-L02',repeat('B',400));
  exception when insufficient_privilege then blocked:=true;
  end;
  if not blocked then raise exception 'B forged A user_id insert'; end if;
  update public.scratch_practice_drafts set archive_base64=repeat('C',400)
    where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  get diagnostics changed=row_count;
  if changed<>0 then raise exception 'B modified account A archive'; end if;
end $$;
insert into public.scratch_practice_drafts (user_id,lesson_id,archive_base64)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','G3-U1-L02',repeat('B',400));
do $$
begin
  if (select count(*) from public.scratch_practice_drafts) <> 1 then
    raise exception 'Account B does not see exactly its own project';
  end if;
end $$;
reset role;
do $$
begin
  if has_table_privilege('anon','public.scratch_practice_drafts','SELECT') then
    raise exception 'anon still has read privilege';
  end if;
end $$;
