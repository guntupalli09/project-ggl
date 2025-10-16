import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import Logo from '../components/Logo'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  ArrowRightIcon,
  SparklesIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  const generateGuestUUID = () => {
    // Generate a UUID v4 for guest users
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  const handleGuestLogin = async () => {
    setError('')
    setGuestLoading(true)

    try {
      // Create a mock guest user session with proper UUID
      const guestUser = {
        id: generateGuestUUID(),
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Modern Brand Header */}
        <div className="text-center">
          <div className="flex flex-col items-center space-y-6">
            {/* Enhanced Logo */}
            <Logo size="xl" showSparkle={true} />
            
            {/* Enhanced Branding */}
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                GetGetLeads
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">
                Lead to Booking Engine
              </p>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span>AI-Powered Lead Generation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Login Card */}
        <Card className="shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome back
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Sign in to your account to continue
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              
              {/* Password Input with Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="error" className="rounded-xl">
                  {error}
                </Alert>
              )}

              {/* Sign In Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                loading={loading}
                disabled={guestLoading}
                leftIcon={!loading && <ArrowRightIcon className="w-5 h-5" />}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 font-medium">or</span>
                </div>
              </div>

              {/* Guest Login Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                onClick={handleGuestLogin}
                loading={guestLoading}
                disabled={loading}
                leftIcon={!guestLoading && <SparklesIcon className="w-5 h-5" />}
              >
                {guestLoading ? 'Starting guest session...' : 'Continue as Guest'}
              </Button>

              {/* Sign Up Link */}
              <div className="text-center pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <a
                    href="/signup"
                    className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200"
                  >
                    Create one now
                  </a>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Trusted by businesses worldwide
          </p>
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-400 dark:text-gray-500">
            <div className="flex items-center space-x-1">
              <CheckCircleIcon className="w-3 h-3 text-green-500" />
              <span>AI-Powered</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircleIcon className="w-3 h-3 text-green-500" />
              <span>Secure</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircleIcon className="w-3 h-3 text-green-500" />
              <span>Fast Setup</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
