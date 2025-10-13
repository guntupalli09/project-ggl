// Google Business Profile Messages OAuth initiation
// GET /api/google/messages/auth

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID
  const redirectUri = process.env.NODE_ENV === 'production' 
    ? 'https://www.getgetleads.com/api/google/messages/callback'
    : 'http://localhost:5173/api/google/messages/callback'

  if (!clientId) {
    return res.status(500).json({ error: 'Google Client ID not configured' })
  }

  // Required scopes for Google Business Profile Messages
  const scopes = [
    'https://www.googleapis.com/auth/businessmessages',
    'https://www.googleapis.com/auth/business.manage'
  ].join(' ')

  // Generate state parameter for CSRF protection
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', state)

  // Redirect to Google OAuth
  res.redirect(302, authUrl.toString())
}
