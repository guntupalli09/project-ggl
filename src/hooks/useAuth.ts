import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { isGuestUser, getGuestUser, clearGuestSession } from '../lib/authUtils'

interface User {
  id: string
  email?: string
  isGuest: boolean
  user_metadata?: any
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    
    const getInitialUser = async () => {
      try {
        // Check if user is authenticated with Supabase
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()
        
        if (!isMounted) return
        
        console.log('🔍 useAuth: User check:', { authenticated: !!supabaseUser, error: error?.message })
        
        if (supabaseUser && !error) {
          console.log('✅ useAuth: Found authenticated user:', supabaseUser.email)
          setUser({ ...supabaseUser, isGuest: false })
          setLoading(false)
          return
        }
        
        // Check if user is a guest
        if (isGuestUser()) {
          const guestUser = getGuestUser()
          if (guestUser) {
            setUser({ ...guestUser, isGuest: true })
            setLoading(false)
            return
          }
        }
        setUser(null)
        setLoading(false)
      } catch (error) {
        if (!isMounted) return
        console.error('Error getting user:', error)
        setUser(null)
        setLoading(false)
      }
    }

    getInitialUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      
      console.log('🔄 useAuth: Auth change:', { event, hasUser: !!session?.user })
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ useAuth: User signed in via auth state change')
        setUser({ ...session.user, isGuest: false })
        // Clear guest session when signing in
        clearGuestSession()
      } else if (event === 'SIGNED_OUT') {
        console.log('❌ useAuth: User signed out')
        setUser(null)
        clearGuestSession()
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      if (user?.isGuest) {
        // Clear guest session
        clearGuestSession()
        setUser(null)
      } else {
        // Sign out from Supabase
        await supabase.auth.signOut()
        setUser(null)
      }
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user
  }
}
