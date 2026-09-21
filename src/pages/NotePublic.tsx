import { Link, useParams } from 'react-router-dom'
import { usePublicNote } from '../lib/hooks'
import { renderMarkdown } from '../lib/markdown'
import { prettyDate } from '../lib/dates'
import type { NoteType } from '../types'

const TYPE_LABELS: Record<NoteType, string> = {
  'tech-note': 'Tech note',
  exercise: 'Coding exercise',
  'system-design': 'System design',
}

/** Public, unauthenticated reader page — this is the actual "garden" site. */
export default function NotePublic() {
  const { slug } = useParams<{ slug: string }>()
  const { data: note, isLoading } = usePublicNote(slug)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500 font-mono">
        Loading…
      </div>
    )
  }

  if (!note) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <p className="text-sm text-slate-500">This note doesn't exist or isn't published.</p>
          <Link to="/" className="mt-3 inline-block font-mono text-xs text-brand-500 tracking-widest">
            🌱 TaskTide
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-base text-slate-800">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link to="/" className="font-mono text-xs text-brand-600 tracking-widest">
          🌱 TaskTide
        </Link>

        <header className="mt-8 mb-8 space-y-2">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">{TYPE_LABELS[note.type]}</p>
          <h1 className="text-3xl font-semibold text-slate-900">{note.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {note.published_at && <span>{prettyDate(note.published_at.slice(0, 10))}</span>}
            {note.tags.length > 0 && <span>{note.tags.join(' · ')}</span>}
          </div>
        </header>

        <article className="prose-note" dangerouslySetInnerHTML={{ __html: renderMarkdown(note.body) }} />
      </div>
    </div>
  )
}
