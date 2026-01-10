// LinkedIn OAuth Integration (No Supabase dependency)
// This file handles LinkedIn OAuth flows directly

interface LinkedInProfile {
  id: string
  firstName: string
  lastName: string
  email?: string
  profilePicture?: string
}

interface LinkedInTokens {
  access_token: string
  expires_in: number
  expires_at: string
}

// Get the backend URL based on environment
const getBackendUrl = () => {
  if (import.meta.env.PROD) {
    return 'https://www.getgetleads.com/api'
  }
  return 'http://localhost:3001/api'
}


// Generate LinkedIn OAuth URL
export const getLinkedInAuthUrl = async (): Promise<string> => {
  try {
    const backendUrl = getBackendUrl()
    const response = await fetch(`${backendUrl}/linkedin/auth`, {
      method: 'GET',
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to get LinkedIn auth URL from backend')
    }
    
    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate auth URL')
    }
    
    return data.authUrl
  } catch (error) {
    console.error('Error getting LinkedIn auth URL:', error)
    throw new Error('Failed to connect to backend server. Please try again.')
  }
}

// Exchange authorization code for access token
export const exchangeLinkedInCode = async (code: string, state: string): Promise<LinkedInTokens & { profile: LinkedInProfile }> => {
  try {
    const backendUrl = getBackendUrl()
    const response = await fetch(`${backendUrl}/linkedin/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // This ensures cookies are sent
      body: JSON.stringify({ code, state })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to exchange code for token')
    }
    
    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to exchange code for token')
    }
    
    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      profile: data.profile
    }
  } catch (error: any) {
    console.error('Error exchanging LinkedIn code for token:', error)
    throw new Error(`Failed to exchange code for token: ${error?.message || error}`)
  }
}

// Get LinkedIn profile using access token
export const getLinkedInProfile = async (accessToken: string): Promise<LinkedInProfile> => {
  try {
    const backendUrl = getBackendUrl()
    const response = await fetch(`${backendUrl}/linkedin/test/${accessToken}`)
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to get LinkedIn profile')
    }
    
    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to get LinkedIn profile')
    }
    
    return data.profile
  } catch (error: any) {
    console.error('Error getting LinkedIn profile:', error)
    throw new Error(`Failed to get LinkedIn profile: ${error?.message || error}`)
  }
}

// Verify state parameter (handled by backend)
export const verifyLinkedInState = (_state: string): boolean => {
  // State verification is handled by the backend
  // This function is kept for compatibility but not used
  return true
}

// Check if token is expired
export const isLinkedInTokenExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) <= new Date()
}

// Store LinkedIn session in localStorage
export const storeLinkedInSession = (tokens: LinkedInTokens, profile: LinkedInProfile) => {
  const session = {
    tokens,
    profile,
    timestamp: Date.now()
  }
  localStorage.setItem('linkedin_session', JSON.stringify(session))
  localStorage.setItem('is_linkedin_connected', 'true')
}

// Get LinkedIn session from localStorage
export const getLinkedInSession = () => {
  const session = localStorage.getItem('linkedin_session')
  if (session) {
    try {
      const parsed = JSON.parse(session)
      return parsed
    } catch (error) {
      console.error('Error parsing LinkedIn session:', error)
      return null
    }
  }
  return null
}

// Clear LinkedIn session
export const clearLinkedInSession = () => {
  console.log('🧹 Clearing LinkedIn session...')
  
  // Get all localStorage keys before clearing
  const allKeys = Object.keys(localStorage)
  const linkedinKeys = allKeys.filter(key => key.toLowerCase().includes('linkedin'))
  
  console.log('Before clearing - All LinkedIn keys found:', linkedinKeys)
  console.log('Before clearing - Values:', {
    linkedin_session: localStorage.getItem('linkedin_session'),
    linkedin_access_token: localStorage.getItem('linkedin_access_token'),
    linkedin_expires_at: localStorage.getItem('linkedin_expires_at'),
    is_linkedin_connected: localStorage.getItem('is_linkedin_connected'),
    oauth_state_linkedin: localStorage.getItem('oauth_state_linkedin')
  })
  
  // Clear all possible LinkedIn keys
  const keysToRemove = [
    'linkedin_session',
    'linkedin_access_token', 
    'linkedin_expires_at',
    'is_linkedin_connected',
    'oauth_state_linkedin',
    'linkedin_profile',
    'linkedin_user',
    'linkedin_token'
  ]
  
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`Removing key: ${key}`)
      localStorage.removeItem(key)
    }
  })
  
  // Also clear any keys that contain 'linkedin' in their name
  linkedinKeys.forEach(key => {
    if (!keysToRemove.includes(key)) {
      console.log(`Removing additional LinkedIn key: ${key}`)
      localStorage.removeItem(key)
    }
  })
  
  console.log('After clearing - All LinkedIn keys remaining:', 
    Object.keys(localStorage).filter(key => key.toLowerCase().includes('linkedin'))
  )
  console.log('After clearing - Values:', {
    linkedin_session: localStorage.getItem('linkedin_session'),
    linkedin_access_token: localStorage.getItem('linkedin_access_token'),
    linkedin_expires_at: localStorage.getItem('linkedin_expires_at'),
    is_linkedin_connected: localStorage.getItem('is_linkedin_connected'),
    oauth_state_linkedin: localStorage.getItem('oauth_state_linkedin')
  })
  console.log('✅ LinkedIn session cleared')
}

// Debug function to inspect all localStorage
export const debugLocalStorage = () => {
  console.log('🔍 DEBUG: All localStorage keys and values:')
  const allKeys = Object.keys(localStorage)
  allKeys.forEach(key => {
    const value = localStorage.getItem(key)
    console.log(`  ${key}: ${value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'null'}`)
  })
  
  const linkedinKeys = allKeys.filter(key => key.toLowerCase().includes('linkedin'))
  console.log('🔍 DEBUG: LinkedIn-related keys:', linkedinKeys)
}

// Cache for LinkedIn connection status to avoid repeated checks
let linkedinConnectionCache: { status: boolean | null; timestamp: number } = { status: null, timestamp: 0 }
const CACHE_DURATION = 5000 // 5 seconds cache

// Check if LinkedIn is connected (with caching to reduce excessive logging)
export const isLinkedInConnected = (): boolean => {
  const now = Date.now()
  
  // Return cached result if still valid
  if (linkedinConnectionCache.status !== null && (now - linkedinConnectionCache.timestamp) < CACHE_DURATION) {
    return linkedinConnectionCache.status
  }
  
  const connected = localStorage.getItem('is_linkedin_connected') === 'true'
  
  // Only log on first check or when status changes
  if (linkedinConnectionCache.status !== connected) {
    console.log('🔍 LinkedIn connection status:', {
      is_linkedin_connected: localStorage.getItem('is_linkedin_connected'),
      connected: connected,
      linkedin_session: localStorage.getItem('linkedin_session') ? 'exists' : 'null',
      linkedin_access_token: localStorage.getItem('linkedin_access_token') ? 'exists' : 'null'
    })
  }
  
  // Update cache
  linkedinConnectionCache = { status: connected, timestamp: now }
  
  return connected
}
