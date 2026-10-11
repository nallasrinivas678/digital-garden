import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useCreatePortfolioProject,
  useDeletePortfolioProject,
  useMyPortfolioProfile,
  useMyPortfolioProjects,
  usePortfolioAllowlisted,
  usePublicProfile,
  useUpdatePortfolioProfile,
  useUpdatePortfolioProject,
} from '../lib/hooks'
import { usernameError } from '../lib/reservedUsernames'
import type { PortfolioProject } from '../types'

const fieldLabelClass = 'block text-xs text-slate-500 mb-1'
const fieldInputClass =
  'w-full bg-surface-hover/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-slate-400'

/** Edit the public profile + manage the project list shown at /:username. */
export default function ManagePortfolio() {
  const { data: profile, isLoading: loadingProfile } = useMyPortfolioProfile()
  const { data: allowlisted, isLoading: loadingAllowlist } = usePortfolioAllowlisted()

  if (loadingProfile || loadingAllowlist) {
    return <div className="max-w-3xl mx-auto px-4 py-8 text-sm text-slate-500">Loading…</div>
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm text-slate-600">
          {allowlisted
            ? "You're eligible for a public portfolio but haven't claimed a username yet."
            : 'Public portfolio pages are limited to a small pilot group right now.'}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
      <header>
        <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Portfolio</p>
        <h1 className="text-2xl font-semibold text-slate-900 mt-1">Manage portfolio</h1>
        <Link to={`/${profile.username}`} target="_blank" className="text-sm text-brand-600 hover:underline">
          View public page →
        </Link>
      </header>

      <ProfileForm profile={profile} />
      <ProjectsSection />
    </div>
  )
}

function ProfileForm({
  profile,
}: {
  profile: NonNullable<ReturnType<typeof useMyPortfolioProfile>['data']>
}) {
  const update = useUpdatePortfolioProfile()
  const [username, setUsername] = useState(profile.username)
  const [debouncedUsername, setDebouncedUsername] = useState(profile.username)
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [title, setTitle] = useState(profile.title ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [githubUrl, setGithubUrl] = useState(profile.github_url ?? '')
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedin_url ?? '')
  const [resumeUrl, setResumeUrl] = useState(profile.resume_url ?? '')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedUsername(username.trim().toLowerCase()), 400)
    return () => clearTimeout(t)
  }, [username])

  const usernameChanged = debouncedUsername !== profile.username
  const formatError = usernameChanged ? usernameError(debouncedUsername) : null
  const { data: existingAtUsername, isFetching: checkingAvailability } = usePublicProfile(
    usernameChanged && !formatError ? debouncedUsername : undefined,
  )
  const taken = usernameChanged && !formatError && !checkingAvailability && !!existingAtUsername

  const canSave = !!displayName.trim() && !formatError && !taken && !checkingAvailability

  function save() {
    if (!canSave) return
    update.mutate({
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
    <section className="card-glow rounded-xl bg-surface-card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Profile</h2>

      <div>
        <label className={fieldLabelClass}>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} className={fieldInputClass} />
        {usernameChanged && (
          <p className="mt-1 text-xs">
            {formatError && <span className="text-red-500">{formatError}</span>}
            {!formatError && checkingAvailability && <span className="text-slate-400">Checking…</span>}
            {!formatError && taken && <span className="text-red-500">That username is taken</span>}
            {!formatError && !taken && !checkingAvailability && (
              <span className="text-brand-600">tasktide.app/{debouncedUsername} is available</span>
            )}
          </p>
        )}
      </div>

      <div>
        <label className={fieldLabelClass}>Display name</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={fieldInputClass} />
      </div>

      <div>
        <label className={fieldLabelClass}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldInputClass} />
      </div>

      <div>
        <label className={fieldLabelClass}>Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={fieldInputClass} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={fieldLabelClass}>GitHub URL</label>
          <input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} className={fieldInputClass} />
        </div>
        <div>
          <label className={fieldLabelClass}>LinkedIn URL</label>
          <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className={fieldInputClass} />
        </div>
      </div>

      <div>
        <label className={fieldLabelClass}>Resume URL</label>
        <input value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} className={fieldInputClass} />
      </div>

      {update.isError && <p className="text-xs text-red-500">{update.error.message}</p>}

      <button
        onClick={save}
        disabled={!canSave || update.isPending}
        className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-40 transition-colors"
      >
        {update.isPending ? 'Saving…' : 'Save profile'}
      </button>
    </section>
  )
}

const emptyDraft = {
  name: '',
  description: '',
  live_url: '',
  repo_url: '',
  stack: '',
  highlights: '',
  related_post_slug: '',
}

function ProjectsSection() {
  const { data: projects, isLoading } = useMyPortfolioProjects()
  const createProject = useCreatePortfolioProject()
  const updateProject = useUpdatePortfolioProject()
  const deleteProject = useDeletePortfolioProject()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [adding, setAdding] = useState(false)

  function startEdit(p: PortfolioProject) {
    setEditingId(p.id)
    setAdding(false)
    setDraft({
      name: p.name,
      description: p.description ?? '',
      live_url: p.live_url ?? '',
      repo_url: p.repo_url ?? '',
      stack: p.stack.join(', '),
      highlights: p.highlights.join('\n'),
      related_post_slug: p.related_post_slug ?? '',
    })
  }

  function startAdd() {
    setEditingId(null)
    setAdding(true)
    setDraft(emptyDraft)
  }

  function cancel() {
    setEditingId(null)
    setAdding(false)
    setDraft(emptyDraft)
  }

  function save() {
    if (!draft.name.trim()) return
    const fields = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      live_url: draft.live_url.trim() || null,
      repo_url: draft.repo_url.trim() || null,
      stack: draft.stack
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      highlights: draft.highlights
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      related_post_slug: draft.related_post_slug.trim() || null,
    }
    if (editingId) {
      updateProject.mutate({ id: editingId, ...fields }, { onSuccess: cancel })
    } else {
      createProject.mutate({ ...fields, sort_order: projects?.length ?? 0 }, { onSuccess: cancel })
    }
  }

  const formOpen = adding || !!editingId

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Projects</h2>
        {!formOpen && (
          <button onClick={startAdd} className="text-sm text-brand-600 hover:underline">
            + Add project
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          {projects?.map((p) => (
            <div key={p.id} className="card-glow rounded-xl bg-surface-card p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{p.name}</p>
                {p.description && <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>}
              </div>
              <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                <button onClick={() => startEdit(p)} className="text-brand-600 hover:underline">
                  Edit
                </button>
                <button
                  onClick={() => deleteProject.mutate(p.id)}
                  className="text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {projects?.length === 0 && !formOpen && (
            <p className="text-sm text-slate-500">No projects yet — add your first one above.</p>
          )}
        </div>
      )}

      {formOpen && (
        <div className="card-glow rounded-xl bg-surface-card p-5 space-y-4">
          <div>
            <label className={fieldLabelClass}>Name</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={fieldInputClass}
            />
          </div>
          <div>
            <label className={fieldLabelClass}>Description</label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              className={fieldInputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={fieldLabelClass}>Live URL</label>
              <input
                value={draft.live_url}
                onChange={(e) => setDraft({ ...draft, live_url: e.target.value })}
                className={fieldInputClass}
              />
            </div>
            <div>
              <label className={fieldLabelClass}>Repo URL</label>
              <input
                value={draft.repo_url}
                onChange={(e) => setDraft({ ...draft, repo_url: e.target.value })}
                className={fieldInputClass}
              />
            </div>
          </div>
          <div>
            <label className={fieldLabelClass}>Stack (comma-separated)</label>
            <input
              value={draft.stack}
              onChange={(e) => setDraft({ ...draft, stack: e.target.value })}
              placeholder="React, TypeScript, Supabase"
              className={fieldInputClass}
            />
          </div>
          <div>
            <label className={fieldLabelClass}>Highlights (one per line)</label>
            <textarea
              value={draft.highlights}
              onChange={(e) => setDraft({ ...draft, highlights: e.target.value })}
              rows={3}
              className={fieldInputClass}
            />
          </div>
          <div>
            <label className={fieldLabelClass}>Related Garden post slug (optional)</label>
            <input
              value={draft.related_post_slug}
              onChange={(e) => setDraft({ ...draft, related_post_slug: e.target.value })}
              className={fieldInputClass}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={!draft.name.trim() || createProject.isPending || updateProject.isPending}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-40 transition-colors"
            >
              {editingId ? 'Save changes' : 'Add project'}
            </button>
            <button onClick={cancel} className="text-sm text-slate-500 hover:text-slate-900">
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
