alter table public.profiles
  add column if not exists cooking_equipment text[] not null default array['stove']::text[];

alter table public.ai_generation_logs
  add column if not exists cooking_equipment text[] not null default array['stove']::text[];

alter table public.ai_generated_recipes
  add column if not exists cooking_equipment text[] not null default array['stove']::text[],
  add column if not exists prompt_version text,
  add column if not exists model text,
  add column if not exists cache_key text;

create index if not exists ai_generated_recipes_cache_key_idx
on public.ai_generated_recipes(user_id, cache_key)
where cache_key is not null;

create table if not exists public.ai_call_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  route text not null,
  operation text not null,
  feature text not null,
  input_mode text not null default 'none',
  model text not null,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  cost_usd numeric(12,8),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_call_usage_user_created_idx
on public.ai_call_usage(user_id, created_at desc);

create index if not exists ai_call_usage_route_created_idx
on public.ai_call_usage(route, created_at desc);

alter table public.ai_call_usage enable row level security;

drop policy if exists "ai_call_usage service role access" on public.ai_call_usage;
create policy "ai_call_usage service role access"
on public.ai_call_usage for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
