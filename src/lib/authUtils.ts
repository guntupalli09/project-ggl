// Utility functions for authentication and guest mode
import { supabase } from './supabaseClient'

export const isGuestUser = (): boolean => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('is_guest') === 'true'
}

export const getGuestUser = () => {
  if (typeof window === 'undefined') return null
  const guestSession = localStorage.getItem('guest_session')
  return guestSession ? JSON.parse(guestSession) : null
}

export const clearGuestSession = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('is_guest')
  localStorage.removeItem('guest_session')
}

export const getCurrentUser = async () => {
  // Check if user is authenticated with Supabase
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    return { ...user, isGuest: false }
  }
  
  // Check if user is a guest
  if (isGuestUser()) {
    const guestUser = getGuestUser()
    return guestUser ? { ...guestUser, isGuest: true } : null
  }
  
  return null
}
