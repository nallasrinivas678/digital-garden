// Recurrence expansion for the `events` scheduler table (RRULE-lite — see
// docs/scheduler-plan.md). Expansion happens here, in TypeScript, rather
// than in Postgres: this is a single-user personal planner with a tiny
// dataset, so there's no need for generate_series or materialized rows.

import { addDaysISO, addMonthsISO, addYearsISO, startOfWeekISO, weekdayOfISO } from './dates'
import type { Event, EventOccurrence, ScheduledItem } from '../types'

// Safety cap on occurrences generated per event per call. Bounds the loop
// for open-ended series (no recurrence_until/count) — e.g. ~5.5 years for a
// daily task. Fine for a personal planner; revisit if that's ever not true.
const MAX_OCCURRENCES = 2000

/** Concrete anchor dates for `event` that fall within [rangeStart, rangeEnd]. */
export function expandEventDates(event: Event, rangeStart: string, rangeEnd: string): string[] {
  const anchor = event.event_date
  if (!event.recurrence_freq) {
    return anchor >= rangeStart && anchor <= rangeEnd ? [anchor] : []
  }
  if (anchor > rangeEnd) return []

  const interval = Math.max(1, event.recurrence_interval || 1)
  const until = event.recurrence_until
  const maxCount = event.recurrence_count
  const dates: string[] = []

  if (event.recurrence_freq === 'weekly') {
    const weekdays = event.recurrence_byweekday?.length
      ? [...event.recurrence_byweekday].sort((a, b) => a - b)
      : [weekdayOfISO(anchor)]

    let weekStart = startOfWeekISO(anchor)
    let occurrenceIndex = 0
    for (let i = 0; i < MAX_OCCURRENCES && weekStart <= rangeEnd; i++) {
      for (const wd of weekdays) {
        const candidate = addDaysISO(weekStart, wd)
        if (candidate < anchor) continue
        if (until && candidate > until) return dates
        if (maxCount != null && occurrenceIndex >= maxCount) return dates
        if (candidate >= rangeStart && candidate <= rangeEnd) dates.push(candidate)
        occurrenceIndex++
      }
      weekStart = addDaysISO(weekStart, 7 * interval)
    }
    return dates
  }

  const step = (iso: string) =>
    event.recurrence_freq === 'daily'
      ? addDaysISO(iso, interval)
      : event.recurrence_freq === 'monthly'
        ? addMonthsISO(iso, interval)
        : addYearsISO(iso, interval)

  let cursor = anchor
  let occurrenceIndex = 0
  for (let i = 0; i < MAX_OCCURRENCES && cursor <= rangeEnd; i++) {
    if (until && cursor > until) break
    if (maxCount != null && occurrenceIndex >= maxCount) break
    if (cursor >= rangeStart) dates.push(cursor)
    occurrenceIndex++
    cursor = step(cursor)
  }
  return dates
}

/**
 * Expand a set of events into resolved, displayable occurrences within a
 * range, overlaying event_occurrences (done/skipped/rescheduled). Does not
 * handle an occurrence rescheduled INTO this range from outside it — a rare
 * edge case, left for later.
 */
export function resolveScheduledItems(
  events: Event[],
  occurrencesByEvent: Map<string, EventOccurrence[]>,
  rangeStart: string,
  rangeEnd: string,
): ScheduledItem[] {
  const items: ScheduledItem[] = []

  for (const event of events) {
    const occByDate = new Map(
      (occurrencesByEvent.get(event.id) ?? []).map((o) => [o.occurrence_date, o]),
    )
    for (const occurrenceDate of expandEventDates(event, rangeStart, rangeEnd)) {
      const occ = occByDate.get(occurrenceDate)
      if (occ?.status === 'skipped') continue
      const resolvedDate = occ?.status === 'rescheduled' && occ.override_date ? occ.override_date : occurrenceDate
      items.push({
        event,
        occurrence_date: occurrenceDate,
        date: resolvedDate,
        start_time: occ?.override_start_time ?? event.start_time,
        end_time: occ?.override_end_time ?? event.end_time,
        title: occ?.override_title ?? event.title,
        done: occ?.status === 'done',
      })
    }
  }

  return items.sort(
    (a, b) => a.date.localeCompare(b.date) || (a.start_time ?? '').localeCompare(b.start_time ?? ''),
  )
}

/**
 * The "current" occurrence of a task for a todo-list view: the earliest
 * not-done occurrence on or before `today`, or — if everything up to today
 * is done (or the series hasn't started) — the next occurrence after today.
 * Returns null once a finite series has run out.
 */
export function currentTaskOccurrence(
  event: Event,
  occurrences: EventOccurrence[],
  today: string,
): { date: string; done: boolean } | null {
  if (!event.recurrence_freq) {
    const occ = occurrences.find((o) => o.occurrence_date === event.event_date)
    return { date: event.event_date, done: occ?.status === 'done' }
  }

  const doneDates = new Set(occurrences.filter((o) => o.status === 'done').map((o) => o.occurrence_date))

  const upToToday = expandEventDates(event, event.event_date, today)
  const pending = upToToday.find((d) => !doneDates.has(d))
  if (pending) return { date: pending, done: false }

  const future = expandEventDates(event, addDaysISO(today, 1), '9999-12-31')
  if (future.length > 0) return { date: future[0], done: false }

  return null
}
