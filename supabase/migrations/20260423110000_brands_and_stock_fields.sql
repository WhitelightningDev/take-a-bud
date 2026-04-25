-- Take A Bud: brands + richer product/stock fields

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prevent duplicates (case-insensitive) while still allowing renames
create unique index if not exists brands_name_unique_ci on public.brands (lower(name));

drop trigger if exists set_brands_updated_at on public.brands;
create trigger set_brands_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

alter table public.brands enable row level security;

drop policy if exists "Brands are viewable by everyone" on public.brands;
create policy "Brands are viewable by everyone"
on public.brands
for select
using (true);

drop policy if exists "Brands are insertable by admins" on public.brands;
create policy "Brands are insertable by admins"
on public.brands
for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "Brands are updatable by admins" on public.brands;
create policy "Brands are updatable by admins"
on public.brands
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Brands are deletable by admins" on public.brands;
create policy "Brands are deletable by admins"
on public.brands
for delete
using (public.is_admin(auth.uid()));

-- Seed brands from the old brand_logos table when present
insert into public.brands (name, logo_url, active)
select bl.name, bl.image_url, bl.active
from public.brand_logos bl
on conflict (lower(name)) do nothing;

-- Ensure the original defaults exist even if brand_logos doesn't
insert into public.brands (name, logo_url, active)
values
  ('Lifted', '/brands/lifted.png', true),
  ('Awaken Distillates', '/brands/awaken.png', true)
on conflict (lower(name)) do nothing;

-- Products: turn into richer "stock items"
alter table public.products
  add column if not exists brand_id uuid null,
  add column if not exists strain_type text null,
  add column if not exists consumption_method text null,
  add column if not exists stock_qty integer not null default 0;

alter table public.products
  drop constraint if exists products_stock_qty_nonneg,
  add constraint products_stock_qty_nonneg check (stock_qty >= 0);

alter table public.products
  drop constraint if exists products_strain_type_check,
  add constraint products_strain_type_check
    check (strain_type is null or strain_type in ('sativa', 'indica', 'hybrid'));

alter table public.products
  drop constraint if exists products_consumption_method_check,
  add constraint products_consumption_method_check
    check (consumption_method is null or consumption_method in ('smokable', 'edible', 'dab'));

alter table public.products
  drop constraint if exists products_brand_id_fkey,
  add constraint products_brand_id_fkey
    foreign key (brand_id)
    references public.brands (id)
    on delete set null;
