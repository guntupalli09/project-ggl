import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { useOnboarding } from '../hooks/useOnboarding'

const AppStatus: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const { isCompleted, isLoading: onboardingLoading } = useOnboarding()

  if (process.env.NODE_ENV !== 'development') {
    return null // Only show in development
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div className="space-y-1">
        <div>Auth: {authLoading ? '⏳' : user ? '✅' : '❌'}</div>
        <div>User: {user?.email || 'None'}</div>
        <div>Onboarding: {onboardingLoading ? '⏳' : isCompleted ? '✅' : '❌'}</div>
        <div>Guest: {user?.isGuest ? 'Yes' : 'No'}</div>
      </div>
    </div>
  )
}

export default AppStatus

