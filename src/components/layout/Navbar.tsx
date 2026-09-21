import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

export default function Navbar() {
  const { user, signOut } = useAuth()

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-surface-border bg-surface-base/80 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-mono text-sm font-medium text-brand-600 tracking-widest">
          🌱 digital garden
        </Link>
        <button
          onClick={signOut}
          title={user?.email ?? 'Sign out'}
          className="px-3 py-1.5 rounded text-sm text-slate-500 hover:text-slate-900 hover:bg-surface-hover transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
