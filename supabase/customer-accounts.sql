alter table public.products drop constraint if exists products_category_check;

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

grant select, insert, update on public.customer_profiles to authenticated;
grant select, insert, update on public.customer_carts to authenticated;

alter table public.customer_profiles enable row level security;
alter table public.customer_carts enable row level security;

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
