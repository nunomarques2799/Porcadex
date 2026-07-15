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
  friend_code text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Backfill for schemas created before friend_code existed.
alter table public.profiles add column if not exists friend_code text unique;

alter table public.profiles enable row level security;

-- Alphabet without visually ambiguous characters (0/o, 1/l/i).
create or replace function public.gen_friend_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  code text;
  attempt int := 0;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    code := substr(code, 1, 4) || '-' || substr(code, 5, 4);
    exit when not exists (select 1 from public.profiles where friend_code = code);
    attempt := attempt + 1;
    if attempt > 20 then
      raise exception 'could not generate unique friend code';
    end if;
  end loop;
  return code;
end;
$$;

update public.profiles
   set friend_code = public.gen_friend_code()
 where friend_code is null;

-- ------------------------------------------------------------------
-- friendships: pending + accepted relationships between users.
-- Created early so the are_friends() function below can reference it
-- (SQL functions resolve identifiers at creation time, not execution).
-- ------------------------------------------------------------------
create table if not exists public.friendships (
  requester uuid not null references auth.users(id) on delete cascade,
  addressee uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  responded_at timestamptz,
  primary key (requester, addressee),
  check (requester <> addressee)
);

create index if not exists friendships_addressee_idx
  on public.friendships (addressee, status);
create index if not exists friendships_requester_idx
  on public.friendships (requester, status);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select" on public.friendships;
drop policy if exists "friendships_insert" on public.friendships;
drop policy if exists "friendships_update" on public.friendships;
drop policy if exists "friendships_delete" on public.friendships;

create policy "friendships_select" on public.friendships
  for select using (auth.uid() in (requester, addressee));
create policy "friendships_insert" on public.friendships
  for insert with check (
    auth.uid() = requester
    and status = 'pending'
    and requester <> addressee
  );
-- Only the addressee can accept a pending request.
create policy "friendships_update" on public.friendships
  for update
  using (auth.uid() = addressee and status = 'pending')
  with check (auth.uid() = addressee and status = 'accepted');
-- Either party can delete: cancel outgoing, decline incoming, or unfriend.
create policy "friendships_delete" on public.friendships
  for delete using (auth.uid() in (requester, addressee));

-- Predicate used by RLS in profiles/people/storage.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
     where status = 'accepted'
       and ((requester = a and addressee = b)
         or (requester = b and addressee = a))
  );
$$;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_upsert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_select_friends" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
-- Friends can read each other's profile rows (view exposes only safe cols).
create policy "profiles_select_friends" on public.profiles
  for select using (public.are_friends(auth.uid(), id));

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, friend_code)
  values (new.id, public.gen_friend_code())
  on conflict do nothing;
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

-- Backfill para schemas anteriores.
alter table public.people add column if not exists battle jsonb default '{}'::jsonb;
alter table public.people add column if not exists rating_count int default 0;
alter table public.people add column if not exists is_ex boolean default false;

alter table public.people enable row level security;

drop policy if exists "people_select_own" on public.people;
drop policy if exists "people_insert_own" on public.people;
drop policy if exists "people_update_own" on public.people;
drop policy if exists "people_delete_own" on public.people;
drop policy if exists "people_select_friends" on public.people;

create policy "people_select_own" on public.people
  for select using (auth.uid() = owner);
create policy "people_insert_own" on public.people
  for insert with check (auth.uid() = owner);
create policy "people_update_own" on public.people
  for update using (auth.uid() = owner);
create policy "people_delete_own" on public.people
  for delete using (auth.uid() = owner);
-- Friends can read each other's non-private entries. Sensitive columns
-- (about, notes, moments, photo_ids, is_private) are hidden by consuming
-- public.public_people below; RLS is what actually stops the raw table read
-- from returning private rows.
create policy "people_select_friends" on public.people
  for select using (
    is_private = false
    and public.are_friends(auth.uid(), owner)
  );

-- ------------------------------------------------------------------
-- ratings: friends rate each other's people. The person's `rating` column
-- is kept as the AVERAGE of these via a trigger, and `rating_count` as the
-- number of raters.
-- ------------------------------------------------------------------
create table if not exists public.ratings (
  rater uuid not null references auth.users(id) on delete cascade,
  target uuid not null references public.people(id) on delete cascade,
  stars numeric not null check (stars >= 0 and stars <= 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (rater, target)
);

create index if not exists ratings_target_idx on public.ratings(target);

alter table public.ratings enable row level security;

-- Owner of the rated person (used by RLS + validation).
create or replace function public.person_owner(p uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select owner from public.people where id = p;
$$;

drop policy if exists "ratings_select" on public.ratings;
drop policy if exists "ratings_insert" on public.ratings;
drop policy if exists "ratings_update" on public.ratings;
drop policy if exists "ratings_delete" on public.ratings;

-- You can read your own ratings, and the owner can read all ratings of their
-- people (to see who rated). The average is exposed to friends via the view.
create policy "ratings_select" on public.ratings
  for select using (
    auth.uid() = rater or auth.uid() = public.person_owner(target)
  );
-- Only a friend of the owner (and not the owner) can rate a person.
create policy "ratings_insert" on public.ratings
  for insert with check (
    auth.uid() = rater
    and public.person_owner(target) <> auth.uid()
    and public.are_friends(auth.uid(), public.person_owner(target))
  );
create policy "ratings_update" on public.ratings
  for update using (auth.uid() = rater)
  with check (auth.uid() = rater);
create policy "ratings_delete" on public.ratings
  for delete using (auth.uid() = rater);

-- Recompute the target person's average rating + count on any change.
create or replace function public.recompute_person_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tgt uuid := coalesce(new.target, old.target);
begin
  update public.people p
     set rating = coalesce((select avg(stars) from public.ratings where target = tgt), 0),
         rating_count = (select count(*) from public.ratings where target = tgt)
   where p.id = tgt;
  return null;
end;
$$;

drop trigger if exists ratings_recompute on public.ratings;
create trigger ratings_recompute
  after insert or update or delete on public.ratings
  for each row execute function public.recompute_person_rating();

-- ------------------------------------------------------------------
-- battles: PvP em tempo real entre dois users.
-- O `setup` guarda o snapshot (freeze) das duas EQUIPAS (arrays de 1 a 6
-- lutadores); `turns` a lista de jogadas concluídas; `action_a`/`action_b` a
-- escolha atual de cada lado (colunas separadas para não haver clobber quando
-- ambos escrevem em simultâneo). Cada cliente reconstrói o estado a partir de
-- setup+turns (determinístico).
--
-- `challenger_person`/`opponent_person` guardam o lutador principal: são a FK
-- que a política de inserção usa para confirmar a posse. A equipa completa vai
-- em `challenger_team`/`opponent_team`.
-- ------------------------------------------------------------------
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  challenger uuid not null references auth.users(id) on delete cascade,
  challenger_person uuid not null references public.people(id) on delete cascade,
  opponent uuid not null references auth.users(id) on delete cascade,
  opponent_person uuid references public.people(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'finished', 'declined', 'cancelled')),
  seed bigint not null default 0,
  setup jsonb not null default '{}'::jsonb,
  turns jsonb not null default '[]'::jsonb,
  move_a int,
  move_b int,
  winner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (challenger <> opponent)
);

-- Backfill para schemas anteriores às batalhas por equipa. As colunas antigas
-- move_a/move_b (int) ficam por usar: as ações passaram a jsonb porque agora
-- também codificam trocas de lutador, não só o índice do ataque.
alter table public.battles add column if not exists challenger_team uuid[];
alter table public.battles add column if not exists opponent_team uuid[];
alter table public.battles add column if not exists team_size int default 1;
alter table public.battles add column if not exists action_a jsonb;
alter table public.battles add column if not exists action_b jsonb;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'battles_team_size_range'
  ) then
    alter table public.battles
      add constraint battles_team_size_range check (team_size between 1 and 6);
  end if;
end $$;

create index if not exists battles_opponent_idx on public.battles(opponent, status);
create index if not exists battles_challenger_idx on public.battles(challenger, status);

alter table public.battles enable row level security;

drop policy if exists "battles_select" on public.battles;
drop policy if exists "battles_insert" on public.battles;
drop policy if exists "battles_update" on public.battles;
drop policy if exists "battles_delete" on public.battles;

create policy "battles_select" on public.battles
  for select using (auth.uid() in (challenger, opponent));
-- Só o desafiante cria, contra um amigo, com a sua própria pessoa.
create policy "battles_insert" on public.battles
  for insert with check (
    auth.uid() = challenger
    and status = 'pending'
    and public.are_friends(auth.uid(), opponent)
    and public.person_owner(challenger_person) = auth.uid()
  );
-- Ambos os participantes podem atualizar (jogadas, aceitar, etc.).
create policy "battles_update" on public.battles
  for update using (auth.uid() in (challenger, opponent))
  with check (auth.uid() in (challenger, opponent));
create policy "battles_delete" on public.battles
  for delete using (auth.uid() in (challenger, opponent));

-- Realtime: publicar alterações da tabela e enviar linha completa nos eventos.
alter table public.battles replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'battles'
  ) then
    alter publication supabase_realtime add table public.battles;
  end if;
end $$;

-- ------------------------------------------------------------------
-- Public views: what a friend is allowed to see about you and your people.
-- security_invoker=on so the underlying table RLS applies.
-- ------------------------------------------------------------------
create or replace view public.public_profiles
with (security_invoker = on)
as
  select id, name, gender, home_country, friend_code, created_at
    from public.profiles;

grant select on public.public_profiles to authenticated, anon;

-- Drop + create (em vez de "create or replace") porque adicionámos colunas:
-- o Postgres não deixa reordenar/renomear colunas de uma view existente, só
-- acrescentar no fim. Dropar é seguro — é só uma view, sem dados.
drop view if exists public.public_people;
create view public.public_people
with (security_invoker = on)
as
  select id, owner, number, name, nickname, gender, relationship,
         types, country, ball, legendary, legendary_cats, avatar_id,
         rating, stats, traits, favorite, created_at,
         -- Colunas novas acrescentadas no fim.
         rating_count, battle,
         -- Subconjunto de `about` visível para amigos (não expõe telefone,
         -- aniversário nem como se conheceram).
         about->>'instagram' as instagram,
         about->>'location'  as location,
         about->>'since'     as since
    from public.people
   where is_private = false;

grant select on public.public_people to authenticated, anon;

-- RPC used by the "add friend" flow: resolve a friend code to {id, name}
-- without exposing the full profile of every user.
create or replace function public.find_by_friend_code(code text)
returns table (id uuid, name text, friend_code text)
language sql
stable
security definer
set search_path = public
as $$
  select id, name, friend_code
    from public.profiles
   where friend_code = code
   limit 1;
$$;

grant execute on function public.find_by_friend_code(text) to authenticated;

-- ------------------------------------------------------------------
-- storage: private photos bucket
-- Each user's photos live under /{user_id}/{file}
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "photos_read_own" on storage.objects;
drop policy if exists "photos_read_friends" on storage.objects;
drop policy if exists "photos_insert_own" on storage.objects;
drop policy if exists "photos_update_own" on storage.objects;
drop policy if exists "photos_delete_own" on storage.objects;

create policy "photos_read_own" on storage.objects
  for select using (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
-- Friends can read objects in another user's folder. The client only ever
-- requests avatar_ids that appear in public_people, so this is safe in
-- practice; a future hardening step is to move shareable avatars into a
-- dedicated bucket.
create policy "photos_read_friends" on storage.objects
  for select using (
    bucket_id = 'photos'
    and public.are_friends(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid
    )
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
