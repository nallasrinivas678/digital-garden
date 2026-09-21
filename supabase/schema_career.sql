-- =====================================================================
-- Career add-on — Supabase schema
-- Adds a job application tracker on top of the existing schema.
--
-- Run in the Supabase SQL Editor (Dashboard → SQL → New query).
-- ADDITIVE and idempotent: safe to re-run; it does NOT touch any
-- existing tables. Reuses set_updated_at(), created by schema.sql.
-- =====================================================================

create table if not exists job_applications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,

  company           text not null,
  role_title        text not null,
  status            text not null default 'saved'
                      check (status in
                        ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn')),

  applied_date      date,               -- null while status = 'saved'
  job_url           text,
  location          text,
  remote_type       text check (remote_type in ('remote', 'hybrid', 'onsite')),
  salary_min        int,
  salary_max        int,
  salary_currency   text not null default 'USD',

  contact_name      text,
  contact_email     text,
  contact_linkedin  text,

  next_follow_up    date,               -- surfaced like a reminder in the UI
  notes             text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Indexes for the common read paths (status filter, follow-up reminders)
-- ---------------------------------------------------------------------
create index if not exists job_applications_user_status_idx
  on job_applications (user_id, status);
create index if not exists job_applications_user_followup_idx
  on job_applications (user_id, next_follow_up)
  where next_follow_up is not null;

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

drop trigger if exists job_applications_updated_at on job_applications;
create trigger job_applications_updated_at
  before update on job_applications
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security: every user can only see/change their own rows.
-- Same pattern as the base schema. This is the security boundary.
-- ---------------------------------------------------------------------
alter table job_applications enable row level security;

drop policy if exists "own job applications" on job_applications;
create policy "own job applications" on job_applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
