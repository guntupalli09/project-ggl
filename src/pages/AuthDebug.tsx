import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getCurrentUser, isGuestUser } from '../lib/authUtils'

export default function AuthDebug() {
  const [authState, setAuthState] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check Supabase auth
        const { data: { user }, error } = await supabase.auth.getUser()
        
        // Check our custom auth utils
        const currentUser = await getCurrentUser()
        const guestStatus = isGuestUser()

        setAuthState({
          supabaseUser: user,
          supabaseError: error,
          currentUser: currentUser,
          isGuest: guestStatus,
          session: await supabase.auth.getSession()
        })
      } catch (error) {
        console.error('Auth check error:', error)
        setAuthState({ error: error.message })
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const loginAsGuest = async () => {
    try {
      // Simulate guest login
      const guestUser = {
        id: 'guest_' + Date.now(),
        email: 'guest@example.com',
        user_metadata: { name: 'Guest User' }
      }
      
      localStorage.setItem('guest_user', JSON.stringify(guestUser))
      window.location.reload()
    } catch (error) {
      console.error('Guest login error:', error)
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('guest_user')
      window.location.reload()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Authentication Debug
        </h1>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Current Authentication State
          </h2>
          
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md mb-4">
            <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-auto">
              {JSON.stringify(authState, null, 2)}
            </pre>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={loginAsGuest}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Login as Guest
            </button>
            
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          
          <div className="space-y-4">
            <a
              href="/login"
              className="block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-center"
            >
              Go to Login Page
            </a>
            
            <a
              href="/social-automation"
              className="block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-center"
            >
              Go to Social Automation
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
