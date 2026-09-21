import { useEffect, useRef, useState } from 'react'
import { addDaysISO, shortDate, todayISO, toISODate } from '../lib/dates'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function monthGrid(year: number, month0: number) {
  const first = new Date(year, month0, 1)
  const last = new Date(year, month0 + 1, 0)
  return { daysInMonth: last.getDate(), firstWeekday: first.getDay() }
}

function monthOf(iso: string): { year: number; month0: number } {
  const [y, m] = iso.split('-').map(Number)
  return { year: y, month0: m - 1 }
}

interface DatePickerProps {
  value: string // ISO date
  onChange: (iso: string) => void
  className?: string // styling for the trigger button
  align?: 'left' | 'right'
}

/** A compact trigger button that opens a month-grid calendar popover to pick a date. */
export default function DatePicker({ value, onChange, className, align = 'left' }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => monthOf(value))
  const rootRef = useRef<HTMLDivElement>(null)
  const today = todayISO()

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function openPicker() {
    setView(monthOf(value || today))
    setOpen(true)
  }

  function pick(iso: string) {
    onChange(iso)
    setOpen(false)
  }

  function goMonth(delta: number) {
    let m = view.month0 + delta
    let y = view.year
    if (m < 0) {
      m = 11
      y -= 1
    } else if (m > 11) {
      m = 0
      y += 1
    }
    setView({ year: y, month0: m })
  }

  const { daysInMonth, firstWeekday } = monthGrid(view.year, view.month0)
  const monthLabel = new Date(view.year, view.month0, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="relative inline-block" ref={rootRef}>
      <button type="button" onClick={() => (open ? setOpen(false) : openPicker())} className={className}>
        {value ? shortDate(value) : 'Pick a date'}
      </button>

      {open && (
        <div
          className={`absolute z-20 mt-1 w-64 card-glow rounded-xl bg-surface-card p-3 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[
              { label: 'Today', iso: today },
              { label: 'Tomorrow', iso: addDaysISO(today, 1) },
              { label: 'Next week', iso: addDaysISO(today, 7) },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => pick(q.iso)}
                className="text-xs px-2 py-1 rounded-full bg-surface-hover text-slate-600 hover:text-slate-900 hover:bg-brand-100 transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-1.5">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              aria-label="Previous month"
              className="h-6 w-6 rounded text-slate-500 hover:text-slate-900 hover:bg-surface-hover transition-colors"
            >
              ‹
            </button>
            <span className="text-xs font-medium text-slate-800">{monthLabel}</span>
            <button
              type="button"
              onClick={() => goMonth(1)}
              aria-label="Next month"
              className="h-6 w-6 rounded text-slate-500 hover:text-slate-900 hover:bg-surface-hover transition-colors"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAY_LABELS.map((w, i) => (
              <div key={i} className="text-center text-[10px] font-mono text-slate-400 pb-0.5">
                {w}
              </div>
            ))}
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateISO = toISODate(new Date(view.year, view.month0, day))
              const isSelected = dateISO === value
              const isToday = dateISO === today
              return (
                <button
                  key={dateISO}
                  type="button"
                  onClick={() => pick(dateISO)}
                  className={`aspect-square rounded-md text-xs transition-colors ${
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : isToday
                        ? 'ring-1 ring-brand-500 text-slate-900 font-medium'
                        : 'text-slate-700 hover:bg-surface-hover'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
