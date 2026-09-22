import { useMemo, useState } from 'react'
import { useCreateEvent, useEventsInRange, useToggleTask, useUpdateEvent } from '../lib/hooks'
import { addDaysISO, prettyDate, todayISO } from '../lib/dates'
import DatePicker from '../components/DatePicker'
import TagChips from '../components/TagChips'
import ReminderToggle from '../components/ReminderToggle'
import type { EventType, RecurrenceFreq, ScheduledItem } from '../types'

const LOOKAHEAD_DAYS = 60

const TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'outing', label: 'Outing' },
]

const REPEAT_OPTIONS: { value: RecurrenceFreq | ''; label: string }[] = [
  { value: '', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

// The landing-page "what's coming up" panel: appointments and outings for
// the next couple of months, grouped by day, with a quick add form. Replaces
// the old month-grid Calendar — tasks already have their own due-date picker
// (see DatePicker + Tasks.tsx), so this view is just what's ahead.
export default function UpcomingAppointments() {
  const today = todayISO()
  const end = addDaysISO(today, LOOKAHEAD_DAYS)
  const { data: items, isLoading } = useEventsInRange(today, end)
  const toggle = useToggleTask()
  const updateEvent = useUpdateEvent()

  const groups = useMemo(() => {
    const upcoming = (items ?? []).filter((i) => i.event.type !== 'task')
    const map = new Map<string, ScheduledItem[]>()
    for (const item of upcoming) {
      const arr = map.get(item.date) ?? []
      arr.push(item)
      map.set(item.date, arr)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  const tagSuggestions = useMemo(
    () => Array.from(new Set((items ?? []).flatMap((i) => i.event.tags))).sort(),
    [items],
  )

  return (
    <div className="space-y-3">
      <header>
        <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Schedule</p>
        <h1 className="text-2xl font-semibold text-slate-900 mt-1">Upcoming</h1>
      </header>

      <section className="card-glow rounded-xl bg-surface-card p-4 space-y-4">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing scheduled in the next {LOOKAHEAD_DAYS} days.</p>
        ) : (
          groups.map(([date, dayItems]) => (
            <div key={date}>
              <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1.5">
                {date === today ? 'Today' : prettyDate(date)}
              </h2>
              <ul className="divide-y divide-surface-border">
                {dayItems.map((item) => (
                  <li key={`${item.event.id}-${item.occurrence_date}`} className="flex items-center gap-3 py-2.5">
                    <button
                      onClick={() =>
                        toggle.mutate({ eventId: item.event.id, dueDate: item.occurrence_date, done: !item.done })
                      }
                      aria-label={item.done ? 'Mark not done' : 'Mark done'}
                      className={`h-6 w-6 shrink-0 rounded-md border flex items-center justify-center transition ${
                        item.done ? 'bg-brand-600 border-brand-600' : 'border-surface-border'
                      }`}
                    >
                      {item.done ? (
                        <span className="text-xs text-white">✓</span>
                      ) : (
                        <span className="text-xs">{item.event.type === 'appointment' ? '📅' : '🚗'}</span>
                      )}
                    </button>
                    <span className={`flex-1 text-sm ${item.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {item.title}
                      {item.event.recurrence_freq && (
                        <span title="Repeats" className="ml-1.5 text-slate-400">
                          🔁
                        </span>
                      )}
                      <TagChips readOnly tags={item.event.tags} className="inline-flex ml-1.5 align-middle" />
                    </span>
                    {item.start_time && <span className="text-xs font-mono text-slate-500">{item.start_time}</span>}
                    <ReminderToggle
                      enabled={item.event.remind_enabled}
                      minutesBefore={item.event.remind_minutes_before}
                      onChange={(fields) => updateEvent.mutate({ id: item.event.id, ...fields })}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section className="card-glow rounded-xl bg-surface-card p-4">
        <AddEventForm defaultDate={today} tagSuggestions={tagSuggestions} />
      </section>
    </div>
  )
}

function AddEventForm({ defaultDate, tagSuggestions }: { defaultDate: string; tagSuggestions: string[] }) {
  const createEvent = useCreateEvent()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<EventType>('appointment')
  const [date, setDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState('')
  const [repeat, setRepeat] = useState<RecurrenceFreq | ''>('')
  const [tags, setTags] = useState<string[]>([])

  function onAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    createEvent.mutate(
      { title: trimmed, type, date, startTime: startTime || null, recurrenceFreq: repeat || null, tags },
      { onSuccess: () => { setTitle(''); setTags([]) } },
    )
  }

  return (
    <form onSubmit={onAdd} className="space-y-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add an appointment or outing…"
        className="w-full rounded-lg bg-surface-base border border-surface-border px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500"
      />
      <TagChips tags={tags} onChange={setTags} suggestions={tagSuggestions} />
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as EventType)}
          className="rounded-lg bg-surface-base border border-surface-border px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-brand-500"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <DatePicker
          value={date}
          onChange={setDate}
          className="rounded-lg bg-surface-base border border-surface-border px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none hover:border-brand-500 transition-colors"
        />
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-lg bg-surface-base border border-surface-border px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-brand-500"
        />
        <select
          value={repeat}
          onChange={(e) => setRepeat(e.target.value as RecurrenceFreq | '')}
          className="rounded-lg bg-surface-base border border-surface-border px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-brand-500"
        >
          {REPEAT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!title.trim() || createEvent.isPending}
          className="col-span-2 sm:col-auto sm:ml-auto rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-40 transition-colors"
        >
          {createEvent.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
