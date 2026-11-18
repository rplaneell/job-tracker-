-- Runs in one transaction that always rolls back. Passes silently; any failed expectation raises an error naming it.
begin;
do $$
declare
  owner_id uuid := (select user_id from public.owners limit 1);
  intruder uuid := gen_random_uuid();
  r uuid;
  n int;
begin
  insert into auth.users (id, instance_id, aud, role, email)
    values (intruder, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'intruder@example.invalid');
  insert into public.roles (source, source_id, company, title) values ('cvtest', 'cvtest1', 'Acme', 'Analyst') returning id into r;
  insert into public.cv_master (content) values ('{"name":"Test Person"}');
  insert into public.cv_versions (role_id, content) values (r, '{"summary":"x"}');

  -- the owner can read and change the master, and read, approve and delete versions
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.cv_master;  if n <> 1 then raise exception 'FAIL owner cannot read cv_master'; end if;
  update public.cv_master set content = '{"name":"Changed"}';  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL owner cannot update cv_master'; end if;
  select count(*) into n from public.cv_versions;  if n <> 1 then raise exception 'FAIL owner cannot read cv_versions'; end if;
  update public.cv_versions set status = 'approved';  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL owner cannot approve a version'; end if;
  -- the owner can queue a tailoring task, but only exactly that kind of task
  insert into public.agent_tasks (agent_id, kind, status, payload) values ('cv', 'tailor_cv', 'queued', json_build_object('role_id', r)::jsonb);
  begin insert into public.agent_tasks (agent_id, kind) values ('scout', 'review_new_roles'); raise exception 'FAIL owner queued a scout task';
  exception when insufficient_privilege then null; end;
  begin insert into public.agent_tasks (agent_id, kind, status) values ('cv', 'tailor_cv', 'done'); raise exception 'FAIL owner inserted a finished task';
  exception when insufficient_privilege then null; end;
  begin insert into public.agent_tasks (agent_id, kind, claimed_at) values ('cv', 'tailor_cv', now()); raise exception 'FAIL owner inserted a claimed task';
  exception when insufficient_privilege then null; end;
  -- versions are written only by the tool (service role), never from the browser
  begin insert into public.cv_versions (role_id, content) values (r, '{}'); raise exception 'FAIL owner inserted a version directly';
  exception when insufficient_privilege then null; end;
  delete from public.cv_versions;  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL owner cannot delete a version'; end if;
  reset role;

  -- another signed in user sees and changes nothing
  insert into public.cv_versions (role_id, content) values (r, '{"summary":"y"}');
  perform set_config('request.jwt.claims', json_build_object('sub', intruder, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.cv_master;   if n <> 0 then raise exception 'FAIL intruder reads cv_master'; end if;
  select count(*) into n from public.cv_versions; if n <> 0 then raise exception 'FAIL intruder reads cv_versions'; end if;
  update public.cv_master set content = '{"name":"Hacked"}';  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL intruder changed cv_master'; end if;
  update public.cv_versions set status = 'approved';  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL intruder changed a version'; end if;
  delete from public.cv_versions;  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL intruder deleted a version'; end if;
  begin insert into public.agent_tasks (agent_id, kind, status) values ('cv', 'tailor_cv', 'queued'); raise exception 'FAIL intruder queued a tailoring task';
  exception when insufficient_privilege then null; end;
  reset role;
end $$;
rollback;
select 'passed' as result, (select count(*) from public.agent_tasks where kind = 'tailor_cv') as leftover_tasks, (select count(*) from public.roles where source = 'cvtest') as leftover_roles;
