// Data layer: every Supabase read/write the UI needs, wrapped in react-query
// hooks. UI components never touch Supabase directly — they call these. That
// separation is what makes a future Expo port mostly a copy of this file.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from './auth'
import { todayISO } from './dates'
import { currentTaskOccurrence, resolveScheduledItems } from './recurrence'
import { randomSuffix, slugify } from './slug'
import type {
  ApplicationStatus,
  Event,
  EventOccurrence,
  JobApplication,
  Note,
  RecurrenceFreq,
  RemoteType,
  ScheduledItem,
  Task,
  TaskPriority,
} from '../types'

// ---------------------------------------------------------------------------
// Tasks (a slice of the `events` scheduler table — see docs/scheduler-plan.md)
// ---------------------------------------------------------------------------

async function fetchEventOccurrences(eventIds: string[]): Promise<EventOccurrence[]> {
  if (eventIds.length === 0) return []
  const { data, error } = await supabase.from('event_occurrences').select('*').in('event_id', eventIds)
  if (error) throw error
  return (data ?? []) as EventOccurrence[]
}

/**
 * All tasks, each resolved to its "current" occurrence (see
 * currentTaskOccurrence) and sorted by that due date ascending — overdue
 * first, then today, then upcoming. Recurring tasks reset to their next
 * occurrence once the current one is checked off.
 */
export function useOpenTasks() {
  const { user } = useAuth()
  const today = todayISO()
  return useQuery({
    queryKey: ['tasks', user?.id, today],
    enabled: !!user,
    queryFn: async (): Promise<Task[]> => {
      const { data: events, error: eErr } = await supabase.from('events').select('*').eq('type', 'task')
      if (eErr) throw eErr

      const typedEvents = (events ?? []) as Event[]
      const occurrences = await fetchEventOccurrences(typedEvents.map((e) => e.id))
      const occByEvent = new Map<string, EventOccurrence[]>()
      for (const o of occurrences) {
        const arr = occByEvent.get(o.event_id) ?? []
        arr.push(o)
        occByEvent.set(o.event_id, arr)
      }

      const tasks: Task[] = []
      for (const e of typedEvents) {
        const current = currentTaskOccurrence(e, occByEvent.get(e.id) ?? [], today)
        if (!current) continue // finite recurring series that has run out
        tasks.push({
          id: e.id,
          title: e.title,
          due_date: current.date,
          done: current.done,
          recurring: !!e.recurrence_freq,
          recurrence_freq: e.recurrence_freq,
          notes: e.notes,
          priority: e.priority,
          tags: e.tags,
          remind_enabled: e.remind_enabled,
          remind_minutes_before: e.remind_minutes_before,
        })
      }
      tasks.sort((a, b) => a.due_date.localeCompare(b.due_date))
      return tasks
    },
  })
}

export interface CreateTaskInput {
  title: string
  dueDate: string
  recurrenceFreq?: RecurrenceFreq | null
  recurrenceInterval?: number
  notes?: string | null
  priority?: TaskPriority
  tags?: string[]
  remindEnabled?: boolean
  remindMinutesBefore?: number
}

export function useCreateTask() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!user) throw new Error('Not signed in')
      const { error } = await supabase.from('events').insert({
        user_id: user.id,
        type: 'task',
        title: input.title,
        event_date: input.dueDate,
        recurrence_freq: input.recurrenceFreq ?? null,
        recurrence_interval: input.recurrenceInterval ?? 1,
        notes: input.notes ?? null,
        priority: input.priority ?? 'none',
        tags: input.tags ?? [],
        remind_enabled: input.remindEnabled ?? false,
        remind_minutes_before: input.remindMinutesBefore ?? 0,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', user?.id] }),
  })
}

/** Check/uncheck a single occurrence of a task or calendar event as done. */
export function useToggleTask() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { eventId: string; dueDate: string; done: boolean }) => {
      if (!user) throw new Error('Not signed in')
      if (input.done) {
        const { error } = await supabase.from('event_occurrences').upsert(
          {
            user_id: user.id,
            event_id: input.eventId,
            occurrence_date: input.dueDate,
            status: 'done',
            completed_at: new Date().toISOString(),
          },
          { onConflict: 'event_id,occurrence_date' },
        )
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('event_occurrences')
          .delete()
          .eq('event_id', input.eventId)
          .eq('occurrence_date', input.dueDate)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', user?.id] })
      qc.invalidateQueries({ queryKey: ['events-range', user?.id] })
    },
  })
}

// ---------------------------------------------------------------------------
// Calendar (full `events` range — tasks, appointments, outings)
// ---------------------------------------------------------------------------

/** Every event of any type touching [start, end], expanded + overlaid. */
export function useEventsInRange(start: string, end: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['events-range', user?.id, start, end],
    enabled: !!user,
    queryFn: async (): Promise<ScheduledItem[]> => {
      const [oneOff, recurring] = await Promise.all([
        supabase.from('events').select('*').is('recurrence_freq', null).gte('event_date', start).lte('event_date', end),
        supabase
          .from('events')
          .select('*')
          .not('recurrence_freq', 'is', null)
          .lte('event_date', end)
          .or(`recurrence_until.is.null,recurrence_until.gte.${start}`),
      ])
      if (oneOff.error) throw oneOff.error
      if (recurring.error) throw recurring.error

      const events = [...((oneOff.data ?? []) as Event[]), ...((recurring.data ?? []) as Event[])]
      const occurrences = await fetchEventOccurrences(events.map((e) => e.id))
      const occByEvent = new Map<string, EventOccurrence[]>()
      for (const o of occurrences) {
        const arr = occByEvent.get(o.event_id) ?? []
        arr.push(o)
        occByEvent.set(o.event_id, arr)
      }

      return resolveScheduledItems(events, occByEvent, start, end)
    },
  })
}

export interface CreateEventInput {
  title: string
  type: 'task' | 'appointment' | 'outing'
  date: string
  startTime?: string | null
  endTime?: string | null
  recurrenceFreq?: RecurrenceFreq | null
  recurrenceInterval?: number
  tags?: string[]
  remindEnabled?: boolean
  remindMinutesBefore?: number
}

export function useCreateEvent() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      if (!user) throw new Error('Not signed in')
      const { error } = await supabase.from('events').insert({
        user_id: user.id,
        type: input.type,
        title: input.title,
        event_date: input.date,
        start_time: input.startTime ?? null,
        end_time: input.endTime ?? null,
        recurrence_freq: input.recurrenceFreq ?? null,
        recurrence_interval: input.recurrenceInterval ?? 1,
        tags: input.tags ?? [],
        remind_enabled: input.remindEnabled ?? false,
        remind_minutes_before: input.remindMinutesBefore ?? 0,
      })
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['events-range', user?.id] })
      if (variables.type === 'task') qc.invalidateQueries({ queryKey: ['tasks', user?.id] })
    },
  })
}

export interface UpdateEventInput {
  id: string
  title?: string
  date?: string
  startTime?: string | null
  endTime?: string | null
  recurrenceFreq?: RecurrenceFreq | null
  recurrenceInterval?: number
  notes?: string | null
  priority?: TaskPriority
  tags?: string[]
  remindEnabled?: boolean
  remindMinutesBefore?: number
}

/** Edit an event's core fields (title, due/anchor date, time, recurrence). */
export function useUpdateEvent() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateEventInput) => {
      const { id, date, startTime, endTime, recurrenceFreq, remindEnabled, remindMinutesBefore, ...rest } = input
      const fields: Record<string, unknown> = { ...rest }
      if (date !== undefined) fields.event_date = date
      if (startTime !== undefined) fields.start_time = startTime
      if (endTime !== undefined) fields.end_time = endTime
      if (recurrenceFreq !== undefined) fields.recurrence_freq = recurrenceFreq
      if (remindEnabled !== undefined) fields.remind_enabled = remindEnabled
      if (remindMinutesBefore !== undefined) fields.remind_minutes_before = remindMinutesBefore
      const { error } = await supabase.from('events').update(fields).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', user?.id] })
      qc.invalidateQueries({ queryKey: ['events-range', user?.id] })
    },
  })
}

export function useDeleteEvent() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', user?.id] })
      qc.invalidateQueries({ queryKey: ['events-range', user?.id] })
    },
  })
}

// ---------------------------------------------------------------------------
// Garden (notes)
// ---------------------------------------------------------------------------

/** All of the signed-in user's notes (draft + published), newest-edited first. */
export function useNotes() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['notes', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Note[]> => {
      const { data, error } = await supabase.from('notes').select('*').order('updated_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Note[]
    },
  })
}

/** A single note by id, for the editor. Owner-only (RLS). */
export function useNote(id: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['note', id],
    enabled: !!user && !!id,
    queryFn: async (): Promise<Note | null> => {
      const { data, error } = await supabase.from('notes').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data as Note | null
    },
  })
}

/** A published note by slug, for the public reader page. Works signed-out. */
export function usePublicNote(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-note', slug],
    enabled: !!slug,
    queryFn: async (): Promise<Note | null> => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()
      if (error) throw error
      return data as Note | null
    },
  })
}

export function useCreateNote() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { title: string }) => {
      if (!user) throw new Error('Not signed in')
      const slug = `${slugify(input.title)}-${randomSuffix()}`
      const { data, error } = await supabase
        .from('notes')
        .insert({ user_id: user.id, title: input.title, slug })
        .select()
        .single()
      if (error) throw error
      return data as Note
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', user?.id] }),
  })
}

export interface UpdateNoteInput {
  id: string
  title?: string
  slug?: string
  body?: string
  type?: Note['type']
  tags?: string[]
  status?: Note['status']
  published_at?: string | null
}

export function useUpdateNote() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateNoteInput) => {
      const { id, ...fields } = input
      const { data, error } = await supabase.from('notes').update(fields).eq('id', id).select().single()
      if (error) throw error
      return data as Note
    },
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ['notes', user?.id] })
      qc.invalidateQueries({ queryKey: ['note', note.id] })
      qc.invalidateQueries({ queryKey: ['public-note', note.slug] })
    },
  })
}

export function useDeleteNote() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', user?.id] }),
  })
}

// ---------------------------------------------------------------------------
// Career (job applications)
// ---------------------------------------------------------------------------

const APPLICATION_STATUS_ORDER: Record<ApplicationStatus, number> = {
  saved: 0,
  applied: 1,
  interviewing: 2,
  offer: 3,
  rejected: 4,
  withdrawn: 5,
}

/** All job applications, grouped by status then soonest follow-up, newest first within that. */
export function useJobApplications() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['job-applications', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<JobApplication[]> => {
      const { data, error } = await supabase.from('job_applications').select('*')
      if (error) throw error
      const applications = (data ?? []) as JobApplication[]
      applications.sort((a, b) => {
        const statusDiff = APPLICATION_STATUS_ORDER[a.status] - APPLICATION_STATUS_ORDER[b.status]
        if (statusDiff !== 0) return statusDiff
        if (a.next_follow_up !== b.next_follow_up) {
          if (!a.next_follow_up) return 1
          if (!b.next_follow_up) return -1
          return a.next_follow_up.localeCompare(b.next_follow_up)
        }
        return b.created_at.localeCompare(a.created_at)
      })
      return applications
    },
  })
}

export interface CreateJobApplicationInput {
  company: string
  roleTitle: string
  status?: ApplicationStatus
  appliedDate?: string | null
}

export function useCreateJobApplication() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateJobApplicationInput) => {
      if (!user) throw new Error('Not signed in')
      const { error } = await supabase.from('job_applications').insert({
        user_id: user.id,
        company: input.company,
        role_title: input.roleTitle,
        status: input.status ?? 'saved',
        applied_date: input.appliedDate ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-applications', user?.id] }),
  })
}

export interface UpdateJobApplicationInput {
  id: string
  company?: string
  roleTitle?: string
  status?: ApplicationStatus
  appliedDate?: string | null
  jobUrl?: string | null
  location?: string | null
  remoteType?: RemoteType | null
  salaryMin?: number | null
  salaryMax?: number | null
  salaryCurrency?: string
  contactName?: string | null
  contactEmail?: string | null
  contactLinkedin?: string | null
  nextFollowUp?: string | null
  notes?: string | null
}

export function useUpdateJobApplication() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateJobApplicationInput) => {
      const { id, roleTitle, appliedDate, jobUrl, remoteType, salaryMin, salaryMax, salaryCurrency,
        contactName, contactEmail, contactLinkedin, nextFollowUp, ...rest } = input
      const fields: Record<string, unknown> = { ...rest }
      if (roleTitle !== undefined) fields.role_title = roleTitle
      if (appliedDate !== undefined) fields.applied_date = appliedDate
      if (jobUrl !== undefined) fields.job_url = jobUrl
      if (remoteType !== undefined) fields.remote_type = remoteType
      if (salaryMin !== undefined) fields.salary_min = salaryMin
      if (salaryMax !== undefined) fields.salary_max = salaryMax
      if (salaryCurrency !== undefined) fields.salary_currency = salaryCurrency
      if (contactName !== undefined) fields.contact_name = contactName
      if (contactEmail !== undefined) fields.contact_email = contactEmail
      if (contactLinkedin !== undefined) fields.contact_linkedin = contactLinkedin
      if (nextFollowUp !== undefined) fields.next_follow_up = nextFollowUp
      const { error } = await supabase.from('job_applications').update(fields).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-applications', user?.id] }),
  })
}

export function useDeleteJobApplication() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('job_applications').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-applications', user?.id] }),
  })
}
