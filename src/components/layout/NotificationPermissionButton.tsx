import { useState } from 'react'
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from '../../lib/notifications'

/** Explicit opt-in for reminder notifications -- Notification.requestPermission()
 * needs a user gesture, unlike WeatherWidget's silent geolocation prompt. */
export default function NotificationPermissionButton() {
  const [permission, setPermission] = useState(getNotificationPermission())

  if (!isNotificationSupported() || permission === 'granted') return null

  if (permission === 'denied') {
    return (
      <span
        title="Notifications blocked — reminders will show as in-app banners instead"
        className="text-slate-300 cursor-default"
      >
        🔕
      </span>
    )
  }

  return (
    <button
      onClick={async () => setPermission(await requestNotificationPermission())}
      title="Enable reminder notifications"
      aria-label="Enable reminder notifications"
      className="text-slate-400 hover:text-slate-700 transition-colors"
    >
      🔔
    </button>
  )
}
