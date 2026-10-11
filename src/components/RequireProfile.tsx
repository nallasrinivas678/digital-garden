import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useMyPortfolioProfile, usePortfolioAllowlisted } from '../lib/hooks'

/**
 * Wraps the authenticated /app routes (nested inside ProtectedRoute, so a
 * user is already guaranteed signed-in here). Only sends a user to
 * /onboarding if they're both profile-less AND currently allowed to claim
 * one (see usePortfolioAllowlisted) — everyone else goes straight into the
 * app. Sign-in and the private workspace stay open to anyone; only
 * claiming a public portfolio is gated while this is a pilot.
 */
export default function RequireProfile({ children }: { children: ReactNode }) {
  const { data: profile, isLoading: loadingProfile } = useMyPortfolioProfile()
  const { data: allowlisted, isLoading: loadingAllowlist } = usePortfolioAllowlisted()

  if (loadingProfile || loadingAllowlist) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 font-mono text-sm">
        Loading…
      </div>
    )
  }
  if (!profile && allowlisted) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
