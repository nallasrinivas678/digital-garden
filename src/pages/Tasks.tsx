import { useMemo, useState } from 'react'
import { useOpenTasks, useCreateTask, useToggleTask, useUpdateEvent, useDeleteEvent } from '../lib/hooks'
import { prettyDate, todayISO } from '../lib/dates'
import DatePicker from '../components/DatePicker'
import TagChips from '../components/TagChips'
import ReminderToggle from '../components/ReminderToggle'
import type { RecurrenceFreq, Task, TaskPriority } from '../types'

const REPEAT_OPTIONS: { value: RecurrenceFreq | ''; label: string }[] = [
  { value: '', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

const PRIORITY_CYCLE: TaskPriority[] = ['none', 'low', 'medium', 'high']
const PRIORITY_META: Record<TaskPriority, { label: string; dot: string }> = {
  none: { label: 'No priority', dot: 'border border-slate-300' },
  low: { label: 'Low priority', dot: 'bg-sky-400' },
  medium: { label: 'Medium priority', dot: 'bg-amber-500' },
  high: { label: 'High priority', dot: 'bg-red-500' },
}

// Shared cell styling: looks like plain text/table content until focused.
const cellInputClass =
  'w-full bg-transparent rounded px-1.5 py-1 text-sm text-slate-800 focus:outline-none focus:bg-surface-base focus:ring-1 focus:ring-brand-500'

export default function Tasks() {
  const today = todayISO()
  const { data: tasks, isLoading } = useOpenTasks()
  const toggleTask = useToggleTask()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()
  const tagSuggestions = useMemo(
    () => Array.from(new Set(tasks?.flatMap((t) => t.tags ?? []) ?? [])).sort(),
    [tasks],
  )

  return (
    <div className="space-y-3">
      <header>
        <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Tasks</p>
        <h1 className="text-2xl font-semibold text-slate-900 mt-1">{prettyDate(today)}</h1>
      </header>

      <section className="card-glow rounded-xl bg-surface-card overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-surface-border">
              <th className="w-9 px-2 sm:px-3 py-2 font-normal" />
              <th className="px-1.5 py-2 font-normal">Title</th>
              <th className="w-20 sm:w-36 px-1.5 py-2 font-normal">Due</th>
              <th className="hidden sm:table-cell w-32 px-1.5 py-2 font-normal">Repeat</th>
              <th className="w-16 px-1.5 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-sm text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              tasks?.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  today={today}
                  onToggle={() => toggleTask.mutate({ eventId: t.id, dueDate: t.due_date, done: !t.done })}
                  onEdit={(fields) => updateEvent.mutate({ id: t.id, ...fields })}
                  onDelete={() => deleteEvent.mutate(t.id)}
                  tagSuggestions={tagSuggestions}
                />
              ))
            )}
            <NewTaskRow today={today} tagSuggestions={tagSuggestions} />
          </tbody>
        </table>
      </section>
    </div>
  )
}

function TaskRow({
  task,
  today,
  onToggle,
  onEdit,
  onDelete,
  tagSuggestions,
}: {
  task: Task
  today: string
  onToggle: () => void
  onEdit: (fields: {
    title?: string
    date?: string
    recurrenceFreq?: RecurrenceFreq | null
    notes?: string | null
    priority?: TaskPriority
    tags?: string[]
    remindEnabled?: boolean
    remindMinutesBefore?: number
  }) => void
  onDelete: () => void
  tagSuggestions: string[]
}) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [notesOpen, setNotesOpen] = useState(false)
  const overdue = !task.done && task.due_date < today
  const isToday = task.due_date === today

  return (
    <>
      <tr className="group border-b border-surface-border last:border-0 hover:bg-surface-hover/50">
        <td className="px-2 sm:px-3 py-1.5">
          <button
            onClick={onToggle}
            aria-label={task.done ? 'Mark not done' : 'Mark done'}
            className={`h-6 w-6 shrink-0 rounded-md border flex items-center justify-center transition ${
              task.done ? 'bg-brand-600 border-brand-600' : 'border-surface-border'
            }`}
          >
            {task.done && <span className="text-xs text-white">✓</span>}
          </button>
        </td>
        <td className="py-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              title={PRIORITY_META[task.priority].label}
              aria-label={PRIORITY_META[task.priority].label}
              onClick={() =>
                onEdit({ priority: PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(task.priority) + 1) % PRIORITY_CYCLE.length] })
              }
              className="h-6 w-6 shrink-0 flex items-center justify-center"
            >
              <span className={`h-2.5 w-2.5 rounded-full transition-colors ${PRIORITY_META[task.priority].dot}`} />
            </button>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                const trimmed = title.trim()
                if (trimmed && trimmed !== task.title) onEdit({ title: trimmed })
                else setTitle(task.title)
              }}
              className={`${cellInputClass} ${task.done ? 'text-slate-400 line-through' : ''}`}
            />
            {(overdue || isToday) && (
              <span
                title={task.notes ? task.notes : 'No description'}
                aria-label={overdue ? 'Overdue' : 'Due today'}
                className={`shrink-0 cursor-default ${overdue ? 'text-red-500' : 'text-brand-600'}`}
              >
                🔔
              </span>
            )}
            {task.recurring && (
              <span title="Repeats" className="text-slate-500 shrink-0">
                🔁
              </span>
            )}
          </div>
          <TagChips
            tags={task.tags}
            onChange={(tags) => onEdit({ tags })}
            suggestions={tagSuggestions}
            className="mt-0.5 pl-7"
          />
        </td>
        <td className="py-1.5">
          <DatePicker
            value={task.due_date}
            onChange={(date) => onEdit({ date })}
            align="right"
            className={`w-full text-left rounded px-1.5 py-1 font-mono text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500 hover:bg-surface-hover ${
              overdue ? 'text-red-500' : isToday ? 'text-brand-600' : 'text-slate-500'
            }`}
          />
        </td>
        <td className="hidden sm:table-cell py-1.5">
          <select
            value={task.recurrence_freq ?? ''}
            onChange={(e) => onEdit({ recurrenceFreq: (e.target.value || null) as RecurrenceFreq | null })}
            className={`${cellInputClass} text-xs`}
          >
            {REPEAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </td>
        <td className="px-1.5 py-1.5">
          <div className="flex items-center">
            <ReminderToggle
              enabled={task.remind_enabled}
              minutesBefore={task.remind_minutes_before}
              onChange={(fields) => onEdit(fields)}
            />
            <button
              onClick={() => setNotesOpen(!notesOpen)}
              aria-label={notesOpen ? 'Hide notes' : 'Show notes'}
              title={task.notes ? 'Has notes' : 'Add notes'}
              className={`h-6 w-6 shrink-0 flex items-center justify-center transition-colors ${
                notesOpen || task.notes ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              📝
            </button>
            <button
              onClick={onDelete}
              aria-label="Delete task"
              className="h-6 w-6 shrink-0 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
            >
              ×
            </button>
          </div>
        </td>
      </tr>
      {notesOpen && (
        <tr className="border-b border-surface-border last:border-0">
          <td colSpan={5} className="px-3 pb-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                const trimmed = notes.trim()
                if (trimmed !== (task.notes ?? '')) onEdit({ notes: trimmed || null })
              }}
              placeholder="Notes…"
              rows={2}
              className="w-full resize-y rounded-lg bg-surface-base border border-surface-border px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500"
            />
          </td>
        </tr>
      )}
    </>
  )
}

function NewTaskRow({ today, tagSuggestions }: { today: string; tagSuggestions: string[] }) {
  const createTask = useCreateTask()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(today)
  const [repeat, setRepeat] = useState<RecurrenceFreq | ''>('')
  const [tags, setTags] = useState<string[]>([])

  function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    createTask.mutate(
      { title: trimmed, dueDate, recurrenceFreq: repeat || null, tags },
      { onSuccess: () => { setTitle(''); setTags([]) } },
    )
  }

  return (
    <tr>
      <td className="px-2 sm:px-3 py-1.5 text-slate-400">+</td>
      <td className="py-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          onBlur={submit}
          placeholder="Add a task…"
          className={`${cellInputClass} placeholder-slate-400`}
        />
        <TagChips tags={tags} onChange={setTags} suggestions={tagSuggestions} className="pl-1.5" />
      </td>
      <td className="py-1.5">
        <DatePicker
          value={dueDate}
          onChange={setDueDate}
          align="right"
          className="w-full text-left rounded px-1.5 py-1 font-mono text-xs text-slate-400 transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500 hover:bg-surface-hover"
        />
      </td>
      <td className="hidden sm:table-cell py-1.5">
        <select
          value={repeat}
          onChange={(e) => setRepeat(e.target.value as RecurrenceFreq | '')}
          className={`${cellInputClass} text-xs`}
        >
          {REPEAT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td />
    </tr>
  )
}
