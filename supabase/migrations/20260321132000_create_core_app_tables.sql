create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  ingredients text[] not null default '{}',
  steps text[] not null default '{}',
  prep_minutes int not null default 30,
  servings int not null default 2,
  image_url text,
  source_type text not null default 'manual' check (source_type in ('manual', 'ai')),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_recipes_user_idx on public.user_recipes(user_id);
create index if not exists user_recipes_source_idx on public.user_recipes(source_type);
create index if not exists user_recipes_title_idx on public.user_recipes using gin (to_tsvector('portuguese', title));

create table if not exists public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('library', 'ai', 'user')),
  recipe_slug text,
  recipe_external_id text,
  user_recipe_id uuid references public.user_recipes(id) on delete cascade,
  saved_at timestamptz not null default now(),
  constraint saved_recipes_target_check check (
    recipe_slug is not null
    or recipe_external_id is not null
    or user_recipe_id is not null
  )
);

create unique index if not exists saved_recipes_unique_target
on public.saved_recipes(user_id, source, coalesce(recipe_slug, ''), coalesce(recipe_external_id, ''), coalesce(user_recipe_id::text, ''));

create index if not exists saved_recipes_user_idx on public.saved_recipes(user_id);

create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity numeric(10,2),
  unit text,
  expires_at date,
  in_stock boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pantry_items_user_idx on public.pantry_items(user_id);
create index if not exists pantry_items_name_idx on public.pantry_items using gin (to_tsvector('portuguese', name));

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Lista de compras',
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shopping_lists_user_idx on public.shopping_lists(user_id);

create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references public.shopping_lists(id) on delete cascade,
  item_name text not null,
  quantity numeric(10,2),
  unit text,
  checked boolean not null default false,
  category text,
  source_recipe_slug text,
  source_user_recipe_id uuid references public.user_recipes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shopping_list_items_list_idx on public.shopping_list_items(shopping_list_id);
create index if not exists shopping_list_items_checked_idx on public.shopping_list_items(checked);

create table if not exists public.library_recipe_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_fingerprint text,
  recipe_slug text not null,
  rating numeric(2,1) not null check (rating >= 1 and rating <= 5 and mod((rating * 10)::int, 5) = 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_rating_identity_check check (user_id is not null or user_fingerprint is not null)
);

create unique index if not exists library_recipe_ratings_user_unique
on public.library_recipe_ratings(user_id, recipe_slug)
where user_id is not null;

create unique index if not exists library_recipe_ratings_fingerprint_unique
on public.library_recipe_ratings(user_fingerprint, recipe_slug)
where user_fingerprint is not null;

create table if not exists public.ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  input_mode text not null check (input_mode in ('text', 'audio', 'photo')),
  ingredients_text text not null default '',
  normalized_ingredients text[] not null default '{}',
  suggestions jsonb not null default '[]'::jsonb,
  selected_suggestion_id text,
  generated_recipe jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_generation_logs_user_idx on public.ai_generation_logs(user_id);
create index if not exists ai_generation_logs_created_idx on public.ai_generation_logs(created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_recipes_set_updated_at on public.user_recipes;
create trigger user_recipes_set_updated_at
before update on public.user_recipes
for each row execute function public.set_updated_at();

drop trigger if exists pantry_items_set_updated_at on public.pantry_items;
create trigger pantry_items_set_updated_at
before update on public.pantry_items
for each row execute function public.set_updated_at();

drop trigger if exists shopping_lists_set_updated_at on public.shopping_lists;
create trigger shopping_lists_set_updated_at
before update on public.shopping_lists
for each row execute function public.set_updated_at();

drop trigger if exists shopping_list_items_set_updated_at on public.shopping_list_items;
create trigger shopping_list_items_set_updated_at
before update on public.shopping_list_items
for each row execute function public.set_updated_at();

drop trigger if exists library_recipe_ratings_set_updated_at on public.library_recipe_ratings;
create trigger library_recipe_ratings_set_updated_at
before update on public.library_recipe_ratings
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_recipes enable row level security;
alter table public.saved_recipes enable row level security;
alter table public.pantry_items enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.library_recipe_ratings enable row level security;
alter table public.ai_generation_logs enable row level security;

drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles write own" on public.profiles;
create policy "profiles write own"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "user_recipes own access" on public.user_recipes;
create policy "user_recipes own access"
on public.user_recipes for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "saved_recipes own access" on public.saved_recipes;
create policy "saved_recipes own access"
on public.saved_recipes for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "pantry_items own access" on public.pantry_items;
create policy "pantry_items own access"
on public.pantry_items for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "shopping_lists own access" on public.shopping_lists;
create policy "shopping_lists own access"
on public.shopping_lists for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "shopping_items through own list" on public.shopping_list_items;
create policy "shopping_items through own list"
on public.shopping_list_items for all
using (
  exists (
    select 1 from public.shopping_lists l
    where l.id = shopping_list_id and l.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shopping_lists l
    where l.id = shopping_list_id and l.user_id = auth.uid()
  )
);

drop policy if exists "ratings public read" on public.library_recipe_ratings;
create policy "ratings public read"
on public.library_recipe_ratings for select
using (true);

drop policy if exists "ratings auth write" on public.library_recipe_ratings;
create policy "ratings auth write"
on public.library_recipe_ratings for all
using (auth.uid() is not null and (user_id = auth.uid() or user_id is null))
with check (auth.uid() is not null and (user_id = auth.uid() or user_id is null));

drop policy if exists "ai_logs own access" on public.ai_generation_logs;
create policy "ai_logs own access"
on public.ai_generation_logs for all
using (user_id is null or user_id = auth.uid())
with check (user_id is null or user_id = auth.uid());
