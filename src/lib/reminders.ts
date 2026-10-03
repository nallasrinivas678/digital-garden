// Pure, dependency-free reminder-time math. No Supabase, no browser
// Notification calls here -- just "when should this occurrence's reminder
// fire" and the localStorage dedup key format, kept separate from the data
// layer so it stays portable to Expo like dates.ts/recurrence.ts.

import { addDaysISO } from './dates'

const DEDUP_PREFIX = 'reminder:'
const DEDUP_MAX_AGE_DAYS = 30

// Tasks have no start_time, so an untimed reminder is anchored to this local
// time of day on the due date.
const DEFAULT_TASK_DUE_TIME = '09:00'

interface ReminderSource {
  start_time: string | null
  remind_enabled: boolean
  remind_minutes_before: number
}

/** When this occurrence's reminder should fire, or null if reminders are off for this event. */
export function computeReminderMoment(source: ReminderSource, occurrenceDate: string): Date | null {
  if (!source.remind_enabled) return null
  const [y, m, d] = occurrenceDate.split('-').map(Number)
  const [hh, mm] = (source.start_time ?? DEFAULT_TASK_DUE_TIME).split(':').map(Number)
  const dueMoment = new Date(y, m - 1, d, hh, mm)
  return new Date(dueMoment.getTime() - source.remind_minutes_before * 60_000)
}

export function dedupKey(eventId: string, occurrenceDate: string): string {
  return `${DEDUP_PREFIX}${eventId}:${occurrenceDate}`
}

/** Drops dedup marks for occurrences more than ~30 days in the past, so localStorage doesn't grow unbounded. */
export function pruneOldReminderMarks(): void {
  const cutoff = addDaysISO(new Date().toISOString().slice(0, 10), -DEDUP_MAX_AGE_DAYS)
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(DEDUP_PREFIX)) continue
    const occurrenceDate = key.slice(key.lastIndexOf(':') + 1)
    if (occurrenceDate < cutoff) localStorage.removeItem(key)
  }
}
