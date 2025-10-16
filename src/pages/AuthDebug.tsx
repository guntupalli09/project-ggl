import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'

export default function AuthDebug() {
  const { user, loading } = useAuth()
  const [authState, setAuthState] = useState<any>(null)
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        setAuthState({
          user: currentUser,
          userError: userError?.message,
          session: currentSession,
          sessionError: sessionError?.message
        })
        setSession(currentSession)
      } catch (err) {
        console.error('Auth debug error:', err)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', { event, session: !!session })
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const testLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      })
      console.log('Test login result:', { data, error })
    } catch (err) {
      console.error('Test login error:', err)
    }
  }

  const generateGuestUUID = () => {
    // Generate a UUID v4 for guest users
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  const testGuestLogin = async () => {
    try {
      // Simulate guest login by setting a guest user in localStorage
      const guestUser = {
        id: generateGuestUUID(),
        email: 'guest@example.com',
        isGuest: true
      }
      localStorage.setItem('guest_user', JSON.stringify(guestUser))
      window.location.reload()
    } catch (err) {
      console.error('Guest login error:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Debug</h1>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">useAuth Hook State</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({ user, loading }, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Supabase Auth State</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(authState, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Current Session</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
            <div className="space-y-2">
              <p><strong>VITE_SUPABASE_URL:</strong> {import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Not set'}</p>
              <p><strong>VITE_SUPABASE_ANON_KEY:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
            <div className="space-x-4">
              <button 
                onClick={testLogin}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Test Login (will fail)
              </button>
              <button 
                onClick={testGuestLogin}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Test Guest Login
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              <strong>Note:</strong> Test login will fail because the test user doesn't exist. 
              Try creating a real account or use guest mode.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
