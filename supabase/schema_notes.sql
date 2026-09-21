-- =====================================================================
-- Garden add-on — Supabase schema
-- Adds a notes table for tech notes / coding exercises / system design
-- write-ups, with a public read policy for published notes so they can
-- be served at /notes/:slug without auth.
--
-- Run in the Supabase SQL Editor (Dashboard → SQL → New query).
-- ADDITIVE and idempotent: safe to re-run; does NOT touch any existing
-- tables.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Notes.
--
-- `slug` is globally unique (not scoped per-user) — this is a single-user
-- personal app, so that's simpler than it would be for a multi-tenant one.
-- Revisit if this ever supports more than one author.
-- ---------------------------------------------------------------------
create table if not exists notes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,

  title        text not null default 'Untitled note',
  slug         text not null unique,
  body         text not null default '',   -- markdown source

  type         text not null default 'tech-note'
                 check (type in ('tech-note', 'exercise', 'system-design')),
  tags         text[] not null default '{}',

  status       text not null default 'draft'
                 check (status in ('draft', 'published')),
  published_at timestamptz,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Indexes: the editor's "my notes" list, and the public reader page.
-- ---------------------------------------------------------------------
create index if not exists notes_user_idx
  on notes (user_id, updated_at desc);
create index if not exists notes_published_idx
  on notes (status, published_at desc)
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

drop trigger if exists notes_updated_at on notes;
create trigger notes_updated_at
  before update on notes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security.
--
-- Two permissive policies on SELECT, combined with OR:
--   1. Owner can do everything to their own rows (same pattern as the
--      rest of the app).
--   2. ANYONE (including signed-out visitors) can read rows where
--      status = 'published' — this is what makes /notes/:slug work
--      without authentication. Writes always require ownership.
-- ---------------------------------------------------------------------
alter table notes enable row level security;

drop policy if exists "own notes" on notes;
create policy "own notes" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "public read of published notes" on notes;
create policy "public read of published notes" on notes
  for select using (status = 'published');
