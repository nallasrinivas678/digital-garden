import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useMyPortfolioProfile } from '../../lib/hooks'
import WeatherWidget from './WeatherWidget'
import NotificationPermissionButton from './NotificationPermissionButton'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const { data: profile } = useMyPortfolioProfile()

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-surface-border bg-surface-base/80 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/app" className="font-mono text-sm font-medium text-brand-600 tracking-widest">
          🌱 TaskTide
        </Link>
        <div className="flex items-center gap-4">
          {profile && (
            <Link to="/app/portfolio" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Portfolio
            </Link>
          )}
          <WeatherWidget />
          <NotificationPermissionButton />
          <button
            onClick={signOut}
            title={user?.email ?? 'Sign out'}
            className="px-3 py-1.5 rounded text-sm text-slate-500 hover:text-slate-900 hover:bg-surface-hover transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
