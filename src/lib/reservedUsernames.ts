// Mirrors the check constraint on portfolio_profiles.username in
// supabase/schema_portfolio.sql — keep these two lists in sync. The DB
// constraint is the final authority; this is just for instant client-side
// feedback in the username field.
export const RESERVED_USERNAMES = new Set([
  'app',
  'login',
  'privacy',
  'notes',
  'projects',
  'onboarding',
  'api',
  'admin',
  'www',
  'auth',
])

const USERNAME_PATTERN = /^[a-z][a-z0-9-]{2,29}$/

export function usernameError(username: string): string | null {
  if (!username) return 'Required'
  if (!USERNAME_PATTERN.test(username)) {
    return 'Lowercase letters, numbers, and hyphens only, starting with a letter (3–30 characters)'
  }
  if (RESERVED_USERNAMES.has(username)) return 'That username is reserved'
  return null
}
