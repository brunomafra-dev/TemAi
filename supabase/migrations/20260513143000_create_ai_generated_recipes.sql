create table if not exists public.ai_generated_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_log_id uuid not null references public.ai_generation_logs(id) on delete cascade,
  suggestion_id text not null,
  include_nutrition boolean not null default false,
  recipe jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, generation_log_id, suggestion_id, include_nutrition)
);

create index if not exists ai_generated_recipes_user_idx
on public.ai_generated_recipes(user_id, created_at desc);

create index if not exists ai_generated_recipes_generation_idx
on public.ai_generated_recipes(generation_log_id);

alter table public.ai_generated_recipes enable row level security;

drop policy if exists "ai_generated_recipes own read" on public.ai_generated_recipes;
create policy "ai_generated_recipes own read"
on public.ai_generated_recipes for select
using (auth.uid() = user_id);
