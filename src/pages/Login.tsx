import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('🔐 Login: Attempting to sign in with:', { email })
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('🔐 Login: Sign in result:', { data, error })

      if (error) {
        console.log('❌ Login: Sign in error:', error.message)
        setError(error.message)
      } else {
        console.log('✅ Login: Sign in successful, navigating to dashboard')
        navigate('/dashboard')
      }
    } catch (err) {
      console.log('❌ Login: Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setError('')
    setGuestLoading(true)

    try {
      // Create a mock guest user session
      const guestUser = {
        id: 'guest-' + Date.now(),
        email: 'guest@example.com',
        user_metadata: {
          is_guest: true,
          name: 'Guest User'
        }
      }

      // Store guest session in localStorage
      localStorage.setItem('guest_session', JSON.stringify(guestUser))
      localStorage.setItem('is_guest', 'true')

      // Navigate to dashboard
      navigate('/dashboard')
    } catch (err) {
      setError('Failed to start guest session')
      setGuestLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <img 
                src="/logo.svg" 
                alt="GGL Logo" 
                className="w-10 h-10"
                onError={(e) => {
                  // Fallback to a simple icon if logo doesn't load
                  e.currentTarget.style.display = 'none'
                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                  if (nextElement) {
                    nextElement.style.display = 'block'
                  }
                }}
              />
              <svg 
                className="w-10 h-10 text-white hidden" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-indigo-600">GGL</h1>
              <p className="text-sm text-gray-600 font-medium">a lead generator</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Sign in to your account</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
                type="email"
                label="Email address"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              
              <Input
                type="password"
                label="Password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              {error && (
                <Alert variant="error">
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={guestLoading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGuestLogin}
                loading={guestLoading}
                disabled={loading}
              >
                {guestLoading ? 'Starting guest session...' : 'Continue as Guest'}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <a
                    href="/signup"
                    className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Sign up
                  </a>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
