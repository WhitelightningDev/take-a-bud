-- Take A Bud: featured landing items + members-only catalog

alter table public.products
  add column if not exists category text not null default 'other',
  add column if not exists featured_on_landing boolean not null default false;

alter table public.products
  drop constraint if exists products_category_check,
  add constraint products_category_check check (
    category in (
      'caps',
      'shirts',
      'apparel',
      'accessory',
      'flower',
      'edible',
      'vape',
      'concentrate',
      'other'
    )
  );

-- Replace the public read policy with:
-- - Everyone can see featured landing items
-- - Only signed-in users can see the full catalog
drop policy if exists "Products are viewable by everyone" on public.products;
drop policy if exists "Products are viewable by signed-in users or featured" on public.products;
create policy "Products are viewable by signed-in users or featured"
on public.products
for select
using (auth.uid() is not null or featured_on_landing = true);
