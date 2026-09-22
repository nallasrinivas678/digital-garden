// Thin wrapper around the browser Notification API. Not part of the Supabase
// data layer (see hooks.ts's header comment) -- same reasoning as weather.ts.

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

/** Must be called from a user gesture (e.g. a button click) in most browsers. */
export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return Promise.resolve('denied')
  return Notification.requestPermission()
}

export function showNotification(title: string, body: string): void {
  if (getNotificationPermission() !== 'granted') return
  new Notification(title, { body })
}
