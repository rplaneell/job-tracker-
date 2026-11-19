-- The owner's career document: one private working document that any future session or agent (for example an interview
-- preparation agent) can pick up. Written only by the service role (the tools), readable only by the owner.
-- Every change is also kept as an append only revision, so nothing is ever silently lost or rewritten.

create function public.block_change() returns trigger
language plpgsql set search_path = ''
as $$ begin raise exception 'this table is append only'; end $$;

create table public.career_profile (
  id boolean primary key default true check (id), -- one document for now
  document text not null check (octet_length(document) <= 300000),
  revision int not null default 1,
  updated_at timestamptz not null default now()
);

create table public.career_profile_revisions (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  revision int not null,
  document text not null check (octet_length(document) <= 300000),
  note text not null default ''
);
create trigger career_profile_revisions_no_change before update or delete on public.career_profile_revisions
  for each row execute function public.block_change();
create trigger career_profile_revisions_no_truncate before truncate on public.career_profile_revisions
  for each statement execute function public.block_change();

alter table public.career_profile enable row level security;
alter table public.career_profile_revisions enable row level security;
create policy "owner reads the career profile" on public.career_profile for select to authenticated using (public.is_owner());
create policy "owner reads the revisions" on public.career_profile_revisions for select to authenticated using (public.is_owner());
-- No insert, update or delete policies: only the service role writes.
