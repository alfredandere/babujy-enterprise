create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Kids Wear', 'Pullnecks', 'Nutrition')),
  price numeric(10, 2) not null check (price > 0),
  image text not null default '',
  description text not null default '',
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.admin_users to authenticated;

alter table public.products enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "Anyone can view products" on public.products;
create policy "Anyone can view products"
  on public.products for select to anon, authenticated
  using (true);

drop policy if exists "Admins can add products" on public.products;
create policy "Admins can add products"
  on public.products for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can edit products" on public.products;
create policy "Admins can edit products"
  on public.products for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can view their own admin record" on public.admin_users;
create policy "Admins can view their own admin record"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "Anyone can view product images" on storage.objects;
create policy "Anyone can view product images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

insert into public.products (name, category, price, image, description, featured)
select seed.name, seed.category, seed.price, seed.image, seed.description, seed.featured
from (values
  ('Little Explorer Hoodie', 'Kids Wear', 1800::numeric, 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=80', 'A cosy everyday hoodie for little adventures.', true),
  ('Everyday Kids Pullneck', 'Pullnecks', 2200::numeric, 'https://images.unsplash.com/photo-1503919005314-30d93d07d823?auto=format&fit=crop&w=900&q=80', 'A soft, warm pullneck made for school days and weekends.', true),
  ('Colour Pop Kids Set', 'Kids Wear', 2500::numeric, 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=900&q=80', 'A playful, comfortable outfit set for everyday wear.', true),
  ('Classic Ribbed Pullneck', 'Pullnecks', 2800::numeric, 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=80', 'A timeless ribbed knit layer with a comfortable fit.', true),
  ('Mini Weekend Outfit', 'Kids Wear', 2100::numeric, 'https://images.unsplash.com/photo-1503919005314-30d93d07d823?auto=format&fit=crop&w=900&q=80', 'An easy-to-style outfit for little ones on the go.', false),
  ('Junior Growth Blend', 'Nutrition', 3200::numeric, 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80', 'A carefully selected nutrition product for family wellbeing.', false),
  ('Daily Wellness Mix', 'Nutrition', 2600::numeric, 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80', 'A convenient daily nutrition blend for a balanced routine.', false),
  ('Cozy Stripe Pullneck', 'Pullnecks', 2400::numeric, 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80', 'A soft striped pullneck that layers easily through the season.', false)
) as seed(name, category, price, image, description, featured)
where not exists (
  select 1 from public.products product where product.name = seed.name
);
