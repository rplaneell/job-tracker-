-- Job tracker schema. Single user app: every table is locked down by row level security,
-- and only a logged in session (the owner) may read or write. The collector uses the
-- service role key, which bypasses row level security by design and must stay secret.

create extension if not exists pgcrypto;

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id text not null,
  company text not null,
  title text not null,
  url text not null default '',
  location_raw text not null default '',
  city text,
  country text,
  remote boolean,
  description text not null default '',
  posted_at timestamptz,
  field_tag text,
  level_tag text,
  matched boolean not null default false,
  status text not null default 'open' check (status in ('open', 'closed')),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (source, source_id)
);
create index roles_first_seen_idx on public.roles (first_seen desc);
create index roles_matched_idx on public.roles (matched, status);

create table public.applications (
  role_id uuid primary key references public.roles (id) on delete cascade,
  stage text not null default 'saved'
    check (stage in ('saved', 'applied', 'assessment', 'interview', 'offer', 'rejected')),
  notes text not null default '',
  assessment_type text,
  applied_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.source_runs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  ran_at timestamptz not null default now(),
  ok boolean not null,
  role_count integer not null default 0,
  error text
);
create index source_runs_name_idx on public.source_runs (source_name, ran_at desc);

alter table public.roles enable row level security;
alter table public.applications enable row level security;
alter table public.source_runs enable row level security;

create policy "owner reads roles" on public.roles for select to authenticated using (true);
create policy "owner reads runs" on public.source_runs for select to authenticated using (true);
create policy "owner manages applications" on public.applications
  for all to authenticated using (true) with check (true);
