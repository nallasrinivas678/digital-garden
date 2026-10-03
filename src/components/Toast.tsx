import { useEffect, useState } from 'react'

interface ToastMessage {
  id: number
  text: string
}

let nextId = 1
let listeners: ((toast: ToastMessage) => void)[] = []

/** Fire-and-forget in-app banner -- the fallback when Notification permission isn't granted. */
export function showToast(text: string): void {
  const toast = { id: nextId++, text }
  listeners.forEach((fn) => fn(toast))
}

const AUTO_DISMISS_MS = 8000

/** Mount once near the app root. Subscribes to showToast() and renders a dismissing stack. */
export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    function onToast(toast: ToastMessage) {
      setToasts((t) => [...t, toast])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), AUTO_DISMISS_MS)
    }
    listeners.push(onToast)
    return () => {
      listeners = listeners.filter((fn) => fn !== onToast)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-72">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card-glow rounded-xl bg-surface-card px-3 py-2.5 text-sm text-slate-800 flex items-start gap-2"
        >
          <span className="shrink-0">🔔</span>
          <span className="flex-1">{t.text}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="Dismiss"
            className="text-slate-400 hover:text-slate-700 shrink-0"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
