create table if not exists public.author_badges (
  id uuid primary key default gen_random_uuid(),
  author_handle text not null,
  badge_slug text not null references public.badges(slug) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (author_handle, badge_slug)
);

create index if not exists author_badges_author_idx on public.author_badges(author_handle);
create index if not exists author_badges_badge_idx on public.author_badges(badge_slug);

alter table public.author_badges enable row level security;

drop policy if exists "author_badges public read" on public.author_badges;
create policy "author_badges public read"
  on public.author_badges for select
  using (true);

create or replace function public.refresh_author_badges(p_author_handle text)
returns void
language plpgsql
security definer
as $$
declare
  v_handle text := lower(trim(coalesce(p_author_handle, '')));
  v_total_community int := 0;
  v_sobremesas_count int := 0;
  v_lanches_count int := 0;
  v_bebidas_count int := 0;
  v_sobremesas_avg numeric := 0;
  v_lanches_avg numeric := 0;
  v_bebidas_avg numeric := 0;
  v_sobremesas_ratings int := 0;
  v_lanches_ratings int := 0;
  v_bebidas_ratings int := 0;
begin
  if v_handle = '' then
    return;
  end if;

  select count(*)
    into v_total_community
  from public.recipes_br r
  where r.is_published = true
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%';

  select count(*) into v_sobremesas_count
  from public.recipes_br r
  where r.is_published = true
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%'
    and r.category = 'sobremesas';

  select count(*) into v_lanches_count
  from public.recipes_br r
  where r.is_published = true
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%'
    and r.category = 'lanches';

  select count(*) into v_bebidas_count
  from public.recipes_br r
  where r.is_published = true
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%'
    and r.category = 'bebidas';

  select coalesce(avg(rt.rating), 0), count(rt.id)
    into v_sobremesas_avg, v_sobremesas_ratings
  from public.recipes_br r
  left join public.recipe_ratings rt on rt.recipe_id = r.id
  where r.is_published = true
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%'
    and r.category = 'sobremesas';

  select coalesce(avg(rt.rating), 0), count(rt.id)
    into v_lanches_avg, v_lanches_ratings
  from public.recipes_br r
  left join public.recipe_ratings rt on rt.recipe_id = r.id
  where r.is_published = true
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%'
    and r.category = 'lanches';

  select coalesce(avg(rt.rating), 0), count(rt.id)
    into v_bebidas_avg, v_bebidas_ratings
  from public.recipes_br r
  left join public.recipe_ratings rt on rt.recipe_id = r.id
  where r.is_published = true
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%'
    and r.category = 'bebidas';

  if v_total_community >= 5 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'chef')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'chef';
  end if;

  if v_sobremesas_count >= 3 and v_sobremesas_ratings >= 5 and v_sobremesas_avg >= 4.5 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'chef_confeiteiro')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'chef_confeiteiro';
  end if;

  if v_lanches_count >= 3 and v_lanches_ratings >= 5 and v_lanches_avg >= 4.5 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'mestre_dos_lanches')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'mestre_dos_lanches';
  end if;

  if v_bebidas_count >= 3 and v_bebidas_ratings >= 5 and v_bebidas_avg >= 4.5 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'rei_das_bebidas')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'rei_das_bebidas';
  end if;
end;
$$;

grant execute on function public.refresh_author_badges(text) to anon, authenticated, service_role;
