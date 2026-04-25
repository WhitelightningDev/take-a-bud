-- Add required profile fields for signup + consent tracking

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists id_number text,
  add column if not exists address text,
  add column if not exists accepted_regulations boolean not null default false,
  add column if not exists accepted_regulations_at timestamptz;

-- Update the signup trigger to capture structured metadata
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
    nullif(coalesce(new.raw_user_meta_data->>'full_name', ''), ''),
    nullif(coalesce(new.raw_user_meta_data->>'first_name', ''), ''),
    nullif(coalesce(new.raw_user_meta_data->>'last_name', ''), ''),
    nullif(coalesce(new.raw_user_meta_data->>'id_number', ''), ''),
    nullif(coalesce(new.raw_user_meta_data->>'address', ''), ''),
    accepted,
    accepted_at
  )
  on conflict (id) do update set
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

