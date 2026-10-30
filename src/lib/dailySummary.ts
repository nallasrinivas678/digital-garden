// Daily summary from llm-gateway (LlmGateway.Assistant): important Gmail
// (orders/bills/travel) + upcoming Calendar events, boiled down into one
// LLM-written briefing. Not part of the Supabase data layer in hooks.ts -
// this calls a separate backend over its own API, same pattern as weather.ts.
//
// Streams over SSE (the LLM call alone takes ~10s) so the UI can show
// progress instead of a long silent wait. Uses fetch + a manual reader
// rather than the native EventSource API because EventSource can't send an
// Authorization header, and the access token must not go in the URL.

import { useEffect, useState } from 'react'
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

// Thrown specifically when the backend's error event means "this user hasn't
// connected Google yet" (GoogleOAuthService has no token on file for them),
// so the UI can offer a "Connect Google" action instead of a generic error.
export class GoogleNotConnectedError extends Error {}

interface DailySummaryState {
  status: string | null
  summary: string
  emails: EmailHighlight[]
  events: CalendarHighlight[]
  done: boolean
}

const initialState: DailySummaryState = { status: null, summary: '', emails: [], events: [], done: false }

function parseSseEvent(raw: string): { event: string; data: string } {
  let event = 'message'
  const dataLines: string[] = []
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice('event:'.length).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trim())
  }
  return { event, data: dataLines.join('\n') }
}

export function useDailySummary() {
  const { session } = useAuth()
  const accessToken = session?.access_token
  const [state, setState] = useState<DailySummaryState>(initialState)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!accessToken) return

    const controller = new AbortController()
    setState(initialState)
    setError(null)
    setIsLoading(true)

    async function run() {
      try {
        const res = await fetch(`${import.meta.env.VITE_ASSISTANT_API_URL}/assistant/daily-summary/stream`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        })
        if (!res.ok || !res.body) throw new Error('Daily summary stream failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const frames = buffer.split('\n\n')
          buffer = frames.pop() ?? ''
          for (const frame of frames) {
            if (!frame.trim()) continue
            handleFrame(parseSseEvent(frame))
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err : new Error('Daily summary stream failed'))
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    function handleFrame({ event, data }: { event: string; data: string }) {
      if (!data) return
      const payload = JSON.parse(data)

      if (event === 'status') {
        setState((s) => ({ ...s, status: payload.message }))
      } else if (event === 'chunk') {
        setState((s) => ({ ...s, status: null, summary: s.summary + payload.text }))
      } else if (event === 'done') {
        setState((s) => ({
          ...s,
          status: null,
          summary: payload.summary,
          emails: payload.emails,
          events: payload.events,
          done: true,
        }))
      } else if (event === 'error') {
        const detail = typeof payload.detail === 'string' ? payload.detail : 'Daily summary stream failed'
        setError(detail.includes('No Google tokens on file') ? new GoogleNotConnectedError(detail) : new Error(detail))
      }
    }

    run()
    return () => controller.abort()
  }, [accessToken])

  return { ...state, error, isLoading }
}
