// Google Business Profile Messages OAuth callback
// GET /api/google/messages/callback

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, state, error } = req.query

  if (error) {
    return res.redirect(`/messages?error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return res.redirect('/messages?error=no_code')
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET!,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: process.env.NODE_ENV === 'production' 
          ? 'https://www.getgetleads.com/api/google/messages/callback'
          : 'http://localhost:5173/api/google/messages/callback'
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData)
      return res.redirect('/messages?error=token_exchange_failed')
    }

    // Get user info to identify the user
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    const userInfo = await userResponse.json()

    if (!userResponse.ok) {
      console.error('User info fetch failed:', userInfo)
      return res.redirect('/messages?error=user_info_failed')
    }

    // Find user by email
    const { data: user, error: userError } = await supabase.auth.admin.getUserByEmail(userInfo.email)

    if (userError || !user) {
      console.error('User not found:', userError)
      return res.redirect('/messages?error=user_not_found')
    }

    // Calculate token expiry
    const expiryTime = new Date()
    expiryTime.setSeconds(expiryTime.getSeconds() + tokenData.expires_in)

    // Store tokens in user_settings
    const { error: updateError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.user.id,
        gbp_access_token: tokenData.access_token,
        gbp_refresh_token: tokenData.refresh_token,
        gbp_token_expiry: expiryTime.toISOString(),
        gbp_account_id: userInfo.id
      }, {
        onConflict: 'user_id'
      })

    if (updateError) {
      console.error('Failed to store tokens:', updateError)
      return res.redirect('/messages?error=storage_failed')
    }

    // Redirect to messages page with success
    res.redirect('/messages?success=connected')

  } catch (error) {
    console.error('OAuth callback error:', error)
    res.redirect('/messages?error=callback_failed')
  }
}
