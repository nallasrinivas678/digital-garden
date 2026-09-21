-- =====================================================================
-- Shared foundation — Supabase schema
-- Run this FIRST in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Every additive schema file in this folder (schema_scheduler.sql,
-- schema_career.sql, schema_notes.sql, ...) uses the trigger function
-- defined here to keep each table's `updated_at` current.
--
-- (This file used to also create journal/habit-tracking tables. That
-- feature was never built in the UI, so the tables were dropped — see
-- schema_drop_unused.sql if you already ran an earlier version of this
-- file and want them gone from your project too.)
-- =====================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
