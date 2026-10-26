import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDeleteNote, useMyPortfolioProfile, useNote, useUpdateNote } from '../lib/hooks'
import { renderMarkdown } from '../lib/markdown'
import { slugify } from '../lib/slug'
import type { NoteType } from '../types'

const TYPE_OPTIONS: { value: NoteType; label: string }[] = [
  { value: 'tech-note', label: 'Tech note' },
  { value: 'exercise', label: 'Coding exercise' },
  { value: 'system-design', label: 'System design' },
]

export default function GardenEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: note, isLoading } = useNote(id)
  const { data: profile } = useMyPortfolioProfile()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [type, setType] = useState<NoteType>('tech-note')
  const [tagsInput, setTagsInput] = useState('')
  const [body, setBody] = useState('')
  const [canonicalUrl, setCanonicalUrl] = useState('')
  const [dirty, setDirty] = useState(false)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [slugError, setSlugError] = useState('')

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setSlug(note.slug)
      setType(note.type)
      setTagsInput(note.tags.join(', '))
      setBody(note.body)
      setCanonicalUrl(note.canonical_url ?? '')
      setDirty(false)
    }
  }, [note])

  const defaultPublicUrl =
    profile && note ? `https://tasktide.app/${profile.username}/notes/${note.slug}` : ''
  const resolvedCanonicalUrl = canonicalUrl.trim() || defaultPublicUrl

  function markDirty() {
    setDirty(true)
  }

  function onSave() {
    if (!note) return
    setSlugError('')
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    updateNote.mutate(
      { id: note.id, title, slug, type, tags, body, canonical_url: canonicalUrl.trim() || null },
      {
        onSuccess: () => setDirty(false),
        onError: (err) => {
          const code = (err as { code?: string })?.code
          setSlugError(code === '23505' ? 'That slug is already taken — try another.' : 'Could not save.')
        },
      },
    )
  }

  function onTogglePublish() {
    if (!note) return
    const nextStatus = note.status === 'published' ? 'draft' : 'published'
    updateNote.mutate({
      id: note.id,
      status: nextStatus,
      published_at: nextStatus === 'published' ? (note.published_at ?? new Date().toISOString()) : note.published_at,
    })
  }

  function onDelete() {
    if (!note) return
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    deleteNote.mutate(note.id, { onSuccess: () => navigate('/app') })
  }

  if (isLoading) {
    return <div className="max-w-3xl mx-auto px-4 py-8 text-sm text-slate-500">Loading…</div>
  }
  if (!note) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-3">
        <p className="text-sm text-slate-500">Note not found.</p>
        <Link to="/app" className="text-xs text-brand-500 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center justify-between">
        <Link to="/app" className="text-xs text-slate-500 hover:text-slate-900 transition-colors">
          ← Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              note.status === 'published' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {note.status === 'published' ? 'Published' : 'Draft'}
          </span>
          {note.status === 'published' && (
            <Link
              to={`/notes/${note.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-500 hover:underline"
            >
              View public page ↗
            </Link>
          )}
        </div>
      </header>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          markDirty()
        }}
        placeholder="Untitled note"
        className="w-full bg-transparent text-2xl font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          /notes/
          <input
            value={slug}
            onChange={(e) => {
              setSlug(slugify(e.target.value))
              markDirty()
            }}
            className="rounded-lg bg-surface-base border border-surface-border px-2 py-1 text-xs font-mono text-slate-700 focus:outline-none focus:border-brand-500"
          />
        </label>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as NoteType)
            markDirty()
          }}
          className="rounded-lg bg-surface-base border border-surface-border px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          value={tagsInput}
          onChange={(e) => {
            setTagsInput(e.target.value)
            markDirty()
          }}
          placeholder="tags, comma, separated"
          className="flex-1 min-w-[10rem] rounded-lg bg-surface-base border border-surface-border px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500"
        />
      </div>
      {slugError && <p className="text-xs text-red-400">{slugError}</p>}

      <label className="flex items-center gap-1.5 text-xs text-slate-500">
        Canonical URL
        <input
          value={canonicalUrl}
          onChange={(e) => {
            setCanonicalUrl(e.target.value)
            markDirty()
          }}
          placeholder={defaultPublicUrl || 'defaults to this post’s own public page'}
          className="flex-1 min-w-[16rem] rounded-lg bg-surface-base border border-surface-border px-2.5 py-1 text-xs font-mono text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500"
        />
      </label>

      <section className="card-glow rounded-xl bg-surface-card p-1">
        <div className="flex items-center gap-1 px-4 pt-3">
          <button
            onClick={() => setTab('write')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              tab === 'write' ? 'bg-surface-hover text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Write
          </button>
          <button
            onClick={() => setTab('preview')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              tab === 'preview' ? 'bg-surface-hover text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Preview
          </button>
        </div>
        <div className="p-4">
          {tab === 'write' ? (
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value)
                markDirty()
              }}
              placeholder="Write in Markdown…"
              rows={20}
              className="w-full resize-y rounded-lg bg-surface-base border border-surface-border p-3 text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500"
            />
          ) : (
            <article className="prose-note" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
          )}
        </div>
      </section>

      <div className="flex items-center justify-between">
        <button onClick={onDelete} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
          Delete note
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePublish}
            disabled={updateNote.isPending}
            className="rounded-lg border border-surface-border px-4 py-1.5 text-sm text-slate-800 hover:bg-surface-hover disabled:opacity-40 transition-colors"
          >
            {note.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
          <button
            onClick={onSave}
            disabled={!dirty || updateNote.isPending}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-40 transition-colors"
          >
            {updateNote.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {note.status === 'published' && (
        <ExportPanel body={body} canonicalUrl={resolvedCanonicalUrl} />
      )}
    </div>
  )
}

function ExportPanel({ body, canonicalUrl }: { body: string; canonicalUrl: string }) {
  const [copied, setCopied] = useState<'md' | 'html' | null>(null)

  async function copy(kind: 'md' | 'html') {
    if (kind === 'md') {
      const footer = canonicalUrl ? `\n\n---\n*Originally published at [${canonicalUrl}](${canonicalUrl})*` : ''
      await navigator.clipboard.writeText(body + footer)
    } else {
      const footer = canonicalUrl
        ? `<hr><p><em>Originally published at <a href="${canonicalUrl}">${canonicalUrl}</a></em></p>`
        : ''
      await navigator.clipboard.writeText(renderMarkdown(body) + footer)
    }
    setCopied(kind)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <section className="card-glow rounded-xl bg-surface-card p-5 space-y-3">
      <h2 className="text-sm font-medium text-slate-800">Export</h2>
      <p className="text-xs text-slate-500 leading-relaxed">
        Medium and Substack don't offer a public API for posting new content. The reliable path: use Medium's own{' '}
        <a
          className="text-brand-500 hover:underline"
          href="https://medium.com/p/import"
          target="_blank"
          rel="noreferrer"
        >
          importer
        </a>{' '}
        against this note's public page URL, or paste the Markdown straight into a new Substack post.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => copy('md')}
          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-slate-800 hover:bg-surface-hover transition-colors"
        >
          {copied === 'md' ? 'Copied!' : 'Copy Markdown'}
        </button>
        <button
          onClick={() => copy('html')}
          className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-slate-800 hover:bg-surface-hover transition-colors"
        >
          {copied === 'html' ? 'Copied!' : 'Copy HTML'}
        </button>
      </div>
    </section>
  )
}
