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
    values ('linkedin_alert', 'dismiss-check', 'Test Co', 'Test role', 'https://example.invalid/r', 'open') returning id into rid;

  -- another signed in user can neither see nor change the role
  perform set_config('request.jwt.claims', json_build_object('sub', intruder, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.roles set dismissed_at = now() where id = rid; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL intruder dismissed a role'; end if;
  reset role;

  -- the owner can dismiss it, but cannot change anything else about it
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.roles set dismissed_at = now() where id = rid; get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL owner could not dismiss a role'; end if;
  begin update public.roles set title = 'Changed' where id = rid; raise exception 'FAIL owner changed the title';
  exception when insufficient_privilege then null; end;
  reset role;

  select count(*) into n from public.roles where id = rid and dismissed_at is not null and title = 'Test role';
  if n <> 1 then raise exception 'FAIL the role did not end up dismissed and unchanged'; end if;
end $$;
rollback;
