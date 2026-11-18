// Connects the user's Google account (Calendar, Gmail, Docs) by running Google's OAuth
// authorization-code flow. Gets a Google-hosted consent URL for this user, then redirects the whole
// browser there.
//
// Two backends can run the flow:
//  - llm-gateway (default): Google redirects back to the backend's own /auth/google/callback.
//  - assistant-node: set VITE_GOOGLE_CONNECT_API_URL. Google redirects back to this app's
//    /app/google/callback page, which posts the one-time code to the service (see GoogleCallback).

const connectBaseUrl = import.meta.env.VITE_GOOGLE_CONNECT_API_URL || import.meta.env.VITE_ASSISTANT_API_URL

/** True when the Node service runs the flow, so the callback page has work to do. */
export const connectViaNodeService = Boolean(import.meta.env.VITE_GOOGLE_CONNECT_API_URL)

export async function connectGoogleAccount(accessToken: string): Promise<void> {
  const res = await fetch(`${connectBaseUrl}/auth/google/start`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error('Could not start the Google connection flow')
  }

  const { authorizationUrl } = await res.json()
  window.location.href = authorizationUrl
}

/** Second half of the Node flow: hands the code Google returned to the service. */
export async function completeGoogleConnection(accessToken: string, code: string, state: string): Promise<void> {
  const res = await fetch(`${connectBaseUrl}/auth/google/exchange`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state }),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: unknown } | null
    throw new Error(typeof body?.detail === 'string' ? body.detail : 'Could not connect your Google account.')
  }
}
