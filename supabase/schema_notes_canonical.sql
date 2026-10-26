-- =====================================================================
-- Garden cross-posting add-on — Supabase schema
-- Adds an optional canonical_url to notes, so a post that's also
-- cross-posted to Medium/Substack can declare its canonical source
-- (normally its own public page, overridden only when the post was
-- first published elsewhere and mirrored into the Garden).
--
-- Run in the Supabase SQL Editor (Dashboard → SQL → New query).
-- ADDITIVE and idempotent: safe to re-run; does NOT touch any existing
-- rows or policies.
-- =====================================================================

alter table notes add column if not exists canonical_url text;
