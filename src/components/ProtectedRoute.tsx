import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOnboarding } from '../hooks/useOnboarding'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth()
  const { isCompleted, isLoading: onboardingLoading } = useOnboarding()

  console.log('🔒 ProtectedRoute: Auth state:', { 
    user: !!user, 
    user_id: user?.id, 
    authLoading, 
    isCompleted, 
    onboardingLoading 
  })

  // Show loading spinner while checking auth and onboarding status
  if (authLoading || onboardingLoading) {
    console.log('⏳ ProtectedRoute: Loading...')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('❌ ProtectedRoute: No user, redirecting to login', { user, authLoading, onboardingLoading })
    return <Navigate to="/login" replace />
  }

  // Temporarily skip onboarding check to avoid loop
  // TODO: Re-enable this once database RLS issues are resolved
  // if (!isCompleted) {
  //   console.log('📝 ProtectedRoute: Onboarding not completed, redirecting to onboarding', { isCompleted, onboardingLoading })
  //   return <Navigate to="/onboarding" replace />
  // }

  // User is authenticated (onboarding check temporarily disabled)
  console.log('✅ ProtectedRoute: User authenticated, rendering children (onboarding check disabled)')
  return <>{children}</>
}

export default ProtectedRoute
