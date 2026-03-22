create extension if not exists pgcrypto;

create table if not exists public.recipes_br (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null default '',
  category text not null check (category in ('principais', 'veggie', 'massas', 'kids', 'sobremesas')),
  ingredients text[] not null default '{}',
  steps text[] not null default '{}',
  prep_minutes int not null default 30,
  servings int not null default 2,
  image_url text,
  source_name text not null default 'TemAi Curadoria',
  source_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_br_category_idx on public.recipes_br(category);
create index if not exists recipes_br_title_idx on public.recipes_br using gin (to_tsvector('portuguese', title));
create index if not exists recipes_br_ingredients_idx on public.recipes_br using gin (ingredients);

create table if not exists public.recipe_ratings (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes_br(id) on delete cascade,
  user_fingerprint text not null,
  rating numeric(2,1) not null check (rating >= 1 and rating <= 5 and mod((rating * 10)::int, 5) = 0),
  created_at timestamptz not null default now(),
  unique (recipe_id, user_fingerprint)
);

create index if not exists recipe_ratings_recipe_idx on public.recipe_ratings(recipe_id);

alter table public.recipes_br enable row level security;
alter table public.recipe_ratings enable row level security;

drop policy if exists "public can read recipes_br" on public.recipes_br;
create policy "public can read recipes_br"
  on public.recipes_br for select
  using (is_published = true);

drop policy if exists "public can read recipe_ratings" on public.recipe_ratings;
create policy "public can read recipe_ratings"
  on public.recipe_ratings for select
  using (true);

drop policy if exists "public can write recipe_ratings" on public.recipe_ratings;
create policy "public can write recipe_ratings"
  on public.recipe_ratings for insert
  with check (true);

drop policy if exists "public can update recipe_ratings" on public.recipe_ratings;
create policy "public can update recipe_ratings"
  on public.recipe_ratings for update
  using (true)
  with check (true);
