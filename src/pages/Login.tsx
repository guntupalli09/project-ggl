import { useState, useEffect } from 'react'
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
  CheckCircleIcon,
  ShieldCheckIcon,
  BoltIcon,
  RocketLaunchIcon,
  StarIcon
} from '@heroicons/react/24/outline'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setIsAnimating(true)
  }, [])

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
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900">
        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl transition-all duration-1000 ${isAnimating ? 'translate-x-20 translate-y-20' : ''}`}></div>
          <div className={`absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl transition-all duration-1000 delay-300 ${isAnimating ? '-translate-x-20 -translate-y-20' : ''}`}></div>
          <div className={`absolute top-1/2 left-1/2 w-60 h-60 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl transition-all duration-1000 delay-500 ${isAnimating ? 'translate-x-10 translate-y-10' : ''}`}></div>
        </div>
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        ></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Hero Section */}
          <div className={`text-center transition-all duration-1000 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="flex flex-col items-center space-y-6">
              {/* Animated Logo */}
              <div className={`relative transition-all duration-1000 delay-200 ${isAnimating ? 'scale-100 rotate-0' : 'scale-75 rotate-12'}`}>
                <Logo size="xl" showSparkle={true} />
                <div className="absolute -inset-4 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-full blur-xl animate-pulse"></div>
              </div>
              
              {/* Brand Identity */}
              <div className="space-y-3">
                <h1 className="text-5xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-pulse">
                  GetGetLeads
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 font-semibold">
                  The Complete Lead-to-Booking Platform
                </p>
                <div className="flex items-center justify-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
                    <BoltIcon className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 dark:text-green-400 font-medium">AI-Powered</span>
                  </div>
                  <div className="flex items-center space-x-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                    <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-700 dark:text-blue-400 font-medium">Secure</span>
                  </div>
                  <div className="flex items-center space-x-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                    <RocketLaunchIcon className="w-4 h-4 text-purple-600" />
                    <span className="text-purple-700 dark:text-purple-400 font-medium">Fast</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Login Card */}
          <div className={`transition-all duration-1000 delay-300 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <Card className="shadow-2xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl">
              <CardHeader className="text-center pb-6 pt-8">
                <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome back! 👋
                </CardTitle>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Sign in to continue your lead generation journey
                </p>
              </CardHeader>
              
              <CardContent className="px-8 pb-8">
                <form className="space-y-6" onSubmit={handleSubmit}>
                  {/* Email Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                      <span>Email address</span>
                      <StarIcon className="w-3 h-3 text-red-500" />
                    </label>
                    <div className="relative group">
                      <input
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="w-full px-4 py-4 border-2 border-gray-200 dark:border-gray-600 rounded-2xl bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 group-hover:border-indigo-300 dark:group-hover:border-indigo-500"
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  </div>
                  
                  {/* Password Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                      <span>Password</span>
                      <StarIcon className="w-3 h-3 text-red-500" />
                    </label>
                    <div className="relative group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="w-full px-4 py-4 pr-12 border-2 border-gray-200 dark:border-gray-600 rounded-2xl bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 group-hover:border-indigo-300 dark:group-hover:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200 p-1"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="w-5 h-5" />
                        ) : (
                          <EyeIcon className="w-5 h-5" />
                        )}
                      </button>
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <Alert variant="error" className="rounded-2xl border-2 border-red-200 dark:border-red-800">
                        {error}
                      </Alert>
                    </div>
                  )}

                  {/* Sign In Button */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-700 hover:via-purple-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group"
                    loading={loading}
                    disabled={guestLoading}
                    leftIcon={!loading && <ArrowRightIcon className="w-5 h-5" />}
                  >
                    <span className="relative z-10">
                      {loading ? 'Signing in...' : 'Sign in to GetGetLeads'}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Button>

                  {/* Divider */}
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t-2 border-gray-200 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-6 bg-white dark:bg-gray-800 text-gray-500 font-bold text-lg">or</span>
                    </div>
                  </div>

                  {/* Guest Login Button */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-2 border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 text-gray-700 dark:text-gray-300 font-bold py-4 px-6 rounded-2xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/20 dark:hover:to-purple-900/20 transition-all duration-300 transform hover:scale-[1.02] group"
                    onClick={handleGuestLogin}
                    loading={guestLoading}
                    disabled={loading}
                    leftIcon={!guestLoading && <SparklesIcon className="w-5 h-5" />}
                  >
                    <span className="flex items-center space-x-2">
                      <span>{guestLoading ? 'Starting guest session...' : 'Continue as Guest'}</span>
                      <span className="text-xs bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent font-bold">
                        (Try for free)
                      </span>
                    </span>
                  </Button>

                  {/* Sign Up Link */}
                  <div className="text-center pt-6">
                    <p className="text-gray-600 dark:text-gray-400">
                      New to GetGetLeads?{' '}
                      <a
                        href="/signup"
                        className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200 hover:underline"
                      >
                        Create your account
                      </a>
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Trust Indicators */}
          <div className={`text-center space-y-6 transition-all duration-1000 delay-500 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">99.9% Uptime</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-medium">SOC 2 Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="font-medium">24/7 Support</span>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Trusted by 10,000+ businesses worldwide
              </p>
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 dark:text-gray-500">
                <div className="flex items-center space-x-1">
                  <CheckCircleIcon className="w-3 h-3 text-green-500" />
                  <span>AI-Powered Lead Generation</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircleIcon className="w-3 h-3 text-green-500" />
                  <span>Email & Social Automation</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircleIcon className="w-3 h-3 text-green-500" />
                  <span>Smart Calendar Integration</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
