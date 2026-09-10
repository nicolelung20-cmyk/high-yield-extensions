-- high-yield-extensions: licenses + profiles
--
-- Backs these routes in index.js:
--   GET  /api/license/verify  (anon, publishable key)  -> verify_license()
--   GET  /api/profile         (user JWT, RLS-scoped)   -> profiles
--   POST /admin/licenses      (secret key, bypasses RLS) -> licenses
--
-- SECURITY NOTE. The publishable key is shipped inside the extension bundles,
-- so it is public. Any RLS policy broad enough to let anon run
-- `select active, expires_at from licenses where key = $1` is also broad
-- enough to let anon run `select * from licenses` and exfiltrate every key
-- ever issued -- an RLS policy filters rows, it cannot require that the caller
-- supplied a WHERE clause. So anon gets NO table access here. Verification
-- goes through verify_license(), which takes the key as an argument and can
-- only ever return the single matching row.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- licenses
create table if not exists public.licenses (
  key          text        primary key,
  extension_id text        not null,
  active       boolean     not null default true,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists licenses_extension_id_idx
  on public.licenses (extension_id);

alter table public.licenses enable row level security;
-- Deliberately no policies: anon and authenticated get nothing. The admin
-- route uses the secret key, which bypasses RLS entirely.
revoke all on public.licenses from anon, authenticated;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "own profile is readable" on public.profiles;
create policy "own profile is readable"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "own profile is updatable" on public.profiles;
create policy "own profile is updatable"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ------------------------------------------------- license verification RPC
-- SECURITY DEFINER so it reads licenses despite RLS. search_path is pinned to
-- defeat search_path hijacking, which is the standard failure mode for
-- definer functions.
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

-- new users get a profile row automatically
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
