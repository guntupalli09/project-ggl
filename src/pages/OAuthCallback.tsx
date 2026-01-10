import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getCurrentUser } from '../lib/authUtils'
import { exchangeCodeForToken, verifyState } from '../lib/socialOAuth'

export default function OAuthCallback() {
  const { platform } = useParams<{ platform: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          throw new Error(errorDescription || `OAuth error: ${error}`)
        }

        if (!code || !state || !platform) {
          throw new Error('Missing required OAuth parameters')
        }

        // Verify state parameter for CSRF protection
        if (!verifyState(platform, state)) {
          throw new Error('Invalid state parameter')
        }

        // Get current user
        const user = await getCurrentUser()
        if (!user) {
          throw new Error('User not authenticated')
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForToken(platform, code, state)

        // Save tokens to database
        const { error: dbError } = await supabase
          .from('social_accounts')
          .upsert({
            user_id: user.id,
            platform: platform,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_at
          })

        if (dbError) {
          throw new Error(`Database error: ${dbError.message}`)
        }

        setStatus('success')
        setMessage(`Successfully connected to ${platform}! Redirecting...`)
        
        // Redirect to social automation page after 2 seconds
        setTimeout(() => {
          navigate('/social-automation')
        }, 2000)

      } catch (error: any) {
        console.error('OAuth callback error:', error)
        setStatus('error')
        setMessage(error.message || 'Failed to connect account')
        
        // Redirect to social automation page after 3 seconds
        setTimeout(() => {
          navigate('/social-automation')
        }, 3000)
      }
    }

    handleOAuthCallback()
  }, [platform, searchParams, navigate])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connecting to {platform}...
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
              Redirecting to Social Automation...
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
              Redirecting to Social Automation...
            </div>
          </>
        )}
      </div>
    </div>
  )
}
