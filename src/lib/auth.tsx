import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get any existing session on first load...
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    // ...then keep it in sync (login, logout, token refresh, OAuth return).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    loading,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

/**
 * First/last name from the signed-in user's OAuth profile. Google via
 * Supabase populates `given_name`/`family_name` on user_metadata; falls
 * back to splitting `full_name`/`name`, then to the email's local part.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getUserDisplayName(user: User | null): { firstName: string; lastName: string; full: string } {
  if (!user) return { firstName: '', lastName: '', full: '' }
  const meta = user.user_metadata ?? {}

  const given = meta.given_name as string | undefined
  const family = meta.family_name as string | undefined
  if (given || family) {
    return { firstName: given ?? '', lastName: family ?? '', full: [given, family].filter(Boolean).join(' ') }
  }

  const full = (meta.full_name ?? meta.name) as string | undefined
  if (full) {
    const [firstName, ...rest] = full.trim().split(/\s+/)
    return { firstName, lastName: rest.join(' '), full }
  }

  const emailName = user.email?.split('@')[0] ?? ''
  return { firstName: emailName, lastName: '', full: emailName }
}
