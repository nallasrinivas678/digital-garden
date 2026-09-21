import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { user, loading, signInWithGoogle } = useAuth()

  if (loading) return <FullScreenMessage text="Loading…" />
  if (user) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center card-glow rounded-2xl bg-surface-card p-8">
        <div className="text-3xl mb-2">🌱</div>
        <h1 className="text-2xl font-semibold text-slate-900">TaskTide</h1>
        <p className="mt-2 text-sm text-slate-500">
          Plan your days, track your career, and grow your notes.
        </p>

        <button
          onClick={signInWithGoogle}
          className="mt-8 w-full flex items-center justify-center gap-3 rounded-lg border border-surface-border bg-white text-slate-800 font-medium py-2.5 hover:bg-surface-hover transition-colors"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="mt-6 text-xs text-slate-400">
          Your entries are private and visible only to you.
        </p>
      </div>
    </div>
  )
}

function FullScreenMessage({ text }: { text: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 font-mono text-sm">
      {text}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.86-.08-1.68-.22-2.47H12v4.68h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.83z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29V6.62H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l4.01-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.09C6.23 6.86 8.88 4.75 12 4.75z"
      />
    </svg>
  )
}
