import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useDailySummary, GoogleNotConnectedError, type EmailHighlight } from '../lib/dailySummary'
import { connectGoogleAccount } from '../lib/googleConnect'
import { renderMarkdown } from '../lib/markdown'
import { showToast } from './Toast'

const CATEGORY_META: Record<EmailHighlight['category'], { label: string; className: string }> = {
  order: { label: 'Orders', className: 'bg-brand-100 text-brand-700' },
  bill: { label: 'Bills', className: 'bg-amber-100 text-amber-700' },
  travel: { label: 'Travel', className: 'bg-sky-100 text-sky-700' },
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function groupByCategory(emails: EmailHighlight[]) {
  return emails.reduce<Record<string, EmailHighlight[]>>((groups, email) => {
    ;(groups[email.category] ??= []).push(email)
    return groups
  }, {})
}

// Daily briefing from llm-gateway: Gmail orders/bills/travel + upcoming
// Calendar events, condensed into one written summary. Sits right below
// TodayBrief on the Dashboard. The LLM call alone takes ~10s, so this
// streams over SSE and shows a status line + the summary text as it's
// written, instead of the long silent wait a single request would have. A
// transient backend failure (other than "you haven't connected Google yet",
// which gets its own actionable card) still just hides the card rather than
// showing a visible error, since this is a non-critical enrichment widget.
export default function DailySummary() {
  const { session } = useAuth()
  const { status, summary, emails, done, error, isLoading } = useDailySummary()
  const [isConnecting, setIsConnecting] = useState(false)

  if (!session) return null

  if (error instanceof GoogleNotConnectedError) {
    async function handleConnect() {
      setIsConnecting(true)
      try {
        await connectGoogleAccount(session!.access_token)
      } catch {
        showToast("Couldn't start the Google connection — please try again.")
        setIsConnecting(false)
      }
    }

    return (
      <section className="card-glow rounded-xl bg-surface-card px-4 py-3 space-y-2">
        <p className="text-sm text-slate-600">
          Connect Google to see your important emails and calendar events here.
        </p>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand-100 text-brand-700 disabled:opacity-60"
        >
          {isConnecting ? 'Connecting…' : 'Connect Google'}
        </button>
      </section>
    )
  }

  if (error) return null

  // While loading and nothing has arrived yet, show the status line in place of a spinner
  // rather than render null - the only part of this component that breaks that convention,
  // since a silent 10s wait here is exactly what read as "broken" before streaming.
  if (isLoading && !summary && !status) return null

  const emailsByCategory = groupByCategory(emails)
  const categories = Object.entries(emailsByCategory) as [EmailHighlight['category'], EmailHighlight[]][]

  return (
    <section className="card-glow rounded-xl bg-surface-card px-4 py-3 space-y-3">
      <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Daily summary</p>
      {status && !summary ? (
        <p className="text-sm text-slate-400 italic animate-pulse">{status}</p>
      ) : (
        <div
          className="prose-note text-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }}
        />
      )}

      {done && categories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-surface-border">
          {categories.map(([category, categoryEmails]) => (
            <div key={category} className="pt-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_META[category].className}`}>
                {CATEGORY_META[category].label}
              </span>
              <ul className="mt-1.5 space-y-1 text-xs text-slate-500">
                {categoryEmails.map((email) => (
                  <li key={`${email.subject}-${email.date}`}>
                    <span className="font-mono text-slate-400">{formatShort(email.date)}</span> — {email.subject}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
