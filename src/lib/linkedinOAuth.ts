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

// Generate LinkedIn OAuth URL
export const getLinkedInAuthUrl = async (): Promise<string> => {
  try {
    const response = await fetch('http://localhost:3001/api/linkedin/auth', {
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
    
    // Store state for verification
    localStorage.setItem('oauth_state_linkedin', data.state)
    
    return data.authUrl
  } catch (error) {
    console.error('Error getting LinkedIn auth URL:', error)
    throw new Error('Failed to connect to backend server. Make sure it\'s running on port 3001.')
  }
}

// Exchange authorization code for access token
export const exchangeLinkedInCode = async (code: string, state: string): Promise<LinkedInTokens & { profile: LinkedInProfile }> => {
  try {
    const response = await fetch('http://localhost:3001/api/linkedin/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
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
  } catch (error) {
    console.error('Error exchanging LinkedIn code for token:', error)
    throw new Error(`Failed to exchange code for token: ${error.message}`)
  }
}

// Get LinkedIn profile using access token
export const getLinkedInProfile = async (accessToken: string): Promise<LinkedInProfile> => {
  try {
    const response = await fetch(`http://localhost:3001/api/linkedin/test/${accessToken}`)
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to get LinkedIn profile')
    }
    
    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to get LinkedIn profile')
    }
    
    return data.profile
  } catch (error) {
    console.error('Error getting LinkedIn profile:', error)
    throw new Error(`Failed to get LinkedIn profile: ${error.message}`)
  }
}

// Verify state parameter
export const verifyLinkedInState = (state: string): boolean => {
  const storedState = localStorage.getItem('oauth_state_linkedin')
  localStorage.removeItem('oauth_state_linkedin')
  return storedState === state
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
  return session ? JSON.parse(session) : null
}

// Clear LinkedIn session
export const clearLinkedInSession = () => {
  localStorage.removeItem('linkedin_session')
  localStorage.removeItem('is_linkedin_connected')
}

// Check if LinkedIn is connected
export const isLinkedInConnected = (): boolean => {
  return localStorage.getItem('is_linkedin_connected') === 'true'
}
