import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  DETAIL_MAX_CHARS,
  DETAIL_MIN_CHARS,
  ResumeMatchError,
  acceptVersion,
  extractResumeText,
  fetchJobText,
  proposeRewrite,
  startMatch,
  type Confirmation,
  type MatchView,
  type RequirementStatus,
  type RewriteProposal,
} from '../lib/resumeMatchApi'

const STATUS_STYLE: Record<RequirementStatus, string> = {
  met: 'bg-emerald-50 text-emerald-700',
  partial: 'bg-amber-50 text-amber-700',
  missing: 'bg-red-50 text-red-700',
}
const STATUS_LABEL: Record<RequirementStatus, string> = { met: 'Met', partial: 'Partial', missing: 'Missing' }

const fieldClass =
  'w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-200'
const buttonClass =
  'px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed'
const secondaryButtonClass =
  'px-3 py-1.5 rounded-lg text-sm text-slate-600 border border-surface-border hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed'
const chosenClass = 'bg-brand-50 text-brand-700 border-brand-200'

const errorMessage = (err: unknown) => (err instanceof ResumeMatchError ? err.message : 'Something went wrong. Please try again.')

function ErrorNote({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
      {message}
    </p>
  ) : null
}

// Resume match: upload a resume PDF (or paste its text), give a job description (paste it or read it
// from a URL), see the match score with each requirement marked met, partial or missing, then add the
// skills you really have. Every change is shown first and nothing is saved until you accept it.
export default function ResumeMatch() {
  const { session } = useAuth()
  const token = session?.access_token

  const [resumeText, setResumeText] = useState('')
  const [jobText, setJobText] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [busy, setBusy] = useState<'pdf' | 'job' | 'score' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MatchView | null>(null)
  // The text of the version shown in `result` (what the next rewrite starts from).
  const [currentText, setCurrentText] = useState('')

  async function run(kind: 'pdf' | 'job' | 'score', action: () => Promise<void>) {
    if (!token || busy) return
    setBusy(kind)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const onPdf = (file: File | undefined) => file && token && run('pdf', async () => setResumeText(await extractResumeText(token, file)))
  const onReadJob = () => token && run('job', async () => setJobText(await fetchJobText(token, jobUrl.trim())))
  const onScore = () =>
    token &&
    run('score', async () => {
      setResult(null)
      const view = await startMatch(token, { resumeText, jobText, jobUrl: jobUrl.trim() || undefined })
      setCurrentText(resumeText.trim())
      setResult(view)
    })

  const canScore = resumeText.trim().length > 0 && jobText.trim().length > 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <Link to="/app" className="text-sm text-slate-500 hover:text-slate-900">
        ← Back
      </Link>
      <header>
        <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Resume match</p>
        <h1 className="text-xl font-semibold text-slate-900 mt-1">How well does your resume fit this job?</h1>
      </header>

      <section className="card-glow rounded-xl bg-surface-card p-5 space-y-3">
        <h2 className="text-sm font-medium text-slate-900">1. Your resume</h2>
        <label className="block text-xs text-slate-500">
          Upload a PDF (text is read from it) or paste the text below
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy !== null}
            onChange={(e) => {
              onPdf(e.target.files?.[0])
              e.target.value = ''
            }}
            className="mt-1 block text-sm text-slate-600"
          />
        </label>
        {busy === 'pdf' && <p className="text-sm text-slate-400 italic animate-pulse">Reading the PDF…</p>}
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={10}
          placeholder="Resume text"
          className={`${fieldClass} font-mono text-xs`}
        />
      </section>

      <section className="card-glow rounded-xl bg-surface-card p-5 space-y-3">
        <h2 className="text-sm font-medium text-slate-900">2. The job</h2>
        <div className="flex gap-2">
          <input
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="Job posting address (optional)"
            className={fieldClass}
          />
          <button onClick={onReadJob} disabled={busy !== null || !jobUrl.trim()} className={secondaryButtonClass}>
            {busy === 'job' ? 'Reading…' : 'Read page'}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Some job sites (LinkedIn, for one) block automatic reading. If so, paste the description below.
        </p>
        <textarea
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
          rows={10}
          placeholder="Job description text"
          className={`${fieldClass} text-xs`}
        />
      </section>

      <div className="flex items-center gap-3">
        <button onClick={onScore} disabled={busy !== null || !canScore} className={buttonClass}>
          {busy === 'score' ? 'Scoring…' : 'Score my resume'}
        </button>
        {busy === 'score' && <span className="text-sm text-slate-400 italic animate-pulse">This takes about 10 seconds.</span>}
      </div>

      <ErrorNote message={error} />

      {result && (
        <ResultPanel
          key={result.matchId}
          result={result}
          currentText={currentText}
          onUpdated={(view, text) => {
            setResult(view)
            setCurrentText(text)
          }}
        />
      )}
    </div>
  )
}

type Choice = 'have' | 'no'

// The score, the requirements, and the loop that adds the skills you have: choose, review the
// suggested change, accept, and see the new score.
function ResultPanel({
  result,
  currentText,
  onUpdated,
}: {
  result: MatchView
  currentText: string
  onUpdated: (view: MatchView, text: string) => void
}) {
  const { session } = useAuth()
  const token = session?.access_token
  const [choices, setChoices] = useState<Record<number, Choice>>({})
  const [details, setDetails] = useState<Record<number, string>>({})
  const [proposal, setProposal] = useState<RewriteProposal | null>(null)
  const [editText, setEditText] = useState<string | null>(null)
  const [busy, setBusy] = useState<'propose' | 'accept' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const byId = new Map(result.results.map((r) => [r.requirementId, r]))
  const gaps = result.requirements.filter((r) => byId.get(r.id)?.status !== 'met')
  const undecided = gaps.filter((g) => !choices[g.id])
  const confirmed: Confirmation[] = gaps
    .filter((g) => choices[g.id] === 'have')
    .map((g) => ({ requirementId: g.id, detail: (details[g.id] ?? '').trim() }))
  const hasUnansweredDetail = confirmed.some((c) => c.detail.length < DETAIL_MIN_CHARS)
  const nothingLeftToAdd = gaps.length > 0 && gaps.every((g) => choices[g.id] === 'no')

  function choose(id: number, choice: Choice) {
    setChoices((c) => ({ ...c, [id]: choice }))
    setError(null)
  }

  async function onPropose() {
    if (!token || busy) return
    if (confirmed.length === 0) return setError('Choose "I have this" for at least one skill you really have.')
    if (undecided.length > 0) return setError(`Choose "I have this" or "Not me" for: ${undecided.map((g) => g.text).join(', ')}.`)
    if (hasUnansweredDetail) return setError(`Add a short note (at least ${DETAIL_MIN_CHARS} characters) on where you used each skill.`)

    setBusy('propose')
    setError(null)
    try {
      setProposal(await proposeRewrite(token, result.matchId, confirmed))
      setEditText(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function onAccept() {
    if (!token || busy || !proposal) return
    const text = editText ?? proposal.proposedText
    setBusy('accept')
    setError(null)
    try {
      const view = await acceptVersion(token, result.matchId, { resumeText: text, confirmed, baseVersion: proposal.baseVersion })
      setProposal(null)
      setEditText(null)
      onUpdated(view, text.trim())
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(currentText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy. Select the text in the box below and copy it.')
    }
  }

  const open = result.missing.length
  const nameOf = (id: number) => result.requirements.find((r) => r.id === id)?.text ?? 'that skill'

  return (
    <div className="space-y-6">
      <section className="card-glow rounded-xl bg-surface-card p-5 space-y-4">
        <div>
          <p className="text-xs text-slate-500">
            {result.title} · version {result.version}
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-slate-900">{result.score}%</span>
            <span className="text-sm text-slate-500">match, target {result.targetScore}%</span>
          </p>
          <div className="relative h-1.5 bg-surface-hover rounded-full mt-3">
            <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${result.score}%` }} />
            <div className="absolute -top-1 h-3.5 w-px bg-slate-500" style={{ left: `${result.targetScore}%` }} />
          </div>
          <p className="text-sm text-slate-600 mt-3">
            {result.reachedTarget
              ? 'Your resume meets the target for this job.'
              : result.rewritesLeft === 0
                ? 'This match has used all its rewrites. Copy the text below to keep working on it yourself.'
                : nothingLeftToAdd
                  ? `The best honest match is ${result.score}%. The remaining gaps are skills you said you don't have.`
                  : `${open} requirement${open === 1 ? '' : 's'} could be stronger. Choose the ones you really have and add a note on where you used them.`}
          </p>
        </div>

        <ul className="divide-y divide-surface-border">
          {result.requirements.map((req) => {
            const res = byId.get(req.id)
            const status = res?.status ?? 'missing'
            const canChoose = status !== 'met' && !result.reachedTarget && result.rewritesLeft > 0 && !proposal
            return (
              <li key={req.id} className="py-2.5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800">
                      {req.text}{' '}
                      <span className="text-xs text-slate-500 border border-surface-border rounded px-1.5 py-0.5 ml-1">
                        {req.kind === 'must' ? 'Must' : 'Nice'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 break-words">
                      {res?.evidence ? `“${res.evidence}”` : 'Not found in your resume'}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs rounded-full px-2 py-0.5 ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
                </div>
                {canChoose && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      {(['have', 'no'] as const).map((choice) => (
                        <button
                          key={choice}
                          aria-pressed={choices[req.id] === choice}
                          onClick={() => choose(req.id, choice)}
                          className={`px-2.5 py-1 rounded-lg text-xs border ${
                            choices[req.id] === choice ? chosenClass : 'text-slate-600 border-surface-border hover:bg-surface-hover'
                          }`}
                        >
                          {choice === 'have' ? 'I have this' : 'Not me'}
                        </button>
                      ))}
                    </div>
                    {choices[req.id] === 'have' && (
                      <input
                        value={details[req.id] ?? ''}
                        onChange={(e) => setDetails((d) => ({ ...d, [req.id]: e.target.value }))}
                        maxLength={DETAIL_MAX_CHARS}
                        aria-label={`Where you used ${req.text}`}
                        placeholder="Where and how you used it, e.g. deployed our APIs to Azure App Service at Fabrikam"
                        className={fieldClass}
                      />
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {gaps.length > 0 && !result.reachedTarget && result.rewritesLeft > 0 && !proposal && (
          <div className="flex items-center gap-3">
            <button onClick={onPropose} disabled={busy !== null} className={buttonClass}>
              {busy === 'propose' ? 'Preparing…' : 'Propose changes'}
            </button>
            <span className="text-xs text-slate-500">Only skills you mark “I have this” are added. You review everything first.</span>
          </div>
        )}
        <ErrorNote message={error} />
      </section>

      {proposal && (
        <ProposalReview
          before={currentText}
          proposal={proposal}
          nameOf={nameOf}
          editText={editText}
          onEdit={() => setEditText(proposal.proposedText)}
          onEditChange={setEditText}
          onAccept={onAccept}
          onDiscard={() => {
            setProposal(null)
            setEditText(null)
          }}
          busy={busy === 'accept'}
        />
      )}

      <section className="card-glow rounded-xl bg-surface-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-slate-900">Your resume, version {result.version}</h2>
          <button onClick={onCopy} className={secondaryButtonClass}>
            {copied ? 'Copied' : 'Copy text'}
          </button>
        </div>
        <textarea readOnly value={currentText} rows={12} className={`${fieldClass} font-mono text-xs bg-surface-base`} />
      </section>
    </div>
  )
}

// Current and suggested text side by side. Lines that are new are highlighted. Accept saves the
// suggestion (or your edit of it) as the next version and scores it again.
function ProposalReview({
  before,
  proposal,
  nameOf,
  editText,
  onEdit,
  onEditChange,
  onAccept,
  onDiscard,
  busy,
}: {
  before: string
  proposal: RewriteProposal
  nameOf: (id: number) => string
  editText: string | null
  onEdit: () => void
  onEditChange: (text: string) => void
  onAccept: () => void
  onDiscard: () => void
  busy: boolean
}) {
  const known = new Set(before.split('\n').map((l) => l.trim()))
  const afterLines = proposal.proposedText.split('\n')

  return (
    <section className="card-glow rounded-xl bg-surface-card p-5 space-y-3">
      <h2 className="text-sm font-medium text-slate-900">Proposed changes</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-slate-500 mb-1">Current</p>
          <pre className="text-xs font-mono whitespace-pre-wrap break-words rounded-lg bg-surface-base p-3 max-h-96 overflow-auto">{before}</pre>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">{editText === null ? 'Proposed (new lines highlighted)' : 'Your edit'}</p>
          {editText === null ? (
            <div className="text-xs font-mono whitespace-pre-wrap break-words rounded-lg bg-surface-base p-3 max-h-96 overflow-auto">
              {afterLines.map((line, i) => (
                <div key={i} className={line.trim() && !known.has(line.trim()) ? 'bg-emerald-50 text-emerald-800' : undefined}>
                  {line || ' '}
                </div>
              ))}
            </div>
          ) : (
            <textarea
              value={editText}
              onChange={(e) => onEditChange(e.target.value)}
              rows={14}
              aria-label="Edit the proposed resume text"
              className={`${fieldClass} font-mono text-xs`}
            />
          )}
        </div>
      </div>

      {proposal.skipped.length > 0 && (
        <ul className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 space-y-1">
          {proposal.skipped.map((s) => (
            <li key={s.requirementId}>
              No line was added for “{nameOf(s.requirementId)}” because {s.reason}. You can add one yourself with Edit.
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <button onClick={onAccept} disabled={busy} className={buttonClass}>
          {busy ? 'Saving and scoring…' : 'Accept and rescore'}
        </button>
        {editText === null && (
          <button onClick={onEdit} disabled={busy} className={secondaryButtonClass}>
            Edit
          </button>
        )}
        <button onClick={onDiscard} disabled={busy} className={secondaryButtonClass}>
          Discard
        </button>
      </div>
    </section>
  )
}
