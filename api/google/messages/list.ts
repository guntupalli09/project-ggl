// List Google Business Profile conversations
// GET /api/google/messages/list

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getValidAccessToken(userId: string) {
  // Get stored tokens
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('gbp_access_token, gbp_refresh_token, gbp_token_expiry')
    .eq('user_id', userId)
    .single()

  if (error || !settings) {
    throw new Error('No GBP tokens found')
  }

  // Check if token is expired
  const now = new Date()
  const expiry = new Date(settings.gbp_token_expiry)

  if (now >= expiry) {
    // Token expired, refresh it
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET!,
        refresh_token: settings.gbp_refresh_token,
        grant_type: 'refresh_token'
      })
    })

    const refreshData = await refreshResponse.json()

    if (!refreshResponse.ok) {
      throw new Error('Token refresh failed')
    }

    // Update stored token
    const newExpiry = new Date()
    newExpiry.setSeconds(newExpiry.getSeconds() + refreshData.expires_in)

    await supabase
      .from('user_settings')
      .update({
        gbp_access_token: refreshData.access_token,
        gbp_token_expiry: newExpiry.toISOString()
      })
      .eq('user_id', userId)

    return refreshData.access_token
  }

  return settings.gbp_access_token
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get user from Authorization header or query param
    const authHeader = req.headers.authorization
    let userId

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' })
      }
      userId = user.id
    } else {
      return res.status(401).json({ error: 'Authorization required' })
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(userId)

    // For now, return mock data since we need the actual brandId and agentId
    // In production, you'd need to get these from the user's business profile
    const mockConversations = [
      {
        name: 'conversations/123456789',
        conversationId: '123456789',
        conversationType: 'UNKNOWN',
        startTime: new Date().toISOString(),
        lastMessageTime: new Date().toISOString(),
        participantId: 'customer-001',
        participantRole: 'CUSTOMER'
      }
    ]

    res.status(200).json({
      conversations: mockConversations,
      totalSize: mockConversations.length
    })

  } catch (error) {
    console.error('Error listing conversations:', error)
    res.status(500).json({ error: 'Failed to list conversations' })
  }
}
