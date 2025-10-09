import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getCurrentUser } from '../lib/authUtils'
import { getOAuthUrl, refreshAccessToken, isTokenExpired, getPlatformDisplayName, getPlatformIcon } from '../lib/socialOAuth'
import { debugOAuth } from '../utils/debugOAuth'

interface SocialAccount {
  id: string
  platform: 'linkedin' | 'facebook' | 'instagram'
  access_token: string
  created_at: string
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

export default function SocialAccountManager() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)

  // Load user and connected accounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const currentUser = await getCurrentUser()
        setUser(currentUser)
        
        if (currentUser) {
          await loadConnectedAccounts(currentUser.id)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        setError('Failed to load account data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Load connected accounts from Supabase
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
              console.log(`Refreshing expired token for ${account.platform}`)
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

    setConnecting(platform)
    setError('')

    try {
      // Debug OAuth information
      if (platform === 'linkedin') {
        debugOAuth()
      }

      // Generate OAuth URL and redirect
      const oauthUrl = await getOAuthUrl(platform)
      console.log(`${platform} OAuth URL:`, oauthUrl)
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
        throw error
      }

      // Reload accounts
      if (user) {
        await loadConnectedAccounts(user.id)
      }
    } catch (error: any) {
      console.error('Error disconnecting account:', error)
      setError(`Failed to disconnect account: ${error.message}`)
    }
  }

  // Check if platform is already connected
  const isConnected = (platform: 'linkedin' | 'facebook' | 'instagram') => {
    return accounts.some(account => account.platform === platform)
  }

  // Get connected account for platform
  const getConnectedAccount = (platform: 'linkedin' | 'facebook' | 'instagram') => {
    return accounts.find(account => account.platform === platform)
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Connected Accounts</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Connect your social media accounts to start automating your posts
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Connect Buttons */}
      <div className="mb-8">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Connect New Account</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(PLATFORM_CONFIG).map(([platform, config]) => {
            const isAccountConnected = isConnected(platform as 'linkedin' | 'facebook' | 'instagram')
            const isConnecting = connecting === platform
            
            return (
              <button
                key={platform}
                onClick={() => handleConnect(platform as 'linkedin' | 'facebook' | 'instagram')}
                disabled={isAccountConnected || isConnecting}
                className={`relative p-4 rounded-lg border-2 border-dashed transition-all duration-200 ${
                  isAccountConnected
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 cursor-not-allowed'
                    : isConnecting
                    ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 cursor-not-allowed'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">{config.icon}</div>
                  <div className={`text-sm font-medium ${
                    isAccountConnected ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'
                  }`}>
                    {isAccountConnected ? 'Connected' : isConnecting ? 'Connecting...' : `Connect ${config.name}`}
                  </div>
                  {isConnecting && (
                    <div className="mt-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mx-auto"></div>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Connected Accounts List */}
      {accounts.length > 0 ? (
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Your Connected Accounts</h4>
          <div className="space-y-3">
            {accounts.map((account) => {
              const config = PLATFORM_CONFIG[account.platform]
              const connectionDate = new Date(account.created_at).toLocaleDateString()
              
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${config.color} rounded-full flex items-center justify-center text-white text-lg`}>
                      {config.icon}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{config.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Connected on {connectionDate}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      Active
                    </span>
                    <button
                      onClick={() => handleDisconnect(account.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">🔗</div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Connected Accounts</h4>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your social media accounts to start automating your posts
          </p>
        </div>
      )}
    </div>
  )
}
