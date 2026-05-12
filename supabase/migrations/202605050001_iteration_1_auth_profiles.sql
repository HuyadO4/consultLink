create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  email text not null unique,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'consultant', 'admin')),
  is_suspended boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'customer');

  if requested_role not in ('customer', 'consultant') then
    requested_role := 'customer';
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    requested_role
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    email = new.email,
    updated_at = timezone('utc', now())
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function public.sync_profile_email();

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select (id, full_name, avatar_url) on public.profiles to anon;
grant select (id, full_name, avatar_url, role, is_suspended, created_at, updated_at) on public.profiles to authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

drop policy if exists "profiles_select_visible_rows" on public.profiles;
create policy "profiles_select_visible_rows"
on public.profiles
for select
using (
  auth.uid() = id
  or public.is_admin()
  or role in ('customer', 'consultant')
);

drop policy if exists "profiles_update_own_profile" on public.profiles;
create policy "profiles_update_own_profile"
on public.profiles
for update
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_is_suspended_idx on public.profiles (is_suspended);

comment on table public.profiles is 'User profile records created automatically from auth.users.';
comment on function public.current_user_role() is 'Security-definer helper used by RLS policies to avoid recursive profile lookups.';

-- After running this migration, promote your platform operator manually:
-- update public.profiles set role = 'admin' where email = 'admin@example.com';
