import { useState } from 'react'

export default function SimpleOAuthTest() {
  const [clientId, setClientId] = useState('')
  const [oauthUrl, setOauthUrl] = useState('')

  const generateOAuthUrl = () => {
    const redirectUri = 'http://localhost:5173/oauth/linkedin/callback'
    const scope = 'r_liteprofile r_emailaddress w_member_social'
    const state = `linkedin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      response_type: 'code',
      state: state
    })

    const url = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
    setOauthUrl(url)
    
    console.log('Generated OAuth URL:', url)
    console.log('Client ID:', clientId)
    console.log('Redirect URI:', redirectUri)
  }

  const testOAuth = () => {
    if (oauthUrl) {
      window.open(oauthUrl, '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Simple LinkedIn OAuth Test
        </h1>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Enter Your LinkedIn Client ID
          </h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              LinkedIn Client ID:
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Enter your LinkedIn Client ID"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <button
            onClick={generateOAuthUrl}
            disabled={!clientId}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md mr-4"
          >
            Generate OAuth URL
          </button>

          <button
            onClick={testOAuth}
            disabled={!oauthUrl}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md"
          >
            Test OAuth
          </button>
        </div>

        {oauthUrl && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Generated OAuth URL:
            </h3>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md">
              <code className="text-sm text-gray-800 dark:text-gray-200 break-all">
                {oauthUrl}
              </code>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Click "Test OAuth" to open this URL in a new tab and test the LinkedIn OAuth flow.
            </p>
          </div>
        )}

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Troubleshooting Steps:
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700 dark:text-yellow-300">
            <li>Get your Client ID from LinkedIn Developer Console</li>
            <li>Make sure your redirect URI is: <code>http://localhost:5173/oauth/linkedin/callback</code></li>
            <li>Ensure your LinkedIn app is active and approved</li>
            <li>Check that you have the required scopes enabled</li>
            <li>Test the OAuth URL in a new tab</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
