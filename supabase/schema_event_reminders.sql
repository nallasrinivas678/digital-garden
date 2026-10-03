-- In-app reminders for events (tasks, appointments, outings). No push/email
-- delivery -- these columns just describe "how long before this occurrence's
-- due moment should the app notify me while I have it open", computed
-- per-occurrence client-side (see src/lib/reminders.ts). Additive and safe to
-- re-run.

alter table events add column if not exists remind_enabled boolean not null default false;
alter table events add column if not exists remind_minutes_before int not null default 0
  check (remind_minutes_before >= 0);
