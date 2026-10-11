import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useClaimUsername, useMyPortfolioProfile, usePortfolioAllowlisted, usePublicProfile } from '../lib/hooks'
import { usernameError } from '../lib/reservedUsernames'

const fieldLabelClass = 'block text-xs text-slate-500 mb-1'
const fieldInputClass =
  'w-full bg-surface-hover/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-slate-400'

/** First-run flow: claim a username + fill in the public profile before landing in /app. */
export default function Onboarding() {
  const { user } = useAuth()
  const { data: existingProfile, isLoading: loadingProfile } = useMyPortfolioProfile()
  const { data: allowlisted, isLoading: loadingAllowlist } = usePortfolioAllowlisted()
  const claimUsername = useClaimUsername()

  const [username, setUsername] = useState('')
  const [debouncedUsername, setDebouncedUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [title, setTitle] = useState('')
  const [bio, setBio] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedUsername(username.trim().toLowerCase()), 400)
    return () => clearTimeout(t)
  }, [username])

  const formatError = usernameError(debouncedUsername)
  const { data: existingAtUsername, isFetching: checkingAvailability } = usePublicProfile(
    !formatError ? debouncedUsername : undefined,
  )
  const taken = !formatError && !checkingAvailability && !!existingAtUsername
  const available = !formatError && !checkingAvailability && debouncedUsername && !existingAtUsername

  if (loadingProfile || loadingAllowlist) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 font-mono text-sm">Loading…</div>
    )
  }
  if (existingProfile) return <Navigate to="/app" replace />
  if (!allowlisted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div className="max-w-sm space-y-3">
          <p className="text-sm text-slate-600">
            Public portfolio pages are limited to a small pilot group right now — you're all set to use the rest of
            TaskTide though.
          </p>
          <Link to="/app" className="inline-block text-sm text-brand-600 hover:underline">
            ← Back to the app
          </Link>
        </div>
      </div>
    )
  }

  const canSubmit = !!displayName.trim() && !!debouncedUsername && !formatError && !taken && !checkingAvailability

  function submit() {
    if (!canSubmit) return
    claimUsername.mutate({
      username: debouncedUsername,
      display_name: displayName.trim(),
      title: title.trim() || undefined,
      bio: bio.trim() || undefined,
      github_url: githubUrl.trim() || undefined,
      linkedin_url: linkedinUrl.trim() || undefined,
      resume_url: resumeUrl.trim() || undefined,
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md card-glow rounded-2xl bg-surface-card p-8 space-y-5">
        <div>
          <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Welcome</p>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1">Claim your portfolio</h1>
          <p className="mt-1 text-sm text-slate-500">
            This is your public page at tasktide.app/&lt;username&gt; — signed in as {user?.email}.
          </p>
        </div>

        <div>
          <label className={fieldLabelClass}>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="srnalla"
            className={fieldInputClass}
            autoFocus
          />
          <p className="mt-1 text-xs">
            {formatError && debouncedUsername && <span className="text-red-500">{formatError}</span>}
            {!formatError && checkingAvailability && <span className="text-slate-400">Checking…</span>}
            {!formatError && taken && <span className="text-red-500">That username is taken</span>}
            {available && <span className="text-brand-600">tasktide.app/{debouncedUsername} is available</span>}
          </p>
        </div>

        <div>
          <label className={fieldLabelClass}>Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className={fieldInputClass}
          />
        </div>

        <div>
          <label className={fieldLabelClass}>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Software Engineer"
            className={fieldInputClass}
          />
        </div>

        <div>
          <label className={fieldLabelClass}>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A sentence or two about what you do."
            rows={3}
            className={fieldInputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={fieldLabelClass}>GitHub URL</label>
            <input
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/…"
              className={fieldInputClass}
            />
          </div>
          <div>
            <label className={fieldLabelClass}>LinkedIn URL</label>
            <input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/…"
              className={fieldInputClass}
            />
          </div>
        </div>

        <div>
          <label className={fieldLabelClass}>Resume URL</label>
          <input
            value={resumeUrl}
            onChange={(e) => setResumeUrl(e.target.value)}
            placeholder="https://…/resume.pdf"
            className={fieldInputClass}
          />
        </div>

        {claimUsername.isError && <p className="text-xs text-red-500">{claimUsername.error.message}</p>}

        <button
          onClick={submit}
          disabled={!canSubmit || claimUsername.isPending}
          className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-40 transition-colors"
        >
          {claimUsername.isPending ? 'Creating…' : 'Create my portfolio'}
        </button>
      </div>
    </div>
  )
}
