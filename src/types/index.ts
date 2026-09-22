// Domain types. These mirror the Supabase schema and are shared across
// the whole app. Kept framework-agnostic on purpose so they can be reused
// verbatim in a future Expo (React Native) port.

// ---------------------------------------------------------------------------
// Scheduler (events table) — a single table backs Tasks, Upcoming
// (appointments/outings), and recurrence; see docs/scheduler-plan.md.
// ---------------------------------------------------------------------------

export type EventType = 'task' | 'appointment' | 'outing'
export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type TaskPriority = 'none' | 'low' | 'medium' | 'high'

export interface Event {
  id: string
  user_id: string
  person_id: string | null
  type: EventType
  title: string
  notes: string | null
  location: string | null
  event_date: string // ISO date — due date for a task
  start_time: string | null
  end_time: string | null
  recurrence_freq: RecurrenceFreq | null
  recurrence_interval: number
  recurrence_byweekday: number[] | null
  recurrence_until: string | null
  recurrence_count: number | null
  priority: TaskPriority
  tags: string[]
  remind_enabled: boolean
  remind_minutes_before: number
  created_at: string
  updated_at: string
}

export interface EventOccurrence {
  id: string
  user_id: string
  event_id: string
  occurrence_date: string
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

// A task as the Tasks view renders it: an `events` row (type='task')
// resolved to its current occurrence (see currentTaskOccurrence in
// lib/recurrence.ts) with completion state from `event_occurrences`.
export interface Task {
  id: string
  title: string
  due_date: string // ISO date — the resolved current occurrence
  done: boolean
  recurring: boolean
  recurrence_freq: RecurrenceFreq | null
  notes: string | null
  priority: TaskPriority
  tags: string[]
  remind_enabled: boolean
  remind_minutes_before: number
}

// What the Calendar view actually renders: a concrete occurrence of an
// event, with the series + any single-occurrence override already resolved.
export interface ScheduledItem {
  event: Event
  occurrence_date: string // original (pre-override) date of this occurrence
  date: string // resolved date, after any reschedule
  start_time: string | null
  end_time: string | null
  title: string
  done: boolean
}

// ---------------------------------------------------------------------------
// Career — job application tracker.
// ---------------------------------------------------------------------------

export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'rejected'
  | 'withdrawn'
export type RemoteType = 'remote' | 'hybrid' | 'onsite'

export interface JobApplication {
  id: string
  user_id: string
  company: string
  role_title: string
  status: ApplicationStatus
  applied_date: string | null // ISO date, null while status = 'saved'
  job_url: string | null
  location: string | null
  remote_type: RemoteType | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  contact_name: string | null
  contact_email: string | null
  contact_linkedin: string | null
  next_follow_up: string | null // ISO date
  notes: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Garden (notes) — tech notes, coding exercises, system design write-ups.
// ---------------------------------------------------------------------------

export type NoteType = 'tech-note' | 'exercise' | 'system-design'
export type NoteStatus = 'draft' | 'published'

export interface Note {
  id: string
  user_id: string
  title: string
  slug: string
  body: string // markdown source
  type: NoteType
  tags: string[]
  status: NoteStatus
  published_at: string | null
  created_at: string
  updated_at: string
}
