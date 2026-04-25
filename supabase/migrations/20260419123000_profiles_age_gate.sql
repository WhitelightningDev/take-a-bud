-- Enforce 18+ based on South African ID number (YYMMDDxxxxxxxxx)
-- This is a defensive server-side rule so the client check can’t be bypassed.

create or replace function public.is_za_id_18_plus(id_number text)
returns boolean
language plpgsql
stable
as $$
declare
  yy int;
  mm int;
  dd int;
  current_yy int := extract(year from current_date)::int % 100;
  full_year int;
  dob date;
begin
  if id_number is null then
    return true;
  end if;

  if id_number !~ '^\\d{13}$' then
    return false;
  end if;

  yy := substring(id_number from 1 for 2)::int;
  mm := substring(id_number from 3 for 2)::int;
  dd := substring(id_number from 5 for 2)::int;
  full_year := case when yy <= current_yy then 2000 + yy else 1900 + yy end;

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
for each row execute function public.guard_profile_age_18();

