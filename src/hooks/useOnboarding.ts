import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabaseClient'

interface OnboardingStatus {
  isCompleted: boolean
  isLoading: boolean
  error: string | null
}

export const useOnboarding = (): OnboardingStatus => {
  const { user, loading: authLoading } = useAuth()
  const [isCompleted, setIsCompleted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      console.log('📝 useOnboarding: Effect triggered', { user: !!user, user_id: user?.id, authLoading })
      
      // Wait for auth to finish loading
      if (authLoading) {
        console.log('📝 useOnboarding: Auth still loading, waiting...')
        return
      }
      
      if (!user) {
        console.log('📝 useOnboarding: No user, skipping onboarding check')
        setIsCompleted(false)
        setIsLoading(false)
        return
      }

      console.log('📝 useOnboarding: Checking onboarding status for user:', user.id)
      setIsLoading(true)

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('niche_template_id')
          .eq('user_id', user.id)
          .single()

        console.log('📝 useOnboarding: Database query result:', { data, error })

        if (error) {
          if (error.code === 'PGRST116') {
            // No user settings found, onboarding not completed
            console.log('📝 useOnboarding: No user settings found, onboarding not completed')
            setIsCompleted(false)
          } else if (error.code === 'PGRST301' || error.message?.includes('406')) {
            // RLS policy issue or permission denied - treat as not onboarded
            console.log('📝 useOnboarding: RLS/permission error, treating as not onboarded:', error.message)
            setIsCompleted(false)
          } else {
            console.log('📝 useOnboarding: Database error:', error)
            // For other errors, also treat as not onboarded to avoid blocking the user
            setIsCompleted(false)
          }
        } else {
          // Check if niche_template_id is set
          const hasNicheTemplate = !!data?.niche_template_id
          console.log('📝 useOnboarding: Niche template check:', { 
            niche_template_id: data?.niche_template_id, 
            hasNicheTemplate,
            fullData: data 
          })
          console.log('📝 useOnboarding: Setting isCompleted to:', hasNicheTemplate)
          setIsCompleted(hasNicheTemplate)
        }
      } catch (err) {
        console.error('📝 useOnboarding: Error checking onboarding status:', err)
        setError(err instanceof Error ? err.message : 'Failed to check onboarding status')
        setIsCompleted(false)
      } finally {
        console.log('📝 useOnboarding: Setting loading to false')
        setIsLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [user, authLoading])

  return { isCompleted, isLoading, error }
}
