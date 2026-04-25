-- Take A Bud: brand logos for the landing page ("Brands we stock")

create table if not exists public.brand_logos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_brand_logos_updated_at on public.brand_logos;
create trigger set_brand_logos_updated_at
before update on public.brand_logos
for each row execute function public.set_updated_at();

alter table public.brand_logos enable row level security;

drop policy if exists "Brand logos are viewable by everyone" on public.brand_logos;
create policy "Brand logos are viewable by everyone"
on public.brand_logos
for select
using (true);

drop policy if exists "Brand logos are insertable by admins" on public.brand_logos;
create policy "Brand logos are insertable by admins"
on public.brand_logos
for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "Brand logos are updatable by admins" on public.brand_logos;
create policy "Brand logos are updatable by admins"
on public.brand_logos
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Brand logos are deletable by admins" on public.brand_logos;
create policy "Brand logos are deletable by admins"
on public.brand_logos
for delete
using (public.is_admin(auth.uid()));

-- Seed defaults matching the current static assets
insert into public.brand_logos (name, image_url, active)
select 'Lifted', '/brands/lifted.png', true
where not exists (
  select 1
  from public.brand_logos
  where name = 'Lifted' and image_url = '/brands/lifted.png'
);

insert into public.brand_logos (name, image_url, active)
select 'Awaken Distillates', '/brands/awaken.png', true
where not exists (
  select 1
  from public.brand_logos
  where name = 'Awaken Distillates' and image_url = '/brands/awaken.png'
);
