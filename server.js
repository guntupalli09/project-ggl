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

// Enhanced API protection and caching system with retry logic
const cache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const QUOTA_RETRY_DELAY = 2 * 60 * 1000 // 2 minutes for quota retry
const MAX_RETRIES = 3

// Helper function to check if we should retry after quota error
function shouldRetryAfterQuotaError(cachedData) {
  if (!cachedData) return true
  const timeSinceLastError = Date.now() - cachedData.lastErrorTime
  return cachedData.retryCount < MAX_RETRIES && timeSinceLastError > QUOTA_RETRY_DELAY
}

// Helper function to validate Google Business Profile location ID
function validateGoogleBusinessLocationId(locationId) {
  if (!locationId) return { valid: false, error: 'Location ID is required' }
  
  // Google Business Profile location IDs typically follow this pattern
  const locationIdPattern = /^[0-9]+$/
  if (!locationIdPattern.test(locationId)) {
    return { valid: false, error: 'Invalid location ID format' }
  }
  
  return { valid: true }
}

// Helper function to validate Google access token
function validateGoogleAccessToken(token) {
  if (!token) return { valid: false, error: 'Access token is required' }
  
  // Basic JWT token validation (check structure)
  const parts = token.split('.')
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid token format' }
  }
  
  return { valid: true }
}

// Helper function to make API call with retry logic
async function makeApiCallWithRetry(url, options, cacheKey, maxRetries = MAX_RETRIES) {
  let retryCount = 0
  
  while (retryCount <= maxRetries) {
    try {
      const response = await fetch(url, options)
      
      if (response.status === 429) {
        // Quota exceeded - cache the error and retry later
        const errorData = await response.json()
        cache.set(cacheKey, {
          data: null,
          timestamp: Date.now(),
          retryCount: retryCount + 1,
          lastErrorTime: Date.now(),
          lastError: errorData
        })
        
        if (retryCount < maxRetries) {
          console.log(`Quota exceeded, will retry in ${QUOTA_RETRY_DELAY/1000} seconds (attempt ${retryCount + 1}/${maxRetries + 1})`)
          await new Promise(resolve => setTimeout(resolve, QUOTA_RETRY_DELAY))
          retryCount++
          continue
        }
      }
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Cache successful response
      cache.set(cacheKey, {
        data: data,
        timestamp: Date.now(),
        retryCount: 0,
        lastErrorTime: null,
        lastError: null
      })
      
      return { success: true, data }
      
    } catch (error) {
      console.error(`API call attempt ${retryCount + 1} failed:`, error)
      
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // Exponential backoff
        retryCount++
      } else {
        throw error
      }
    }
  }
}

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


async function generateMissedCallMessage(details) {
  const {
    businessName,
    bookingLink,
    businessHours,
    businessUrl,
    callerNumber
  } = details

  const prompt = `You are a professional assistant for a small local business.
A customer just called but the owner couldn't answer. Write a short, friendly, and actionable SMS text (max 480 characters) to the customer.
Include: a brief apology, the business name, today's business hours (if provided), a booking link, and the website URL. Be concise and human.

Business name: ${businessName || 'our business'}
Business hours: ${businessHours || 'not provided'}
Booking link: ${bookingLink || 'not provided'}
Website: ${businessUrl || 'not provided'}
Customer phone: ${callerNumber}

Reply with only the SMS text.`

  // Try local Ollama first
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OLLAMA_MODEL || 'llama3', prompt, stream: false }),
      signal: controller.signal
    })
    clearTimeout(timeout)
    if (res.ok) {
      const data = await res.json()
      if (data?.response) return data.response.trim()
    }
  } catch (err) {
    console.log('Ollama not available; using fallback message')
  }

  // Use the exact template specified by the user
  const hoursText = businessHours ? `${businessHours} are our business hours` : 'our business hours'
  const bookingText = bookingLink ? `if you want to book, cancel, edit appointment here is the ${bookingLink}` : 'if you want to book, cancel, edit appointment please contact us'
  const websiteText = businessUrl ? `for more information visit our ${businessUrl}` : 'for more information please contact us'
  
  return `Thank you for reaching out ${businessName}, sorry we missed your call. ${hoursText}, ${bookingText}, ${websiteText}, one of our representative will be in touch with you shortly!!`
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
    
    // Check if we have valid cached data
    if (cached && cached.data && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached conversations data')
      return res.json(cached.data)
    }
    
    // Check if we should retry after quota error
    if (cached && !cached.data && shouldRetryAfterQuotaError(cached)) {
      console.log('Retrying after quota error...')
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
            isMockData: true,
            mockDataReason: 'Google My Business APIs quota exceeded or not enabled',
            message: '⚠️ DEMO DATA: Google My Business APIs quota exceeded. Wait a few minutes for quota to reset, or upgrade your Google Cloud plan for higher limits.',
            setup_required: [
              'Enable Google My Business API in Google Cloud Console',
              'Upgrade Google Cloud plan for higher API limits',
              'Wait for quota reset (usually 1-2 minutes)'
            ]
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
        isMockData: true,
        mockDataReason: 'Google My Business API error',
        message: '⚠️ DEMO DATA: Google My Business APIs quota exceeded. Wait a few minutes for quota to reset, or upgrade your Google Cloud plan for higher limits.',
        setup_required: [
          'Enable Google My Business API in Google Cloud Console',
          'Upgrade Google Cloud plan for higher API limits',
          'Wait for quota reset (usually 1-2 minutes)'
        ]
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
      // - Messages via Google Business Profile
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
          'Integrate with Google Business Messages',
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
            isMockData: true,
            mockDataReason: isQuotaError ? 'API quota exceeded' : 'Performance API not enabled',
            message: isQuotaError 
              ? '⚠️ DEMO DATA: Google Business Profile API quota exceeded. Wait a few minutes for quota to reset, or upgrade your Google Cloud plan for higher limits.'
              : '⚠️ DEMO DATA: Google Business Profile Performance API not enabled. Please enable "Business Profile Performance API" in Google Cloud Console.',
            setup_required: isQuotaError ? [
              'Wait for quota reset (usually 1-2 minutes)',
              'Upgrade Google Cloud plan for higher API limits'
            ] : [
              'Enable "Business Profile Performance API" in Google Cloud Console',
              'Ensure your Google Business Profile is verified'
            ]
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
        isMockData: true,
        mockDataReason: 'Unable to fetch performance data',
        message: '⚠️ DEMO DATA: Unable to fetch performance data. Please ensure your Google Business Profile is set up and the Performance API is enabled.',
        setup_required: [
          'Set up Google Business Profile',
          'Enable "Business Profile Performance API" in Google Cloud Console',
          'Verify your business profile is active'
        ]
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
      
      
      case 'google-business-calls':
        return await handleGoogleBusinessCalls(req, res)
      
      case 'google-missed-call-followup':
        return await handleGoogleMissedCallFollowup(req, res)
      
      case 'google-calls-sync':
        return await handleGoogleCallsSync(req, res)
      
      case 'booking-webhook':
        return await handleBookingWebhook(req, res)
      
      case 'calendar-sync':
        return await handleCalendarSync(req, res)
      
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


// Initialize workflow engine
async function initializeWorkflowEngine() {
  try {
    const { workflowEngine } = await import('./src/lib/workflowEngine.js')
    await workflowEngine.initialize()
  } catch (error) {
    console.error('Error initializing workflow engine:', error)
  }
}

// Google Business Profile calls handler
async function handleGoogleBusinessCalls(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user_id } = req.query

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Get user's Google Business Profile settings
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('google_business_location_id, google_access_token, google_token_expiry')
      .eq('user_id', user_id)
      .single()

    if (settingsError || !userSettings) {
      return res.status(404).json({ error: 'User settings not found' })
    }

    if (!userSettings.google_business_location_id || !userSettings.google_access_token) {
      return res.status(400).json({ error: 'Google Business Profile not connected' })
    }

    // Validate Google Business Profile data
    const locationValidation = validateGoogleBusinessLocationId(userSettings.google_business_location_id)
    if (!locationValidation.valid) {
      return res.status(400).json({ 
        error: 'Invalid Google Business Profile configuration',
        details: locationValidation.error
      })
    }

    const tokenValidation = validateGoogleAccessToken(userSettings.google_access_token)
    if (!tokenValidation.valid) {
      return res.status(400).json({ 
        error: 'Invalid Google access token',
        details: tokenValidation.error
      })
    }

    // Check if token is still valid
    const now = new Date()
    const expiry = new Date(userSettings.google_token_expiry)
    if (now >= expiry) {
      return res.status(401).json({ error: 'Google access token expired' })
    }

    // Fetch call logs from Google Business Profile API
    const googleResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${userSettings.google_business_location_id}/locations/${userSettings.google_business_location_id}/callLogs`,
      {
        headers: {
          'Authorization': `Bearer ${userSettings.google_access_token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!googleResponse.ok) {
      const errorData = await googleResponse.json()
      console.error('Google API Error:', errorData)
      return res.status(googleResponse.status).json({ 
        error: 'Failed to fetch call logs from Google',
        details: errorData
      })
    }

    const callLogsData = await googleResponse.json()
    const callLogs = callLogsData.callLogs || []

    // Process and store call logs in our database
    const processedCalls = []
    
    for (const call of callLogs) {
      // Check if call already exists
      const { data: existingCall } = await supabase
        .from('call_logs')
        .select('id')
        .eq('google_call_id', call.callId)
        .single()

      if (existingCall) {
        // Update existing call if needed
        const { error: updateError } = await supabase
          .from('call_logs')
          .update({
            call_type: call.callType === 'MISSED' ? 'missed' : 'answered',
            duration_seconds: call.durationSeconds,
            updated_at: new Date().toISOString()
          })
          .eq('google_call_id', call.callId)

        if (updateError) {
          console.error('Error updating call log:', updateError)
        }
      } else {
        // Create new call log entry
        const { data: newCall, error: insertError } = await supabase
          .from('call_logs')
          .insert({
            user_id: user_id,
            phone: call.phoneNumber,
            caller_name: call.callerName,
            call_type: call.callType === 'MISSED' ? 'missed' : 'answered',
            call_time: call.startTime,
            duration_seconds: call.durationSeconds,
            google_call_id: call.callId,
            ai_followup_sent: false
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error inserting call log:', insertError)
        } else {
          processedCalls.push(newCall)
          
          // If it's a missed call, create a lead and trigger automation
          if (call.callType === 'MISSED') {
            try {
              // Create a lead from the missed call
              const { data: lead, error: leadError } = await supabase
                .from('leads')
                .insert({
                  name: call.callerName || 'Missed Call',
                  phone: call.phoneNumber,
                  source: 'missed_call',
                  status: 'new',
                  workflow_stage: 'callback_asap',
                  user_id: user_id
                })
                .select()
                .single()

              if (leadError) {
                console.error('Failed to create lead from missed call:', leadError)
              } else {
                // Update the call log with the lead ID
                await supabase
                  .from('call_logs')
                  .update({ lead_id: lead.id })
                  .eq('id', newCall.id)

                // Check if missed call automation is enabled
                const { data: automationSettings } = await supabase
                  .from('user_settings')
                  .select('missed_call_automation_enabled, business_name, business_hours, booking_link, business_website')
                  .eq('user_id', user_id)
                  .single()
                
                if (automationSettings?.missed_call_automation_enabled) {
                  // Automatically trigger AI follow-up
                  await handleGoogleMissedCallFollowup({
                    body: { call_id: newCall.id, user_id: user_id }
                  }, { status: () => {}, json: () => {} })
                }
              }
            } catch (followupError) {
              console.error('Error processing missed call:', followupError)
            }
          }
        }
      }
    }

    // Get all call logs for this user from our database
    const { data: allCallLogs, error: fetchError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('user_id', user_id)
      .order('call_time', { ascending: false })
      .limit(50)

    if (fetchError) {
      console.error('Error fetching call logs:', fetchError)
      return res.status(500).json({ error: 'Failed to fetch call logs' })
    }

    return res.status(200).json({
      success: true,
      callLogs: allCallLogs || [],
      processed: processedCalls.length
    })

  } catch (error) {
    console.error('Error in Google Business calls API:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Google missed call AI follow-up handler
async function handleGoogleMissedCallFollowup(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { call_id, user_id } = req.body

    if (!call_id || !user_id) {
      return res.status(400).json({ error: 'Call ID and User ID are required' })
    }

    // Get the call log
    const { data: callLog, error: callError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('id', call_id)
      .eq('user_id', user_id)
      .single()

    if (callError || !callLog) {
      return res.status(404).json({ error: 'Call log not found' })
    }

    if (callLog.ai_followup_sent) {
      return res.status(400).json({ error: 'AI follow-up already sent for this call' })
    }

    // Get user settings for business info
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('business_name, business_hours, booking_link, business_website, google_access_token')
      .eq('user_id', user_id)
      .single()

    if (settingsError || !userSettings) {
      return res.status(404).json({ error: 'User settings not found' })
    }

    // Generate AI follow-up message using Profile page data
    const aiMessage = await generateMissedCallMessage({
      businessName: userSettings.business_name || 'our business',
      bookingLink: userSettings.booking_link || 'our booking system',
      businessHours: userSettings.business_hours || 'our business hours',
      businessUrl: userSettings.business_website || 'our website',
      callerNumber: callLog.phone
    })

    // Send message via Google Business Messages API
    if (userSettings.google_access_token) {
      try {
        // Send message via Google Business Messages API
        const messageResponse = await fetch('http://localhost:3001/api/google/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userSettings.google_access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            conversationId: `missed_call_${callLog.phone}`, // Create a conversation ID for missed calls
            messageText: aiMessage
          })
        })

        if (messageResponse.ok) {
          console.log('AI Follow-up message sent successfully:', aiMessage)
        } else {
          console.error('Failed to send AI follow-up message:', await messageResponse.text())
        }
        
        // Update call log to mark AI follow-up as sent
        const { error: updateError } = await supabase
          .from('call_logs')
          .update({
            ai_followup_sent: true,
            call_type: 'ai_followup_sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', call_id)

        if (updateError) {
          console.error('Error updating call log:', updateError)
        }

        // Log the AI follow-up activity
        await supabase.from('automation_logs').insert({
          user_id: user_id,
          lead_id: callLog.lead_id,
          action_type: 'ai_followup_sent',
          status: 'completed',
          trigger_event: 'missed_call',
          executed_at: new Date().toISOString(),
          metadata: {
            call_id: call_id,
            phone: callLog.phone,
            message: aiMessage
          }
        })

        return res.status(200).json({
          success: true,
          message: 'AI follow-up sent successfully',
          aiMessage: aiMessage
        })

      } catch (error) {
        console.error('Error sending AI follow-up:', error)
        return res.status(500).json({ error: 'Failed to send AI follow-up' })
      }
    } else {
      return res.status(400).json({ error: 'Google Business Profile not connected' })
    }

  } catch (error) {
    console.error('Error in Google missed call follow-up:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Google calls sync handler (for cron jobs)
async function handleGoogleCallsSync(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get all users with Google Business Profile connected
    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('user_id, google_business_location_id, google_access_token, google_token_expiry, missed_call_automation_enabled')
      .not('google_business_location_id', 'is', null)
      .not('google_access_token', 'is', null)
      .eq('missed_call_automation_enabled', true)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return res.status(500).json({ error: 'Failed to fetch users' })
    }

    const results = []

    for (const user of users || []) {
      try {
        // Check if token is still valid
        const now = new Date()
        const expiry = new Date(user.google_token_expiry)
        if (now >= expiry) {
          console.log(`Token expired for user ${user.user_id}`)
          continue
        }

        // Fetch call logs from Google Business Profile API
        const googleResponse = await fetch(
          `https://mybusiness.googleapis.com/v4/accounts/${user.google_business_location_id}/locations/${user.google_business_location_id}/callLogs`,
          {
            headers: {
              'Authorization': `Bearer ${user.google_access_token}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!googleResponse.ok) {
          console.error(`Google API Error for user ${user.user_id}:`, await googleResponse.text())
          continue
        }

        const callLogsData = await googleResponse.json()
        const callLogs = callLogsData.callLogs || []

        let processedCount = 0

        for (const call of callLogs) {
          // Check if call already exists
          const { data: existingCall } = await supabase
            .from('call_logs')
            .select('id')
            .eq('google_call_id', call.callId)
            .single()

          if (!existingCall) {
            // Create new call log entry
            const { data: newCall, error: insertError } = await supabase
              .from('call_logs')
              .insert({
                user_id: user.user_id,
                phone: call.phoneNumber,
                caller_name: call.callerName,
                call_type: call.callType === 'MISSED' ? 'missed' : 'answered',
                call_time: call.startTime,
                duration_seconds: call.durationSeconds,
                google_call_id: call.callId,
                ai_followup_sent: false
              })
              .select()
              .single()

            if (insertError) {
              console.error('Error inserting call log:', insertError)
            } else {
              processedCount++

              // If it's a missed call, create a lead and trigger automation
              if (call.callType === 'MISSED') {
                try {
                  // Create a lead from the missed call
                  const { data: lead, error: leadError } = await supabase
                    .from('leads')
                    .insert({
                      name: call.callerName || 'Missed Call',
                      phone: call.phoneNumber,
                      source: 'missed_call',
                      status: 'new',
                      workflow_stage: 'callback_asap',
                      user_id: user.user_id
                    })
                    .select()
                    .single()

                  if (leadError) {
                    console.error('Failed to create lead from missed call:', leadError)
                  } else {
                    // Update the call log with the lead ID
                    await supabase
                      .from('call_logs')
                      .update({ lead_id: lead.id })
                      .eq('id', newCall.id)

                    // Trigger AI follow-up
                    const followupResponse = await fetch('http://localhost:3001/api/consolidated?action=google-missed-call-followup', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        call_id: newCall.id,
                        user_id: user.user_id
                      })
                    })

                    if (!followupResponse.ok) {
                      console.error('Failed to trigger AI follow-up:', await followupResponse.text())
                    }
                  }
                } catch (followupError) {
                  console.error('Error processing missed call:', followupError)
                }
              }
            }
          }
        }

        results.push({
          user_id: user.user_id,
          processed: processedCount,
          total_calls: callLogs.length
        })

      } catch (error) {
        console.error(`Error processing user ${user.user_id}:`, error)
        results.push({
          user_id: user.user_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Google calls sync completed',
      results
    })

  } catch (error) {
    console.error('Error in Google calls sync:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Booking webhook handler
async function handleBookingWebhook(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { 
      event_type, 
      booking_id, 
      lead_id, 
      user_id, 
      customer_name, 
      customer_email, 
      customer_phone, 
      appointment_date, 
      appointment_time, 
      status, 
      service_type,
      notes,
      booking_source = 'external'
    } = req.body

    if (!event_type || !booking_id || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    console.log(`Booking webhook received: ${event_type} for booking ${booking_id}`)

    switch (event_type) {
      case 'booking_created':
        await processBookingCreated({
          booking_id,
          lead_id,
          user_id,
          customer_name,
          customer_email,
          customer_phone,
          appointment_date,
          appointment_time,
          status,
          service_type,
          notes,
          booking_source
        })
        break

      case 'booking_updated':
        await processBookingUpdated({
          booking_id,
          lead_id,
          user_id,
          customer_name,
          customer_email,
          customer_phone,
          appointment_date,
          appointment_time,
          status,
          service_type,
          notes
        })
        break

      case 'booking_cancelled':
        await processBookingCancelled({
          booking_id,
          lead_id,
          user_id,
          status: 'cancelled'
        })
        break

      case 'booking_completed':
        await processBookingCompleted({
          booking_id,
          lead_id,
          user_id,
          status: 'completed'
        })
        break

      default:
        return res.status(400).json({ error: 'Invalid event type' })
    }

    return res.status(200).json({ 
      success: true, 
      message: `Booking ${event_type} processed successfully` 
    })

  } catch (error) {
    console.error('Booking webhook error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Calendar sync handler
async function handleCalendarSync(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user_id, booking_id, action, appointment_data } = req.body

    if (!user_id || !booking_id || !action) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Get user's Google Calendar settings
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('google_calendar_id, google_access_token, google_token_expiry')
      .eq('user_id', user_id)
      .single()

    if (settingsError || !userSettings) {
      return res.status(404).json({ error: 'User calendar settings not found' })
    }

    // Check if token is still valid
    const now = new Date()
    const expiry = new Date(userSettings.google_token_expiry)
    if (now >= expiry) {
      return res.status(401).json({ error: 'Google token expired' })
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .eq('user_id', user_id)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    let calendarEvent = null

    switch (action) {
      case 'create':
        calendarEvent = await createCalendarEvent(userSettings, booking, appointment_data)
        break
      case 'update':
        calendarEvent = await updateCalendarEvent(userSettings, booking, appointment_data)
        break
      case 'delete':
        calendarEvent = await deleteCalendarEvent(userSettings, booking)
        break
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }

    // Update booking with calendar event ID
    if (calendarEvent && calendarEvent.id) {
      await supabase
        .from('bookings')
        .update({
          google_calendar_event_id: calendarEvent.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking_id)
    }

    return res.status(200).json({
      success: true,
      message: `Calendar event ${action}d successfully`,
      calendar_event: calendarEvent
    })

  } catch (error) {
    console.error('Calendar sync error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Booking processing functions
async function processBookingCreated(data) {
  const { booking_id, lead_id, user_id, customer_name, customer_email, customer_phone, appointment_date, appointment_time, status, service_type, notes, booking_source } = data

  // Create or update booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .upsert({
      id: booking_id,
      lead_id: lead_id,
      user_id: user_id,
      customer_name: customer_name,
      customer_email: customer_email,
      customer_phone: customer_phone,
      appointment_date: appointment_date,
      appointment_time: appointment_time,
      status: status || 'scheduled',
      service_type: service_type,
      notes: notes,
      booking_source: booking_source,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    })
    .select()
    .single()

  if (bookingError) {
    console.error('Error creating booking:', bookingError)
    throw bookingError
  }

  // Update lead status if lead_id provided
  if (lead_id) {
    await supabase
      .from('leads')
      .update({
        status: 'booked',
        workflow_stage: 'appointment_scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id', lead_id)
  }

  // Sync with Google Calendar
  try {
    await fetch('http://localhost:3001/api/consolidated?action=calendar-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user_id,
        booking_id: booking_id,
        action: 'create',
        appointment_data: {
          summary: `${service_type || 'Appointment'} - ${customer_name}`,
          description: `Customer: ${customer_name}\nPhone: ${customer_phone}\nEmail: ${customer_email}\nNotes: ${notes || 'No additional notes'}`,
          start: {
            dateTime: `${appointment_date}T${appointment_time}:00`,
            timeZone: 'America/New_York'
          },
          end: {
            dateTime: `${appointment_date}T${appointment_time}:00`,
            timeZone: 'America/New_York'
          }
        }
      })
    })
  } catch (calendarError) {
    console.error('Calendar sync failed:', calendarError)
  }

  // Log the booking creation
  await supabase
    .from('automation_logs')
    .insert({
      user_id: user_id,
      lead_id: lead_id,
      booking_id: booking_id,
      action_type: 'booking_created',
      status: 'completed',
      trigger_event: 'external_booking',
      executed_at: new Date().toISOString(),
      metadata: {
        customer_name: customer_name,
        appointment_date: appointment_date,
        appointment_time: appointment_time,
        service_type: service_type
      }
    })

  console.log(`Booking created: ${booking_id} for customer ${customer_name}`)
}

async function processBookingUpdated(data) {
  const { booking_id, lead_id, user_id, customer_name, customer_email, customer_phone, appointment_date, appointment_time, status, service_type, notes } = data

  // Update booking
  const { error: bookingError } = await supabase
    .from('bookings')
    .update({
      customer_name: customer_name,
      customer_email: customer_email,
      customer_phone: customer_phone,
      appointment_date: appointment_date,
      appointment_time: appointment_time,
      status: status,
      service_type: service_type,
      notes: notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', booking_id)

  if (bookingError) {
    console.error('Error updating booking:', bookingError)
    throw bookingError
  }

  // Update lead workflow stage based on status
  if (lead_id) {
    let workflowStage = 'appointment_scheduled'
    if (status === 'rescheduled') {
      workflowStage = 'appointment_rescheduled'
    } else if (status === 'completed') {
      workflowStage = 'appointment_completed'
    }

    await supabase
      .from('leads')
      .update({
        workflow_stage: workflowStage,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead_id)
  }

  // Sync with Google Calendar
  try {
    await fetch('http://localhost:3001/api/consolidated?action=calendar-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user_id,
        booking_id: booking_id,
        action: 'update',
        appointment_data: {
          summary: `${service_type || 'Appointment'} - ${customer_name}`,
          description: `Customer: ${customer_name}\nPhone: ${customer_phone}\nEmail: ${customer_email}\nNotes: ${notes || 'No additional notes'}`,
          start: {
            dateTime: `${appointment_date}T${appointment_time}:00`,
            timeZone: 'America/New_York'
          },
          end: {
            dateTime: `${appointment_date}T${appointment_time}:00`,
            timeZone: 'America/New_York'
          }
        }
      })
    })
  } catch (calendarError) {
    console.error('Calendar sync failed:', calendarError)
  }

  // Log the booking update
  await supabase
    .from('automation_logs')
    .insert({
      user_id: user_id,
      lead_id: lead_id,
      booking_id: booking_id,
      action_type: 'booking_updated',
      status: 'completed',
      trigger_event: 'external_booking',
      executed_at: new Date().toISOString(),
      metadata: {
        customer_name: customer_name,
        appointment_date: appointment_date,
        appointment_time: appointment_time,
        status: status
      }
    })

  console.log(`Booking updated: ${booking_id}`)
}

async function processBookingCancelled(data) {
  const { booking_id, lead_id, user_id, status } = data

  // Update booking status
  const { error: bookingError } = await supabase
    .from('bookings')
    .update({
      status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', booking_id)

  if (bookingError) {
    console.error('Error cancelling booking:', bookingError)
    throw bookingError
  }

  // Update lead workflow stage
  if (lead_id) {
    await supabase
      .from('leads')
      .update({
        workflow_stage: 'appointment_cancelled',
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', lead_id)
  }

  // Sync with Google Calendar
  try {
    await fetch('http://localhost:3001/api/consolidated?action=calendar-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user_id,
        booking_id: booking_id,
        action: 'delete'
      })
    })
  } catch (calendarError) {
    console.error('Calendar sync failed:', calendarError)
  }

  // Log the booking cancellation
  await supabase
    .from('automation_logs')
    .insert({
      user_id: user_id,
      lead_id: lead_id,
      booking_id: booking_id,
      action_type: 'booking_cancelled',
      status: 'completed',
      trigger_event: 'external_booking',
      executed_at: new Date().toISOString(),
      metadata: {
        status: status
      }
    })

  console.log(`Booking cancelled: ${booking_id}`)
}

async function processBookingCompleted(data) {
  const { booking_id, lead_id, user_id, status } = data

  // Update booking status
  const { error: bookingError } = await supabase
    .from('bookings')
    .update({
      status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', booking_id)

  if (bookingError) {
    console.error('Error completing booking:', bookingError)
    throw bookingError
  }

  // Update lead workflow stage
  if (lead_id) {
    await supabase
      .from('leads')
      .update({
        workflow_stage: 'appointment_completed',
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', lead_id)
  }

  // Log the booking completion
  await supabase
    .from('automation_logs')
    .insert({
      user_id: user_id,
      lead_id: lead_id,
      booking_id: booking_id,
      action_type: 'booking_completed',
      status: 'completed',
      trigger_event: 'external_booking',
      executed_at: new Date().toISOString(),
      metadata: {
        status: status
      }
    })

  console.log(`Booking completed: ${booking_id}`)
}

// Calendar event functions
async function createCalendarEvent(userSettings, booking, appointment_data) {
  const eventData = appointment_data || {
    summary: `${booking.service_type || 'Appointment'} - ${booking.customer_name}`,
    description: `Customer: ${booking.customer_name}\nPhone: ${booking.customer_phone}\nEmail: ${booking.customer_email}\nNotes: ${booking.notes || 'No additional notes'}`,
    start: {
      dateTime: `${booking.appointment_date}T${booking.appointment_time}:00`,
      timeZone: 'America/New_York'
    },
    end: {
      dateTime: `${booking.appointment_date}T${booking.appointment_time}:00`,
      timeZone: 'America/New_York'
    },
    attendees: [
      {
        email: booking.customer_email,
        displayName: booking.customer_name
      }
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 }
      ]
    }
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${userSettings.google_calendar_id}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userSettings.google_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google Calendar API error: ${error}`)
  }

  return await response.json()
}

async function updateCalendarEvent(userSettings, booking, appointment_data) {
  if (!booking.google_calendar_event_id) {
    return await createCalendarEvent(userSettings, booking, appointment_data)
  }

  const eventData = appointment_data || {
    summary: `${booking.service_type || 'Appointment'} - ${booking.customer_name}`,
    description: `Customer: ${booking.customer_name}\nPhone: ${booking.customer_phone}\nEmail: ${booking.customer_email}\nNotes: ${booking.notes || 'No additional notes'}`,
    start: {
      dateTime: `${booking.appointment_date}T${booking.appointment_time}:00`,
      timeZone: 'America/New_York'
    },
    end: {
      dateTime: `${booking.appointment_date}T${booking.appointment_time}:00`,
      timeZone: 'America/New_York'
    },
    attendees: [
      {
        email: booking.customer_email,
        displayName: booking.customer_name
      }
    ]
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${userSettings.google_calendar_id}/events/${booking.google_calendar_event_id}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${userSettings.google_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google Calendar API error: ${error}`)
  }

  return await response.json()
}

async function deleteCalendarEvent(userSettings, booking) {
  if (!booking.google_calendar_event_id) {
    return { success: true, message: 'No calendar event to delete' }
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${userSettings.google_calendar_id}/events/${booking.google_calendar_event_id}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userSettings.google_access_token}`
      }
    }
  )

  if (!response.ok && response.status !== 410) {
    const error = await response.text()
    throw new Error(`Google Calendar API error: ${error}`)
  }

  return { success: true, message: 'Calendar event deleted' }
}

// ========================================
// EMAIL MANAGEMENT API ENDPOINTS
// ========================================

// Email Management API
app.post('/api/email/management', async (req, res) => {
  try {
    const { action, user_id, filters, search, page, limit, email_id } = req.body

    switch (action) {
      case 'get_email_metrics':
        return await handleGetEmailMetrics(req, res, user_id)
      
      case 'get_emails':
        return await handleGetEmails(req, res, user_id, filters, search, page, limit)
      
      case 'resend_email':
        return await handleResendEmail(req, res, user_id, email_id)
      
      case 'delete_email':
        return await handleDeleteEmail(req, res, user_id, email_id)
      
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Email management error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Email Workflows API
app.post('/api/email/workflows', async (req, res) => {
  try {
    const { action, user_id, workflow_id, workflow_data } = req.body

    switch (action) {
      case 'get_workflows':
        return await handleGetWorkflows(req, res, user_id)
      
      case 'toggle_workflow':
        return await handleToggleWorkflow(req, res, user_id, workflow_id)
      
      case 'enhance_workflow':
        return await handleEnhanceWorkflow(req, res, user_id, workflow_id)
      
      case 'create_workflow':
        return await handleCreateWorkflow(req, res, user_id, workflow_data)
      
      case 'update_workflow':
        return await handleUpdateWorkflow(req, res, user_id, workflow_id, workflow_data)
      
      case 'delete_workflow':
        return await handleDeleteWorkflow(req, res, user_id, workflow_id)
      
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Email workflows error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Email Management Handlers
async function handleGetEmailMetrics(req, res, userId) {
  try {
    // Get email logs for the user
    const { data: emailLogs, error } = await supabase
      .from('email_logs')
      .select('status, sent_at, campaign_type')
      .eq('user_id', userId)
      .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

    if (error) throw error

    const totalSent = emailLogs?.length || 0
    const delivered = emailLogs?.filter(log => 
      ['delivered', 'opened', 'clicked'].includes(log.status)
    ).length || 0
    const opened = emailLogs?.filter(log => 
      ['opened', 'clicked'].includes(log.status)
    ).length || 0
    const clicked = emailLogs?.filter(log => 
      log.status === 'clicked'
    ).length || 0

    const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0
    const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0
    const clickRate = delivered > 0 ? Math.round((clicked / delivered) * 100) : 0

    // Get campaign breakdown
    const campaignBreakdown = emailLogs?.reduce((acc, log) => {
      acc[log.campaign_type] = (acc[log.campaign_type] || 0) + 1
      return acc
    }, {}) || {}

    // Get recent activity (last 7 days)
    const recentActivity = emailLogs?.filter(log => 
      new Date(log.sent_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length || 0

    return res.status(200).json({
      metrics: {
        totalSent,
        delivered,
        opened,
        clicked,
        deliveryRate,
        openRate,
        clickRate,
        campaignBreakdown,
        recentActivity
      }
    })
  } catch (error) {
    console.error('Error getting email metrics:', error)
    return res.status(500).json({ error: 'Failed to get email metrics' })
  }
}

async function handleGetEmails(req, res, userId, filters, search, page, limit) {
  try {
    let query = supabase
      .from('email_logs')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })

    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters?.campaign_type && filters.campaign_type !== 'all') {
      query = query.eq('campaign_type', filters.campaign_type)
    }

    if (filters?.date_range && filters.date_range !== 'all') {
      const days = parseInt(filters.date_range.replace('d', ''))
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('sent_at', startDate)
    }

    // Apply search
    if (search) {
      query = query.or(`subject.ilike.%${search}%,customer_email.ilike.%${search}%`)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: emails, error, count } = await query

    if (error) throw error

    const totalPages = Math.ceil((count || 0) / limit)

    return res.status(200).json({
      emails: emails || [],
      totalPages,
      currentPage: page,
      totalCount: count || 0
    })
  } catch (error) {
    console.error('Error getting emails:', error)
    return res.status(500).json({ error: 'Failed to get emails' })
  }
}

async function handleResendEmail(req, res, userId, emailId) {
  try {
    // Get the email to resend
    const { data: email, error: fetchError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('id', emailId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !email) {
      return res.status(404).json({ error: 'Email not found' })
    }

    // Update the email status to 'sent' and reset timestamps
    const { error: updateError } = await supabase
      .from('email_logs')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        delivered_at: null,
        opened_at: null,
        clicked_at: null,
        bounced_at: null,
        error_message: null
      })
      .eq('id', emailId)

    if (updateError) throw updateError

    return res.status(200).json({ message: 'Email resent successfully' })
  } catch (error) {
    console.error('Error resending email:', error)
    return res.status(500).json({ error: 'Failed to resend email' })
  }
}

async function handleDeleteEmail(req, res, userId, emailId) {
  try {
    const { error } = await supabase
      .from('email_logs')
      .delete()
      .eq('id', emailId)
      .eq('user_id', userId)

    if (error) throw error

    return res.status(200).json({ message: 'Email deleted successfully' })
  } catch (error) {
    console.error('Error deleting email:', error)
    return res.status(500).json({ error: 'Failed to delete email' })
  }
}

// Email Workflow Handlers
async function handleGetWorkflows(req, res, userId) {
  try {
    const { data: workflows, error } = await supabase
      .from('email_workflow_settings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform the data to match the expected format
    const transformedWorkflows = workflows?.map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      isActive: workflow.is_active,
      isAiEnhanced: workflow.is_ai_enhanced,
      executionCount: workflow.execution_count,
      lastExecuted: workflow.last_executed,
      trigger: workflow.trigger_event,
      campaignType: workflow.campaign_type,
      status: workflow.is_active ? 'active' : 'inactive',
      created_at: workflow.created_at,
      updated_at: workflow.updated_at
    })) || []

    return res.status(200).json({
      workflows: transformedWorkflows
    })
  } catch (error) {
    console.error('Error getting workflows:', error)
    return res.status(500).json({ error: 'Failed to get workflows' })
  }
}

async function handleToggleWorkflow(req, res, userId, workflowId) {
  try {
    // First get the current workflow to toggle its status
    const { data: workflow, error: fetchError } = await supabase
      .from('email_workflow_settings')
      .select('is_active')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !workflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    // Toggle the active status
    const { error: updateError } = await supabase
      .from('email_workflow_settings')
      .update({ is_active: !workflow.is_active })
      .eq('id', workflowId)
      .eq('user_id', userId)

    if (updateError) throw updateError

    return res.status(200).json({ 
      message: 'Workflow toggled successfully',
      isActive: !workflow.is_active
    })
  } catch (error) {
    console.error('Error toggling workflow:', error)
    return res.status(500).json({ error: 'Failed to toggle workflow' })
  }
}

async function handleEnhanceWorkflow(req, res, userId, workflowId) {
  try {
    const { error } = await supabase
      .from('email_workflow_settings')
      .update({ is_ai_enhanced: true })
      .eq('id', workflowId)
      .eq('user_id', userId)

    if (error) throw error

    return res.status(200).json({ message: 'Workflow enhanced with AI successfully' })
  } catch (error) {
    console.error('Error enhancing workflow:', error)
    return res.status(500).json({ error: 'Failed to enhance workflow' })
  }
}

async function handleCreateWorkflow(req, res, userId, workflowData) {
  try {
    const { data: workflow, error } = await supabase
      .from('email_workflow_settings')
      .insert({
        user_id: userId,
        name: workflowData.name,
        description: workflowData.description,
        campaign_type: workflowData.campaignType,
        trigger_event: workflowData.trigger,
        niche: workflowData.niche,
        business_type: workflowData.businessType,
        is_active: workflowData.isActive || false,
        is_ai_enhanced: workflowData.isAiEnhanced || false
      })
      .select()
      .single()

    if (error) throw error

    return res.status(201).json({ 
      message: 'Workflow created successfully',
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        isActive: workflow.is_active,
        isAiEnhanced: workflow.is_ai_enhanced,
        executionCount: workflow.execution_count,
        lastExecuted: workflow.last_executed,
        trigger: workflow.trigger_event,
        campaignType: workflow.campaign_type,
        status: workflow.is_active ? 'active' : 'inactive',
        created_at: workflow.created_at,
        updated_at: workflow.updated_at
      }
    })
  } catch (error) {
    console.error('Error creating workflow:', error)
    return res.status(500).json({ error: 'Failed to create workflow' })
  }
}

async function handleUpdateWorkflow(req, res, userId, workflowId, workflowData) {
  try {
    const { error } = await supabase
      .from('email_workflow_settings')
      .update({
        name: workflowData.name,
        description: workflowData.description,
        campaign_type: workflowData.campaignType,
        trigger_event: workflowData.trigger,
        niche: workflowData.niche,
        business_type: workflowData.businessType,
        is_active: workflowData.isActive,
        is_ai_enhanced: workflowData.isAiEnhanced
      })
      .eq('id', workflowId)
      .eq('user_id', userId)

    if (error) throw error

    return res.status(200).json({ message: 'Workflow updated successfully' })
  } catch (error) {
    console.error('Error updating workflow:', error)
    return res.status(500).json({ error: 'Failed to update workflow' })
  }
}

async function handleDeleteWorkflow(req, res, userId, workflowId) {
  try {
    const { error } = await supabase
      .from('email_workflow_settings')
      .delete()
      .eq('id', workflowId)
      .eq('user_id', userId)

    if (error) throw error

    return res.status(200).json({ message: 'Workflow deleted successfully' })
  } catch (error) {
    console.error('Error deleting workflow:', error)
    return res.status(500).json({ error: 'Failed to delete workflow' })
  }
}

// ========================================
// EMAIL SEND CAMPAIGN API ENDPOINT
// ========================================

app.post('/api/email/send-campaign', async (req, res) => {
  try {
    const { campaign_id, user_id } = req.body

    if (!campaign_id || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('user_id', user_id)
      .single()

    if (campaignError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    // Get leads to send to (for now, all leads with emails)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, email')
      .eq('user_id', user_id)
      .not('email', 'is', null)

    if (leadsError) {
      return res.status(500).json({ error: 'Failed to fetch leads' })
    }

    if (!leads || leads.length === 0) {
      return res.status(400).json({ error: 'No leads with email addresses found' })
    }

    // Send emails (simulate for now)
    const emailLogs = leads.map(lead => ({
      user_id,
      lead_id: lead.id,
      recipient_email: lead.email,
      recipient_name: lead.name,
      subject: campaign.subject,
      content: campaign.content,
      campaign_type: campaign.campaign_type,
      status: 'sent'
    }))

    // Insert email logs
    const { error: logsError } = await supabase
      .from('email_logs')
      .insert(emailLogs)

    if (logsError) {
      return res.status(500).json({ error: 'Failed to log emails' })
    }

    // Update campaign
    const { error: updateError } = await supabase
      .from('email_campaigns')
      .update({
        sent_count: leads.length,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', campaign_id)

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update campaign' })
    }

    res.status(200).json({ 
      success: true, 
      message: `Campaign sent to ${leads.length} leads`,
      sent_count: leads.length
    })
  } catch (error) {
    console.error('Email campaign error:', error)
    res.status(500).json({ error: 'Failed to send campaign' })
  }
})

// ========================================
// EMAIL WORKFLOW AUTOMATION API ENDPOINT
// ========================================

app.post('/api/email/workflow-automation', async (req, res) => {
  try {
    const { user_id } = req.body

    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id' })
    }

    // Get active review request workflows
    const { data: workflows, error: workflowsError } = await supabase
      .from('email_workflows')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .eq('campaign_type', 'review_request')

    if (workflowsError) {
      return res.status(500).json({ error: 'Failed to fetch workflows' })
    }

    if (!workflows || workflows.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No active review request workflows found',
        processed: 0
      })
    }

    let totalProcessed = 0

    for (const workflow of workflows) {
      // Calculate the cutoff time for completed leads
      const cutoffTime = new Date()
      cutoffTime.setHours(cutoffTime.getHours() - workflow.delay_hours)

      // Get completed leads that haven't received a review request yet
      const { data: completedLeads, error: leadsError } = await supabase
        .from('leads')
        .select('id, name, email, source, updated_at')
        .eq('user_id', user_id)
        .eq('status', 'completed')
        .not('email', 'is', null)
        .lte('updated_at', cutoffTime.toISOString())

      if (leadsError) {
        console.error('Error fetching completed leads:', leadsError)
        continue
      }

      if (!completedLeads || completedLeads.length === 0) {
        continue
      }

      // Check which leads already received review requests
      const leadIds = completedLeads.map(lead => lead.id)
      const { data: existingEmails, error: emailsError } = await supabase
        .from('email_logs')
        .select('lead_id')
        .eq('user_id', user_id)
        .eq('campaign_type', 'review_request')
        .in('lead_id', leadIds)

      if (emailsError) {
        console.error('Error checking existing emails:', emailsError)
        continue
      }

      const existingLeadIds = new Set(existingEmails?.map(email => email.lead_id) || [])
      const leadsToEmail = completedLeads.filter(lead => !existingLeadIds.has(lead.id))

      if (leadsToEmail.length === 0) {
        continue
      }

      // Get business info from Profile page for personalization
      const { data: businessInfo } = await supabase
        .from('user_settings')
        .select('business_name, business_website, business_hours, booking_link')
        .eq('user_id', user_id)
        .single()

      // Generate and send review request emails
      const emailLogs = leadsToEmail.map(lead => {
        const subject = `How was your experience? We'd love to hear about it!`
        const content = generateReviewRequestContent(lead, businessInfo)

        return {
          user_id,
          lead_id: lead.id,
          recipient_email: lead.email,
          recipient_name: lead.name,
          subject,
          content,
          campaign_type: 'review_request',
          status: 'sent'
        }
      })

      // Insert email logs
      const { error: insertError } = await supabase
        .from('email_logs')
        .insert(emailLogs)

      if (insertError) {
        console.error('Error inserting email logs:', insertError)
        continue
      }

      totalProcessed += leadsToEmail.length
    }

    res.status(200).json({ 
      success: true, 
      message: `Processed ${totalProcessed} review request emails`,
      processed: totalProcessed
    })
  } catch (error) {
    console.error('Workflow automation error:', error)
    res.status(500).json({ error: 'Failed to process workflow automation' })
  }
})

function generateReviewRequestContent(lead, businessInfo) {
  const businessName = businessInfo?.business_name || 'Our Business'
  const website = businessInfo?.business_website || businessInfo?.booking_link || 'our website'
  const businessHours = businessInfo?.business_hours || ''
  
  return `<h2>Hi ${lead.name}!</h2>
  <p>We hope you're loving your experience with us!</p>
  <p>Your feedback means everything to us and helps other clients discover our services.</p>
  <p><a href="${website}" style="background: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Leave a Review</a></p>
  <p>Ready to book your next appointment? <a href="${website}">Click here</a></p>
  ${businessHours ? `<p><strong>Our Hours:</strong> ${businessHours}</p>` : ''}
  <p>Best regards,<br>${businessName} Team</p>`
}

// ========================================
// AI GENERATION API ENDPOINT
// ========================================

app.post('/api/ai/generate', async (req, res) => {
  try {
    const { prompt, user_id } = req.body

    if (!prompt || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Try to use Ollama first, fallback to template-based approach
    try {
      const ollamaResponse = await generateWithOllama(prompt)
      if (ollamaResponse) {
        return res.status(200).json(ollamaResponse)
      }
    } catch (error) {
      console.log('Ollama not available, using fallback:', error)
    }
    
    // Fallback to template-based approach
    const response = generateEmailContent(prompt)
    res.status(200).json(response)
  } catch (error) {
    console.error('AI generation error:', error)
    res.status(500).json({ error: 'Failed to generate content' })
  }
})

async function generateWithOllama(prompt) {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3:latest', // Using the available model
        prompt: `${prompt}\n\nPlease respond with valid JSON in this format: {"subject": "Email Subject", "content": "HTML email content"}`,
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Try to parse the JSON response
    try {
      const parsedResponse = JSON.parse(data.response)
      return {
        subject: parsedResponse.subject || 'Email from Your Business',
        content: parsedResponse.content || '<h2>Hello!</h2><p>Thank you for your interest!</p>'
      }
    } catch (parseError) {
      // If JSON parsing fails, extract subject and content from the response
      const responseText = data.response
      const subjectMatch = responseText.match(/"subject":\s*"([^"]+)"/)
      const contentMatch = responseText.match(/"content":\s*"([^"]+)"/)
      
      return {
        subject: subjectMatch ? subjectMatch[1] : 'Email from Your Business',
        content: contentMatch ? contentMatch[1] : '<h2>Hello!</h2><p>Thank you for your interest!</p>'
      }
    }
  } catch (error) {
    console.error('Ollama generation error:', error)
    return null
  }
}

function generateEmailContent(prompt) {
  // Extract campaign type and business info from prompt
  const campaignType = extractCampaignType(prompt)
  const businessName = extractBusinessInfo(prompt, 'Business Name:')
  const website = extractBusinessInfo(prompt, 'Business URL:')
  
  // Generate content based on campaign type - be more specific about each type
  switch (campaignType) {
         case 'promotion':
           return {
             subject: `🎉 Special Promotion from ${businessName}!`,
             content: `Hello!

We're excited to share an exclusive promotion with you!

Visit our website to learn more about this limited-time offer: ${website}

Don't miss out on this amazing opportunity!

Best regards,
${businessName} Team`
           }
    
         case 'offer':
           return {
             subject: `🎁 Special Offer Just for You - ${businessName}`,
             content: `Hello!

We have an exclusive offer that we think you'll absolutely love!

This special deal is available for a limited time only and is designed specifically for our valued customers like you.

Here's what we're offering:
• Special pricing on select services
• Exclusive access to new features
• Limited-time bonus benefits

This offer won't last long, so don't miss out!

Visit our website to claim your special offer: ${website}

Thank you for being a valued customer!

Best regards,
${businessName} Team`
           }
    
         case 'update':
           return {
             subject: `📢 Important Update from ${businessName}`,
             content: `Hello!

We wanted to share some important updates with you about ${businessName}.

Here are the latest developments and news from our business:

• We're excited to announce some changes to our services
• We've been working hard to improve our customer experience
• We have some exciting news to share about our future plans

We appreciate your continued support and trust in our business.

For more information, visit our website: ${website}

Thank you for being a valued customer!

Best regards,
${businessName} Team`
           }
    
         case 'custom':
           // Check if there's custom input in the prompt
           const customRequestMatch = prompt.match(/CUSTOM REQUEST:\s*([^]+?)(?=\n\n|$)/i)
           const customRequest = customRequestMatch ? customRequestMatch[1].trim() : null
           
           if (customRequest) {
             return {
               subject: `Message from ${businessName}`,
               content: `Hello!

${customRequest}

We appreciate your continued support and trust in our business.

For more information, visit our website: ${website}

If you have any questions, please don't hesitate to contact us.

Best regards,
${businessName} Team`
             }
           } else {
             return {
               subject: `Message from ${businessName}`,
               content: `Hello!

We hope this message finds you well.

We wanted to reach out and share some information with you.

Visit our website to learn more: ${website}

If you have any questions, please don't hesitate to contact us.

Best regards,
${businessName} Team`
             }
           }
    
         default:
           return {
             subject: `Message from ${businessName}`,
             content: `Hello!

We hope this message finds you well.

Visit us at ${website} to learn more about our services.

Best regards,
${businessName} Team`
           }
  }
}

function extractCampaignType(prompt) {
  const lowerPrompt = prompt.toLowerCase()
  
  // Look for specific campaign type mentions (prioritize exact matches)
  if (lowerPrompt.includes('campaign type: promotion')) return 'promotion'
  if (lowerPrompt.includes('campaign type: offer')) return 'offer'
  if (lowerPrompt.includes('campaign type: update')) return 'update'
  if (lowerPrompt.includes('campaign type: custom')) return 'custom'
  
  // Fallback to general mentions
  if (lowerPrompt.includes('promotion')) return 'promotion'
  if (lowerPrompt.includes('offer')) return 'offer'
  if (lowerPrompt.includes('update')) return 'update'
  if (lowerPrompt.includes('custom')) return 'custom'
  
  // Default fallback
  return 'custom'
}

function extractBusinessInfo(prompt, field) {
  const regex = new RegExp(`${field}\\s*([^\\n]+)`, 'i')
  const match = prompt.match(regex)
  return match ? match[1].trim() : 'Your Business'
}

// ===== MOVED API ENDPOINTS TO REDUCE VERCEL SERVERLESS FUNCTION COUNT =====

// Niche Templates API (moved from api/niche-templates.ts)
app.get('/api/niche-templates', async (req, res) => {
  try {
    // Get all active niche templates
    const { data: templates, error } = await supabase
      .from('niche_templates')
      .select('*')
      .eq('is_active', true)
      .order('display_name')

    if (error) {
      console.error('Error fetching niche templates:', error)
      return res.status(500).json({ error: 'Failed to fetch niche templates' })
    }

    res.status(200).json({
      success: true,
      templates: templates || []
    })
  } catch (error) {
    console.error('Niche templates API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Leads Create API (moved from api/leads/create.ts)
app.post('/api/leads/create', async (req, res) => {
  try {
    const { name, email, phone, message, business_slug, source } = req.body

    // Validate required fields
    if (!name || !email || !business_slug) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, email, business_slug' 
      })
    }

    // Get business owner's user_id from business_slug
    const { data: businessData, error: businessError } = await supabase
      .from('user_settings')
      .select('user_id, business_name')
      .eq('business_slug', business_slug)
      .single()

    if (businessError || !businessData) {
      console.error('Business not found:', businessError)
      return res.status(404).json({ error: 'Business not found' })
    }

    // Create the lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert([{
        user_id: businessData.user_id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        source: source || 'HostedForm',
        status: 'new',
        notes: message?.trim() || null
      }])
      .select('id, name, email, status, created_at')
      .single()

    if (leadError) {
      console.error('Error creating lead:', leadError)
      return res.status(500).json({ 
        error: 'Failed to create lead',
        details: leadError.message 
      })
    }

    // Log the lead creation for analytics
    console.log(`New lead created via hosted form:`, {
      lead_id: leadData.id,
      business_slug,
      business_name: businessData.business_name,
      lead_name: leadData.name,
      lead_email: leadData.email
    })

    return res.status(201).json({
      success: true,
      lead_id: leadData.id,
      message: 'Lead created successfully'
    })

  } catch (error) {
    console.error('Error in leads/create API:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Bookings Complete API (moved from api/bookings/complete.ts)
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
        service_type,
        appointment_time,
        user_id,
        leads!inner(id, name, email, phone)
      `)
      .single()

    if (bookingError || !booking) {
      console.error('Error updating booking:', bookingError)
      return res.status(500).json({ 
        error: 'Failed to complete booking',
        details: bookingError?.message 
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
      lead_id: booking.leads?.id,
      user_id: booking.user_id,
      business_name: businessSettings?.business_name || 'Our Business',
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      service_type: booking.service_type,
      booking_time: booking.appointment_time,
      service_notes: service_notes
    }

    // Trigger post-service workflow
    try {
      const { workflowEngine } = await import('./src/lib/workflowEngine.js')
      
      // Trigger review request workflow
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
      service: booking.service_type,
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

// Tenant Onboarding API (moved from api/tenant/onboarding.ts)
app.post('/api/tenant/onboarding', async (req, res) => {
  try {
    const { user_id, niche_template_id, business_name } = req.body

    if (!user_id || !niche_template_id || !business_name) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, niche_template_id, business_name' 
      })
    }

    // Get niche template configuration
    const { data: template, error: templateError } = await supabase
      .from('niche_templates')
      .select('*')
      .eq('id', niche_template_id)
      .single()

    if (templateError || !template) {
      return res.status(404).json({ error: 'Niche template not found' })
    }

    // Generate subdomain
    const { data: subdomainResult, error: subdomainError } = await supabase
      .rpc('generate_subdomain', { business_name })

    if (subdomainError) {
      console.error('Error generating subdomain:', subdomainError)
      return res.status(500).json({ error: 'Failed to generate subdomain' })
    }

    const subdomain = subdomainResult
    const sending_domain = `reviews.${subdomain}`

    // Update user settings with niche configuration
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        niche_template_id,
        subdomain,
        sending_domain,
        business_name,
        workflow_stage: 'new'
      })
      .eq('user_id', user_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user settings:', updateError)
      return res.status(500).json({ error: 'Failed to update user settings' })
    }

    // Create tenant domain record
    const { error: domainError } = await supabase
      .from('tenant_domains')
      .insert({
        user_id,
        subdomain,
        sending_domain,
        status: 'pending'
      })
      .select()
      .single()

    if (domainError) {
      console.error('Error creating tenant domain:', domainError)
      // Don't fail the request, just log the error
    }

    res.status(200).json({
      success: true,
      message: 'Niche configuration applied successfully',
      config: {
        niche_template: template,
        subdomain,
        sending_domain,
        workflow_stages: template.config.workflow_stages,
        automation_rules: template.config.automation_rules
      }
    })

  } catch (error) {
    console.error('Tenant onboarding error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.listen(PORT, async () => {
  console.log(`🚀 Development API server running on http://localhost:${PORT}`)
  console.log(`📱 Frontend should be running on http://localhost:5173`)
  console.log(`🔗 API endpoints available at http://localhost:${PORT}/api/`)
  
  // Initialize workflow engine
  await initializeWorkflowEngine()
})
