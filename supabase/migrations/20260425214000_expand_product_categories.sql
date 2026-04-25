-- Take A Bud: expand product categories for broader catalog grouping

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
      'edibles',
      'beverages',
      'smokables',
      'vape',
      'concentrate',
      'other'
    )
  );
