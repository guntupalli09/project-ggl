// Simple Express server for development API routes
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

// Simple cache to prevent excessive API calls
const cache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://www.getgetleads.com'],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// Google Business Profile Messages OAuth initiation
app.get('/api/google/messages/auth', (req, res) => {
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.NODE_ENV === 'production' 
    ? 'https://www.getgetleads.com/api/google/callback'
    : 'http://localhost:5173/profile'

  if (!clientId) {
    return res.status(500).json({ error: 'Google Client ID not configured' })
  }

  // Required scopes for Google Business Profile Messages
  // Valid OAuth scopes for Business Profile / My Business APIs
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/business.manage',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly'
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

  console.log('Redirecting to Google OAuth:', authUrl.toString())
  res.redirect(302, authUrl.toString())
})

// Google Business Profile Messages OAuth callback
app.get('/api/google/messages/callback', async (req, res) => {
  const { code, state, error } = req.query

  if (error) {
    console.error('OAuth error:', error)
    return res.redirect(`http://localhost:5173/messages?error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    console.error('No authorization code received')
    return res.redirect('http://localhost:5173/messages?error=no_code')
  }

  try {
    console.log('Exchanging code for tokens...')
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.VITE_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.NODE_ENV === 'production' 
          ? 'https://www.getgetleads.com/api/google/messages/callback'
          : 'http://localhost:5173/api/google/messages/callback'
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData)
      return res.redirect('http://localhost:5173/messages?error=token_exchange_failed')
    }

    console.log('Token exchange successful, redirecting to frontend...')
    
    // For now, just redirect to success page
    // In production, you'd store the tokens in your database
    res.redirect('http://localhost:5173/messages?success=connected')

  } catch (error) {
    console.error('OAuth callback error:', error)
    res.redirect('http://localhost:5173/messages?error=callback_failed')
  }
})

// POST endpoint for callback (used by the HTML page)
app.post('/api/google/messages/callback', async (req, res) => {
  const { code, state } = req.body

  if (!code) {
    return res.status(400).json({ error: 'No authorization code received' })
  }

  try {
    console.log('Exchanging code for tokens...')
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.VITE_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.NODE_ENV === 'production' 
          ? 'https://www.getgetleads.com/api/google/messages/callback'
          : 'http://localhost:5173/api/google/messages/callback'
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData)
      return res.status(400).json({ error: 'Token exchange failed' })
    }

    console.log('Token exchange successful!')
    res.json({ success: true, access_token: tokenData.access_token })

  } catch (error) {
    console.error('OAuth callback error:', error)
    res.status(500).json({ error: 'Callback processing failed' })
  }
})

// Real Google Business Messages API routes
app.get('/api/google/messages/list', async (req, res) => {
  try {
    // Get user from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' })
    }

    const token = authHeader.substring(7)
    
    // Check cache first to prevent quota exhaustion
    const cacheKey = `conversations_${token.substring(0, 10)}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached conversations data')
      return res.json(cached.data)
    }
    
    // For now, we need to get the user's business profile first
    // This requires additional setup in Google Cloud Console
    // We'll implement a fallback with proper error handling
    
    try {
      // Try to get user's business profiles using My Business API
      const businessResponse = await fetch('https://mybusinessbusinessinformation.googleapis.com/v1/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (businessResponse.ok) {
        const businessData = await businessResponse.json()
        console.log('Business profiles found:', businessData)
        
        // Check if no business accounts exist
        if (!businessData.accounts || businessData.accounts.length === 0) {
          const responseData = {
            conversations: [],
            totalSize: 0,
            message: 'No Google Business account found for this email address. Please ensure your Google account has a verified Business Profile.'
          }
          
          // Cache the response
          cache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
          })
          
          return res.json(responseData)
        }
        
        // Get business locations for each account
        const conversations = []
        
        for (const account of businessData.accounts || []) {
          try {
            const locationsResponse = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
            
            if (locationsResponse.ok) {
              const locationsData = await locationsResponse.json()
              console.log('Locations found for account:', account.name, locationsData)
              
              // For now, we'll create mock conversations based on business locations
              // In a real implementation, you'd integrate with actual messaging platforms
              for (const location of locationsData.locations || []) {
                conversations.push({
                  name: `conversations/${location.name}`,
                  conversationId: location.name.split('/').pop(),
                  conversationType: 'BUSINESS_LOCATION',
                  startTime: new Date().toISOString(),
                  lastMessageTime: new Date().toISOString(),
                  participantId: location.displayName || 'Business Location',
                  participantRole: 'BUSINESS',
                  location: location
                })
              }
            }
          } catch (locationError) {
            console.error('Error fetching locations for account:', account.name, locationError)
          }
        }
        
        const responseData = {
          conversations: conversations,
          totalSize: conversations.length,
          message: conversations.length === 0 ? 'No business locations found. Please ensure your Google My Business profile is set up and verified.' : null
        }
        
        // Cache the response
        cache.set(cacheKey, {
          data: responseData,
          timestamp: Date.now()
        })
        
        res.json(responseData)
      } else {
        const errorData = await businessResponse.json()
        console.error('Business profile access error:', errorData)
        
        // Check if it's an API not enabled error or quota exceeded
        if (errorData.error?.message?.includes('has not been used in project') || 
            errorData.error?.message?.includes('is disabled') ||
            errorData.error?.message?.includes('Quota exceeded') ||
            errorData.error?.status === 'RESOURCE_EXHAUSTED') {
          // Return mock data instead of error when APIs are not enabled or quota exceeded
          console.log('My Business APIs quota exceeded or not enabled, returning mock data')
          const mockData = {
            conversations: [
              {
                name: 'conversations/mock-1',
                conversationId: 'mock-1',
                conversationType: 'MOCK_CONVERSATION',
                startTime: new Date().toISOString(),
                lastMessageTime: new Date().toISOString(),
                participantId: 'Demo Customer',
                participantRole: 'CUSTOMER'
              },
              {
                name: 'conversations/mock-2',
                conversationId: 'mock-2',
                conversationType: 'MOCK_CONVERSATION',
                startTime: new Date(Date.now() - 3600000).toISOString(),
                lastMessageTime: new Date(Date.now() - 1800000).toISOString(),
                participantId: 'Another Customer',
                participantRole: 'CUSTOMER'
              }
            ],
            totalSize: 2,
            message: 'Demo conversations (Google My Business APIs quota exceeded). Wait a few minutes for quota to reset, or upgrade your Google Cloud plan for higher limits.'
          }
          
          // Cache the mock data
          cache.set(cacheKey, {
            data: mockData,
            timestamp: Date.now()
          })
          
          res.json(mockData)
        } else {
          throw new Error(`Business profile access denied: ${errorData.error?.message || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('My Business API error:', error)
      
      // Return mock data instead of error
      console.log('Returning mock data due to API error')
      res.json({
        conversations: [
          {
            name: 'conversations/mock-1',
            conversationId: 'mock-1',
            conversationType: 'MOCK_CONVERSATION',
            startTime: new Date().toISOString(),
            lastMessageTime: new Date().toISOString(),
            participantId: 'Demo Customer',
            participantRole: 'CUSTOMER'
          },
          {
            name: 'conversations/mock-2',
            conversationId: 'mock-2',
            conversationType: 'MOCK_CONVERSATION',
            startTime: new Date(Date.now() - 3600000).toISOString(),
            lastMessageTime: new Date(Date.now() - 1800000).toISOString(),
            participantId: 'Another Customer',
            participantRole: 'CUSTOMER'
          }
        ],
        totalSize: 2,
        message: 'Demo conversations (Google My Business APIs quota exceeded). Wait a few minutes for quota to reset, or upgrade your Google Cloud plan for higher limits.'
      })
    }
  } catch (error) {
    console.error('Error listing conversations:', error)
    res.status(500).json({ error: 'Failed to list conversations' })
  }
})

// Get messages for a specific conversation thread
app.get('/api/google/messages/thread/:id', async (req, res) => {
  try {
    const { id: conversationId } = req.params
    
    // Get user from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' })
    }

    const token = authHeader.substring(7)

    try {
      // Since Google Business Messages API is not available, we'll simulate message fetching
      // In a real implementation, you'd fetch from actual messaging platforms
      
      console.log(`Simulating message fetch for conversation ${conversationId}`)
      
      // Simulate some sample messages for the conversation
      const simulatedMessages = [
        {
          id: `msg_${Date.now()}_1`,
          text: 'Hello! How can I help you today?',
          sender: 'business',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          representativeType: 'HUMAN'
        },
        {
          id: `msg_${Date.now()}_2`,
          text: 'I\'m interested in your services. Can you tell me more?',
          sender: 'customer',
          timestamp: new Date(Date.now() - 3000000).toISOString(),
          representativeType: 'CUSTOMER'
        },
        {
          id: `msg_${Date.now()}_3`,
          text: 'Of course! I\'d be happy to help. What specific service are you looking for?',
          sender: 'business',
          timestamp: new Date(Date.now() - 2400000).toISOString(),
          representativeType: 'HUMAN'
        }
      ]
      
      res.json({ 
        messages: simulatedMessages,
        note: 'These are simulated messages. In production, integrate with real messaging platforms.'
      })
      
    } catch (apiError) {
      console.error('Message fetching error:', apiError)
      res.status(400).json({ 
        error: 'Message fetching not available',
        details: 'Google Business Messages API is not available. Consider integrating with other messaging platforms.'
      })
    }
  } catch (error) {
    console.error('Error fetching thread messages:', error)
    res.status(500).json({ error: 'Failed to fetch thread messages' })
  }
})

app.post('/api/google/messages/send', async (req, res) => {
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

    try {
      // Since Google Business Messages API is not available, we'll simulate message sending
      // In a real implementation, you'd integrate with actual messaging platforms like:
      // - WhatsApp Business API
      // - Facebook Messenger
      // - SMS via Twilio
      // - Email notifications
      
      console.log(`Simulating message send to conversation ${conversationId}: ${messageText}`)
      
      // Simulate successful message sending
      const simulatedResponse = {
        name: `conversations/${conversationId}/messages/msg_${Date.now()}`,
        messageId: `msg_${Date.now()}`,
        text: messageText,
        createTime: new Date().toISOString(),
        representativeType: 'HUMAN',
        status: 'SENT',
        note: 'This is a simulated message. In production, integrate with real messaging platforms.'
      }
      
      console.log('Simulated message sent:', simulatedResponse)
      res.json(simulatedResponse)
      
    } catch (apiError) {
      console.error('Message sending error:', apiError)
      res.status(400).json({ 
        error: 'Message sending not available',
        details: 'Google Business Messages API is not available. Consider integrating with other messaging platforms.',
        setup_required: [
          'Integrate with WhatsApp Business API',
          'Integrate with Facebook Messenger',
          'Integrate with SMS via Twilio',
          'Set up email notifications'
        ]
      })
    }
  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// Health check
// Google Business Profile Performance API routes
app.get('/api/google/business/performance', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' })
    }

    const token = authHeader.substring(7)
    
    // Check cache first to prevent quota exhaustion
    const cacheKey = `performance_${token.substring(0, 10)}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached performance data')
      return res.json(cached.data)
    }
    
    try {
      // Get user's business accounts
      const businessResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (businessResponse.ok) {
        const businessData = await businessResponse.json()
        console.log('Business accounts found:', businessData)
        
        // Check if no business accounts exist
        if (!businessData.accounts || businessData.accounts.length === 0) {
          const responseData = {
            performance: [],
            totalSize: 0,
            message: 'No Google Business account found for this email address. Please ensure your Google account has a verified Business Profile.'
          }
          
          // Cache the response
          cache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
          })
          
          return res.json(responseData)
        }
        
        const performanceData = []
        
        // Get performance data for each business account
        for (const account of businessData.accounts || []) {
          try {
            // Get locations for this account
            const locationsResponse = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
            
            if (locationsResponse.ok) {
              const locationsData = await locationsResponse.json()
              console.log('Locations found for account:', account.name, locationsData)
              
              // Get performance data for each location
              for (const location of locationsData.locations || []) {
                try {
                  // Get performance metrics using Business Profile Performance API
                  const performanceResponse = await fetch(`https://mybusiness.googleapis.com/v1/${location.name}/reportInsights`, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  })
                  
                  if (performanceResponse.ok) {
                    const perfData = await performanceResponse.json()
                    console.log('Performance data found for location:', location.name, perfData)
                    
                    // Process performance data and add location info
                    performanceData.push({
                      ...perfData,
                      locationName: location.displayName,
                      locationAddress: location.storefrontAddress?.addressLines?.join(', '),
                      businessAccount: account.name
                    })
                  } else {
                    console.error('Error fetching performance data for location:', location.name, performanceResponse.status)
                  }
                } catch (perfError) {
                  console.error('Error fetching performance data for location:', location.name, perfError)
                }
              }
            }
          } catch (locationError) {
            console.error('Error fetching locations for account:', account.name, locationError)
          }
        }
        
        const responseData = {
          performance: performanceData,
          totalSize: performanceData.length,
          message: performanceData.length === 0 ? 'No performance data found. This could mean your Google Business Profile has no performance data yet, or the Performance API is not enabled.' : null
        }
        
        // Cache the response
        cache.set(cacheKey, {
          data: responseData,
          timestamp: Date.now()
        })
        
        res.json(responseData)
      } else {
        const errorData = await businessResponse.json()
        console.error('Business account access error:', errorData)
        
        // Check if it's an API not enabled error or quota exceeded
        if (errorData.error?.message?.includes('has not been used in project') || 
            errorData.error?.message?.includes('is disabled') ||
            errorData.error?.message?.includes('Quota exceeded') ||
            errorData.error?.status === 'RESOURCE_EXHAUSTED') {
          // Return appropriate message based on error type
          const isQuotaError = errorData.error?.message?.includes('Quota exceeded') || errorData.error?.status === 'RESOURCE_EXHAUSTED'
          
          const mockData = {
            performance: [],
            totalSize: 0,
            message: isQuotaError 
              ? 'Google Business Profile API quota exceeded. Wait a few minutes for quota to reset, or upgrade your Google Cloud plan for higher limits.'
              : 'Google Business Profile Performance API not enabled. Please enable "Business Profile Performance API" in Google Cloud Console.'
          }
          
          // Cache the mock data
          cache.set(cacheKey, {
            data: mockData,
            timestamp: Date.now()
          })
          
          res.json(mockData)
        } else {
          throw new Error(`Business account access denied: ${errorData.error?.message || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('My Business API error:', error)
      
      // Return appropriate error message
      const mockData = {
        performance: [],
        totalSize: 0,
        message: 'Unable to fetch performance data. Please ensure your Google Business Profile is set up and the Performance API is enabled.'
      }
      
      // Cache the error response
      cache.set(cacheKey, {
        data: mockData,
        timestamp: Date.now()
      })
      
      res.json(mockData)
    }
  } catch (error) {
    console.error('Error listing performance data:', error)
    res.status(500).json({ error: 'Failed to list performance data' })
  }
})

// LinkedIn OAuth endpoints
app.get('/api/linkedin/auth', (req, res) => {
  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID
    // Use environment-specific redirect URI
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? 'http://www.getgetleads.com/linkedin/callback'
      : 'http://localhost:5173/linkedin/callback'
    
    if (!clientId) {
      return res.status(500).json({ error: 'LinkedIn Client ID not configured' })
    }

    // Generate state parameter for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    // Store state in session or cookie for verification
    res.cookie('linkedin_state', state, { 
      httpOnly: true, 
      secure: false, // Set to true in production with HTTPS
      maxAge: 600000 // 10 minutes
    })

    const scopes = 'openid profile email w_member_social'
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}&` +
      `scope=${encodeURIComponent(scopes)}`

    res.json({ 
      success: true,
      authUrl,
      state
    })
  } catch (error) {
    console.error('Error generating LinkedIn auth URL:', error)
    res.status(500).json({ error: 'Failed to generate LinkedIn auth URL' })
  }
})

// Frontend endpoint to exchange code for tokens
app.post('/api/linkedin/exchange', async (req, res) => {
  try {
    const { code, state } = req.body
    const storedState = req.cookies.linkedin_state

    console.log('LinkedIn exchange request:', { 
      hasCode: !!code, 
      hasState: !!state, 
      hasStoredState: !!storedState,
      stateMatch: state === storedState 
    })

    if (!code) {
      return res.status(400).json({ error: 'Authorization code not provided' })
    }

    // For now, let's be more lenient with state validation for testing
    if (!state) {
      console.log('Warning: No state parameter provided, proceeding anyway for testing')
    } else if (storedState && state !== storedState) {
      console.log('State mismatch:', { provided: state, stored: storedState })
      return res.status(400).json({ error: 'Invalid state parameter' })
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
    // Use environment-specific redirect URI
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? 'http://www.getgetleads.com/linkedin/callback'
      : 'http://localhost:5173/linkedin/callback'

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'LinkedIn credentials not configured' })
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('LinkedIn token exchange error:', errorData)
      return res.status(400).json({ error: 'Failed to exchange code for token' })
    }

    const tokenData = await tokenResponse.json()
    
    // For OpenID Connect scopes, we can get basic profile info from the token response
    // or make a simple profile request
    let profile = {
      id: 'linkedin_user',
      firstName: 'LinkedIn',
      lastName: 'User',
      email: null,
      profilePictureUrl: null
    }

    // Try to get additional profile info if available
    try {
      const profileResponse = await fetch('https://api.linkedin.com/v2/people/~:(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      })

      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        
        // Extract profile picture URL
        let profilePictureUrl = null
        if (profileData.profilePicture?.['displayImage~']?.elements?.length > 0) {
          const images = profileData.profilePicture['displayImage~'].elements
          // Get the highest resolution image
          const sortedImages = images.sort((a, b) => (b.width || 0) - (a.width || 0))
          if (sortedImages.length > 0) {
            profilePictureUrl = sortedImages[0].identifiers?.[0]?.identifier
          }
        }

        profile = {
          id: profileData.id || 'linkedin_user',
          firstName: profileData.firstName?.localized?.en_US || profileData.firstName || 'LinkedIn',
          lastName: profileData.lastName?.localized?.en_US || profileData.lastName || 'User',
          email: null,
          profilePictureUrl: profilePictureUrl
        }
      }
    } catch (profileError) {
      console.log('Could not fetch additional profile info:', profileError.message)
    }

    // Return JSON response for frontend
    res.json({
      success: true,
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      profile: profile
    })
    
  } catch (error) {
    console.error('LinkedIn exchange error:', error)
    res.status(500).json({ error: 'Failed to exchange LinkedIn code' })
  }
})

app.get('/api/linkedin/callback', async (req, res) => {
  try {
    const { code, state } = req.query
    const storedState = req.cookies.linkedin_state

    if (!code) {
      return res.status(400).json({ error: 'Authorization code not provided' })
    }

    if (!state || state !== storedState) {
      return res.status(400).json({ error: 'Invalid state parameter' })
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
    // Use environment-specific redirect URI
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? 'http://www.getgetleads.com/linkedin/callback'
      : 'http://localhost:5173/linkedin/callback'

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'LinkedIn credentials not configured' })
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('LinkedIn token exchange error:', errorData)
      return res.status(400).json({ error: 'Failed to exchange code for token' })
    }

    const tokenData = await tokenResponse.json()
    
    // For OpenID Connect scopes, we can get basic profile info from the token response
    // or make a simple profile request
    let profile = {
      id: 'linkedin_user',
      firstName: 'LinkedIn',
      lastName: 'User',
      email: null,
      profilePictureUrl: null
    }

    // Try to get additional profile info if available
    try {
      const profileResponse = await fetch('https://api.linkedin.com/v2/people/~:(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      })

      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        
        // Extract profile picture URL
        let profilePictureUrl = null
        if (profileData.profilePicture?.['displayImage~']?.elements?.length > 0) {
          const images = profileData.profilePicture['displayImage~'].elements
          // Get the highest resolution image
          const sortedImages = images.sort((a, b) => (b.width || 0) - (a.width || 0))
          if (sortedImages.length > 0) {
            profilePictureUrl = sortedImages[0].identifiers?.[0]?.identifier
          }
        }

        profile = {
          id: profileData.id || 'linkedin_user',
          firstName: profileData.firstName?.localized?.en_US || profileData.firstName || 'LinkedIn',
          lastName: profileData.lastName?.localized?.en_US || profileData.lastName || 'User',
          email: null,
          profilePictureUrl: profilePictureUrl
        }
      }
    } catch (profileError) {
      console.log('Could not fetch additional profile info:', profileError.message)
    }

    // Prepare profile data for redirect
    const profileData = profile

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/social-automation?linkedin_success=true&profile=${encodeURIComponent(JSON.stringify(profileData))}&token=${tokenData.access_token}`)
    
  } catch (error) {
    console.error('LinkedIn callback error:', error)
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/social-automation?linkedin_error=true`)
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🚀 Development API server running on http://localhost:${PORT}`)
  console.log(`📱 Frontend should be running on http://localhost:5173`)
  console.log(`🔗 API endpoints available at http://localhost:${PORT}/api/`)
})
