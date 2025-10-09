import { useState } from 'react'
import { getOAuthUrl } from '../lib/socialOAuth'
import { debugOAuth } from '../utils/debugOAuth'

export default function OAuthTest() {
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const runDebug = () => {
    const info = debugOAuth()
    setDebugInfo(info)
  }

  const testLinkedInOAuth = async () => {
    try {
      const oauthUrl = await getOAuthUrl('linkedin')
      console.log('LinkedIn OAuth URL:', oauthUrl)
      alert(`LinkedIn OAuth URL:\n${oauthUrl}\n\nCheck console for full details.`)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          OAuth Debug Tool
        </h1>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Debug Information
          </h2>
          
          <button
            onClick={runDebug}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md mb-4"
          >
            Run Debug
          </button>

          {debugInfo && (
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md">
              <h3 className="font-semibold mb-2">Current Configuration:</h3>
              <pre className="text-sm text-gray-800 dark:text-gray-200">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            LinkedIn OAuth Test
          </h2>
          
          <button
            onClick={testLinkedInOAuth}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md mb-4"
          >
            Generate LinkedIn OAuth URL
          </button>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>This will generate the LinkedIn OAuth URL and show it in an alert.</p>
            <p>Check the browser console for detailed information.</p>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Instructions for LinkedIn Setup
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700 dark:text-yellow-300">
            <li>Run the debug tool above to see the exact redirect URI</li>
            <li>Go to <a href="https://www.linkedin.com/developers/" target="_blank" rel="noopener noreferrer" className="underline">LinkedIn Developer Portal</a></li>
            <li>Select your app and go to "Auth" tab</li>
            <li>In "OAuth 2.0 settings", click the pencil icon next to "Authorized redirect URLs"</li>
            <li>Add the exact redirect URI shown in the debug output</li>
            <li>Click "Update" to save</li>
            <li>Try the OAuth connection again</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
