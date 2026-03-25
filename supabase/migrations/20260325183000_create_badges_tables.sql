create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  icon text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

create index if not exists user_badges_user_idx on public.user_badges(user_id);
create index if not exists user_badges_badge_idx on public.user_badges(badge_id);

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "badges public read" on public.badges;
create policy "badges public read"
  on public.badges for select
  using (true);

drop policy if exists "user_badges read own" on public.user_badges;
create policy "user_badges read own"
  on public.user_badges for select
  using (auth.uid() = user_id);

drop policy if exists "user_badges write own" on public.user_badges;
create policy "user_badges write own"
  on public.user_badges for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.badges (slug, name, description, icon)
values
  ('chef', 'Chef', 'Publicou receitas populares na comunidade.', 'chef-hat'),
  ('chef_confeiteiro', 'Chef Confeiteiro', 'Especialista em sobremesas avaliadas pela comunidade.', 'cupcake'),
  ('mestre_dos_lanches', 'Mestre dos Lanches', 'Destaque em receitas de lanches criativos.', 'burger'),
  ('rei_das_bebidas', 'Rei das Bebidas', 'Criador de bebidas que a comunidade ama.', 'drink')
on conflict (slug) do nothing;
