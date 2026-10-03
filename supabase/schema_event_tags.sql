-- Free-form tags on events (tasks, appointments, outings). Mirrors the
-- notes.tags text[] pattern in schema_notes.sql. Additive and safe to re-run.

alter table events add column if not exists tags text[] not null default '{}';

-- Not queried by the app yet (tag filtering is a future addition), but cheap
-- to have in place now for when it is.
create index if not exists events_tags_idx on events using gin (tags);
