import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/** Root "/" — minimal marketing page explaining TaskTide + sign-in CTA. */
export default function Landing() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-surface-base text-slate-800 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-lg text-center space-y-6">
          <div className="text-3xl">🌱</div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900">TaskTide</h1>
          <p className="text-sm sm:text-base text-slate-600">
            A personal task, career, and notes hub — and a free public portfolio page at your own
            <span className="font-mono"> tasktide.app/username</span>.
          </p>
          <Link
            to={user ? '/app' : '/login'}
            className="inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-500 transition-colors"
          >
            {user ? 'Open App' : 'Get started'}
          </Link>
        </div>
      </div>
      <footer className="border-t border-surface-border py-8 text-center text-xs text-slate-500 font-mono">
        <Link to="/privacy" className="hover:text-slate-900 transition-colors">
          Privacy
        </Link>
      </footer>
    </div>
  )
}
