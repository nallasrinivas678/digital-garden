-- =====================================================================
-- Task priority add-on — Supabase schema
-- Adds a priority column to the shared `events` table (tasks, appointments,
-- outings all live there — see schema_scheduler.sql). Only the Tasks UI
-- surfaces it today; appointments/outings just keep the 'none' default.
--
-- Run in the Supabase SQL Editor (Dashboard → SQL → New query).
-- ADDITIVE and idempotent: safe to re-run.
-- =====================================================================

alter table events add column if not exists priority text not null default 'none'
  check (priority in ('none', 'low', 'medium', 'high'));
