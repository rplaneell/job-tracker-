-- Runs in one transaction that always rolls back. Passes silently; any failed expectation raises an error naming it.
begin;
do $$
declare
  owner_id uuid := (select user_id from public.owners limit 1);
  intruder uuid := gen_random_uuid();
  rid uuid;
  n int;
begin
  insert into auth.users (id, instance_id, aud, role, email)
    values (intruder, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'intruder@example.invalid');
  insert into public.roles (source, source_id, company, title, url, status)
    values ('test', 'owner-only-check', 'Test Co', 'Test role', 'https://example.invalid/r', 'open') returning id into rid;
  insert into public.source_runs (source_name, ok, role_count) values ('test', true, 1);
  insert into public.applications (role_id) values (rid);

  -- another signed in user sees nothing and can change nothing
  perform set_config('request.jwt.claims', json_build_object('sub', intruder, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.roles where source = 'test';      if n <> 0 then raise exception 'FAIL intruder reads roles'; end if;
  select count(*) into n from public.source_runs where source_name = 'test'; if n <> 0 then raise exception 'FAIL intruder reads source_runs'; end if;
  select count(*) into n from public.applications;                     if n <> 0 then raise exception 'FAIL intruder reads applications'; end if;
  update public.applications set role_id = role_id; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL intruder changed applications'; end if;
  begin insert into public.applications (role_id) values (rid); raise exception 'FAIL intruder added an application';
  exception when insufficient_privilege or check_violation then null; end;
  reset role;

  -- the owner still reads everything and manages applications
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.roles where source = 'test';      if n <> 1 then raise exception 'FAIL owner cannot read roles'; end if;
  select count(*) into n from public.source_runs where source_name = 'test'; if n <> 1 then raise exception 'FAIL owner cannot read source_runs'; end if;
  select count(*) into n from public.applications;                     if n <> 1 then raise exception 'FAIL owner cannot read applications'; end if;
  update public.applications set role_id = role_id; get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL owner cannot change applications'; end if;
  reset role;
end $$;
rollback;
select 'passed' as result;
