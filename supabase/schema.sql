create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric(10, 2) not null check (price > 0),
  image text not null default '',
  description text not null default '',
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.products drop constraint if exists products_category_check;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  delivery_address text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_carts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  updated_at timestamptz not null default now()
);

create table if not exists public.website_page_views (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  page_path text not null check (page_path ~ '^/[A-Za-z0-9/_-]{0,179}$'),
  referrer_host text not null default '' check (length(referrer_host) <= 253),
  created_at timestamptz not null default now()
);

create index if not exists website_page_views_created_at_idx
  on public.website_page_views (created_at);
create index if not exists website_page_views_page_path_created_at_idx
  on public.website_page_views (page_path, created_at);

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

create or replace function public.record_website_page_view(
  p_session_id uuid,
  p_page_path text,
  p_referrer_host text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_session_id is null
    or p_page_path is null
    or p_page_path !~ '^/[A-Za-z0-9/_-]{0,179}$'
    or p_page_path = '/admin'
    or p_page_path like '/admin/%'
  then
    raise exception 'Invalid page view data';
  end if;

  if p_referrer_host is null
    or length(p_referrer_host) > 253
    or p_referrer_host !~ '^[A-Za-z0-9.-]*$'
  then
    p_referrer_host := '';
  end if;

  if exists (
    select 1
    from public.website_page_views
    where session_id = p_session_id
      and page_path = p_page_path
      and created_at > now() - interval '30 seconds'
  ) then
    return;
  end if;

  insert into public.website_page_views (session_id, page_path, referrer_host)
  values (p_session_id, p_page_path, p_referrer_host);
end;
$$;

create or replace function public.get_website_traffic_summary(p_days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if coalesce(public.is_admin(), false) is not true then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_days is null or p_days not in (7, 30, 90) then
    raise exception 'Traffic period must be 7, 30, or 90 days';
  end if;

  select jsonb_build_object(
    'totalViews',
    count(*),
    'uniqueSessions',
    count(distinct session_id),
    'daily',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'date', to_char(day_series.day, 'YYYY-MM-DD'),
            'views', coalesce(daily.views, 0),
            'sessions', coalesce(daily.sessions, 0)
          )
          order by day_series.day
        ),
        '[]'::jsonb
      )
      from generate_series(
        current_date - (p_days - 1),
        current_date,
        interval '1 day'
      ) as day_series(day)
      left join (
        select
          created_at::date as visit_date,
          count(*) as views,
          count(distinct session_id) as sessions
        from public.website_page_views
        where created_at >= current_date - (p_days - 1)
          and created_at < current_date + interval '1 day'
        group by created_at::date
      ) as daily on daily.visit_date = day_series.day::date
    ),
    'topPages',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('path', popular.page_path, 'views', popular.views)
          order by popular.views desc, popular.page_path
        ),
        '[]'::jsonb
      )
      from (
        select page_path, count(*) as views
        from public.website_page_views
        where created_at >= current_date - (p_days - 1)
          and created_at < current_date + interval '1 day'
        group by page_path
        order by count(*) desc, page_path
        limit 10
      ) as popular
    ),
    'topSources',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('source', popular.referrer_host, 'views', popular.views)
          order by popular.views desc, popular.referrer_host
        ),
        '[]'::jsonb
      )
      from (
        select referrer_host, count(*) as views
        from public.website_page_views
        where created_at >= current_date - (p_days - 1)
          and created_at < current_date + interval '1 day'
          and referrer_host <> ''
        group by referrer_host
        order by count(*) desc, referrer_host
        limit 10
      ) as popular
    )
  )
  into result
  from public.website_page_views
  where created_at >= current_date - (p_days - 1)
    and created_at < current_date + interval '1 day';

  return result;
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
revoke all on table public.website_page_views from anon, authenticated;
revoke all on function public.record_website_page_view(uuid, text, text) from public;
grant execute on function public.record_website_page_view(uuid, text, text) to anon, authenticated;
revoke all on function public.get_website_traffic_summary(integer) from public;
revoke all on function public.get_website_traffic_summary(integer) from anon;
grant execute on function public.get_website_traffic_summary(integer) to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.admin_users to authenticated;
grant select, insert, update on public.customer_profiles to authenticated;
grant select, insert, update on public.customer_carts to authenticated;

alter table public.products enable row level security;
alter table public.admin_users enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.customer_carts enable row level security;
alter table public.website_page_views enable row level security;

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

drop policy if exists "Customers can view their own profile" on public.customer_profiles;
create policy "Customers can view their own profile"
  on public.customer_profiles for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Customers can create their own profile" on public.customer_profiles;
create policy "Customers can create their own profile"
  on public.customer_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Customers can update their own profile" on public.customer_profiles;
create policy "Customers can update their own profile"
  on public.customer_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Customers can view their own cart" on public.customer_carts;
create policy "Customers can view their own cart"
  on public.customer_carts for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Customers can create their own cart" on public.customer_carts;
create policy "Customers can create their own cart"
  on public.customer_carts for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Customers can update their own cart" on public.customer_carts;
create policy "Customers can update their own cart"
  on public.customer_carts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

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
