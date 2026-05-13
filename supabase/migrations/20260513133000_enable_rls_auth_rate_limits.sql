alter table public.auth_rate_limits enable row level security;

revoke all on table public.auth_rate_limits from public, anon, authenticated;
grant all on table public.auth_rate_limits to service_role;

drop policy if exists "auth_rate_limits service role access" on public.auth_rate_limits;
create policy "auth_rate_limits service role access"
on public.auth_rate_limits for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
