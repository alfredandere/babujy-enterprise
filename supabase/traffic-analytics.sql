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

alter table public.website_page_views enable row level security;
revoke all on table public.website_page_views from anon, authenticated;

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

revoke all on function public.record_website_page_view(uuid, text, text) from public;
grant execute on function public.record_website_page_view(uuid, text, text) to anon, authenticated;

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

revoke all on function public.get_website_traffic_summary(integer) from public;
revoke all on function public.get_website_traffic_summary(integer) from anon;
grant execute on function public.get_website_traffic_summary(integer) to authenticated;
