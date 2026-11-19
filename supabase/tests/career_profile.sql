-- Runs in one transaction that always rolls back. Passes silently; any failed expectation raises an error naming it.
begin;
do $$
declare
  owner_id uuid := (select user_id from public.owners limit 1);
  intruder uuid := gen_random_uuid();
  n int;
begin
  insert into auth.users (id, instance_id, aud, role, email)
    values (intruder, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'intruder@example.invalid');
  insert into public.career_profile (document) values ('# Test profile');
  insert into public.career_profile_revisions (revision, document, note) values (1, '# Test profile', 'first');

  -- the owner can read both, but cannot write them from the browser
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.career_profile;            if n <> 1 then raise exception 'FAIL owner cannot read career_profile'; end if;
  select count(*) into n from public.career_profile_revisions;  if n <> 1 then raise exception 'FAIL owner cannot read revisions'; end if;
  update public.career_profile set document = 'changed';  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL the browser changed the profile'; end if;
  begin insert into public.career_profile_revisions (revision, document) values (2, 'x'); raise exception 'FAIL the browser added a revision';
  exception when insufficient_privilege then null; end;
  reset role;

  -- revisions can never be changed or removed, even by the all powerful role
  begin update public.career_profile_revisions set note = 'tampered'; raise exception 'FAIL a revision was changed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin delete from public.career_profile_revisions; raise exception 'FAIL a revision was deleted';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;

  -- another signed in user sees nothing
  perform set_config('request.jwt.claims', json_build_object('sub', intruder, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.career_profile;            if n <> 0 then raise exception 'FAIL intruder reads career_profile'; end if;
  select count(*) into n from public.career_profile_revisions;  if n <> 0 then raise exception 'FAIL intruder reads revisions'; end if;
  reset role;
end $$;
rollback;
select 'passed' as result;
