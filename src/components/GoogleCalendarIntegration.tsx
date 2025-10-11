import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { googleCalendarAuth } from '../lib/googleCalendarAuth'
import { CalendarIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface GoogleCalendarIntegrationProps {
  onConnectionChange?: (connected: boolean) => void
}

interface GoogleCalendarStatus {
  connected: boolean
  email?: string
  expiry?: string
}

const GoogleCalendarIntegration: React.FC<GoogleCalendarIntegrationProps> = ({ 
  onConnectionChange 
}) => {
  const [status, setStatus] = useState<GoogleCalendarStatus>({ connected: false })
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  // Check Google Calendar connection status
  useEffect(() => {
    checkConnectionStatus()
    
    // Handle OAuth callback for local development
    if (googleCalendarAuth.isCallback()) {
      console.log('OAuth callback detected, processing...')
      const params = googleCalendarAuth.getCallbackParams()
      if (params) {
        console.log('OAuth callback parameters found:', { code: params.code.substring(0, 10) + '...', state: params.state })
        handleOAuthCallback(params.code, params.state)
      } else {
        console.log('OAuth callback detected but no parameters found')
      }
    } else {
      console.log('No OAuth callback detected')
    }
  }, [])

  const checkConnectionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Use the new auth status check that handles token refresh
      const authStatus = await googleCalendarAuth.checkAuthStatus()
      
      setStatus({ 
        connected: authStatus.isAuthenticated, 
        email: authStatus.userInfo?.email,
        expiry: null // Will be updated below
      })
      
      if (onConnectionChange) {
        onConnectionChange(authStatus.isAuthenticated)
      }

      // Get the current expiry from the database
      const { data: settings } = await supabase
        .from('user_settings')
        .select('google_token_expiry')
        .eq('user_id', user.id)
        .single()
      
      if (settings?.google_token_expiry) {
        setStatus(prev => ({ ...prev, expiry: settings.google_token_expiry }))
      }

      console.log('Google Calendar Status Check:', {
        connected: authStatus.isAuthenticated,
        hasValidToken: authStatus.isAuthenticated,
        email: authStatus.userInfo?.email,
        accessToken: authStatus.isAuthenticated ? 'present' : 'missing',
        expiry: settings?.google_token_expiry
      })
    } catch (err) {
      console.error('Error checking Google Calendar status:', err)
      setStatus({ connected: false })
      if (onConnectionChange) {
        onConnectionChange(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthCallback = async (code: string, state: string) => {
    setConnecting(true)
    setError('')

    console.log('Processing Google Calendar OAuth callback:', { code: code.substring(0, 10) + '...', state })

    try {
      const result = await googleCalendarAuth.handleCallback(code, state)
      
      console.log('OAuth callback result:', result)
      
      if (result.success) {
        console.log('OAuth callback successful, updating status')
        setStatus({ connected: true })
        onConnectionChange?.(true)
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
        // Refresh connection status to get the latest data
        setTimeout(() => checkConnectionStatus(), 1000)
      } else {
        console.error('OAuth callback failed:', result.error)
        setError(result.error || 'Failed to connect Google Calendar')
      }
    } catch (err: any) {
      console.error('OAuth callback error:', err)
      setError(err.message || 'Failed to process Google Calendar callback')
    } finally {
      setConnecting(false)
    }
  }

  const handleConnect = async () => {
    setConnecting(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please log in to connect Google Calendar')
        return
      }

      // For local development, use direct OAuth flow
      if (import.meta.env.MODE === 'development') {
        await googleCalendarAuth.initiateAuth()
      } else {
        // For production, use API route
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setError('No valid session found')
          return
        }

        const authUrl = `${window.location.origin}/api/google/auth`
        const response = await fetch(authUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to initiate Google OAuth')
          return
        }

        if (response.redirected) {
          window.location.href = response.url
        }
      }

    } catch (err: any) {
      console.error('Error connecting Google Calendar:', err)
      setError(err.message || 'Failed to connect Google Calendar')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_settings')
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expiry: null,
          google_calendar_connected: false,
          google_calendar_email: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (error) {
        console.error('Error disconnecting Google Calendar:', error)
        return
      }
      setStatus({ connected: false })
      onConnectionChange?.(false)

    } catch (err) {
      console.error('Error disconnecting Google Calendar:', err)
    }
  }


  const isTokenExpired = () => {
    if (!status.expiry) return false
    return new Date(status.expiry) < new Date()
  }

  const testCalendarConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: settings } = await supabase
        .from('user_settings')
        .select('google_access_token, google_calendar_email')
        .eq('user_id', user.id)
        .single()

      if (!settings?.google_access_token) {
        setError('No access token found')
        return
      }

      // Test Google Calendar API
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: {
          'Authorization': `Bearer ${settings.google_access_token}`
        }
      })

      if (response.ok) {
        const calendar = await response.json()
        console.log('Calendar API test successful:', calendar)
        setError('')
        // Refresh the connection status
        checkConnectionStatus()
      } else {
        const error = await response.text()
        console.error('Calendar API test failed:', error)
        setError(`Calendar API test failed: ${response.status}`)
      }
    } catch (err: any) {
      console.error('Calendar API test error:', err)
      setError(`Calendar API test error: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }


  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Google Calendar
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sync your calendar for automatic booking management
            </p>
          </div>
        </div>
        {status.connected && (
          <div className="flex items-center text-green-600 dark:text-green-400">
            <CheckIcon className="h-5 w-5 mr-1" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {status.connected ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Connected to Google Calendar
                </p>
                {status.email && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {status.email}
                  </p>
                )}
                {isTokenExpired() && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Token expired - please reconnect
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={testCalendarConnection}
                  className="inline-flex items-center px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Test Connection
                </button>
                <button
                  onClick={checkConnectionStatus}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
                <button
                  onClick={handleDisconnect}
                  className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-600 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Connect Google Calendar
            </h4>
            <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
              Connect your Google Calendar to automatically manage bookings and sync events.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </button>
          </div>

        </div>
      )}
    </div>
  )
}

export default GoogleCalendarIntegration
