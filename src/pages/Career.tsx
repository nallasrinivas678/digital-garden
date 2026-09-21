import { useState } from 'react'
import {
  useCreateJobApplication,
  useDeleteJobApplication,
  useJobApplications,
  useUpdateJobApplication,
} from '../lib/hooks'
import { prettyDate, todayISO } from '../lib/dates'
import type { ApplicationStatus, JobApplication, RemoteType } from '../types'

const STATUS_META: Record<ApplicationStatus, { label: string; pill: string }> = {
  saved: { label: 'Saved', pill: 'bg-slate-100 text-slate-600' },
  applied: { label: 'Applied', pill: 'bg-sky-100 text-sky-700' },
  interviewing: { label: 'Interviewing', pill: 'bg-amber-100 text-amber-700' },
  offer: { label: 'Offer', pill: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', pill: 'bg-rose-100 text-rose-700' },
  withdrawn: { label: 'Withdrawn', pill: 'bg-slate-100 text-slate-500' },
}
const STATUS_OPTIONS = Object.keys(STATUS_META) as ApplicationStatus[]

const REMOTE_LABELS: Record<RemoteType, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'Onsite' }

// Shared styling for expanded-card fields: looks like plain text until focused.
const fieldInputClass =
  'w-full bg-surface-hover/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-slate-400'
const fieldLabelClass = 'block text-xs text-slate-500 mb-1'

export default function Career() {
  const { data: applications, isLoading } = useJobApplications()
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all')

  const filtered = applications?.filter((a) => filter === 'all' || a.status === filter)

  return (
    <div className="space-y-3">
      <header>
        <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Career</p>
        <h1 className="text-2xl font-semibold text-slate-900 mt-1">Job Applications</h1>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {(['all', ...STATUS_OPTIONS] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              filter === s ? 'bg-brand-600 text-white' : 'bg-surface-hover text-slate-500 hover:text-slate-800'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_META[s].label}
          </button>
        ))}
      </div>

      <section className="card-glow rounded-xl bg-surface-card p-4 space-y-3">
        <NewApplicationForm />
      </section>

      <section className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : !filtered || filtered.length === 0 ? (
          <p className="text-sm text-slate-500 px-1">
            {applications && applications.length > 0
              ? 'No applications match this filter.'
              : 'No applications yet — add your first one above.'}
          </p>
        ) : (
          filtered.map((a) => <ApplicationCard key={a.id} application={a} />)
        )}
      </section>
    </div>
  )
}

function NewApplicationForm() {
  const createApp = useCreateJobApplication()
  const [company, setCompany] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [status, setStatus] = useState<ApplicationStatus>('saved')
  const [appliedDate, setAppliedDate] = useState(todayISO())

  function submit() {
    const trimmedCompany = company.trim()
    const trimmedRole = roleTitle.trim()
    if (!trimmedCompany || !trimmedRole) return
    createApp.mutate(
      {
        company: trimmedCompany,
        roleTitle: trimmedRole,
        status,
        appliedDate: status === 'saved' ? null : appliedDate,
      },
      {
        onSuccess: () => {
          setCompany('')
          setRoleTitle('')
          setStatus('saved')
        },
      },
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[10rem]">
        <label className={fieldLabelClass}>Company</label>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Acme Corp"
          className={fieldInputClass}
        />
      </div>
      <div className="flex-1 min-w-[10rem]">
        <label className={fieldLabelClass}>Role</label>
        <input
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          placeholder="Senior Engineer"
          className={fieldInputClass}
        />
      </div>
      <div className="w-36">
        <label className={fieldLabelClass}>Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
          className={fieldInputClass}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </div>
      {status !== 'saved' && (
        <div className="w-40">
          <label className={fieldLabelClass}>Applied</label>
          <input
            type="date"
            value={appliedDate}
            onChange={(e) => setAppliedDate(e.target.value)}
            className={`${fieldInputClass} font-mono text-xs`}
          />
        </div>
      )}
      <button
        onClick={submit}
        disabled={createApp.isPending || !company.trim() || !roleTitle.trim()}
        className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-40 transition-colors"
      >
        + Add
      </button>
    </div>
  )
}

interface Draft {
  jobUrl: string
  location: string
  remoteType: RemoteType | ''
  salaryMin: string
  salaryMax: string
  salaryCurrency: string
  contactName: string
  contactEmail: string
  contactLinkedin: string
  nextFollowUp: string
  notes: string
}

function draftFromApplication(a: JobApplication): Draft {
  return {
    jobUrl: a.job_url ?? '',
    location: a.location ?? '',
    remoteType: a.remote_type ?? '',
    salaryMin: a.salary_min?.toString() ?? '',
    salaryMax: a.salary_max?.toString() ?? '',
    salaryCurrency: a.salary_currency,
    contactName: a.contact_name ?? '',
    contactEmail: a.contact_email ?? '',
    contactLinkedin: a.contact_linkedin ?? '',
    nextFollowUp: a.next_follow_up ?? '',
    notes: a.notes ?? '',
  }
}

function ApplicationCard({ application: a }: { application: JobApplication }) {
  const updateApp = useUpdateJobApplication()
  const deleteApp = useDeleteJobApplication()
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => draftFromApplication(a))
  const today = todayISO()
  const followUpDue = !!a.next_follow_up && a.next_follow_up <= today

  function toggleExpanded() {
    if (!expanded) setDraft(draftFromApplication(a))
    setExpanded(!expanded)
  }

  function saveDraft() {
    updateApp.mutate({
      id: a.id,
      jobUrl: draft.jobUrl.trim() || null,
      location: draft.location.trim() || null,
      remoteType: draft.remoteType || null,
      salaryMin: draft.salaryMin ? Number(draft.salaryMin) : null,
      salaryMax: draft.salaryMax ? Number(draft.salaryMax) : null,
      salaryCurrency: draft.salaryCurrency.trim() || 'USD',
      contactName: draft.contactName.trim() || null,
      contactEmail: draft.contactEmail.trim() || null,
      contactLinkedin: draft.contactLinkedin.trim() || null,
      nextFollowUp: draft.nextFollowUp || null,
      notes: draft.notes.trim() || null,
    })
    setExpanded(false)
  }

  return (
    <div className="card-glow rounded-xl bg-surface-card overflow-hidden">
      <button onClick={toggleExpanded} className="w-full flex items-center gap-3 px-4 py-3 text-left group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900 truncate">{a.company}</span>
            {followUpDue && (
              <span
                title={`Follow up ${a.next_follow_up === today ? 'today' : 'overdue'}`}
                className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0"
              >
                Follow up
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">{a.role_title}</p>
        </div>
        <select
          value={a.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) =>
            updateApp.mutate({
              id: a.id,
              status: e.target.value as ApplicationStatus,
              appliedDate:
                e.target.value !== 'saved' && !a.applied_date ? todayISO() : undefined,
            })
          }
          className={`text-xs px-2 py-0.5 rounded-full border-0 shrink-0 ${STATUS_META[a.status].pill}`}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        {a.applied_date && (
          <span className="hidden sm:inline text-xs font-mono text-slate-500 shrink-0">
            {prettyDate(a.applied_date)}
          </span>
        )}
        <span className="text-slate-400 shrink-0 group-hover:text-slate-600">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-surface-border pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={fieldLabelClass}>Job link</label>
              <input
                value={draft.jobUrl}
                onChange={(e) => setDraft({ ...draft, jobUrl: e.target.value })}
                placeholder="https://…"
                className={fieldInputClass}
              />
            </div>
            <div>
              <label className={fieldLabelClass}>Location</label>
              <input
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                placeholder="City, State"
                className={fieldInputClass}
              />
            </div>
            <div>
              <label className={fieldLabelClass}>Work type</label>
              <select
                value={draft.remoteType}
                onChange={(e) => setDraft({ ...draft, remoteType: e.target.value as RemoteType | '' })}
                className={fieldInputClass}
              >
                <option value="">—</option>
                {(Object.keys(REMOTE_LABELS) as RemoteType[]).map((r) => (
                  <option key={r} value={r}>
                    {REMOTE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabelClass}>Next follow-up</label>
              <input
                type="date"
                value={draft.nextFollowUp}
                onChange={(e) => setDraft({ ...draft, nextFollowUp: e.target.value })}
                className={`${fieldInputClass} font-mono text-xs`}
              />
            </div>
            <div>
              <label className={fieldLabelClass}>Salary min</label>
              <input
                type="number"
                value={draft.salaryMin}
                onChange={(e) => setDraft({ ...draft, salaryMin: e.target.value })}
                placeholder="120000"
                className={fieldInputClass}
              />
            </div>
            <div>
              <label className={fieldLabelClass}>Salary max</label>
              <input
                type="number"
                value={draft.salaryMax}
                onChange={(e) => setDraft({ ...draft, salaryMax: e.target.value })}
                placeholder="150000"
                className={fieldInputClass}
              />
            </div>
            <div>
              <label className={fieldLabelClass}>Contact name</label>
              <input
                value={draft.contactName}
                onChange={(e) => setDraft({ ...draft, contactName: e.target.value })}
                placeholder="Recruiter or referral"
                className={fieldInputClass}
              />
            </div>
            <div>
              <label className={fieldLabelClass}>Contact email</label>
              <input
                value={draft.contactEmail}
                onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })}
                placeholder="name@company.com"
                className={fieldInputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabelClass}>Contact LinkedIn</label>
              <input
                value={draft.contactLinkedin}
                onChange={(e) => setDraft({ ...draft, contactLinkedin: e.target.value })}
                placeholder="linkedin.com/in/…"
                className={fieldInputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabelClass}>Notes</label>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                rows={3}
                placeholder="Interview prep, referral details, impressions…"
                className={`${fieldInputClass} resize-none`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => deleteApp.mutate(a.id)}
              className="text-xs text-slate-500 hover:text-red-600 transition-colors"
            >
              Delete
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setExpanded(false)}
                className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveDraft}
                disabled={updateApp.isPending}
                className="text-xs px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-40 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
