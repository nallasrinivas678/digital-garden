-- =====================================================================
-- Optional cleanup — Supabase schema
-- Only needed if you ran an earlier version of schema.sql that created
-- journal_entries/habits/habit_logs. That feature was never built in the
-- UI, so this drops the now-unused tables. Safe to run even if they don't
-- exist. Run in the Supabase SQL Editor (Dashboard → SQL → New query).
-- =====================================================================

drop table if exists habit_logs cascade;
drop table if exists habits cascade;
drop table if exists journal_entries cascade;
