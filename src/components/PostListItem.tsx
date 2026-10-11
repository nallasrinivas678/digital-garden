import { Link } from 'react-router-dom'
import { prettyDate } from '../lib/dates'
import type { Note, NoteType } from '../types'

const TYPE_LABELS: Record<NoteType, string> = {
  'tech-note': 'Tech note',
  exercise: 'Coding exercise',
  'system-design': 'System design',
}

/** Strips markdown syntax and truncates for a plain-text preview line. */
function excerpt(body: string, length = 140): string {
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_`>]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > length ? `${plain.slice(0, length).trim()}…` : plain
}

/** Reusable row for GardenIndex and Home's "recent posts". */
export default function PostListItem({ note, username }: { note: Note; username: string }) {
  return (
    <Link to={`/${username}/notes/${note.slug}`} className="block py-4 group">
      <div className="flex items-center gap-x-3 text-xs font-mono text-slate-500">
        {note.published_at && <span>{prettyDate(note.published_at.slice(0, 10))}</span>}
        <span>{TYPE_LABELS[note.type]}</span>
      </div>
      <h3 className="mt-1 text-base font-medium text-slate-900 group-hover:text-brand-600 transition-colors">
        {note.title || 'Untitled note'}
      </h3>
      {note.body && <p className="mt-1 text-sm text-slate-600">{excerpt(note.body)}</p>}
    </Link>
  )
}
