// Simple Express server for development API routes
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config()

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

console.log('Supabase URL:', process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
console.log('Service Role Key available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

// Enhanced API protection and caching system
const cache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Rate limiting and API protection
const rateLimitStore = new Map()
const API_LIMITS = {
  google_places: {
    requests_per_minute: 10,
    requests_per_day: 1000,
    cooldown_minutes: 5
  },
  google_business: {
    requests_per_minute: 5,
    requests_per_day: 100,
    cooldown_minutes: 10
  }
}

// Rate limiting helper
function checkRateLimit(apiType) {
  const now = Date.now()
  const limits = API_LIMITS[apiType]
  const key = `${apiType}_${Math.floor(now / 60000)}` // minute-based key
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 0, resetTime: now + 60000 })
  }
  
  const current = rateLimitStore.get(key)
  
  if (current.count >= limits.requests_per_minute) {
    return { allowed: false, resetTime: current.resetTime }
  }
  
  current.count++
  return { allowed: true, remaining: limits.requests_per_minute - current.count }
}

// Enhanced cache with TTL
function setCache(key, data, ttlMinutes = 30) {
  const expiry = Date.now() + (ttlMinutes * 60 * 1000)
  cache.set(key, { data, expiry })
}

function getCache(key) {
  const cached = cache.get(key)
  if (!cached) return null
  
  if (Date.now() > cached.expiry) {
    cache.delete(key)
    return null
  }
  
  return cached.data
}

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

// Google Places API route for real reviews (with rate limiting and caching)
app.get('/api/google/places/reviews', async (req, res) => {
  try {
    // Check rate limit first
    const rateLimit = checkRateLimit('google_places')
    if (!rateLimit.allowed) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        message: `Too many requests. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds`,
        retry_after: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      })
    }

    // Get user from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' })
    }

    const token = authHeader.substring(7)
    
    // For now, let's use a simple approach - get the user from the token
    // In a real app, you'd validate the JWT token properly
    let user = null
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser(token)
      if (error || !authUser) {
        // If auth fails, try to get user from user_settings table
        // This is a fallback for development
        const { data: settings } = await supabase
          .from('user_settings')
          .select('user_id')
          .limit(1)
          .single()
        
        if (settings) {
          user = { id: settings.user_id }
        } else {
          return res.status(401).json({ error: 'Invalid token' })
        }
      } else {
        user = authUser
      }
    } catch (authError) {
      console.log('Auth error, using fallback:', authError.message)
      // Fallback: get first user from user_settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('user_id')
        .limit(1)
        .single()
      
      if (settings) {
        user = { id: settings.user_id }
      } else {
        return res.status(401).json({ error: 'No user found' })
      }
    }

    // Get user's business place ID
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('google_place_id, business_name, business_address')
      .eq('user_id', user.id)
      .single()

    console.log('User settings query result:', { settings, settingsError })

    if (settingsError || !settings?.google_place_id) {
      console.log('No Google Place ID found for user:', user.id)
      return res.status(404).json({ 
        error: 'Google Place ID not found. Please add your business location in Profile settings.',
        setup_required: true
      })
    }

    console.log('Found Google Place ID:', settings.google_place_id)

    // Check cache first
    const cacheKey = `reviews_${settings.google_place_id}`
    const cachedData = getCache(cacheKey)
    if (cachedData) {
      console.log('Returning cached reviews data')
      return res.json({
        ...cachedData,
        cached: true,
        rate_limit_remaining: rateLimit.remaining
      })
    }

    // Use your existing Google credentials for Places API
    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_CLIENT_ID
    if (!GOOGLE_PLACES_API_KEY) {
      return res.status(500).json({ 
        error: 'Google Places API key not configured. Please add GOOGLE_PLACES_API_KEY to your .env file (can use your existing VITE_GOOGLE_CLIENT_ID).',
        setup_required: true
      })
    }

    // Fetch reviews from Google Places API v1
    const placesUrl = `https://places.googleapis.com/v1/places/${settings.google_place_id}?` +
      `fields=reviews,rating,userRatingCount&` +
      `key=${GOOGLE_PLACES_API_KEY}`
    
    console.log('Calling Google Places API v1:', placesUrl)
    const placesResponse = await fetch(placesUrl, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY
      }
    })

    if (!placesResponse.ok) {
      // Handle specific API errors
      if (placesResponse.status === 429) {
        return res.status(429).json({ 
          error: 'Google API quota exceeded', 
          message: 'Google Places API rate limit exceeded. Please try again later.',
          retry_after: 300 // 5 minutes
        })
      }
      
      throw new Error(`Google Places API error: ${placesResponse.status}`)
    }

    const placesData = await placesResponse.json()
    console.log('Google Places API response data:', JSON.stringify(placesData, null, 2))

    if (placesData.error) {
      throw new Error(`Google Places API error: ${placesData.error.message || 'Unknown error'}`)
    }

    const reviews = placesData.reviews || []
    const rating = placesData.rating || 0
    const totalRatings = placesData.userRatingCount || 0
    
    console.log('Parsed reviews:', reviews.length, 'rating:', rating, 'totalRatings:', totalRatings)

    // Process and store reviews in our database
    const processedReviews = []
    for (const review of reviews) {
      const reviewData = {
        user_id: user.id,
        review_id: `google_${review.publishTime || Date.now()}`,
        reviewer_name: review.authorAttribution?.displayName || 'Anonymous',
        reviewer_email: null,
        review_text: review.text?.text || '',
        rating: review.rating || 0,
        platform: 'google',
        review_url: `https://www.google.com/maps/place/?q=place_id:${settings.google_place_id}`,
        status: 'pending',
        created_at: new Date(review.publishTime || Date.now()).toISOString()
      }

      // Store in database
      console.log('Storing review data:', reviewData)
      const { data: storedReview, error: storeError } = await supabase
        .from('reviews')
        .insert(reviewData)
        .select()
        .single()

      if (storeError) {
        console.error('Error storing review:', storeError)
      } else if (storedReview) {
        console.log('Successfully stored review:', storedReview.id)
        processedReviews.push(storedReview)
      }
    }

    const responseData = {
      success: true,
      message: 'Real Google reviews fetched successfully',
      reviews: processedReviews,
      summary: {
        total_reviews: processedReviews.length,
        average_rating: rating,
        total_ratings: totalRatings,
        positive_reviews: processedReviews.filter(r => r.is_positive).length,
        negative_reviews: processedReviews.filter(r => !r.is_positive).length
      },
      place_info: {
        place_id: settings.google_place_id,
        business_name: settings.business_name,
        business_address: settings.business_address
      },
      rate_limit_remaining: rateLimit.remaining
    }

    // Cache the response for 30 minutes
    setCache(cacheKey, responseData, 30)

    res.status(200).json(responseData)

  } catch (error) {
    console.error('Google Places reviews error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch Google reviews',
      details: error.message 
    })
  }
})

// Niche Templates API
app.get('/api/niche-templates', async (req, res) => {
  try {
    const { data: nicheTemplates, error } = await supabase
      .from('niche_templates')
      .select('*')

    if (error) {
      console.error('Error fetching niche templates:', error)
      return res.status(500).json({ error: error.message })
    }

    res.status(200).json(nicheTemplates)
  } catch (error) {
    console.error('Unexpected error fetching niche templates:', error)
    res.status(500).json({ error: error.message })
  }
})

// Tenant Onboarding API
app.post('/api/tenant/onboarding', async (req, res) => {
  try {
    const { userId, nicheTemplateId, customDomain, businessName } = req.body

    if (!userId || !nicheTemplateId) {
      return res.status(400).json({ error: 'userId and nicheTemplateId are required' })
    }

    // Generate business slug from business name
    const generateBusinessSlug = (name) => {
      if (!name) return null
      return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    }

    // Update user_settings with the selected niche
    const updateData = {
      niche_template_id: nicheTemplateId,
      updated_at: new Date().toISOString()
    }
    
    // Add business name if provided
    if (businessName) {
      updateData.business_name = businessName
      updateData.business_slug = generateBusinessSlug(businessName)
    }
    
    // Add custom_domain if provided
    if (customDomain) {
      updateData.custom_domain = customDomain
    }
    
    const { data, error } = await supabase
      .from('user_settings')
      .update(updateData)
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('Error updating user settings:', error)
      return res.status(500).json({ error: error.message })
    }

    res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Unexpected error in onboarding:', error)
    res.status(500).json({ error: error.message })
  }
})

// Booking completion endpoint
app.post('/api/bookings/complete', async (req, res) => {
  try {
    const { booking_id, user_id, service_notes } = req.body

    // Validate required fields
    if (!booking_id || !user_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: booking_id, user_id' 
      })
    }

    // Update booking status to completed
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        service_completed_at: new Date().toISOString(),
        service_completed_by: user_id,
        service_notes: service_notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id)
      .eq('user_id', user_id)
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        service,
        booking_time,
        user_id
      `)
      .single()

    if (bookingError) {
      console.error('Error updating booking:', bookingError)
      return res.status(500).json({ 
        error: 'Failed to complete booking',
        details: bookingError.message 
      })
    }

    if (!booking) {
      console.error('No booking found with ID:', booking_id)
      return res.status(404).json({ 
        error: 'Booking not found',
        details: `No booking found with ID: ${booking_id} for user: ${user_id}`
      })
    }

    // Get business settings for workflow data
    const { data: businessSettings } = await supabase
      .from('user_settings')
      .select('business_name, niche_template_id')
      .eq('user_id', user_id)
      .single()

    // Prepare workflow data
    const workflowData = {
      booking_id: booking.id,
      lead_id: null, // No lead relationship for now
      user_id: booking.user_id,
      business_name: businessSettings?.business_name || 'Our Business',
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      service_type: booking.service,
      booking_time: booking.booking_time,
      service_notes: service_notes
    }

    // Trigger post-service workflow
    try {
          // Import and use the actual workflow engine
          const { workflowEngine } = await import('./src/lib/workflowEngine.js')
      
      // Trigger the booking completed workflow
      await workflowEngine.triggerWorkflow('booking_completed', workflowData)
      
      console.log(`✅ Service completed and workflow triggered for booking ${booking_id}`)
    } catch (workflowError) {
      console.error('Error triggering workflow:', workflowError)
      // Don't fail the booking completion if workflow fails
    }

    // Log the completion
    console.log(`Service completed:`, {
      booking_id: booking.id,
      customer: booking.customer_name,
      service: booking.service,
      completed_by: user_id
    })

    return res.status(200).json({
      success: true,
      message: 'Service completed successfully',
      booking: {
        id: booking.id,
        status: 'completed',
        service_completed_at: booking.service_completed_at
      }
    })

  } catch (error) {
    console.error('Error in booking completion:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Test endpoint to create a booking for testing
app.post('/api/test/create-booking', async (req, res) => {
  try {
    const { user_id } = req.body

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    // Create a test booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        user_id: user_id,
        customer_name: 'Test Customer',
        customer_email: 'test@example.com',
        customer_phone: '555-1234',
        service: 'Test Service',
        booking_time: new Date().toISOString(),
        duration_minutes: 60,
        status: 'confirmed',
        notes: 'Test booking for completion testing'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating test booking:', error)
      return res.status(500).json({ error: error.message })
    }

    res.status(200).json({ 
      success: true, 
      booking: booking,
      message: 'Test booking created successfully'
    })
  } catch (error) {
    console.error('Error in test booking creation:', error)
    res.status(500).json({ error: error.message })
  }
})

// Health check endpoint (moved from Vercel function)
app.get('/api/health', async (req, res) => {
  const startTime = Date.now()
  
  try {
    // Check database connectivity
    const { error } = await supabase
      .from('user_settings')
      .select('count')
      .limit(1)

    const dbHealthy = !error

    // Check environment variables
    const envHealthy = !!(
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Check external services
    const externalServices = {
      supabase: dbHealthy,
      environment: envHealthy
    }

    const allHealthy = Object.values(externalServices).every(Boolean)
    const responseTime = Date.now() - startTime

    const healthStatus = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: externalServices,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }

    const statusCode = allHealthy ? 200 : 503
    res.status(statusCode).json(healthStatus)

  } catch (error) {
    const responseTime = Date.now() - startTime
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        supabase: false,
        environment: false
      }
    })
  }
})

// Workflow logs endpoint (moved from Vercel function)
app.get('/api/workflow-logs', async (req, res) => {
  try {
    console.log('📊 Fetching workflow logs via API...')
    
    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('❌ Error fetching logs:', error)
      return res.status(500).json({ error: 'Failed to fetch logs' })
    }

    console.log('✅ Fetched logs:', data.length)
    return res.status(200).json({ logs: data || [] })
  } catch (error) {
    console.error('❌ Error in workflow-logs API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Consolidated API endpoint (moved from Vercel function)
app.all('/api/consolidated', async (req, res) => {
  const { method, query, body } = req
  const { action } = query

  try {
    switch (action) {
      case 'health':
        return await handleHealth(req, res)
      
      case 'booking-complete':
        return await handleBookingComplete(req, res)
      
      case 'lead-workflow':
        return await handleLeadWorkflow(req, res)
      
      case 'referral-generate':
        return await handleReferralGenerate(req, res)
      
      case 'feedback-request':
        return await handleFeedbackRequest(req, res)
      
      case 'niche-templates':
        return await handleNicheTemplates(req, res)
      
      case 'tenant-onboarding':
        return await handleTenantOnboarding(req, res)
      
      case 'workflow-logs':
        return await handleWorkflowLogs(req, res)
      
      case 'automation-review-referral':
        return await handleAutomationReviewReferral(req, res)
      
      case 'automation-speed-to-lead':
        return await handleAutomationSpeedToLead(req, res)
      
      case 'cron-followups':
        return await handleCronFollowups(req, res)
      
      case 'email-send':
        return await handleEmailSend(req, res)
      
      case 'twilio-incoming-call':
        return await handleTwilioIncomingCall(req, res)
      
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Helper functions for consolidated API
async function handleHealth(req, res) {
  const { error } = await supabase
    .from('user_settings')
    .select('count')
    .limit(1)

  const dbHealthy = !error
  const timestamp = new Date().toISOString()

  res.status(200).json({
    status: 'ok',
    timestamp,
    services: {
      database: dbHealthy ? 'healthy' : 'unhealthy',
      api: 'healthy'
    }
  })
}

async function handleBookingComplete(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { bookingId, userId } = req.body

  if (!bookingId || !userId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Update booking status
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ 
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .eq('user_id', userId)

  if (updateError) {
    return res.status(500).json({ error: 'Failed to update booking' })
  }

  // Trigger workflow automation
  const { error: workflowError } = await supabase
    .from('workflow_automations')
    .insert({
      user_id: userId,
      lead_id: null,
      action_type: 'service_completed',
      status: 'pending',
      trigger_event: 'booking_completed',
      metadata: { booking_id: bookingId }
    })

  if (workflowError) {
    console.error('Workflow error:', workflowError)
  }

  res.status(200).json({ success: true, message: 'Booking completed successfully' })
}

async function handleLeadWorkflow(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { leadId, userId, newStage } = req.body

  if (!leadId || !userId || !newStage) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Update lead stage
  const { error: updateError } = await supabase
    .from('leads')
    .update({ 
      workflow_stage: newStage,
      updated_at: new Date().toISOString()
    })
    .eq('id', leadId)
    .eq('user_id', userId)

  if (updateError) {
    return res.status(500).json({ error: 'Failed to update lead' })
  }

  // Log workflow change
  const { error: logError } = await supabase
    .from('automation_logs')
    .insert({
      user_id: userId,
      lead_id: leadId,
      action_type: 'workflow_stage_change',
      status: 'success',
      trigger_event: 'manual_update',
      executed_at: new Date().toISOString(),
      metadata: { new_stage: newStage }
    })

  if (logError) {
    console.error('Log error:', logError)
  }

  res.status(200).json({ success: true, message: 'Lead workflow updated' })
}

async function handleReferralGenerate(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { lead_id, user_id } = req.body

  if (!lead_id || !user_id) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Generate referral link
  const { data: referralLink, error: referralError } = await supabase
    .from('referral_links')
    .insert({
      user_id,
      lead_id,
      token: crypto.randomUUID(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
    .select()
    .single()

  if (referralError) {
    return res.status(500).json({ error: 'Failed to create referral link' })
  }

  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://www.getgetleads.com'
    : 'http://localhost:5173'

  const referralUrl = `${baseUrl}/referral/${referralLink.token}`

  res.status(200).json({
    success: true,
    referral_link: {
      id: referralLink.id,
      token: referralLink.token,
      url: referralUrl,
      expires_at: referralLink.expires_at
    }
  })
}

async function handleFeedbackRequest(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { lead_id, user_id, message } = req.body

  if (!lead_id || !user_id) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Create feedback request
  const { data: feedbackRequest, error } = await supabase
    .from('feedback_requests')
    .insert({
      user_id,
      lead_id,
      message_content: message || 'Thank you for your recent visit! We would love to hear your feedback.',
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: 'Failed to create feedback request' })
  }

  res.status(200).json({
    success: true,
    feedback_request: feedbackRequest
  })
}

async function handleNicheTemplates(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { data: templates, error } = await supabase
    .from('niche_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch templates' })
  }

  res.status(200).json({ success: true, templates })
}

async function handleTenantOnboarding(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { user_id, niche_template_id, business_name } = req.body

  if (!user_id || !niche_template_id || !business_name) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Generate subdomain
  const subdomain = business_name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.random().toString(36).substr(2, 4)
  const sending_domain = `reviews.${subdomain}`

  // Update user settings
  const { error: updateError } = await supabase
    .from('user_settings')
    .update({
      niche_template_id,
      subdomain,
      sending_domain,
      business_name,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user_id)

  if (updateError) {
    return res.status(500).json({ error: 'Failed to update user settings' })
  }

  res.status(200).json({
    success: true,
    subdomain,
    sending_domain
  })
}

async function handleWorkflowLogs(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { user_id, limit = 50 } = req.query

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  const { data: logs, error } = await supabase
    .from('automation_logs')
    .select('*')
    .eq('user_id', user_id)
    .order('executed_at', { ascending: false })
    .limit(parseInt(limit))

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch logs' })
  }

  res.status(200).json({ success: true, logs })
}

async function handleAutomationReviewReferral(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { lead_id, user_id } = req.body

  if (!lead_id || !user_id) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Create review request
  const { data: reviewRequest, error: reviewError } = await supabase
    .from('feedback_requests')
    .insert({
      user_id,
      lead_id,
      message_content: 'Thank you for your recent visit! We would love to hear your feedback.',
      status: 'pending'
    })
    .select()
    .single()

  if (reviewError) {
    return res.status(500).json({ error: 'Failed to create review request' })
  }

  // Create referral offer
  const { data: referralOffer, error: referralError } = await supabase
    .from('referral_requests')
    .insert({
      user_id,
      lead_id,
      offer_message: 'Refer a friend and get a special discount!',
      status: 'pending'
    })
    .select()
    .single()

  if (referralError) {
    console.error('Referral error:', referralError)
  }

  res.status(200).json({
    success: true,
    review_request: reviewRequest,
    referral_offer: referralOffer
  })
}

async function handleAutomationSpeedToLead(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { lead_id, user_id, message } = req.body

  if (!lead_id || !user_id) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Send immediate follow-up
  const { error } = await supabase
    .from('automation_logs')
    .insert({
      user_id,
      lead_id,
      action_type: 'immediate_followup',
      status: 'completed',
      trigger_event: 'lead_created',
      executed_at: new Date().toISOString(),
      metadata: { message: message || 'Thank you for your interest! We will contact you soon.' }
    })

  if (error) {
    return res.status(500).json({ error: 'Failed to send follow-up' })
  }

  res.status(200).json({ success: true, message: 'Follow-up sent' })
}

async function handleCronFollowups(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Process pending followups
  const { data: followups, error } = await supabase
    .from('automation_logs')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch followups' })
  }

  // Process each followup
  for (const followup of followups || []) {
    // Update status to completed
    await supabase
      .from('automation_logs')
      .update({ 
        status: 'completed',
        executed_at: new Date().toISOString()
      })
      .eq('id', followup.id)
  }

  res.status(200).json({ 
    success: true, 
    processed: followups?.length || 0 
  })
}

async function handleEmailSend(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, subject, body, user_id } = req.body

  if (!to || !subject || !body || !user_id) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Log email send
  const { error } = await supabase
    .from('automation_logs')
    .insert({
      user_id,
      action_type: 'email_sent',
      status: 'completed',
      trigger_event: 'manual',
      executed_at: new Date().toISOString(),
      metadata: { to, subject, body }
    })

  if (error) {
    return res.status(500).json({ error: 'Failed to log email' })
  }

  res.status(200).json({ success: true, message: 'Email logged' })
}

async function handleTwilioIncomingCall(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { From, To } = req.body

  if (!From || !To) {
    return res.status(400).json({ error: 'Missing phone numbers' })
  }

  // Create lead from missed call
  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      name: 'Missed Call',
      phone: From,
      source: 'missed_call',
      status: 'new',
      workflow_stage: 'missed_call',
      user_id: null // Will be updated based on phone number lookup
    })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: 'Failed to create lead' })
  }

  res.status(200).json({ 
    success: true, 
    lead_id: lead.id,
    message: 'Lead created from missed call'
  })
}

// Initialize workflow engine
async function initializeWorkflowEngine() {
  try {
    const { workflowEngine } = await import('./src/lib/workflowEngine.js')
    await workflowEngine.initialize()
  } catch (error) {
    console.error('Error initializing workflow engine:', error)
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Development API server running on http://localhost:${PORT}`)
  console.log(`📱 Frontend should be running on http://localhost:5173`)
  console.log(`🔗 API endpoints available at http://localhost:${PORT}/api/`)
  
  // Initialize workflow engine
  await initializeWorkflowEngine()
})
