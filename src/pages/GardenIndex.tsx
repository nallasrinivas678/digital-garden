import { useOutletContext } from 'react-router-dom'
import PostListItem from '../components/PostListItem'
import { usePublicNotes } from '../lib/hooks'
import type { PortfolioProfile } from '../types'

/** One user's published Garden posts, served at "/:username/notes". */
export default function GardenIndex() {
  const profile = useOutletContext<PortfolioProfile>()
  const { data: notes, isLoading } = usePublicNotes(profile.user_id)

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14 space-y-6">
      <header>
        <p className="font-mono text-xs text-brand-500 uppercase tracking-widest">Garden</p>
        <h1 className="text-3xl font-semibold text-slate-900 mt-1">Notes</h1>
      </header>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : !notes || notes.length === 0 ? (
        <p className="text-sm text-slate-500">No published notes yet — check back soon.</p>
      ) : (
        <div className="divide-y divide-surface-border">
          {notes.map((n) => (
            <PostListItem key={n.id} note={n} username={profile.username} />
          ))}
        </div>
      )}
    </div>
  )
}
