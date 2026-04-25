-- Take A Bud: initial schema for profiles + products

create extension if not exists "pgcrypto";

-- Helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = uid and is_admin = true
  );
$$;

create or replace function public.guard_profile_admin()
returns trigger
language plpgsql
as $$
begin
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

drop trigger if exists guard_profiles_admin on public.profiles;
create trigger guard_profiles_admin
before insert or update on public.profiles
for each row execute function public.guard_profile_admin();

-- Create profile automatically when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(coalesce(new.raw_user_meta_data->>'full_name', ''), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles
for insert
with check (auth.uid() = id);

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.products enable row level security;

drop policy if exists "Products are viewable by everyone" on public.products;
create policy "Products are viewable by everyone"
on public.products
for select
using (true);

drop policy if exists "Products are insertable by admins" on public.products;
create policy "Products are insertable by admins"
on public.products
for insert
with check (public.is_admin(auth.uid()));

drop policy if exists "Products are updatable by admins" on public.products;
create policy "Products are updatable by admins"
on public.products
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Products are deletable by admins" on public.products;
create policy "Products are deletable by admins"
on public.products
for delete
using (public.is_admin(auth.uid()));
