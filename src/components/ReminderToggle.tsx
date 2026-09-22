import { useEffect, useRef, useState } from 'react'

const OFFSET_OPTIONS = [
  { value: 0, label: 'At due time' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
]

interface ReminderToggleProps {
  enabled: boolean
  minutesBefore: number
  onChange: (fields: { remindEnabled: boolean; remindMinutesBefore: number }) => void
  className?: string
}

/** Small ⏰ popover toggle for enabling an in-app reminder and picking a lead time. */
export default function ReminderToggle({ enabled, minutesBefore, onChange, className }: ReminderToggleProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className={`relative inline-block ${className ?? ''}`} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={enabled ? 'Reminder set' : 'Set reminder'}
        title={enabled ? `Reminder: ${OFFSET_OPTIONS.find((o) => o.value === minutesBefore)?.label ?? `${minutesBefore}m before`}` : 'Set reminder'}
        className={`h-6 w-6 shrink-0 flex items-center justify-center transition-colors ${
          enabled ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        ⏰
      </button>

      {open && (
        <div className="absolute z-20 right-0 mt-1 w-48 card-glow rounded-xl bg-surface-card p-2.5 space-y-2">
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onChange({ remindEnabled: e.target.checked, remindMinutesBefore: minutesBefore })}
            />
            Remind me
          </label>
          <select
            value={minutesBefore}
            disabled={!enabled}
            onChange={(e) => onChange({ remindEnabled: enabled, remindMinutesBefore: Number(e.target.value) })}
            className="w-full text-xs rounded bg-surface-base border border-surface-border px-1.5 py-1 disabled:opacity-40"
          >
            {OFFSET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
