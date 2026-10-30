// Starts llm-gateway's Google OAuth authorization-code flow: gets a
// Google-hosted consent URL for this user, then redirects the whole browser
// there. Google redirects back to the backend's own /auth/google/callback
// when done - this tab just needs to leave and (eventually) come back.
export async function connectGoogleAccount(accessToken: string): Promise<void> {
  const res = await fetch(`${import.meta.env.VITE_ASSISTANT_API_URL}/auth/google/start`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error('Could not start the Google connection flow')
  }

  const { authorizationUrl } = await res.json()
  window.location.href = authorizationUrl
}
