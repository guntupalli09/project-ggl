// Google OAuth callback endpoint
// Handles the OAuth callback and exchanges code for tokens

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
    const { code, state, error } = req.query

    // Check for OAuth errors
    if (error) {
      console.error('Google OAuth error:', error)
      return res.redirect(302, `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?calendar_error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      return res.redirect(302, `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?calendar_error=missing_parameters`)
    }

    // Verify and decode state parameter
    let stateData
    try {
      const decodedState = Buffer.from(state as string, 'base64').toString('utf-8')
      stateData = JSON.parse(decodedState)
    } catch (stateError) {
      console.error('Invalid state parameter:', stateError)
      return res.redirect(302, `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?calendar_error=invalid_state`)
    }

    // Check if state is not too old (5 minutes)
    const stateAge = Date.now() - stateData.timestamp
    if (stateAge > 5 * 60 * 1000) {
      return res.redirect(302, `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?calendar_error=state_expired`)
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.VITE_GOOGLE_CLIENT_ID!,
        client_secret: process.env.VITE_GOOGLE_CLIENT_SECRET!,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: process.env.NODE_ENV === 'production' 
          ? 'https://www.getgetleads.com/api/google/callback'
          : 'http://localhost:5173/api/google/callback'
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      return res.redirect(302, `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?calendar_error=token_exchange_failed`)
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokenData

    if (!access_token) {
      return res.redirect(302, `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?calendar_error=no_access_token`)
    }

    // Calculate token expiry time
    const tokenExpiry = new Date(Date.now() + (expires_in * 1000)).toISOString()

    // Get user info to verify the token
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    })

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info')
      return res.redirect(302, `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?calendar_error=user_info_failed`)
    }

    const userInfo = await userInfoResponse.json()

    // Save tokens to user_settings table
    const { error: updateError } = await supabase
      .from('user_settings')
      .upsert([{
        user_id: stateData.userId,
        google_access_token: access_token,
        google_refresh_token: refresh_token,
        google_token_expiry: tokenExpiry,
        google_calendar_connected: true,
        google_calendar_email: userInfo.email,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'user_id'
      })

    if (updateError) {
      console.error('Failed to save Google tokens:', updateError)
      return res.redirect(302, `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?calendar_error=save_tokens_failed`)
    }

    console.log(`Google Calendar connected for user ${stateData.userId}`)

    // Redirect back to profile with success
    return res.redirect(302, `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?calendar_success=true`)

  } catch (error: any) {
    console.error('Google callback error:', error)
    return res.redirect(302, `${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?calendar_error=internal_error`)
  }
}
