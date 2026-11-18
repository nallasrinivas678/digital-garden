import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { completeGoogleConnection, connectViaNodeService } from '../lib/googleConnect'

// Where Google sends the browser after the user approves (or refuses) access, when the Node
// service (assistant-node) runs the Connect Google flow. The page hands the one-time code to the
// service together with the user's own login token, so the service only saves the tokens for the
// user who started the flow. With the llm-gateway flow Google redirects to the backend instead,
// and this page is never reached.
export default function GoogleCallback() {
  const { session } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  // The code works once. React runs effects twice in development, so guard against a second call.
  const started = useRef(false)

  useEffect(() => {
    if (started.current || !session) return
    started.current = true

    const code = params.get('code')
    const state = params.get('state')
    const denied = params.get('error')

    if (!connectViaNodeService) {
      navigate('/app', { replace: true })
      return
    }
    if (denied) {
      setError('Google access was cancelled, so nothing was connected.')
      return
    }
    if (!code || !state) {
      setError('The Google sign-in link is incomplete. Please try connecting again.')
      return
    }

    completeGoogleConnection(session.access_token, code, state)
      .then(() => navigate('/app', { replace: true }))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not connect your Google account.'))
  }, [session, params, navigate])

  return (
    <div className="max-w-md mx-auto mt-24 text-center card-glow rounded-xl bg-surface-card p-8 space-y-3">
      {error ? (
        <>
          <p className="text-sm text-slate-700">{error}</p>
          <Link to="/app" className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-brand-100 text-brand-700">
            Back to the dashboard
          </Link>
        </>
      ) : (
        <p className="text-sm text-slate-500 font-mono">Connecting your Google account…</p>
      )}
    </div>
  )
}
