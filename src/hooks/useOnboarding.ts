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
          .select('niche_template_id, business_name, business_slug')
          .eq('user_id', user.id)
          .maybeSingle()

        console.log('📝 useOnboarding: Database query result:', { data, error })

        if (error) {
          if (error.code === 'PGRST116') {
            // No user settings found, onboarding not completed
            console.log('📝 useOnboarding: No user settings found, onboarding not completed')
            setIsCompleted(false)
          } else if (error.code === 'PGRST301' || error.message?.includes('406') || error.code === 'PGRST301') {
            // RLS policy issue, permission denied, or column doesn't exist - treat as not onboarded
            console.log('📝 useOnboarding: Database error, treating as not onboarded:', error.message)
            setIsCompleted(false)
          } else {
            console.log('📝 useOnboarding: Database error:', error)
            // For other errors, also treat as not onboarded to avoid blocking the user
            setIsCompleted(false)
          }
        } else {
          // Check if user has completed basic onboarding (has business info or niche template)
          const hasBasicInfo = data?.business_name && data?.business_slug
          const hasNicheTemplate = !!data?.niche_template_id
          const isOnboarded = hasBasicInfo || hasNicheTemplate
          
          console.log('📝 useOnboarding: Onboarding check:', { 
            business_name: data?.business_name,
            business_slug: data?.business_slug,
            niche_template_id: data?.niche_template_id, 
            hasBasicInfo,
            hasNicheTemplate,
            isOnboarded,
            fullData: data 
          })
          console.log('📝 useOnboarding: Setting isCompleted to:', isOnboarded)
          setIsCompleted(isOnboarded)
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
