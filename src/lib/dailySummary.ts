// Daily summary from llm-gateway (LlmGateway.Assistant): important Gmail
// (orders/bills/travel) + upcoming Calendar events, boiled down into one
// LLM-written briefing. Not part of the Supabase data layer in hooks.ts -
// this calls a separate backend over its own API, same pattern as weather.ts.

import { useQuery } from '@tanstack/react-query'
import { useAuth } from './auth'

export interface EmailHighlight {
  category: 'order' | 'bill' | 'travel'
  subject: string
  from: string
  date: string
}

export interface CalendarHighlight {
  summary: string
  start: string
  end: string
}

export interface DailySummaryResponse {
  summary: string
  emails: EmailHighlight[]
  events: CalendarHighlight[]
  generatedAtUtc: string
}

// Thrown specifically when the backend's 502 means "this user hasn't
// connected Google yet" (GoogleOAuthService has no token on file for them),
// so the UI can offer a "Connect Google" action instead of a generic error.
export class GoogleNotConnectedError extends Error {}

async function fetchDailySummary(accessToken: string): Promise<DailySummaryResponse> {
  const res = await fetch(`${import.meta.env.VITE_ASSISTANT_API_URL}/assistant/daily-summary`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (res.status === 502) {
    const body = await res.json().catch(() => null)
    if (typeof body?.detail === 'string' && body.detail.includes('No Google tokens on file')) {
      throw new GoogleNotConnectedError(body.detail)
    }
  }

  if (!res.ok) {
    throw new Error('Daily summary fetch failed')
  }

  return res.json()
}

export function useDailySummary() {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['daily-summary'],
    queryFn: () => fetchDailySummary(session!.access_token),
    enabled: !!session,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    retry: false,
  })
}
