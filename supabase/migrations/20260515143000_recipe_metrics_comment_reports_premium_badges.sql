insert into public.badges (slug, name, description, icon)
values
  ('premium_temai', 'Premium TemAi', 'Assinatura Premium ativa.', 'sparkles'),
  ('chef_ia', 'Chef IA', 'Gerou 10 receitas com IA.', 'wand'),
  ('colecionador_receitas', 'Colecionador de Receitas', 'Salvou 10 receitas.', 'bookmark'),
  ('autor_organizado', 'Autor Organizado', 'Organizou 3 receitas autorais com IA.', 'mic')
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    icon = excluded.icon;

create table if not exists public.recipe_view_events (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes_br(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  visitor_key text not null default '',
  viewed_on date not null default current_date,
  created_at timestamptz not null default now(),
  constraint recipe_view_events_identity_check check (user_id is not null or length(trim(visitor_key)) >= 12)
);

create unique index if not exists recipe_view_events_user_day_unique
on public.recipe_view_events(recipe_id, user_id, viewed_on)
where user_id is not null;

create unique index if not exists recipe_view_events_visitor_day_unique
on public.recipe_view_events(recipe_id, visitor_key, viewed_on)
where user_id is null;

create index if not exists recipe_view_events_recipe_idx
on public.recipe_view_events(recipe_id, created_at desc);

alter table public.recipe_view_events enable row level security;

drop policy if exists "recipe_view_events service role access" on public.recipe_view_events;
create policy "recipe_view_events service role access"
on public.recipe_view_events for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create table if not exists public.recipe_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.recipe_comments(id) on delete cascade,
  recipe_id uuid not null references public.recipes_br(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  detail text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint recipe_comment_reports_reason_check check (reason in ('inappropriate', 'harassment', 'spam', 'dangerous', 'other')),
  constraint recipe_comment_reports_status_check check (status in ('open', 'reviewed', 'dismissed'))
);

create unique index if not exists recipe_comment_reports_unique_user_comment
on public.recipe_comment_reports(comment_id, user_id);

create index if not exists recipe_comment_reports_comment_status_idx
on public.recipe_comment_reports(comment_id, status, created_at desc);

alter table public.recipe_comment_reports enable row level security;

drop policy if exists "recipe_comment_reports service role access" on public.recipe_comment_reports;
create policy "recipe_comment_reports service role access"
on public.recipe_comment_reports for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create or replace function public.refresh_personal_badges(p_user_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_premium boolean := false;
  v_ai_generations int := 0;
  v_saved_count int := 0;
  v_author_polish_count int := 0;
  v_badges text[] := array[]::text[];
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  select exists (
    select 1
    from public.user_subscriptions s
    where s.user_id = p_user_id
      and s.plan = 'premium'
      and coalesce(s.status, 'active') = 'active'
      and (s.current_period_end is null or s.current_period_end >= now())
  ) into v_is_premium;

  select count(*)::int
    into v_ai_generations
  from public.ai_usage_events e
  where e.user_id = p_user_id
    and e.bucket = 'recipe_ai'
    and e.feature = 'suggestions';

  select count(*)::int
    into v_saved_count
  from public.saved_recipes s
  where s.user_id = p_user_id;

  select count(*)::int
    into v_author_polish_count
  from public.ai_usage_events e
  where e.user_id = p_user_id
    and e.bucket = 'recipe_ai'
    and e.feature = 'author_recipe';

  if v_is_premium then
    insert into public.user_badges(user_id, badge_id)
    select p_user_id, b.id
    from public.badges b
    where b.slug = 'premium_temai'
    on conflict (user_id, badge_id) do nothing;
  else
    delete from public.user_badges ub
    using public.badges b
    where ub.badge_id = b.id
      and ub.user_id = p_user_id
      and b.slug = 'premium_temai';
  end if;

  if v_ai_generations >= 10 then
    insert into public.user_badges(user_id, badge_id)
    select p_user_id, b.id
    from public.badges b
    where b.slug = 'chef_ia'
    on conflict (user_id, badge_id) do nothing;
  end if;

  if v_saved_count >= 10 then
    insert into public.user_badges(user_id, badge_id)
    select p_user_id, b.id
    from public.badges b
    where b.slug = 'colecionador_receitas'
    on conflict (user_id, badge_id) do nothing;
  end if;

  if v_author_polish_count >= 3 then
    insert into public.user_badges(user_id, badge_id)
    select p_user_id, b.id
    from public.badges b
    where b.slug = 'autor_organizado'
    on conflict (user_id, badge_id) do nothing;
  end if;

  select coalesce(array_agg(distinct b.slug order by b.slug), array[]::text[])
    into v_badges
  from public.user_badges ub
  join public.badges b on b.id = ub.badge_id
  where ub.user_id = p_user_id;

  return v_badges;
end;
$$;

revoke all on function public.refresh_personal_badges(uuid) from public, anon, authenticated;
grant execute on function public.refresh_personal_badges(uuid) to service_role;
