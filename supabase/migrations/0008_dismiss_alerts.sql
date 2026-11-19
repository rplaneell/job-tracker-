-- Lets the owner tick a LinkedIn alert as checked and remove it from the list.
-- The role is kept and only marked, so the next alert intake cannot bring it back. Only the owner can mark it, and only this one column.
alter table public.roles add column dismissed_at timestamptz;

-- Supabase lets signed in users update every column by default, so take that away first and allow this one column only.
revoke update on public.roles from authenticated, anon;
grant update (dismissed_at) on public.roles to authenticated;
create policy "owner dismisses roles" on public.roles for update to authenticated
  using (public.is_owner()) with check (public.is_owner());
