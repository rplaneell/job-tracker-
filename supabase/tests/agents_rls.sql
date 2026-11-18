-- Run inside one transaction that always rolls back, so it leaves nothing behind.
-- Passes silently. Any failed expectation raises an error that names it.
begin;
do $$
declare
  owner_id uuid := (select user_id from public.owners limit 1);
  intruder uuid := gen_random_uuid();
  n int;
begin
  insert into auth.users (id, instance_id, aud, role, email)
    values (intruder, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'intruder@example.invalid');
  insert into public.agents (id, name, version, instructions) values ('scout_test', 'Scout', 1, 'x');
  insert into public.agent_tasks (agent_id, kind, payload) values ('scout_test', 'review_new_roles', '{}');
  insert into public.audit_log (agent_id, action, detail) values ('scout_test', 'test', '{}');

  -- the owner can read
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.agent_tasks;
  if n < 1 then raise exception 'FAIL owner cannot read agent_tasks'; end if;
  select count(*) into n from public.roles;  -- old tables must still work for the owner
  reset role;

  -- a different signed in user sees nothing in any new table
  perform set_config('request.jwt.claims', json_build_object('sub', intruder, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.agents;        if n <> 0 then raise exception 'FAIL intruder reads agents'; end if;
  select count(*) into n from public.agent_tasks;   if n <> 0 then raise exception 'FAIL intruder reads agent_tasks'; end if;
  select count(*) into n from public.scout_verdicts; if n <> 0 then raise exception 'FAIL intruder reads scout_verdicts'; end if;
  select count(*) into n from public.audit_log;     if n <> 0 then raise exception 'FAIL intruder reads audit_log'; end if;
  reset role;

  -- the audit log cannot be changed or deleted, even by the all powerful role
  begin
    update public.audit_log set action = 'tampered';
    raise exception 'FAIL audit_log update was allowed';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    delete from public.audit_log;
    raise exception 'FAIL audit_log delete was allowed';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
rollback;
