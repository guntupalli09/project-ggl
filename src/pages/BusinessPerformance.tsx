import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { googleCalendarAuth } from '../lib/googleCalendarAuth'
import { ChartBarIcon, MapPinIcon, EyeIcon, PhoneIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

interface PerformanceData {
  locationName: string
  locationAddress: string
  businessAccount: string
  // Performance metrics will vary based on API response
  [key: string]: any
}

export default function BusinessPerformance() {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    checkConnectionStatus()
    
    // Check if we're coming from a Google OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    
    if (code && state) {
      handleGoogleCallback(code, state)
    }
  }, [])

  const handleGoogleCallback = async (code: string, state: string) => {
    try {
      const result = await googleCalendarAuth.handleCallback(code, state)
      if (result.success) {
        setIsConnected(true)
        setSuccessMessage('Successfully connected to Google! You can now view your business performance data.')
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname)
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000)
        // Fetch performance data after successful connection
        fetchPerformanceData()
      } else {
        setError(`Connection failed: ${result.error}`)
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    } catch (error) {
      console.error('Error handling Google callback:', error)
      setError('Failed to complete Google connection')
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }

  const checkConnectionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if Google Calendar is connected (we'll use the same OAuth for now)
      const { data: settings } = await supabase
        .from('user_settings')
        .select('google_access_token, google_token_expiry, google_calendar_email')
        .eq('user_id', user.id)
        .single()

      if (settings?.google_access_token) {
        // Check if token is still valid
        const now = new Date()
        const expiry = new Date(settings.google_token_expiry)
        const isValid = now < expiry
        
        if (isValid) {
          // Test if the token has the required scopes by trying to fetch performance data
          try {
            await fetchPerformanceData()
            setIsConnected(true)
          } catch (error) {
            // If we get a scope error, the user needs to re-authenticate
            console.log('Token lacks required scopes, user needs to re-authenticate')
            setIsConnected(false)
            setError('Please reconnect to Google to access Business Performance. New permissions are required for Google My Business API.')
          }
        } else {
          setIsConnected(false)
          setError('Google connection expired. Please reconnect.')
        }
      } else {
        setIsConnected(false)
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      await googleCalendarAuth.initiateAuth()
    } catch (error) {
      console.error('Error initiating Google auth:', error)
      setError('Failed to start Google authentication')
    }
  }

  const fetchPerformanceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get Google Calendar access token
      const { data: settings } = await supabase
        .from('user_settings')
        .select('google_access_token')
        .eq('user_id', user.id)
        .single()

      if (!settings?.google_access_token) {
        setError('No Google access token found. Please reconnect.')
        return
      }

      const response = await fetch('http://localhost:3001/api/google/business/performance', {
        headers: {
          'Authorization': `Bearer ${settings.google_access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPerformanceData(data.performance || [])
        
        // Check if no business account exists
        if (data.performance && data.performance.length === 0 && data.message && 
            (data.message.includes('No performance data found') || 
             data.message.includes('No business locations found'))) {
          setError('No Google Business account found for this email address. Please ensure your Google account has a verified Business Profile.')
        } else if (data.message) {
          setError(data.message)
        }
      } else {
        const errorData = await response.json()
        
        // Check if it's a scope error
        if (response.status === 400 && errorData.details?.includes('insufficient authentication scopes')) {
          setError('Please reconnect to Google. New permissions are required for Business Performance.')
          setIsConnected(false)
        } else if (response.status === 403 && errorData.error?.includes('Business account access denied')) {
          setError('No Google Business account found for this email address. Please ensure your Google account has a verified Business Profile.')
        } else {
          setError(errorData.error || 'Failed to fetch performance data')
        }
        
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch performance data')
      }
    } catch (error) {
      console.error('Error fetching performance data:', error)
      setError('Network error while fetching performance data')
      throw error // Re-throw to be caught by checkConnectionStatus
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading performance data...</p>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChartBarIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Connect Google Business Profile
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Link your Google Business Profile to view performance insights and analytics.
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {error}
              </p>
            </div>
          )}
          
          <button
            onClick={handleConnect}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Connect Google Business
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Business Performance
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor your Google Business Profile performance and analytics
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              {successMessage}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {error}
            </p>
          </div>
        )}

        {/* Performance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <EyeIcon className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Views</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {performanceData.length > 0 ? 'N/A' : '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PhoneIcon className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Calls</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {performanceData.length > 0 ? 'N/A' : '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <GlobeAltIcon className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Website Clicks</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {performanceData.length > 0 ? 'N/A' : '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPinIcon className="h-8 w-8 text-orange-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Locations</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {performanceData.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Data */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Performance Overview</h2>
          </div>
          
          {performanceData.length === 0 ? (
            <div className="p-6 text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {error && error.includes('No Google Business account found') 
                  ? 'No Google Business Account Found' 
                  : 'No performance data found'
                }
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {error || 'Your Google Business Profile may not have performance data yet, or the Performance API is not enabled.'}
              </p>
              
              {error && error.includes('No Google Business account found') ? (
                <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    How to set up Google Business Profile:
                  </h4>
                  <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1 text-left">
                    <li>Go to <a href="https://business.google.com" target="_blank" rel="noopener noreferrer" className="underline">business.google.com</a></li>
                    <li>Sign in with your Google account</li>
                    <li>Create or claim your business listing</li>
                    <li>Complete the verification process</li>
                    <li>Return here to view your performance data</li>
                  </ol>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    To enable this feature:
                  </p>
                  <ol className="text-sm text-gray-500 dark:text-gray-400 mt-2 list-decimal list-inside space-y-1">
                    <li>Go to Google Cloud Console</li>
                    <li>Enable "Business Profile Performance API"</li>
                    <li>Request GBP API access if quota is 0</li>
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {performanceData.map((location, index) => (
                <div key={index} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {location.locationName}
                      </h3>
                      {location.locationAddress && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {location.locationAddress}
                        </p>
                      )}
                      
                      {/* Display available performance metrics */}
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(location).map(([key, value]) => {
                          if (key === 'locationName' || key === 'locationAddress' || key === 'businessAccount') {
                            return null
                          }
                          
                          return (
                            <div key={key} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </p>
                              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
