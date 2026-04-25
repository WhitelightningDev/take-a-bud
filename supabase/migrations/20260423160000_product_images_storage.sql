-- Take A Bud: storage bucket + policies for product images

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Product images are uploadable by admins" on storage.objects;
create policy "Product images are uploadable by admins"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and public.is_admin(auth.uid())
);

drop policy if exists "Product images are updatable by admins" on storage.objects;
create policy "Product images are updatable by admins"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and public.is_admin(auth.uid())
)
with check (
  bucket_id = 'product-images'
  and public.is_admin(auth.uid())
);

drop policy if exists "Product images are deletable by admins" on storage.objects;
create policy "Product images are deletable by admins"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and public.is_admin(auth.uid())
);
