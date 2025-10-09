import React, { useState } from 'react'
import { getLinkedInSession } from '../lib/linkedinOAuth'
import { postToPlatform } from '../lib/socialOAuth'

const LinkedInTest: React.FC = () => {
  const [testContent, setTestContent] = useState('Testing LinkedIn posting from GGL app! 🚀')
  const [isPosting, setIsPosting] = useState(false)
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleTestPost = async () => {
    setIsPosting(true)
    setError('')
    setResult('')

    try {
      const session = getLinkedInSession()
      if (!session) {
        setError('No LinkedIn session found. Please connect LinkedIn first.')
        return
      }

      console.log('Testing LinkedIn posting with session:', session)
      
      const postResult = await postToPlatform('linkedin', session.accessToken, testContent)
      
      if (postResult.success) {
        setResult(`✅ Success! Post ID: ${postResult.postId}`)
      } else {
        setError(`❌ Failed: ${postResult.error}`)
      }
    } catch (err: any) {
      setError(`❌ Error: ${err.message}`)
      console.error('Test posting error:', err)
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          LinkedIn Posting Test
        </h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Test Real LinkedIn Posting
          </h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Post Content:
            </label>
            <textarea
              value={testContent}
              onChange={(e) => setTestContent(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              rows={4}
              placeholder="Enter your test post content..."
            />
          </div>
          
          <button
            onClick={handleTestPost}
            disabled={isPosting || !testContent.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200"
          >
            {isPosting ? 'Posting...' : 'Test Post to LinkedIn'}
          </button>
        </div>

        {result && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4 mb-4">
            <p className="text-green-800 dark:text-green-200">{result}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Debug Information:
          </h3>
          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
            • Check browser console for detailed logs<br/>
            • Make sure LinkedIn is connected with posting permissions<br/>
            • Verify your LinkedIn app has "Share on LinkedIn" product enabled<br/>
            • Check if the post appears on your LinkedIn profile
          </p>
        </div>
      </div>
    </div>
  )
}

export default LinkedInTest
