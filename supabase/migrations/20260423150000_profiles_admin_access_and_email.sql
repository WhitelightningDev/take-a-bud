-- Take A Bud: allow admins to manage users and store email on profiles

alter table public.profiles
  add column if not exists email text;

-- Backfill existing emails (best-effort)
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

-- Keep profile email in sync on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted boolean := coalesce((new.raw_user_meta_data->>'accepted_regulations')::boolean, false);
  accepted_at timestamptz := null;
begin
  if accepted then
    accepted_at := now();
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    id_number,
    address,
    accepted_regulations,
    accepted_regulations_at
  )
  values (
    new.id,
    new.email,
    nullif(coalesce(new.raw_user_meta_data->>'full_name', ''), ''),
    nullif(coalesce(new.raw_user_meta_data->>'first_name', ''), ''),
    nullif(coalesce(new.raw_user_meta_data->>'last_name', ''), ''),
    nullif(coalesce(new.raw_user_meta_data->>'id_number', ''), ''),
    nullif(coalesce(new.raw_user_meta_data->>'address', ''), ''),
    accepted,
    accepted_at
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    id_number = excluded.id_number,
    address = excluded.address,
    accepted_regulations = excluded.accepted_regulations,
    accepted_regulations_at = excluded.accepted_regulations_at;

  return new;
end;
$$;

-- Admin visibility + management for profiles
drop policy if exists "Profiles are viewable by admins" on public.profiles;
create policy "Profiles are viewable by admins"
on public.profiles
for select
using (public.is_admin(auth.uid()));

drop policy if exists "Profiles are updatable by admins" on public.profiles;
create policy "Profiles are updatable by admins"
on public.profiles
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
