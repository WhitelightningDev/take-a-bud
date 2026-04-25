-- Take A Bud: allow service role / SQL editor to set profiles.is_admin
--
-- The original guard prevented users from granting themselves admin.
-- However, it also blocks updates performed by the Supabase SQL editor
-- (auth.uid() is null there) and by service-role scripts.

create or replace function public.guard_profile_admin()
returns trigger
language plpgsql
as $$
begin
  -- Allow privileged contexts (service role key / SQL editor).
  if auth.role() = 'service_role' or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  -- Prevent users from granting themselves admin via client-side inserts/updates.
  if (tg_op = 'INSERT') then
    if new.is_admin is true and not public.is_admin(auth.uid()) then
      new.is_admin = false;
    end if;
  elsif (tg_op = 'UPDATE') then
    if new.is_admin is distinct from old.is_admin and not public.is_admin(auth.uid()) then
      new.is_admin = old.is_admin;
    end if;
  end if;

  return new;
end;
$$;
