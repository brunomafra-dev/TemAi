alter table public.profiles
  add column if not exists selected_badge text not null default 'estagiario',
  add column if not exists unlocked_badges text[] not null default array['estagiario']::text[];
