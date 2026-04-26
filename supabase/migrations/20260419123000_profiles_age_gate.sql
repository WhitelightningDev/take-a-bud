-- Enforce 18+ based on South African ID number (YYMMDDxxxxxxx)
-- Defensive server-side rule so the client check cannot be bypassed.

create or replace function public.is_za_id_18_plus(id_number text)
returns boolean
language plpgsql
stable
as $$
declare
  clean_id text;
  yy int;
  mm int;
  dd int;
  current_yy int := extract(year from current_date)::int % 100;
  full_year int;
  dob date;
begin
  if id_number is null or trim(id_number) = '' then
    return true;
  end if;

  clean_id := regexp_replace(id_number, '\s+', '', 'g');

  if clean_id !~ '^[0-9]{13}$' then
    return false;
  end if;

  yy := substring(clean_id from 1 for 2)::int;
  mm := substring(clean_id from 3 for 2)::int;
  dd := substring(clean_id from 5 for 2)::int;

  full_year := case
    when yy <= current_yy then 2000 + yy
    else 1900 + yy
  end;

  begin
    dob := make_date(full_year, mm, dd);
  exception when others then
    return false;
  end;

  return dob <= (current_date - interval '18 years')::date;
end;
$$;

create or replace function public.guard_profile_age_18()
returns trigger
language plpgsql
as $$
begin
  if new.id_number is not null and not public.is_za_id_18_plus(new.id_number) then
    raise exception 'You must be 18+ to use Take A Bud.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profiles_age_18 on public.profiles;

create trigger guard_profiles_age_18
before insert or update on public.profiles
for each row
execute function public.guard_profile_age_18();