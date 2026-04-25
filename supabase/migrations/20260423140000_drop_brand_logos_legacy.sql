-- Take A Bud: remove legacy brand_logos table (replaced by brands)

-- Migrate any remaining rows into brands
insert into public.brands (name, logo_url, active)
select bl.name, bl.image_url, bl.active
from public.brand_logos bl
on conflict (lower(name)) do update set
  logo_url = excluded.logo_url,
  active = excluded.active;

drop table if exists public.brand_logos;
