create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

create or replace function public.temai_unaccent(value text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select unaccent('unaccent', coalesce(value, ''));
$$;

create or replace function public.temai_prefix_tsquery(value text)
returns tsquery
language sql
immutable
parallel safe
set search_path = public
as $$
  with tokens as (
    select distinct token
    from regexp_split_to_table(lower(public.temai_unaccent(coalesce(value, ''))), '[^[:alnum:]]+') as token
    where length(token) >= 2
  ),
  query_text as (
    select string_agg(quote_literal(token) || case when length(token) >= 4 then ':*' else '' end, ' & ') as value
    from tokens
  )
  select case
    when query_text.value is null or query_text.value = '' then null::tsquery
    else to_tsquery('portuguese', query_text.value)
  end
  from query_text;
$$;

alter table public.recipes_br
  add column if not exists search_vector tsvector;

create or replace function public.build_recipe_search_vector(
  p_title text,
  p_ingredients text[],
  p_category text
)
returns tsvector
language sql
immutable
parallel safe
set search_path = public
as $$
  select
    setweight(to_tsvector('portuguese', public.temai_unaccent(coalesce(p_title, ''))), 'A') ||
    setweight(to_tsvector('portuguese', public.temai_unaccent(array_to_string(coalesce(p_ingredients, '{}'::text[]), ' '))), 'B') ||
    setweight(to_tsvector('portuguese', public.temai_unaccent(coalesce(p_category, ''))), 'C');
$$;

create or replace function public.set_recipe_search_vector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_vector := public.build_recipe_search_vector(new.title, new.ingredients, new.category);
  return new;
end;
$$;

drop trigger if exists recipes_br_set_search_vector on public.recipes_br;
create trigger recipes_br_set_search_vector
before insert or update of title, ingredients, category on public.recipes_br
for each row
execute function public.set_recipe_search_vector();

update public.recipes_br
set search_vector = public.build_recipe_search_vector(title, ingredients, category)
where search_vector is null;

create index if not exists recipes_br_search_vector_idx
on public.recipes_br using gin(search_vector);

create index if not exists recipes_br_public_category_created_idx
on public.recipes_br(category, created_at desc)
where is_published = true and moderation_status = 'approved';

create table if not exists public.recipe_popularity_metrics (
  recipe_id uuid primary key references public.recipes_br(id) on delete cascade,
  rating_average numeric not null default 0,
  rating_count bigint not null default 0,
  view_count bigint not null default 0,
  refreshed_at timestamptz not null default now()
);

create index if not exists recipe_popularity_metrics_rank_idx
on public.recipe_popularity_metrics(view_count desc, rating_average desc, rating_count desc, refreshed_at desc);

alter table public.recipe_popularity_metrics enable row level security;

drop policy if exists "recipe_popularity_metrics service role access" on public.recipe_popularity_metrics;
create policy "recipe_popularity_metrics service role access"
on public.recipe_popularity_metrics for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create or replace function public.refresh_recipe_popularity_metric(p_recipe_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.recipe_popularity_metrics (
    recipe_id,
    rating_average,
    rating_count,
    view_count,
    refreshed_at
  )
  select
    r.id,
    coalesce(round((avg(rt.rating) * 2)::numeric, 1), 0)::numeric as rating_average,
    count(rt.id)::bigint as rating_count,
    (
      select count(*)::bigint
      from public.recipe_view_events v
      where v.recipe_id = r.id
    ) as view_count,
    now()
  from public.recipes_br r
  left join public.recipe_ratings rt on rt.recipe_id = r.id
  where r.id = p_recipe_id
  group by r.id
  on conflict (recipe_id) do update
  set rating_average = excluded.rating_average,
      rating_count = excluded.rating_count,
      view_count = excluded.view_count,
      refreshed_at = excluded.refreshed_at;
$$;

create or replace function public.refresh_recipe_popularity_metrics()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.recipe_popularity_metrics (
    recipe_id,
    rating_average,
    rating_count,
    view_count,
    refreshed_at
  )
  select
    r.id,
    coalesce(round((avg(rt.rating) * 2)::numeric, 1), 0)::numeric as rating_average,
    count(rt.id)::bigint as rating_count,
    coalesce(v.view_count, 0)::bigint as view_count,
    now()
  from public.recipes_br r
  left join public.recipe_ratings rt on rt.recipe_id = r.id
  left join (
    select recipe_id, count(*)::bigint as view_count
    from public.recipe_view_events
    group by recipe_id
  ) v on v.recipe_id = r.id
  group by r.id, v.view_count
  on conflict (recipe_id) do update
  set rating_average = excluded.rating_average,
      rating_count = excluded.rating_count,
      view_count = excluded.view_count,
      refreshed_at = excluded.refreshed_at;

  delete from public.recipe_popularity_metrics m
  where not exists (
    select 1
    from public.recipes_br r
    where r.id = m.recipe_id
  );
$$;

create or replace function public.search_recipes_br_v1(
  p_query text default '',
  p_category text default '',
  p_page int default 1,
  p_page_size int default 12,
  p_seed text default 'default-seed'
)
returns table (
  id uuid,
  slug text,
  title text,
  description text,
  category text,
  ingredients text[],
  steps text[],
  prep_minutes int,
  servings int,
  image_url text,
  source_name text,
  created_at timestamptz,
  total_count bigint
)
language sql
security definer
set search_path = public
as $$
  with safe_params as (
    select
      nullif(trim(coalesce(p_query, '')), '') as query,
      lower(nullif(trim(coalesce(p_category, '')), '')) as category,
      greatest(1, coalesce(p_page, 1)) as page,
      greatest(6, least(24, coalesce(p_page_size, 12))) as page_size,
      coalesce(nullif(trim(p_seed), ''), 'default-seed') as seed
  ),
  search_query as (
    select public.temai_prefix_tsquery(query) as tsq
    from safe_params
  ),
  matched as (
    select
      r.id,
      r.slug,
      r.title,
      r.description,
      r.category,
      r.ingredients,
      r.steps,
      r.prep_minutes,
      r.servings,
      r.image_url,
      r.source_name,
      r.created_at,
      case
        when sq.tsq is null then 0::real
        else ts_rank_cd(r.search_vector, sq.tsq)
      end as search_rank,
      hashtextextended((select seed from safe_params) || ':' || r.slug, 0) as stable_rank
    from public.recipes_br r
    cross join safe_params sp
    cross join search_query sq
    where r.is_published = true
      and r.moderation_status = 'approved'
      and (sp.category is null or sp.category = 'todas' or r.category = sp.category)
      and (sq.tsq is null or r.search_vector @@ sq.tsq)
      and (
        sp.category is distinct from 'veggie'
        or public.temai_unaccent(lower(r.title || ' ' || r.description || ' ' || array_to_string(r.ingredients, ' ')))
          !~ '(carne bovina|carne suina|frango|peixe|camarao|atum|salmao|bacalhau|linguica|presunto|bacon|chicken|beef|pork|fish|shrimp|tuna|salmon|ham|sausage|meat|seafood)'
      )
  ),
  ranked as (
    select matched.*, count(*) over() as total_count
    from matched
    order by search_rank desc, stable_rank asc, slug asc
    limit (select page_size from safe_params)
    offset ((select page - 1 from safe_params) * (select page_size from safe_params))
  )
  select
    ranked.id,
    ranked.slug,
    ranked.title,
    ranked.description,
    ranked.category,
    ranked.ingredients,
    ranked.steps,
    ranked.prep_minutes,
    ranked.servings,
    ranked.image_url,
    ranked.source_name,
    ranked.created_at,
    ranked.total_count
  from ranked;
$$;

create or replace function public.get_popular_recipes_br(p_limit int default 8)
returns table (
  id uuid,
  slug text,
  title text,
  description text,
  category text,
  ingredients text[],
  steps text[],
  prep_minutes int,
  servings int,
  image_url text,
  source_name text,
  created_at timestamptz,
  rating_average numeric,
  rating_count bigint,
  view_count bigint
)
language sql
security definer
set search_path = public
as $$
  with safe_limit as (
    select greatest(4, least(20, coalesce(p_limit, 8))) as value
  )
  select
    r.id,
    r.slug,
    r.title,
    r.description,
    r.category,
    r.ingredients,
    r.steps,
    r.prep_minutes,
    r.servings,
    r.image_url,
    r.source_name,
    r.created_at,
    coalesce(m.rating_average, 0)::numeric as rating_average,
    coalesce(m.rating_count, 0)::bigint as rating_count,
    coalesce(m.view_count, 0)::bigint as view_count
  from public.recipes_br r
  left join public.recipe_popularity_metrics m on m.recipe_id = r.id
  where r.is_published = true
    and r.moderation_status = 'approved'
  order by
    coalesce(m.view_count, 0) desc,
    coalesce(m.rating_average, 0) desc,
    coalesce(m.rating_count, 0) desc,
    r.created_at desc
  limit (select value from safe_limit);
$$;

create or replace function public.bump_recipe_view_metric()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.recipe_popularity_metrics (
    recipe_id,
    rating_average,
    rating_count,
    view_count,
    refreshed_at
  )
  values (new.recipe_id, 0, 0, 1, now())
  on conflict (recipe_id) do update
  set view_count = public.recipe_popularity_metrics.view_count + 1,
      refreshed_at = excluded.refreshed_at;

  return new;
end;
$$;

create or replace function public.refresh_recipe_metric_from_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipe_id uuid;
begin
  v_recipe_id := case when tg_op = 'DELETE' then old.recipe_id else new.recipe_id end;
  perform public.refresh_recipe_popularity_metric(v_recipe_id);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists recipe_view_events_bump_metric on public.recipe_view_events;
create trigger recipe_view_events_bump_metric
after insert on public.recipe_view_events
for each row
execute function public.bump_recipe_view_metric();

drop trigger if exists recipe_ratings_refresh_metric on public.recipe_ratings;
create trigger recipe_ratings_refresh_metric
after insert or update or delete on public.recipe_ratings
for each row
execute function public.refresh_recipe_metric_from_rating();

select public.refresh_recipe_popularity_metrics();

revoke all on function public.temai_unaccent(text) from public, anon, authenticated;
revoke all on function public.temai_prefix_tsquery(text) from public, anon, authenticated;
revoke all on function public.build_recipe_search_vector(text, text[], text) from public, anon, authenticated;
revoke all on function public.set_recipe_search_vector() from public, anon, authenticated;
revoke all on function public.refresh_recipe_popularity_metric(uuid) from public, anon, authenticated;
revoke all on function public.refresh_recipe_popularity_metrics() from public, anon, authenticated;
revoke all on function public.bump_recipe_view_metric() from public, anon, authenticated;
revoke all on function public.refresh_recipe_metric_from_rating() from public, anon, authenticated;
revoke all on function public.search_recipes_br_v1(text, text, int, int, text) from public, anon, authenticated;
revoke all on function public.get_popular_recipes_br(int) from public, anon, authenticated;

grant execute on function public.search_recipes_br_v1(text, text, int, int, text) to service_role;
grant execute on function public.get_popular_recipes_br(int) to service_role;
grant execute on function public.temai_unaccent(text) to service_role;
grant execute on function public.temai_prefix_tsquery(text) to service_role;
grant execute on function public.build_recipe_search_vector(text, text[], text) to service_role;
grant execute on function public.refresh_recipe_popularity_metric(uuid) to service_role;
grant execute on function public.refresh_recipe_popularity_metrics() to service_role;
