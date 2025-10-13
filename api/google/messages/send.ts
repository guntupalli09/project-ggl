// Send message via Google Business Profile
// POST /api/google/messages/send

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { conversationId, messageText } = req.body

    if (!conversationId || !messageText) {
      return res.status(400).json({ error: 'conversationId and messageText are required' })
    }

    // Get user from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(user.id)

    // For now, return mock success since we need actual brandId and agentId
    // In production, you'd make the actual API call:
    /*
    const response = await fetch(`https://businessmessages.googleapis.com/v1/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messageText: messageText,
        representativeType: 'HUMAN'
      })
    })
    */

    // Mock response for now
    const mockResponse = {
      name: `conversations/${conversationId}/messages/msg_${Date.now()}`,
      messageId: `msg_${Date.now()}`,
      text: messageText,
      createTime: new Date().toISOString(),
      representativeType: 'HUMAN'
    }

    // Log the message in our database
    await supabase
      .from('messages_log')
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        sender: 'business',
        text: messageText,
        timestamp: new Date().toISOString()
      })

    res.status(200).json(mockResponse)

  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({ error: 'Failed to send message' })
  }
}
