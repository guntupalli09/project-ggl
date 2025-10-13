// Combined Google token management endpoint
// Handles both token exchange and refresh

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { code, refresh_token, action } = req.body

    // Handle token exchange
    if (action === 'exchange' || code) {
      return handleTokenExchange(req, res)
    }

    // Handle token refresh
    if (action === 'refresh' || refresh_token) {
      return handleTokenRefresh(req, res)
    }

    return res.status(400).json({ error: 'Invalid action. Use "exchange" or "refresh"' })

  } catch (error) {
    console.error('Token management error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleTokenExchange(req: any, res: any) {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ error: 'Missing code' })
    }

    // Use the correct redirect URI for production
    const redirect_uri = process.env.NODE_ENV === 'production' 
      ? 'https://www.getgetleads.com/profile'
      : 'http://localhost:5173/profile'

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirect_uri
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      return res.status(400).json({ error: 'Token exchange failed' })
    }

    const tokenData = await tokenResponse.json()

    // Return the tokens to the frontend
    res.status(200).json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type
    })
  } catch (error) {
    console.error('Token exchange error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleTokenRefresh(req: any, res: any) {
  try {
    const { refresh_token } = req.body

    if (!refresh_token) {
      return res.status(400).json({ error: 'Missing refresh_token' })
    }

    // Refresh the access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refresh_token,
        grant_type: 'refresh_token'
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token refresh failed:', errorData)
      return res.status(400).json({ error: 'Token refresh failed' })
    }

    const tokenData = await tokenResponse.json()

    // Return the new access token
    res.status(200).json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
