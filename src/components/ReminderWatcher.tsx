import { useEffect, useRef } from 'react'
import { useOpenTasks, useEventsInRange } from '../lib/hooks'
import { addDaysISO, todayISO } from '../lib/dates'
import { computeReminderMoment, dedupKey, pruneOldReminderMarks } from '../lib/reminders'
import { getNotificationPermission, showNotification } from '../lib/notifications'
import { showToast } from './Toast'

const POLL_MS = 30_000
const FIRE_WINDOW_MS = 2 * 60_000
const LOOKAHEAD_DAYS = 2

/**
 * Always-mounted, renders nothing. Polls already-fetched task/event data for
 * due reminders and fires a Notification (or an in-app toast fallback) --
 * in-app only, so this only works while the tab is open.
 */
export default function ReminderWatcher() {
  const today = todayISO()
  const { data: tasks } = useOpenTasks()
  const { data: items } = useEventsInRange(today, addDaysISO(today, LOOKAHEAD_DAYS))
  const tasksRef = useRef(tasks)
  const itemsRef = useRef(items)
  tasksRef.current = tasks
  itemsRef.current = items

  useEffect(() => {
    pruneOldReminderMarks()

    function tick() {
      const now = new Date()

      for (const task of tasksRef.current ?? []) {
        if (task.done) continue
        const moment = computeReminderMoment({ start_time: null, remind_enabled: task.remind_enabled, remind_minutes_before: task.remind_minutes_before }, task.due_date)
        if (!moment) continue
        fireIfDue(task.id, task.due_date, moment, now, `Task due: ${task.title}`)
      }

      for (const item of itemsRef.current ?? []) {
        if (item.done || item.event.type === 'task') continue
        const moment = computeReminderMoment(
          { start_time: item.start_time, remind_enabled: item.event.remind_enabled, remind_minutes_before: item.event.remind_minutes_before },
          item.date,
        )
        if (!moment) continue
        fireIfDue(item.event.id, item.occurrence_date, moment, now, `Upcoming: ${item.title}`)
      }
    }

    function fireIfDue(eventId: string, occurrenceDate: string, moment: Date, now: Date, message: string) {
      if (now < moment) return
      if (now.getTime() - moment.getTime() > FIRE_WINDOW_MS) return
      const key = dedupKey(eventId, occurrenceDate)
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, '1')
      if (getNotificationPermission() === 'granted') {
        showNotification('TaskTide reminder', message)
      } else {
        showToast(message)
      }
    }

    tick()
    const interval = setInterval(tick, POLL_MS)
    return () => clearInterval(interval)
  }, [])

  return null
}
