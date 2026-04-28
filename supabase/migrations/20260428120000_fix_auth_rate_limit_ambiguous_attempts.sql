create or replace function public.consume_auth_rate_limit(
  p_key text,
  p_max_attempts integer default 5,
  p_window_seconds integer default 900
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer,
  attempts integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_started_at timestamptz;
  v_attempts integer;
  v_retry integer;
begin
  if trim(coalesce(p_key, '')) = '' then
    raise exception 'rate limit key is required';
  end if;

  if coalesce(p_max_attempts, 0) <= 0 then
    raise exception 'p_max_attempts must be greater than zero';
  end if;

  if coalesce(p_window_seconds, 0) <= 0 then
    raise exception 'p_window_seconds must be greater than zero';
  end if;

  v_window_started_at :=
    to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  insert into public.auth_rate_limits as rl (key, attempts, window_started_at, updated_at)
  values (p_key, 1, v_window_started_at, v_now)
  on conflict (key) do update
    set attempts = case
      when rl.window_started_at = excluded.window_started_at then rl.attempts + 1
      else 1
    end,
    window_started_at = excluded.window_started_at,
    updated_at = v_now;

  select rl.attempts, rl.window_started_at
    into v_attempts, v_window_started_at
  from public.auth_rate_limits as rl
  where rl.key = p_key;

  if v_attempts <= p_max_attempts then
    return query
      select true, greatest(p_max_attempts - v_attempts, 0), 0, v_attempts;
    return;
  end if;

  v_retry := greatest(
    ceil(extract(epoch from ((v_window_started_at + make_interval(secs => p_window_seconds)) - v_now)))::integer,
    1
  );

  return query
    select false, 0, v_retry, v_attempts;
end;
$$;

revoke all on function public.consume_auth_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_auth_rate_limit(text, integer, integer) to service_role;
