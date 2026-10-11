import { Link, Outlet, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { usePublicProfile } from '../lib/hooks'

/**
 * Wraps every /:username/* public page. Resolves the username to a profile
 * exactly once here (children read it via useOutletContext instead of each
 * re-fetching it), and owns the one "this page doesn't exist" state for an
 * unclaimed or mistyped username.
 */
export default function PublicProfileLayout() {
  const { username } = useParams<{ username: string }>()
  const { user } = useAuth()
  const { data: profile, isLoading } = usePublicProfile(username)

  return (
    <div className="min-h-screen bg-surface-base text-slate-800">
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-surface-border bg-surface-base/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-mono text-sm font-medium text-brand-600 tracking-widest">
            🌱 TaskTide
          </Link>
          {profile && (
            <div className="flex items-center gap-5 text-sm">
              <Link to={`/${username}`} className="text-slate-500 hover:text-slate-900 transition-colors">
                Home
              </Link>
              <Link to={`/${username}/projects`} className="text-slate-500 hover:text-slate-900 transition-colors">
                Projects
              </Link>
              <Link to={`/${username}/notes`} className="text-slate-500 hover:text-slate-900 transition-colors">
                Garden
              </Link>
              {profile.resume_url && (
                <a href={profile.resume_url} className="text-slate-500 hover:text-slate-900 transition-colors">
                  Resume
                </a>
              )}
              <Link
                to={user ? '/app' : '/login'}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-white font-medium hover:bg-brand-500 transition-colors"
              >
                {user ? 'Open App' : 'Sign in'}
              </Link>
            </div>
          )}
        </div>
      </nav>

      <main className="pt-14">
        {isLoading ? (
          <p className="max-w-4xl mx-auto px-4 py-14 text-sm text-slate-500">Loading…</p>
        ) : !profile ? (
          <div className="max-w-4xl mx-auto px-4 py-14 text-center">
            <p className="text-sm text-slate-500">No portfolio exists at "{username}".</p>
            <Link to="/" className="mt-3 inline-block font-mono text-xs text-brand-500 tracking-widest">
              🌱 TaskTide
            </Link>
          </div>
        ) : (
          <Outlet context={profile} />
        )}
      </main>

      <footer className="border-t border-surface-border mt-20 py-8 text-center text-xs text-slate-500 font-mono">
        🌱 <span className="text-brand-600">TaskTide</span>
      </footer>
    </div>
  )
}
