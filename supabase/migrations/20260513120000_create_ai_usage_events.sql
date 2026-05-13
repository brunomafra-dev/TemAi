create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null check (bucket in ('recipe_ai', 'support_ai')),
  feature text not null check (feature in ('suggestions', 'recipe', 'author_recipe', 'support_agent')),
  input_mode text not null default 'none' check (input_mode in ('text', 'audio', 'photo', 'none')),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_bucket_created_idx
on public.ai_usage_events(user_id, bucket, created_at desc);

alter table public.ai_usage_events enable row level security;

drop policy if exists "ai_usage_events own read" on public.ai_usage_events;
create policy "ai_usage_events own read"
on public.ai_usage_events for select
using (auth.uid() = user_id);

drop policy if exists "ai_usage_events service role write" on public.ai_usage_events;
create policy "ai_usage_events service role write"
on public.ai_usage_events for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create or replace function public.consume_ai_usage_event(
  p_user_id uuid,
  p_bucket text,
  p_feature text,
  p_input_mode text,
  p_limit integer,
  p_window_start timestamptz
)
returns table (
  allowed boolean,
  used integer,
  remaining integer,
  event_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
  v_event_id uuid;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_bucket not in ('recipe_ai', 'support_ai') then
    raise exception 'invalid ai usage bucket';
  end if;

  if p_feature not in ('suggestions', 'recipe', 'author_recipe', 'support_agent') then
    raise exception 'invalid ai usage feature';
  end if;

  if p_input_mode not in ('text', 'audio', 'photo', 'none') then
    raise exception 'invalid ai usage input mode';
  end if;

  if p_limit < -1 then
    raise exception 'invalid ai usage limit';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_bucket, 0));

  select count(*)::integer
  into v_used
  from public.ai_usage_events
  where user_id = p_user_id
    and bucket = p_bucket
    and created_at >= p_window_start;

  if p_limit >= 0 and v_used >= p_limit then
    return query select false, v_used, 0, null::uuid;
    return;
  end if;

  insert into public.ai_usage_events (user_id, bucket, feature, input_mode)
  values (p_user_id, p_bucket, p_feature, p_input_mode)
  returning id into v_event_id;

  return query
  select
    true,
    v_used + 1,
    case when p_limit < 0 then -1 else greatest(p_limit - v_used - 1, 0) end,
    v_event_id;
end;
$$;

create or replace function public.refund_ai_usage_event(
  p_event_id uuid,
  p_user_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.ai_usage_events
  where id = p_event_id
    and user_id = p_user_id
    and created_at >= now() - interval '15 minutes';
$$;

revoke all on function public.consume_ai_usage_event(uuid, text, text, text, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.refund_ai_usage_event(uuid, uuid) from public, anon, authenticated;

grant execute on function public.consume_ai_usage_event(uuid, text, text, text, integer, timestamptz) to service_role;
grant execute on function public.refund_ai_usage_event(uuid, uuid) to service_role;
