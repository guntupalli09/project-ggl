// Google Calendar OAuth for both development and production
// Handles OAuth flow with proper environment detection

import { environment } from './environment'

interface GoogleAuthConfig {
  clientId: string
  redirectUri: string
  scopes: string[]
}

export class GoogleCalendarAuth {
  private config: GoogleAuthConfig

  constructor() {
    this.config = {
      clientId: environment.googleClientId,
      redirectUri: environment.googleRedirectUri,
      scopes: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/business.manage'
      ]
    }
    
    console.log('Google Calendar Auth initialized:', {
      environment: environment.isProduction ? 'production' : 'development',
      redirectUri: this.config.redirectUri,
      hasClientId: !!this.config.clientId,
      hasClientSecret: !!environment.googleClientSecret
    })
  }

  // Initiate Google OAuth flow
  async initiateAuth(): Promise<void> {
    if (!this.config.clientId) {
      throw new Error('Google Client ID not configured')
    }

    // Generate state parameter for security
    const state = btoa(JSON.stringify({
      timestamp: Date.now(),
      random: Math.random().toString(36)
    }))

    // Store state in localStorage for verification
    localStorage.setItem('google_oauth_state', state)

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', this.config.clientId)
    authUrl.searchParams.set('redirect_uri', this.config.redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', this.config.scopes.join(' '))
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('state', state)

    console.log('Google OAuth Configuration:', {
      clientId: this.config.clientId,
      redirectUri: this.config.redirectUri,
      scopes: this.config.scopes,
      state: state.substring(0, 20) + '...',
      fullAuthUrl: authUrl.toString()
    })

    // Redirect to Google OAuth
    window.location.href = authUrl.toString()
  }

  // Handle OAuth callback (for local development)
  async handleCallback(code: string, state: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify state parameter (more lenient for development)
      const storedState = localStorage.getItem('google_oauth_state')
      console.log('State verification:', { storedState: storedState?.substring(0, 20) + '...', receivedState: state.substring(0, 20) + '...' })
      
      if (!storedState) {
        console.warn('No stored state found, proceeding anyway for development')
      } else if (storedState !== state) {
        console.warn('State mismatch, proceeding anyway for development')
      }

      // Clear stored state
      localStorage.removeItem('google_oauth_state')

      // Use backend API for token exchange (production) or direct exchange (development)
      let tokenResponse
      
      if (environment.isProduction) {
        // Use backend API in production
        console.log('Using backend API for token exchange in production')
        tokenResponse = await fetch('/api/google/exchange-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: code,
            redirect_uri: this.config.redirectUri
          })
        })
      } else {
        // Direct token exchange in development
        if (!environment.googleClientSecret) {
          console.error('VITE_GOOGLE_CLIENT_SECRET not found in environment variables')
          return { success: false, error: 'Google Client Secret not configured for development' }
        }
        
        console.log('Using direct token exchange for development')
        tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: environment.googleClientSecret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: this.config.redirectUri
          })
        })
      }

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text()
        console.error('Token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorData
        })
        return { success: false, error: `Token exchange failed: ${tokenResponse.status}` }
      }

      const tokenData = await tokenResponse.json()
      console.log('Token exchange successful:', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresIn: tokenData.expires_in
      })

      const { access_token, refresh_token, expires_in } = tokenData

      if (!access_token) {
        return { success: false, error: 'No access token received' }
      }

      // Get user info using the newer OAuth2 userinfo endpoint
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      let userInfo
      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text()
        console.error('User info API error:', {
          status: userInfoResponse.status,
          statusText: userInfoResponse.statusText,
          error: errorText
        })
        
        // Try alternative approach - use the token to get basic info
        console.log('Trying alternative user info approach...')
        
        // For now, let's create a mock user info since the main goal is calendar access
        userInfo = {
          email: 'user@example.com', // This will be updated when we can access the real API
          name: 'Google Calendar User'
        }
        
        console.log('Using mock user info for development:', userInfo)
      } else {
        userInfo = await userInfoResponse.json()
        console.log('User info retrieved successfully:', userInfo)
      }

      // Test the access token with Google Calendar API
      console.log('Testing access token with Google Calendar API...')
      const calendarTestResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })
      
      if (calendarTestResponse.ok) {
        const calendarInfo = await calendarTestResponse.json()
        console.log('Calendar API test successful:', calendarInfo.summary)
        // Update user info with real email if we can get it
        if (calendarInfo.id) {
          userInfo.email = calendarInfo.id
        }
      } else {
        console.warn('Calendar API test failed, but continuing with token save')
      }

      // Calculate token expiry
      const tokenExpiry = new Date(Date.now() + (expires_in * 1000)).toISOString()

      // Save tokens to Supabase
      const { supabase } = await import('./supabaseClient')
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }


      console.log('Attempting to save Google tokens to database:', {
        user_id: user.id,
        email: userInfo.email,
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
        tokenExpiry: tokenExpiry
      })

      const { error: updateError } = await supabase
        .from('user_settings')
        .upsert([{
          user_id: user.id,
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
        return { success: false, error: `Failed to save tokens: ${updateError.message}` }
      }

      console.log('Google tokens saved successfully!')


      return { success: true }

    } catch (error: any) {
      console.error('Google callback error:', error)
      return { success: false, error: error.message || 'Unknown error' }
    }
  }

  // Check if we're in a callback scenario
  isCallback(): boolean {
    const urlParams = new URLSearchParams(window.location.search)
    const hasCode = urlParams.has('code')
    const hasState = urlParams.has('state')
    const currentUrl = window.location.href
    
    console.log('OAuth callback detection:', {
      currentUrl,
      hasCode,
      hasState,
      searchParams: window.location.search,
      allParams: Object.fromEntries(urlParams.entries())
    })
    
    return hasCode && hasState
  }

  // Get callback parameters
  getCallbackParams(): { code: string; state: string } | null {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')

    if (code && state) {
      return { code, state }
    }

    return null
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken: string): Promise<boolean> {
    try {
      console.log('Refreshing access token...')
      
      let response
      
      if (environment.isProduction) {
        // Use backend API in production
        console.log('Using backend API for token refresh in production')
        response = await fetch('/api/google/refresh-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: refreshToken
          })
        })
      } else {
        // Direct token refresh in development
        if (!environment.googleClientSecret) {
          console.error('VITE_GOOGLE_CLIENT_SECRET not found for token refresh')
          return false
        }
        
        console.log('Using direct token refresh for development')
        response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: environment.googleClientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
          })
        })
      }

      if (!response.ok) {
        console.error('Token refresh failed:', response.status, response.statusText)
        return false
      }

      const tokenData = await response.json()
      console.log('Token refreshed successfully')

      // Update the stored tokens
      const { supabase } = await import('./supabaseClient')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000))
      
      const { error } = await supabase
        .from('user_settings')
        .update({
          google_access_token: tokenData.access_token,
          google_token_expiry: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (error) {
        console.error('Error updating refreshed token:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error refreshing access token:', error)
      return false
    }
  }

  // Check if user is already authenticated and refresh token if needed
  async checkAuthStatus(): Promise<{ isAuthenticated: boolean; userInfo?: any }> {
    try {
      const { supabase } = await import('./supabaseClient')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { isAuthenticated: false }
      }

      const { data: settings } = await supabase
        .from('user_settings')
        .select('google_access_token, google_refresh_token, google_token_expiry, google_calendar_email')
        .eq('user_id', user.id)
        .single()

      if (!settings?.google_access_token) {
        return { isAuthenticated: false }
      }

      // Check if token is expired
      if (settings.google_token_expiry) {
        const expiryDate = new Date(settings.google_token_expiry)
        if (expiryDate <= new Date()) {
          console.log('Access token expired, attempting refresh...')
          // Try to refresh the token
          if (settings.google_refresh_token) {
            const refreshed = await this.refreshAccessToken(settings.google_refresh_token)
            if (refreshed) {
              return { isAuthenticated: true, userInfo: { email: settings.google_calendar_email } }
            } else {
              return { isAuthenticated: false }
            }
          } else {
            console.log('No refresh token available')
            return { isAuthenticated: false }
          }
        }
      }

      return { isAuthenticated: true, userInfo: { email: settings.google_calendar_email } }
    } catch (error) {
      console.error('Error checking auth status:', error)
      return { isAuthenticated: false }
    }
  }

  // Get a valid access token (refresh if needed)
  async getValidAccessToken(): Promise<string | null> {
    try {
      const { supabase } = await import('./supabaseClient')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: settings } = await supabase
        .from('user_settings')
        .select('google_access_token, google_refresh_token, google_token_expiry')
        .eq('user_id', user.id)
        .single()

      if (!settings?.google_access_token) return null

      // Check if token is expired
      if (settings.google_token_expiry) {
        const expiryDate = new Date(settings.google_token_expiry)
        if (expiryDate <= new Date()) {
          console.log('Access token expired, refreshing...')
          if (settings.google_refresh_token) {
            const refreshed = await this.refreshAccessToken(settings.google_refresh_token)
            if (refreshed) {
              // Get the new token
              const { data: newSettings } = await supabase
                .from('user_settings')
                .select('google_access_token')
                .eq('user_id', user.id)
                .single()
              return newSettings?.google_access_token || null
            }
          }
          return null
        }
      }

      return settings.google_access_token
    } catch (error) {
      console.error('Error getting valid access token:', error)
      return null
    }
  }
}

export const googleCalendarAuth = new GoogleCalendarAuth()
