import { useJobApplications, useOpenTasks, useEventsInRange } from '../lib/hooks'
import { todayISO } from '../lib/dates'
import { featureFlags } from '../lib/featureFlags'

// At-a-glance "what needs attention today" banner. Pure in-app reminder —
// no push/email — built from the same hooks Tasks/Career/Upcoming already
// call, so react-query dedupes the requests and this adds no extra fetches.
export default function TodayBrief() {
  const today = todayISO()
  const { data: tasks } = useOpenTasks()
  const { data: events } = useEventsInRange(today, today)
  const { data: applications } = useJobApplications()

  const ready = tasks && events && (!featureFlags.jobTracker || applications)
  if (!ready) return null

  const overdue = tasks.filter((t) => !t.done && t.due_date < today).length
  const dueToday = tasks.filter((t) => !t.done && t.due_date === today).length
  const appointmentsToday = events.filter((i) => i.event.type !== 'task' && !i.done).length
  const followUpsDue = featureFlags.jobTracker
    ? (applications ?? []).filter((a) => a.next_follow_up && a.next_follow_up <= today).length
    : 0

  const pills = [
    overdue > 0 && { label: `${overdue} overdue`, className: 'bg-red-100 text-red-700' },
    dueToday > 0 && { label: `${dueToday} due today`, className: 'bg-brand-100 text-brand-700' },
    appointmentsToday > 0 && {
      label: `${appointmentsToday} appointment${appointmentsToday === 1 ? '' : 's'} today`,
      className: 'bg-sky-100 text-sky-700',
    },
    followUpsDue > 0 && { label: `${followUpsDue} follow-up${followUpsDue === 1 ? '' : 's'} due`, className: 'bg-amber-100 text-amber-700' },
  ].filter(Boolean) as { label: string; className: string }[]

  return (
    <section className="card-glow rounded-xl bg-surface-card px-4 py-3 flex flex-wrap items-center gap-2">
      {pills.length === 0 ? (
        <p className="text-sm text-slate-500">You're all caught up 🎉</p>
      ) : (
        pills.map((p) => (
          <span key={p.label} className={`text-xs font-medium px-2.5 py-1 rounded-full ${p.className}`}>
            {p.label}
          </span>
        ))
      )}
    </section>
  )
}
