-- Porcadex — Supabase schema
-- Run this in the SQL Editor of your Supabase project (once).
-- It is idempotent-ish: safe to re-run after adding tables, but do not run
-- it while there is real data unless you understand what it drops.

-- ------------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------
-- profiles: one row per authenticated user
-- ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text default '',
  gender text check (gender in ('M', 'F', 'O')) ,
  last_period date,
  cycle_length int default 28,
  period_length int default 5,
  home_country text default '620',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_upsert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------
-- people: the Pokédex entries
-- Complex fields (stats, about, moments, traits, ...) are stored as JSONB
-- so we can iterate on the client shape without a migration every time.
-- ------------------------------------------------------------------
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  number int not null,
  name text not null,
  nickname text default '',
  gender text check (gender in ('M', 'F', 'O')),
  is_private boolean default false,
  relationship text default 'beijo',
  types text[] default array['normal']::text[],
  country text,
  ball text default 'poke',
  legendary boolean default false,
  legendary_cats text[] default '{}',
  avatar_id text,
  photo_ids text[] default '{}',
  rating numeric default 0,
  stats jsonb default '{}'::jsonb,
  about jsonb default '{}'::jsonb,
  traits text[] default '{}',
  notes text default '',
  moments jsonb default '[]'::jsonb,
  favorite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (owner, number)
);

create index if not exists people_owner_idx on public.people(owner);

alter table public.people enable row level security;

drop policy if exists "people_select_own" on public.people;
drop policy if exists "people_insert_own" on public.people;
drop policy if exists "people_update_own" on public.people;
drop policy if exists "people_delete_own" on public.people;

create policy "people_select_own" on public.people
  for select using (auth.uid() = owner);
create policy "people_insert_own" on public.people
  for insert with check (auth.uid() = owner);
create policy "people_update_own" on public.people
  for update using (auth.uid() = owner);
create policy "people_delete_own" on public.people
  for delete using (auth.uid() = owner);

-- ------------------------------------------------------------------
-- storage: private photos bucket
-- Each user's photos live under /{user_id}/{file}
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "photos_read_own" on storage.objects;
drop policy if exists "photos_insert_own" on storage.objects;
drop policy if exists "photos_update_own" on storage.objects;
drop policy if exists "photos_delete_own" on storage.objects;

create policy "photos_read_own" on storage.objects
  for select using (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "photos_update_own" on storage.objects
  for update using (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
