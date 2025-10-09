import { useState } from 'react'
import { getOAuthUrl, exchangeCodeForToken, verifyState } from '../lib/socialOAuth'

export default function LinkedInOAuthTest() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [accessToken, setAccessToken] = useState('')

  const testLinkedInAuth = async () => {
    setStatus('loading')
    setMessage('Generating LinkedIn OAuth URL...')
    
    try {
      const oauthUrl = await getOAuthUrl('linkedin')
      console.log('LinkedIn OAuth URL:', oauthUrl)
      
      setMessage('Redirecting to LinkedIn...')
      // Open in new window for testing
      window.open(oauthUrl, '_blank')
      
      setStatus('success')
      setMessage('OAuth URL generated successfully! Check the new window for LinkedIn authorization.')
    } catch (error: any) {
      setStatus('error')
      setMessage(`Error: ${error.message}`)
    }
  }

  const testTokenExchange = async () => {
    if (!accessToken) {
      setStatus('error')
      setMessage('Please enter an access token first')
      return
    }

    setStatus('loading')
    setMessage('Testing access token...')

    try {
      const response = await fetch(`http://localhost:3001/api/linkedin/test/${accessToken}`)
      const data = await response.json()

      if (data.success) {
        setProfile(data.profile)
        setStatus('success')
        setMessage('Access token is valid! Profile data retrieved successfully.')
      } else {
        setStatus('error')
        setMessage(`Error: ${data.error}`)
      }
    } catch (error: any) {
      setStatus('error')
      setMessage(`Error: ${error.message}`)
    }
  }

  const simulateCallback = () => {
    // This simulates what happens in the OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    const error = urlParams.get('error')

    if (error) {
      setStatus('error')
      setMessage(`OAuth Error: ${error}`)
      return
    }

    if (code && state) {
      setStatus('loading')
      setMessage('Simulating token exchange...')
      
      exchangeCodeForToken('linkedin', code, state)
        .then((tokens) => {
          setAccessToken(tokens.access_token)
          setProfile(tokens.profile)
          setStatus('success')
          setMessage('Token exchange successful!')
        })
        .catch((error) => {
          setStatus('error')
          setMessage(`Token exchange failed: ${error.message}`)
        })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          LinkedIn OAuth Test
        </h1>

        {/* Status Display */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Test Status
          </h2>
          
          <div className={`p-4 rounded-md mb-4 ${
            status === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
            status === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
            status === 'loading' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200' :
            'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}>
            <div className="flex items-center">
              {status === 'loading' && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              )}
              {status === 'success' && (
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {status === 'error' && (
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-medium">{message || 'Ready to test'}</span>
            </div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Step 1: Generate OAuth URL
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This will generate a LinkedIn OAuth URL and open it in a new window.
            </p>
            <button
              onClick={testLinkedInAuth}
              disabled={status === 'loading'}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
            >
              {status === 'loading' ? 'Generating...' : 'Generate OAuth URL'}
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Step 2: Test Access Token
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Enter an access token to test the LinkedIn API connection.
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter access token..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={testTokenExchange}
                disabled={status === 'loading' || !accessToken}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
              >
                {status === 'loading' ? 'Testing...' : 'Test Token'}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Display */}
        {profile && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              LinkedIn Profile Data
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
              <pre className="text-sm text-gray-800 dark:text-gray-200">
                {JSON.stringify(profile, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-4">
            Testing Instructions
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700 dark:text-yellow-300">
            <li>Make sure your backend server is running on port 3001</li>
            <li>Click "Generate OAuth URL" to start the LinkedIn OAuth flow</li>
            <li>Complete the LinkedIn authorization in the new window</li>
            <li>Copy the access token from the callback URL or backend response</li>
            <li>Paste the access token and click "Test Token" to verify the connection</li>
            <li>Check the profile data to confirm everything is working</li>
          </ol>
        </div>

        {/* Environment Check */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
            Environment Check
          </h3>
          <div className="space-y-2 text-blue-700 dark:text-blue-300">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              LinkedIn Client ID: {import.meta.env.VITE_LINKEDIN_CLIENT_ID ? '✅ Set' : '❌ Missing'}
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Backend Server: <span id="backend-status">Checking...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
