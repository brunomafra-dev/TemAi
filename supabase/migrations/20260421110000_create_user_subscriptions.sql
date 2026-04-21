create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'expired')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_renewal_at timestamptz,
  canceled_at timestamptz,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_subscriptions_user_unique unique (user_id)
);

create index if not exists user_subscriptions_user_id_idx on public.user_subscriptions(user_id);
create index if not exists user_subscriptions_plan_idx on public.user_subscriptions(plan);

drop trigger if exists user_subscriptions_set_updated_at on public.user_subscriptions;
create trigger user_subscriptions_set_updated_at
before update on public.user_subscriptions
for each row execute function public.set_updated_at();

alter table public.user_subscriptions enable row level security;

drop policy if exists "user_subscriptions own read" on public.user_subscriptions;
create policy "user_subscriptions own read"
on public.user_subscriptions for select
using (auth.uid() = user_id);

drop policy if exists "user_subscriptions own write" on public.user_subscriptions;
create policy "user_subscriptions own write"
on public.user_subscriptions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
