// Google OAuth initiation endpoint
// Redirects user to Google OAuth consent screen

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' })
    }

    const token = authHeader.split(' ')[1]

    // Verify the user token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Google OAuth configuration
    const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID
    const REDIRECT_URI = process.env.NODE_ENV === 'production' 
      ? 'https://www.getgetleads.com/api/google/callback'
      : 'http://localhost:5173/api/google/callback'

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google Client ID not configured' })
    }

    // Required scopes for Google Calendar
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly'
    ].join(' ')

    // Generate state parameter for security
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now()
    })).toString('base64')

    // Build Google OAuth URL
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
    googleAuthUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    googleAuthUrl.searchParams.set('response_type', 'code')
    googleAuthUrl.searchParams.set('scope', scopes)
    googleAuthUrl.searchParams.set('access_type', 'offline')
    googleAuthUrl.searchParams.set('prompt', 'consent')
    googleAuthUrl.searchParams.set('state', state)

    console.log('Redirecting to Google OAuth:', googleAuthUrl.toString())

    // Redirect to Google OAuth
    return res.redirect(302, googleAuthUrl.toString())

  } catch (error: any) {
    console.error('Google auth error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}
