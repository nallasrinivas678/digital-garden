import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { usePublicProfile } from '../lib/hooks'
import { GithubIcon, LinkedinIcon } from './icons'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `transition-colors ${isActive ? 'text-brand-600 font-medium' : 'text-slate-500 hover:text-slate-900'}`

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
            <div className="flex items-center gap-5 text-sm font-mono">
              <NavLink to={`/${username}`} end className={navLinkClass}>
                Home
              </NavLink>
              <NavLink to={`/${username}/projects`} className={navLinkClass}>
                Projects
              </NavLink>
              <NavLink to={`/${username}/notes`} className={navLinkClass}>
                Garden
              </NavLink>
              {profile.resume_url && (
                <a href={profile.resume_url} className="text-slate-500 hover:text-slate-900 transition-colors">
                  Résumé
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

      <footer className="border-t border-surface-border mt-20 py-10 text-center text-xs text-slate-500 font-mono">
        {profile && (profile.github_url || profile.linkedin_url) && (
          <div className="flex items-center justify-center gap-4 mb-4 text-slate-400">
            {profile.github_url && (
              <a href={profile.github_url} target="_blank" rel="noreferrer" aria-label="GitHub" className="hover:text-brand-600 transition-colors">
                <GithubIcon className="w-4 h-4" />
              </a>
            )}
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="hover:text-brand-600 transition-colors">
                <LinkedinIcon className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
        Built with 🌱 <span className="text-brand-600">TaskTide</span>
      </footer>
    </div>
  )
}
