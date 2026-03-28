alter table public.profiles
  add column if not exists username text,
  add column if not exists accepted_terms_at timestamptz,
  add column if not exists accepted_privacy_at timestamptz;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

create or replace function public.is_username_available(p_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := lower(trim(coalesce(p_username, '')));
  v_exists boolean;
begin
  if length(v_username) < 3 then
    return false;
  end if;

  select exists (
    select 1
    from public.profiles
    where lower(username) = v_username
  ) into v_exists;

  return not v_exists;
end;
$$;

grant execute on function public.is_username_available(text) to anon, authenticated, service_role;
