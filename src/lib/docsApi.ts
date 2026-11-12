// PDF Q&A calls to llm-gateway (LlmGateway.Assistant). Same pattern as
// dailySummary.ts: a separate backend over its own API, authenticated with the
// Supabase access token. The documents themselves (rows, files) are read and
// written through hooks.ts; this file only starts ingest and asks questions.

import type { AskResult } from '../types'

const baseUrl = () => import.meta.env.VITE_ASSISTANT_API_URL as string

/** Starts (or re-runs) ingest for an uploaded document. The gateway answers 202 and works in the background. */
export async function ingestDocument(accessToken: string, documentId: string): Promise<void> {
  const res = await fetch(`${baseUrl()}/assistant/docs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId }),
  })
  if (!res.ok) throw new Error(`Could not start processing (${res.status})`)
}

/** Carries the HTTP status so the chat can show a specific message. */
export class AskError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function askErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Please ask a shorter question.'
    case 404:
      return 'This document could not be found.'
    case 409:
      return 'This document is still being processed. Try again in a moment.'
    case 429:
      return 'Slow down: you can ask 10 questions a minute.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

export async function askDocument(accessToken: string, documentId: string, question: string): Promise<AskResult> {
  let res: Response
  try {
    res = await fetch(`${baseUrl()}/assistant/docs/ask`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, question }),
    })
  } catch {
    throw new AskError('Could not reach the server. Check your connection and try again.', 0)
  }
  if (!res.ok) throw new AskError(askErrorMessage(res.status), res.status)
  return (await res.json()) as AskResult
}
