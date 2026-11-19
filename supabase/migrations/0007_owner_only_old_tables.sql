-- The first three tables let any signed in user in. With a public website that is not enough: only the owner may read
-- roles and collection runs, and only the owner may manage applications. The collector uses the service role and is unaffected.
drop policy "owner reads roles" on public.roles;
drop policy "owner reads runs" on public.source_runs;
drop policy "owner manages applications" on public.applications;

create policy "owner reads roles" on public.roles for select to authenticated using (public.is_owner());
create policy "owner reads runs" on public.source_runs for select to authenticated using (public.is_owner());
create policy "owner manages applications" on public.applications
  for all to authenticated using (public.is_owner()) with check (public.is_owner());
