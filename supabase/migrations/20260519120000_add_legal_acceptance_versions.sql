alter table public.profiles
  add column if not exists accepted_terms_version text,
  add column if not exists accepted_privacy_version text;

update public.profiles
set accepted_terms_version = 'terms-2026-05-19'
where accepted_terms_at is not null
  and accepted_terms_version is null;

update public.profiles
set accepted_privacy_version = 'privacy-2026-05-19'
where accepted_privacy_at is not null
  and accepted_privacy_version is null;
