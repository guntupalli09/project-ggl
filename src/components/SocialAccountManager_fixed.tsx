import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getCurrentUser } from '../lib/authUtils'
import { getOAuthUrl, refreshAccessToken, isTokenExpired } from '../lib/socialOAuth'
import { getLinkedInSession, isLinkedInConnected, clearLinkedInSession } from '../lib/linkedinOAuth'

interface SocialAccount {
  id: string
  platform: 'linkedin' | 'facebook' | 'instagram'
  access_token: string
  created_at: string
}

interface SocialAccountManagerProps {
  onAccountUpdate?: () => void
}

const PLATFORM_CONFIG = {
  linkedin: {
    name: 'LinkedIn',
    icon: '💼',
    color: 'bg-blue-600'
  },
  facebook: {
    name: 'Facebook',
    icon: '📘',
    color: 'bg-blue-700'
  },
  instagram: {
    name: 'Instagram',
    icon: '📷',
    color: 'bg-pink-600'
  }
}

export default function SocialAccountManager({ onAccountUpdate }: SocialAccountManagerProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [linkedinProfile, setLinkedinProfile] = useState<any>(null)

  // Load user and connected accounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const currentUser = await getCurrentUser()
        setUser(currentUser)
        
        // Load LinkedIn profile if connected
        if (isLinkedInConnected()) {
          const session = getLinkedInSession()
          if (session && session.profile) {
            setLinkedinProfile(session.profile)
          }
        }
        
        if (currentUser) {
          await loadConnectedAccounts(currentUser.id)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Monitor LinkedIn connection status changes
  useEffect(() => {
    const checkLinkedInStatus = () => {
      const isLinkedInActive = isLinkedInConnected()
      if (!isLinkedInActive && linkedinProfile) {
        setLinkedinProfile(null)
      }
    }

    // Check immediately
    checkLinkedInStatus()

    // Set up interval to check periodically
    const interval = setInterval(checkLinkedInStatus, 1000)

    return () => clearInterval(interval)
  }, [linkedinProfile])

  const loadConnectedAccounts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading accounts:', error)
        return
      }

      // Check for expired tokens and refresh if needed
      const accountsWithRefreshedTokens = await Promise.all(
        (data || []).map(async (account) => {
          if (account.expires_at && isTokenExpired(account.expires_at)) {
            try {
              const newTokens = await refreshAccessToken(account.platform, account.refresh_token || '')
              
              // Update token in database
              const { error: updateError } = await supabase
                .from('social_accounts')
                .update({
                  access_token: newTokens.access_token,
                  refresh_token: newTokens.refresh_token,
                  expires_at: newTokens.expires_at
                })
                .eq('id', account.id)

              if (updateError) {
                console.error(`Error updating refreshed token for ${account.platform}:`, updateError)
                return account
              }

              return {
                ...account,
                access_token: newTokens.access_token,
                refresh_token: newTokens.refresh_token,
                expires_at: newTokens.expires_at
              }
            } catch (refreshError) {
              console.error(`Error refreshing token for ${account.platform}:`, refreshError)
              return account
            }
          }
          return account
        })
      )

      setAccounts(accountsWithRefreshedTokens)
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  // Start OAuth connection
  const handleConnect = async (platform: 'linkedin' | 'facebook' | 'instagram') => {
    if (!user) {
      setError('User not found')
      return
    }

    // Check if already connected
    if (isConnected(platform)) {
      setError(`${PLATFORM_CONFIG[platform].name} is already connected`)
      return
    }

    setConnecting(platform)
    setError('')

    try {
      // Generate OAuth URL and redirect
      const oauthUrl = await getOAuthUrl(platform)
      window.location.href = oauthUrl
    } catch (error: any) {
      console.error('Error starting OAuth:', error)
      setError(`Failed to start ${PLATFORM_CONFIG[platform].name} connection: ${error.message}`)
      setConnecting(null)
    }
  }

  // Disconnect account
  const handleDisconnect = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('social_accounts')
        .delete()
        .eq('id', accountId)

      if (error) {
        console.error('Error disconnecting account:', error)
        return
      }

      // Reload accounts
      if (user) {
        await loadConnectedAccounts(user.id)
      }

      // Notify parent component
      if (onAccountUpdate) {
        onAccountUpdate()
      }
    } catch (error: any) {
      console.error('Error disconnecting account:', error)
    }
  }

  // Disconnect LinkedIn (localStorage-based)
  const handleDisconnectLinkedIn = () => {
    try {
      // Use the centralized clearLinkedInSession function
      clearLinkedInSession()
      
      // Clear profile state
      setLinkedinProfile(null)
      
      // Force a re-render by updating a dummy state
      setAccounts(prev => [...prev])
      
      // Force a complete re-render by updating loading state
      setLoading(true)
      setTimeout(() => setLoading(false), 100)
      
      // Notify parent component
      if (onAccountUpdate) {
        onAccountUpdate()
      }
    } catch (error: any) {
      console.error('Error disconnecting LinkedIn:', error)
      setError(`Failed to disconnect LinkedIn: ${error.message}`)
    }
  }

  // Check if platform is already connected
  const isConnected = (platform: 'linkedin' | 'facebook' | 'instagram') => {
    // Check Supabase accounts
    const supabaseConnected = accounts.some(account => account.platform === platform)
    
    // Check LinkedIn connection using centralized function
    if (platform === 'linkedin') {
      const linkedinConnected = isLinkedInConnected()
      if (linkedinConnected) {
        // Update LinkedIn profile if we have a session but no profile loaded
        if (!linkedinProfile) {
          const session = getLinkedInSession()
          if (session && session.profile) {
            setLinkedinProfile(session.profile)
          }
        }
        return true
      }
      return false
    }
    
    return supabaseConnected
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Connected Accounts
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage your social media account connections
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(PLATFORM_CONFIG).map(([platform, config]) => {
          const connected = isConnected(platform as 'linkedin' | 'facebook' | 'instagram')
          const isConnecting = connecting === platform

          return (
            <div
              key={platform}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">{config.icon}</span>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {config.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {connected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {connected ? (
                  <button
                    onClick={() => {
                      if (platform === 'linkedin') {
                        handleDisconnectLinkedIn()
                      } else {
                        const account = accounts.find(acc => acc.platform === platform)
                        if (account) {
                          handleDisconnect(account.id)
                        }
                      }
                    }}
                    className="px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/20 rounded-md hover:bg-red-200 dark:hover:bg-red-900/30"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(platform as 'linkedin' | 'facebook' | 'instagram')}
                    disabled={isConnecting}
                    className={`px-3 py-1 text-xs font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${config.color} hover:opacity-90`}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {accounts.length === 0 && !isLinkedInConnected() ? (
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">🔗</div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Connected Accounts</h4>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your social media accounts to start automating your posts
          </p>
        </div>
      ) : null}
    </div>
  )
}
