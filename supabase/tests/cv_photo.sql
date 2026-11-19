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
  insert into public.cv_master (content) values ('{"name":"Test Person"}');

  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.cv_master set photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL owner cannot save a jpeg photo'; end if;
  begin update public.cv_master set photo = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='; raise exception 'FAIL an svg image was accepted';
  exception when check_violation then null; end;
  begin update public.cv_master set photo = 'javascript:alert(1)'; raise exception 'FAIL a javascript address was accepted';
  exception when check_violation then null; end;
  begin update public.cv_master set photo = 'data:image/jpeg;base64,' || repeat('A', 150001); raise exception 'FAIL an oversized photo was accepted';
  exception when check_violation then null; end;
  begin update public.cv_master set photo = 'data:image/jpeg;base64,abc"onerror="x'; raise exception 'FAIL a photo with quotes was accepted';
  exception when check_violation then null; end;
  update public.cv_master set photo = null;  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL owner cannot remove the photo'; end if;
  reset role;

  update public.cv_master set photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  perform set_config('request.jwt.claims', json_build_object('sub', intruder, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.cv_master where photo is not null;  if n <> 0 then raise exception 'FAIL intruder reads the photo'; end if;
  update public.cv_master set photo = null;  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL intruder changed the photo'; end if;
  reset role;
end $$;
rollback;
select 'passed' as result, (select count(*) from public.cv_master) as master_rows;
