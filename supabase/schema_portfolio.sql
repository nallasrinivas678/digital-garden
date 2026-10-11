-- =====================================================================
-- Multi-tenant public portfolio — Supabase schema
-- Sign-in and the private workspace (tasks/career/garden editor at /app)
-- stay open to anyone — unchanged. Claiming a public portfolio
-- (/:username, /:username/projects, /:username/notes(/:slug)) is
-- currently gated to a small allowlist (see portfolio_allowlist below);
-- widen it later by inserting more emails into that table.
--
-- Run in the Supabase SQL Editor (Dashboard → SQL → New query).
-- ADDITIVE and idempotent: safe to re-run; does NOT touch any existing
-- tables except the one narrow, explicitly-called-out `notes` slug
-- migration below. Reuses set_updated_at(), created by schema.sql.
--
-- NOTE: portfolio_profiles is NOT the same table as schema_assistant.sql's
-- user_profiles — that one holds private PII (phone, address) for the AI
-- job-application agent and must never be publicly readable. This table
-- holds only public-facing identity, so an unconditional public SELECT
-- policy is safe.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Public-facing profile: the thing a username resolves to.
-- ---------------------------------------------------------------------
create table if not exists portfolio_profiles (
  user_id       uuid primary key references auth.users (id) on delete cascade,

  username      text not null unique
                  check (username ~ '^[a-z][a-z0-9-]{2,29}$')
                  check (username <> all (array[
                    'app', 'login', 'privacy', 'notes', 'projects',
                    'onboarding', 'api', 'admin', 'www', 'auth'
                  ])),

  display_name  text not null,
  title         text,
  bio           text,
  github_url    text,
  linkedin_url  text,
  resume_url    text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Portfolio projects: replaces the old static src/data/projects.ts so
-- every user can manage their own list without a code deploy.
-- ---------------------------------------------------------------------
create table if not exists portfolio_projects (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,

  name               text not null,
  description        text,
  live_url           text,
  repo_url           text,
  stack              text[] not null default '{}',
  highlights         text[] not null default '{}',
  related_post_slug  text,
  sort_order         int not null default 0,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists portfolio_projects_user_sort_idx
  on portfolio_projects (user_id, sort_order);

-- ---------------------------------------------------------------------
-- Notes slug migration: was globally unique (single-user assumption,
-- see schema_notes.sql's own comment); now unique per user so multiple
-- people's notes don't collide on slug.
-- ---------------------------------------------------------------------
alter table notes drop constraint if exists notes_slug_key;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'notes_user_slug_key') then
    alter table notes add constraint notes_user_slug_key unique (user_id, slug);
  end if;
end $$;

create index if not exists notes_user_published_idx
  on notes (user_id, status, published_at desc)
  where status = 'published';

-- ---------------------------------------------------------------------
-- Auto-update updated_at. Reuses set_updated_at() created by the base
-- schema; redefined here so this file can run standalone.
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists portfolio_profiles_updated_at on portfolio_profiles;
create trigger portfolio_profiles_updated_at
  before update on portfolio_profiles
  for each row execute function set_updated_at();

drop trigger if exists portfolio_projects_updated_at on portfolio_projects;
create trigger portfolio_projects_updated_at
  before update on portfolio_projects
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Allowlist: who is currently allowed to CLAIM a portfolio (i.e. insert
-- into portfolio_profiles / portfolio_projects). Locked down with RLS
-- and no policies at all — nobody can read it directly, including via
-- a subquery from another table's policy. The only way in or out is the
-- security-definer function below, which checks only the caller's own
-- email and never returns the list itself. To add someone later:
--   insert into portfolio_allowlist (email) values ('new@email.com');
-- ---------------------------------------------------------------------
create table if not exists portfolio_allowlist (
  email text primary key
);
alter table portfolio_allowlist enable row level security;

insert into portfolio_allowlist (email) values
  ('nallasrinivas678@gmail.com'),
  ('harshitha.ponnala@gmail.com')
on conflict (email) do nothing;

create or replace function is_portfolio_allowlisted()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from portfolio_allowlist
    where email = (auth.jwt() ->> 'email')
  );
$$;

grant execute on function is_portfolio_allowlisted() to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security.
--
-- Both tables: owner can read/update/delete their own row (same pattern
-- as the rest of the app) and an unconditional public SELECT — these
-- tables hold no PII, and a public portfolio only works if anyone can
-- read anyone's row. INSERT (claiming a new portfolio / adding a project
-- for the first time) additionally requires is_portfolio_allowlisted().
-- ---------------------------------------------------------------------
alter table portfolio_profiles enable row level security;
alter table portfolio_projects enable row level security;

drop policy if exists "own portfolio profile" on portfolio_profiles;
drop policy if exists "insert own portfolio profile if allowlisted" on portfolio_profiles;
drop policy if exists "update own portfolio profile" on portfolio_profiles;
drop policy if exists "delete own portfolio profile" on portfolio_profiles;

create policy "insert own portfolio profile if allowlisted" on portfolio_profiles
  for insert with check (auth.uid() = user_id and is_portfolio_allowlisted());

create policy "update own portfolio profile" on portfolio_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own portfolio profile" on portfolio_profiles
  for delete using (auth.uid() = user_id);

drop policy if exists "public read of portfolio profiles" on portfolio_profiles;
create policy "public read of portfolio profiles" on portfolio_profiles
  for select using (true);

drop policy if exists "own portfolio projects" on portfolio_projects;
drop policy if exists "insert own portfolio projects if allowlisted" on portfolio_projects;
drop policy if exists "update own portfolio projects" on portfolio_projects;
drop policy if exists "delete own portfolio projects" on portfolio_projects;

create policy "insert own portfolio projects if allowlisted" on portfolio_projects
  for insert with check (auth.uid() = user_id and is_portfolio_allowlisted());

create policy "update own portfolio projects" on portfolio_projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own portfolio projects" on portfolio_projects
  for delete using (auth.uid() = user_id);

drop policy if exists "public read of portfolio projects" on portfolio_projects;
create policy "public read of portfolio projects" on portfolio_projects
  for select using (true);
