// Resume match calls to the Node service (assistant-node in llm-gateway): extract the text of a
// resume PDF, read a job posting from a URL, and score the resume against the job. Same pattern as
// dailySummary.ts: a separate backend, authenticated with the Supabase access token.

export type RequirementKind = 'must' | 'nice'
export type RequirementStatus = 'met' | 'partial' | 'missing'

export interface Requirement {
  id: number
  text: string
  kind: RequirementKind
}

export interface RequirementResult {
  requirementId: number
  status: RequirementStatus
  /** A line copied from the resume that shows the requirement; empty when missing. */
  evidence: string
}

export interface MatchView {
  matchId: string
  title: string
  jobUrl: string | null
  targetScore: number
  /** How many more rewrites this match allows. */
  rewritesLeft: number
  requirements: Requirement[]
  version: number
  score: number
  results: RequirementResult[]
  missing: Requirement[]
  reachedTarget: boolean
}

// Falls back to the daily summary address, since that is the same Node service.
const baseUrl = () =>
  (import.meta.env.VITE_RESUME_MATCH_API_URL || import.meta.env.VITE_DAILY_SUMMARY_API_URL) as string | undefined

/** The service answers with a readable `detail`; show it as is. */
export class ResumeMatchError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function call<T>(accessToken: string, path: string, init: RequestInit): Promise<T> {
  const base = baseUrl()
  if (!base) throw new ResumeMatchError('Resume match is not set up for this app yet.', 0)

  let res: Response
  try {
    res = await fetch(`${base}/resume${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
    })
  } catch {
    throw new ResumeMatchError('Could not reach the server. Check your connection and try again.', 0)
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: unknown } | null
    throw new ResumeMatchError(typeof body?.detail === 'string' ? body.detail : 'Something went wrong. Please try again.', res.status)
  }
  return (await res.json()) as T
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export async function extractResumeText(accessToken: string, file: File): Promise<string> {
  const form = new FormData()
  form.set('file', file)
  return (await call<{ text: string }>(accessToken, '/extract', { method: 'POST', body: form })).text
}

export async function fetchJobText(accessToken: string, url: string): Promise<string> {
  return (await call<{ text: string }>(accessToken, '/job-text', json({ url }))).text
}

/** A skill the user says they have, with their own words about where they used it. */
export interface Confirmation {
  requirementId: number
  detail: string
}

export interface RewriteProposal {
  baseVersion: number
  proposedText: string
  changes: { requirementId: number; skill: string | null; bullet: string | null }[]
  /** Confirmed skills for which no line was added, with the reason. */
  skipped: { requirementId: number; reason: string }[]
}

// The same limits the service enforces on the user's own words, so the form can say so before sending.
export const DETAIL_MIN_CHARS = 10
export const DETAIL_MAX_CHARS = 500

/** Asks for a suggested resume that adds the confirmed skills. Nothing is saved. */
export function proposeRewrite(accessToken: string, matchId: string, confirmed: Confirmation[]): Promise<RewriteProposal> {
  return call<RewriteProposal>(accessToken, `/matches/${matchId}/rewrite`, json({ confirmed }))
}

/** Saves the text the user accepted (as suggested or edited) as the next version and scores it again. */
export function acceptVersion(
  accessToken: string,
  matchId: string,
  input: { resumeText: string; confirmed: Confirmation[]; baseVersion: number },
): Promise<MatchView> {
  return call<MatchView>(accessToken, `/matches/${matchId}/versions`, json(input))
}

export function startMatch(
  accessToken: string,
  input: { resumeText: string; jobText: string; jobUrl?: string },
): Promise<MatchView> {
  return call<MatchView>(accessToken, '/matches', json(input))
}
