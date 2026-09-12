-- The 20260910000000_licenses_and_profiles.sql migration's table DDL landed
-- (licenses + profiles exist with RLS), but verify_license() and the
-- handle_new_user trigger were missing from the live database -- discovered
-- 2026-09-12 when the new Edge Function's /api/license/verify route failed
-- with "Could not find the function public.verify_license(...) in the
-- schema cache". Re-applying just the function + trigger here, idempotently.

create or replace function public.verify_license(
  p_key          text,
  p_extension_id text
)
returns table (active boolean, expires_at timestamptz)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select l.active, l.expires_at
  from public.licenses as l
  where l.key = p_key
    and l.extension_id = p_extension_id;
$$;

revoke all on function public.verify_license(text, text) from public;
grant execute on function public.verify_license(text, text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
