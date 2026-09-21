-- =====================================================================
-- Scheduler add-on — Supabase schema
-- Adds a daily planner (tasks, appointments, outings) with recurrence
-- and per-person tagging.
--
-- Run in the Supabase SQL Editor (Dashboard → SQL → New query).
-- ADDITIVE and idempotent: safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- People: who an item is for (you, your daughter, "family", ...).
-- Used to tag and filter the schedule. Optional per event.
-- ---------------------------------------------------------------------
create table if not exists people (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  color      text not null default '#22c55e',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Events: the one unified table for tasks, appointments, and outings.
--
--   type        = task | appointment | outing
--   event_date  = the anchor calendar date. For recurring items this is
--                 the FIRST occurrence; recurrence is expanded forward.
--   start_time  = optional local time; NULL means all-day / untimed
--                 (e.g. "take her to the park sometime today").
--
-- Times are stored as plain date/time in the user's local timezone.
-- This is a single-user personal planner, so we deliberately avoid
-- timestamptz to keep month-view queries trivial and dodge all-day /
-- timezone-boundary bugs.
-- ---------------------------------------------------------------------
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  person_id   uuid references people (id) on delete set null,

  type        text not null default 'task'
                check (type in ('task', 'appointment', 'outing')),
  title       text not null,
  notes       text,
  location    text,

  event_date  date not null,          -- anchor date (first occurrence)
  start_time  time,                   -- NULL = all-day / untimed
  end_time    time,

  -- Recurrence rule (RRULE-lite). All NULL/absent => one-off event.
  recurrence_freq      text
                         check (recurrence_freq in
                                ('daily', 'weekly', 'monthly', 'yearly')),
  recurrence_interval  int not null default 1,   -- every N freq units
  recurrence_byweekday smallint[],               -- 0=Sun .. 6=Sat (weekly)
  recurrence_until     date,                      -- inclusive end, or NULL
  recurrence_count     int,                       -- max occurrences, or NULL

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  check (end_time is null or start_time is null or end_time >= start_time)
);

-- ---------------------------------------------------------------------
-- Event occurrences: per-date state overlaid on an event.
--
-- One row exists only when a specific occurrence has been acted on:
--   * completed / skipped a single occurrence
--   * rescheduled or edited just one occurrence of a recurring series
--
-- occurrence_date = the ORIGINAL date of the occurrence (the key we
-- match against when expanding recurrence). override_date moves it.
-- This mirrors the existing habit_logs pattern.
-- ---------------------------------------------------------------------
create table if not exists event_occurrences (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  event_id        uuid not null references events (id) on delete cascade,

  occurrence_date date not null,       -- original date of this occurrence

  status          text not null default 'done'
                    check (status in ('done', 'skipped', 'rescheduled')),
  completed_at    timestamptz,

  -- Single-occurrence overrides (all NULL = no edit, just a status change)
  override_date       date,
  override_title      text,
  override_start_time time,
  override_end_time   time,
  override_notes      text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (event_id, occurrence_date)
);

-- ---------------------------------------------------------------------
-- Indexes for the common read paths (month view + filtering)
-- ---------------------------------------------------------------------
create index if not exists events_user_date_idx
  on events (user_id, event_date);
create index if not exists events_user_person_idx
  on events (user_id, person_id);
create index if not exists events_recurring_idx
  on events (user_id, event_date)
  where recurrence_freq is not null;

create index if not exists event_occurrences_event_idx
  on event_occurrences (event_id, occurrence_date);
create index if not exists event_occurrences_user_date_idx
  on event_occurrences (user_id, occurrence_date);

create index if not exists people_user_idx
  on people (user_id);

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

drop trigger if exists events_updated_at on events;
create trigger events_updated_at
  before update on events
  for each row execute function set_updated_at();

drop trigger if exists event_occurrences_updated_at on event_occurrences;
create trigger event_occurrences_updated_at
  before update on event_occurrences
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security: every user can only see/change their own rows.
-- Same pattern as the base schema. This is the security boundary.
-- ---------------------------------------------------------------------
alter table people            enable row level security;
alter table events            enable row level security;
alter table event_occurrences enable row level security;

drop policy if exists "own people" on people;
create policy "own people" on people
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own events" on events;
create policy "own events" on events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own event occurrences" on event_occurrences;
create policy "own event occurrences" on event_occurrences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
