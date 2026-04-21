create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  source text not null default 'app_chat' check (source in ('app_chat', 'email', 'manual')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_idx on public.support_tickets(user_id, created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets(status);

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets own read" on public.support_tickets;
create policy "support_tickets own read"
on public.support_tickets for select
using (auth.uid() = user_id);

drop policy if exists "support_tickets own write" on public.support_tickets;
create policy "support_tickets own write"
on public.support_tickets for insert
with check (auth.uid() = user_id);
