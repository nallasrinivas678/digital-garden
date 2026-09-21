// Small, dependency-free date helpers. All dates in this app are handled as
// local "YYYY-MM-DD" strings so a day means the user's local calendar day,
// not a UTC instant. Portable to React Native as-is.

/** Local date as "YYYY-MM-DD". */
export function toISODate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Today as "YYYY-MM-DD" in the user's local timezone. */
export function todayISO(): string {
  return toISODate(new Date())
}

/** ISO date `n` days before the given ISO date (negative = future). */
export function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return toISODate(dt)
}

/** Human label like "Sun, Aug 2" for headings. */
export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Compact label like "Aug 2" — for tight spaces (date picker triggers, table cells). */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Day of week for an ISO date, 0=Sun..6=Sat, in local time. */
export function weekdayOfISO(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

/** The Sunday that starts the local week containing this ISO date. */
export function startOfWeekISO(iso: string): string {
  return addDaysISO(iso, -weekdayOfISO(iso))
}

/** ISO date `n` months after the given ISO date, clamped to the target
 * month's last day (so Jan 31 + 1 month = Feb 28/29, not a rollover to March). */
export function addMonthsISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const total = m - 1 + n
  const targetYear = y + Math.floor(total / 12)
  const targetMonth0 = ((total % 12) + 12) % 12
  const lastDay = new Date(targetYear, targetMonth0 + 1, 0).getDate()
  return toISODate(new Date(targetYear, targetMonth0, Math.min(d, lastDay)))
}

/** ISO date `n` years after the given ISO date (leap-day clamped as above). */
export function addYearsISO(iso: string, n: number): string {
  return addMonthsISO(iso, n * 12)
}
