import { Link, useNavigate } from 'react-router-dom'
import { useNotes, useCreateNote } from '../lib/hooks'
import type { Note, NoteType } from '../types'

const TYPE_LABELS: Record<NoteType, string> = {
  'tech-note': 'Tech note',
  exercise: 'Exercise',
  'system-design': 'System design',
}

export default function GardenList() {
  const { data: notes, isLoading } = useNotes()
  const createNote = useCreateNote()
  const navigate = useNavigate()

  function onNew() {
    createNote.mutate(
      { title: 'Untitled note' },
      { onSuccess: (note) => navigate(`/garden/${note.id}`) },
    )
  }

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Garden</p>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1">Notes</h1>
        </div>
        <button
          onClick={onNew}
          disabled={createNote.isPending}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-40 transition-colors"
        >
          {createNote.isPending ? 'Creating…' : '+ New note'}
        </button>
      </header>

      <section className="card-glow rounded-xl bg-surface-card p-5">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : !notes || notes.length === 0 ? (
          <p className="text-sm text-slate-500">
            No notes yet — create your first tech note, exercise, or system design write-up above.
          </p>
        ) : (
          <ul className="divide-y divide-surface-border">
            {notes.map((n) => (
              <NoteRow key={n.id} note={n} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function NoteRow({ note }: { note: Note }) {
  return (
    <li>
      <Link to={`/garden/${note.id}`} className="flex items-center gap-3 py-3 group">
        <span className="flex-1 text-sm text-slate-800 truncate group-hover:text-slate-900 transition-colors">
          {note.title || 'Untitled note'}
        </span>
        {note.tags.length > 0 && (
          <span className="hidden sm:inline text-xs text-slate-500 truncate max-w-[10rem]">
            {note.tags.join(', ')}
          </span>
        )}
        <span className="text-xs font-mono text-slate-500 shrink-0">{TYPE_LABELS[note.type]}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
            note.status === 'published' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {note.status === 'published' ? 'Published' : 'Draft'}
        </span>
      </Link>
    </li>
  )
}
