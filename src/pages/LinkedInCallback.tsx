import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeLinkedInCode } from '../lib/linkedinOAuth'

export default function LinkedInCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleLinkedInCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          throw new Error(errorDescription || `LinkedIn OAuth error: ${error}`)
        }

        if (!code || !state) {
          throw new Error('Missing required OAuth parameters')
        }

        // Exchange code for tokens via backend
        const result = await exchangeLinkedInCode(code, state)
        localStorage.setItem('linkedin_access_token', result.access_token)
        localStorage.setItem('linkedin_expires_at', result.expires_at || '')

        // Use profile from the exchange result
        const userProfile = result.profile

        setStatus('success')
        setMessage(`Successfully connected to LinkedIn as ${userProfile.firstName} ${userProfile.lastName}! Redirecting...`)
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)

      } catch (error: any) {
        console.error('LinkedIn callback error:', error)
        setStatus('error')
        setMessage(error.message || 'Failed to connect to LinkedIn')
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/dashboard')
        }, 3000)
      }
    }

    handleLinkedInCallback()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connecting to LinkedIn...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we complete the connection.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Success!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {message}
            </p>
            <div className="animate-pulse text-sm text-gray-500 dark:text-gray-400">
              Redirecting to Dashboard...
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connection Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {message}
            </p>
            <div className="animate-pulse text-sm text-gray-500 dark:text-gray-400">
              Redirecting to Dashboard...
            </div>
          </>
        )}
      </div>
    </div>
  )
}
