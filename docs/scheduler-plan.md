# Scheduler — schema design plan

Adds a daily/monthly planner to the existing Journal & Habits app: daily tasks,
appointments, and outings (e.g. take your daughter to a class or the park), with
a rolling one-month view. Builds on the current Supabase schema; nothing existing
changes.

## Design decisions

- **One unified `events` table.** Tasks, appointments, and outings are the same
  shape — a titled thing on a date, sometimes with a time. A `type` column
  distinguishes them. A task is just an event with no `start_time`. This keeps
  the month view a single query instead of merging several tables.
- **Full recurrence.** A weekly class ("every Tuesday") is stored **once** as a
  recurrence rule on the event, not as 52 rows. Occurrences are expanded on read
  for the visible date range.
- **People tagging.** A small `people` table (You, Daughter, Family, …) lets you
  tag and filter the schedule — "show only my daughter's things this month".
- **Local dates/times, not `timestamptz`.** This is a single-user personal
  planner, so times are stored as plain `date` + `time` in your local zone. That
  makes month queries trivial (`event_date between …`) and avoids the classic
  all-day / timezone-boundary bugs. (If you ever add multi-timezone or sharing,
  revisit this.)

## Tables

**`people`** — who an item is for. `id, user_id, name, color, created_at`.
Optional per event.

**`events`** — the core table.

| column | purpose |
|---|---|
| `type` | `task` \| `appointment` \| `outing` |
| `title`, `notes`, `location` | what / details / where |
| `person_id` | optional tag → `people` |
| `event_date` | anchor date; for recurring items, the **first** occurrence |
| `start_time`, `end_time` | optional; `NULL` start = all-day / untimed |
| `recurrence_freq` | `daily`/`weekly`/`monthly`/`yearly`, or `NULL` for a one-off |
| `recurrence_interval` | every N units (e.g. 2 = every other week) |
| `recurrence_byweekday` | `smallint[]`, 0=Sun…6=Sat, for weekly rules |
| `recurrence_until` / `recurrence_count` | when the series stops (either, or neither = forever) |

**`event_occurrences`** — per-date overrides on a recurring (or one-off) event.
A row exists **only when a specific occurrence is acted on**: marked done,
skipped, or edited/moved on its own. Keyed by `(event_id, occurrence_date)` where
`occurrence_date` is the occurrence's original date. Mirrors your existing
`habit_logs` pattern.

| column | purpose |
|---|---|
| `status` | `done` \| `skipped` \| `rescheduled` |
| `completed_at` | when it was checked off |
| `override_date` | move just this one occurrence |
| `override_title` / `override_start_time` / `override_end_time` / `override_notes` | edit just this one |

This "series + sparse exceptions" model is how Google Calendar and iCal work: the
common case (an unmodified recurring item) costs zero extra rows.

## How the month view is built

For a visible range `[start, end]` (e.g. today → +1 month):

1. **One-off events** — `recurrence_freq is null and event_date between start and end`.
2. **Recurring series that could touch the range** —
   `recurrence_freq is not null and event_date <= end and (recurrence_until is null or recurrence_until >= start)`.
3. **Expand** each recurring series into concrete dates within `[start, end]` in
   TypeScript (tiny dataset — a personal planner). Apply `recurrence_interval`,
   `byweekday`, and stop at `recurrence_until` / `recurrence_count`.
4. **Overlay `event_occurrences`** for the range: drop `skipped` dates, move
   `rescheduled` ones to `override_date`, apply title/time overrides, and mark
   `done`.

Expansion stays in the app so the schema has no cron/materialization to maintain.
If lists ever get large, this same logic can move into a Postgres
`generate_series` RPC without changing the tables.

## RLS & indexes

- **RLS** on all three tables with the same `auth.uid() = user_id` policy as the
  base schema — the security boundary. Do not skip.
- **Indexes** cover the two hot paths: `(user_id, event_date)` for the month
  query, a partial index on recurring rows, `(user_id, person_id)` for filtering,
  and `(event_id, occurrence_date)` for overlaying occurrences.

## TypeScript types (to add to `src/types/index.ts`)

```ts
export type EventType = 'task' | 'appointment' | 'outing'
export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Person {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface Event {
  id: string
  user_id: string
  person_id: string | null
  type: EventType
  title: string
  notes: string | null
  location: string | null
  event_date: string          // ISO date, anchor / first occurrence
  start_time: string | null   // "HH:MM", null = all-day
  end_time: string | null
  recurrence_freq: RecurrenceFreq | null
  recurrence_interval: number
  recurrence_byweekday: number[] | null  // 0=Sun..6=Sat
  recurrence_until: string | null
  recurrence_count: number | null
  created_at: string
  updated_at: string
}

export interface EventOccurrence {
  id: string
  user_id: string
  event_id: string
  occurrence_date: string     // original date of the occurrence
  status: 'done' | 'skipped' | 'rescheduled'
  completed_at: string | null
  override_date: string | null
  override_title: string | null
  override_start_time: string | null
  override_end_time: string | null
  override_notes: string | null
  created_at: string
  updated_at: string
}

// What the calendar/day list actually renders: a concrete occurrence
// with the series + any override already resolved.
export interface ScheduledItem {
  event: Event
  date: string                // resolved date (after any reschedule)
  start_time: string | null
  end_time: string | null
  title: string
  done: boolean
}
```

## Next steps

1. Run `supabase/schema_scheduler.sql` in the Supabase SQL Editor.
2. Add the types above to `src/types/index.ts`.
3. Add hooks in `src/lib/hooks.ts`: `usePeople`, `useEventsInRange(start, end)`
   (does the expand + overlay), plus create/complete/skip mutations.
4. Build a `Schedule.tsx` page: a month grid + a per-day list, with a person
   filter; wire it into the navbar and router.

Open question for later: do you want reminders/notifications? That would add a
`remind_at` column (or a separate reminders table) and a scheduled task to fire
them — easy to bolt on once the core is in.
