alter table public.recipe_ratings
  drop constraint if exists recipe_ratings_rating_check;

alter table public.recipe_ratings
  add constraint recipe_ratings_rating_check
  check (rating >= 0.5 and rating <= 5 and mod((rating * 10)::int, 5) = 0);

update public.recipe_ratings
set user_id = substring(user_fingerprint from '^user:([0-9a-fA-F-]{36})$')::uuid
where user_id is null
  and user_fingerprint ~ '^user:[0-9a-fA-F-]{36}$';

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
  ),
  rating_stats as (
    select
      recipe_id,
      round((avg(rating) * 2)::numeric, 1) as rating_average,
      count(*)::bigint as rating_count
    from public.recipe_ratings
    group by recipe_id
  ),
  view_stats as (
    select
      recipe_id,
      count(*)::bigint as view_count
    from public.recipe_view_events
    group by recipe_id
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
    coalesce(rs.rating_average, 0)::numeric as rating_average,
    coalesce(rs.rating_count, 0)::bigint as rating_count,
    coalesce(vs.view_count, 0)::bigint as view_count
  from public.recipes_br r
  left join rating_stats rs on rs.recipe_id = r.id
  left join view_stats vs on vs.recipe_id = r.id
  where r.is_published = true
    and r.moderation_status = 'approved'
  order by
    coalesce(vs.view_count, 0) desc,
    coalesce(rs.rating_average, 0) desc,
    coalesce(rs.rating_count, 0) desc,
    r.created_at desc
  limit (select value from safe_limit);
$$;

revoke all on function public.get_popular_recipes_br(int) from public, anon, authenticated;
grant execute on function public.get_popular_recipes_br(int) to service_role;
