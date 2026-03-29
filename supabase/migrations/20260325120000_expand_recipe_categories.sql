create extension if not exists pgcrypto;

create table if not exists public.recipes_br (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null default '',
  category text not null check (category in ('principais', 'veggie', 'massas', 'kids', 'sobremesas', 'bebidas', 'lanches')),
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

alter table public.recipes_br
  drop constraint if exists recipes_br_category_check;

alter table public.recipes_br
  add constraint recipes_br_category_check
  check (category in ('principais', 'veggie', 'massas', 'kids', 'sobremesas', 'bebidas', 'lanches'));
