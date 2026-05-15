alter table public.recipes_br
  add column if not exists author_user_id uuid references auth.users(id) on delete set null,
  add column if not exists moderation_status text not null default 'approved',
  add column if not exists moderation_reason text,
  add column if not exists moderation_result jsonb not null default '{}'::jsonb,
  add column if not exists moderated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipes_br_moderation_status_check'
      and conrelid = 'public.recipes_br'::regclass
  ) then
    alter table public.recipes_br
      add constraint recipes_br_moderation_status_check
      check (moderation_status in ('pending', 'approved', 'rejected', 'review'));
  end if;
end $$;

update public.recipes_br
set moderation_status = 'approved',
    moderated_at = coalesce(moderated_at, now())
where moderation_status is null
   or moderation_status = '';

create index if not exists recipes_br_moderation_idx
on public.recipes_br(is_published, moderation_status, created_at desc);

create index if not exists recipes_br_author_user_idx
on public.recipes_br(author_user_id, created_at desc);

drop policy if exists "public can read recipes_br" on public.recipes_br;
create policy "public can read recipes_br"
  on public.recipes_br for select
  using (is_published = true and moderation_status = 'approved');

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'general',
  title text not null,
  body text not null default '',
  href text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_created_idx
on public.user_notifications(user_id, created_at desc);

create index if not exists user_notifications_user_unread_idx
on public.user_notifications(user_id, created_at desc)
where read_at is null;

alter table public.user_notifications enable row level security;

drop policy if exists "user_notifications own read" on public.user_notifications;
create policy "user_notifications own read"
on public.user_notifications for select
using (auth.uid() = user_id);

drop policy if exists "user_notifications own update" on public.user_notifications;
create policy "user_notifications own update"
on public.user_notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_notifications service role access" on public.user_notifications;
create policy "user_notifications service role access"
on public.user_notifications for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

alter table public.recipe_ratings
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists recipe_ratings_user_unique
on public.recipe_ratings(recipe_id, user_id)
where user_id is not null;

drop trigger if exists recipe_ratings_set_updated_at on public.recipe_ratings;
create trigger recipe_ratings_set_updated_at
before update on public.recipe_ratings
for each row execute function public.set_updated_at();

create table if not exists public.recipe_comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes_br(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  author_name text not null default 'Usuário TemAi',
  author_username text,
  author_avatar_url text,
  status text not null default 'visible',
  moderation_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_comments_status_check check (status in ('visible', 'hidden', 'rejected', 'review'))
);

create index if not exists recipe_comments_recipe_created_idx
on public.recipe_comments(recipe_id, created_at desc)
where status = 'visible';

create index if not exists recipe_comments_user_idx
on public.recipe_comments(user_id, created_at desc);

drop trigger if exists recipe_comments_set_updated_at on public.recipe_comments;
create trigger recipe_comments_set_updated_at
before update on public.recipe_comments
for each row execute function public.set_updated_at();

alter table public.recipe_comments enable row level security;

drop policy if exists "recipe_comments public visible read" on public.recipe_comments;
create policy "recipe_comments public visible read"
on public.recipe_comments for select
using (status = 'visible');

drop policy if exists "recipe_comments service role access" on public.recipe_comments;
create policy "recipe_comments service role access"
on public.recipe_comments for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create table if not exists public.recipe_reports (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes_br(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  detail text,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint recipe_reports_reason_check check (reason in ('wrong_info', 'wrong_image', 'inappropriate', 'dangerous', 'other')),
  constraint recipe_reports_status_check check (status in ('open', 'reviewed', 'dismissed'))
);

create unique index if not exists recipe_reports_unique_user_recipe
on public.recipe_reports(recipe_id, user_id);

create index if not exists recipe_reports_recipe_status_idx
on public.recipe_reports(recipe_id, status, created_at desc);

alter table public.recipe_reports enable row level security;

drop policy if exists "recipe_reports service role access" on public.recipe_reports;
create policy "recipe_reports service role access"
on public.recipe_reports for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create or replace function public.refresh_author_badges(p_author_handle text)
returns void
language plpgsql
security definer
as $$
declare
  v_handle text := lower(trim(coalesce(p_author_handle, '')));
  v_total int := 0;
  v_veggie int := 0;
  v_sobremesas int := 0;
  v_lanches int := 0;
  v_bebidas int := 0;
begin
  if v_handle = '' then
    return;
  end if;

  select count(*) into v_total
  from public.recipes_br r
  where r.is_published = true
    and r.moderation_status = 'approved'
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%';

  select count(*) into v_veggie
  from public.recipes_br r
  where r.is_published = true
    and r.moderation_status = 'approved'
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%'
    and r.category = 'veggie';

  select count(*) into v_sobremesas
  from public.recipes_br r
  where r.is_published = true
    and r.moderation_status = 'approved'
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%'
    and r.category = 'sobremesas';

  select count(*) into v_lanches
  from public.recipes_br r
  where r.is_published = true
    and r.moderation_status = 'approved'
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%'
    and r.category = 'lanches';

  select count(*) into v_bebidas
  from public.recipes_br r
  where r.is_published = true
    and r.moderation_status = 'approved'
    and lower(r.source_name) = '@' || v_handle
    and r.source_url like 'temai://community/%'
    and r.category = 'bebidas';

  if v_total between 0 and 3 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'estagiario')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'estagiario';
  end if;

  if v_total >= 4 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'cozinheiro_junior')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'cozinheiro_junior';
  end if;

  if v_total >= 11 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'cozinheiro_pleno')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'cozinheiro_pleno';
  end if;

  if v_total >= 31 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'cozinheiro_senior')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'cozinheiro_senior';
  end if;

  if v_total >= 51 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'chef')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'chef';
  end if;

  if v_total >= 101 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'chef_executivo')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'chef_executivo';
  end if;

  if v_veggie >= 30 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'plant_based_chef')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'plant_based_chef';
  end if;

  if v_sobremesas >= 10 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'confeiteiro')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'confeiteiro';
  end if;

  if v_sobremesas >= 31 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'chef_confeiteiro')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'chef_confeiteiro';
  end if;

  if v_lanches >= 20 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'mestre_dos_lanches')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'mestre_dos_lanches';
  end if;

  if v_bebidas >= 20 then
    insert into public.author_badges(author_handle, badge_slug)
    values (v_handle, 'mixologista')
    on conflict (author_handle, badge_slug) do nothing;
  else
    delete from public.author_badges where author_handle = v_handle and badge_slug = 'mixologista';
  end if;
end;
$$;

grant execute on function public.refresh_author_badges(text) to anon, authenticated, service_role;
