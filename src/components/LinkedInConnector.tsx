import { useState, useEffect } from 'react'
import { getLinkedInAuthUrl, getLinkedInProfile, isLinkedInTokenExpired } from '../lib/linkedinOAuth'

export default function LinkedInConnector() {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    // Load existing session
    const accessToken = localStorage.getItem('linkedin_access_token')
    const expiresAt = localStorage.getItem('linkedin_expires_at')
    
    if (accessToken && expiresAt && !isLinkedInTokenExpired(expiresAt)) {
      // Fetch profile to verify token is still valid
      getLinkedInProfile(accessToken)
        .then(profile => {
          setSession({ accessToken, expiresAt, profile })
        })
        .catch(() => {
          // Token is invalid, clear it
          localStorage.removeItem('linkedin_access_token')
          localStorage.removeItem('linkedin_expires_at')
        })
    }
  }, [])

  const handleConnect = async () => {
    setConnecting(true)
    setError('')

    try {
      const authUrl = await getLinkedInAuthUrl()
      console.log('LinkedIn OAuth URL:', authUrl)
      window.location.href = authUrl
    } catch (error: any) {
      console.error('Error starting LinkedIn OAuth:', error)
      setError(`Failed to start LinkedIn connection: ${error.message}`)
      setConnecting(false)
    }
  }

  const handleDisconnect = () => {
    localStorage.removeItem('linkedin_access_token')
    localStorage.removeItem('linkedin_expires_at')
    setSession(null)
  }

  const isConnected = session && session.accessToken

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">LinkedIn Connection</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Connect your LinkedIn account to start automating your posts
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Connection Status */}
      {isConnected ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg">
                💼
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {session.profile?.firstName} {session.profile?.lastName}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {session.profile?.email || 'No email available'}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Token expires: {session.expiresAt ? new Date(session.expiresAt).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                Active
              </span>
              <button
                onClick={handleDisconnect}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">💼</div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Not Connected</h4>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Connect your LinkedIn account to start automating your posts
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connecting...
              </>
            ) : (
              <>
                <span className="mr-2">💼</span>
                Connect LinkedIn
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
