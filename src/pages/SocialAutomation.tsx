import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getCurrentUser } from '../lib/authUtils'
import SocialAccountManager from '../components/SocialAccountManager'
import AISocialPostGenerator from '../components/AISocialPostGenerator'
import ResponsivePageWrapper from '../components/ResponsivePageWrapper'
import ResponsiveGrid from '../components/ResponsiveGrid'

// Connected Accounts component with shared state
const ConnectedAccounts = ({ onAccountUpdate }: { onAccountUpdate: () => void }) => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Social Media Accounts</h3>
      <SocialAccountManager onAccountUpdate={onAccountUpdate} />
    </div>
  </div>
)

const CreatePost = () => <AISocialPostGenerator />

const UpcomingPosts = () => (
  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Upcoming Posts</h3>
    <p className="text-gray-600 dark:text-gray-400">View and manage your scheduled posts</p>
    <div className="mt-4 space-y-3">
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">LinkedIn • Tomorrow at 9:00 AM</p>
            <p className="text-gray-900 dark:text-white mt-1">Check out our latest product launch! #innovation</p>
          </div>
          <button className="text-red-600 hover:text-red-700 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  </div>
)

const PostHistory = () => (
  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Post History</h3>
    <p className="text-gray-600 dark:text-gray-400">View your published posts and analytics</p>
    <div className="mt-4 space-y-3">
      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">LinkedIn • Published 2 hours ago</p>
            <p className="text-gray-900 dark:text-white mt-1">Excited to share our company milestone! 🎉</p>
            <div className="flex space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span>👍 12 likes</span>
              <span>💬 3 comments</span>
              <span>🔄 2 shares</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)

export default function SocialAutomation() {
  const [activeTab, setActiveTab] = useState('accounts')
  const [loading, setLoading] = useState(true)
  const [connectedAccounts] = useState<any[]>([])
  const [scheduledPosts] = useState<any[]>([])
  const [publishedPosts] = useState<any[]>([])

  // Handle LinkedIn OAuth callback
  useEffect(() => {
    const handleLinkedInCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const linkedinSuccess = urlParams.get('linkedin_success')
      const linkedinError = urlParams.get('linkedin_error')
      const profile = urlParams.get('profile')
      const token = urlParams.get('token')

      if (linkedinSuccess && profile && token) {
        try {
          const currentUser = await getCurrentUser()
          if (!currentUser) {
            console.error('No user found for LinkedIn connection')
            return
          }

          const profileData = JSON.parse(decodeURIComponent(profile))
          
          console.log('🔍 LinkedIn Profile Data:', profileData)
          
          // Save LinkedIn account to database with profile info
          const { error } = await supabase
            .from('social_accounts')
            .upsert({
              user_id: currentUser.id,
              platform: 'linkedin',
              access_token: token,
              platform_user_id: profileData.id,
              platform_username: `${profileData.firstName} ${profileData.lastName}`,
              profile_picture_url: profileData.profilePictureUrl || null,
              expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days from now
            }, {
              onConflict: 'user_id,platform'
            })

          if (error) {
            console.error('❌ Error saving LinkedIn account:', error)
          } else {
            console.log('✅ LinkedIn account connected successfully!')
            console.log('📊 Profile saved:', {
              name: `${profileData.firstName} ${profileData.lastName}`,
              id: profileData.id,
              picture: profileData.profilePictureUrl
            })
            // Refresh the page to show updated connection status
            window.location.href = '/social-automation'
          }
        } catch (error) {
          console.error('Error handling LinkedIn callback:', error)
        }
      } else if (linkedinError) {
        console.error('LinkedIn OAuth error occurred')
      }
    }

    handleLinkedInCallback()
  }, [])

  // Load user data and stats
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        // const currentUser = await getCurrentUser()
        // setUser(currentUser)
        
        // Load connected accounts
        // await loadConnectedAccounts()
        
        // Load scheduled posts
        // await loadScheduledPosts()
        
        // Load published posts
        // await loadPublishedPosts()
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Handle account updates
  const handleAccountUpdate = () => {
    // Refresh all data when accounts are updated
    loadConnectedAccounts()
    loadScheduledPosts()
    loadPublishedPosts()
  }

  // Load connected accounts
  const loadConnectedAccounts = async () => {
    // Implementation will be added
  }

  // Load scheduled posts
  const loadScheduledPosts = async () => {
    // Implementation will be added
  }

  // Load published posts
  const loadPublishedPosts = async () => {
    // Implementation will be added
  }

  const tabs = [
    { id: 'accounts', name: 'Connected Accounts', icon: '🔗' },
    { id: 'create', name: 'Create Post', icon: '✍️' },
    { id: 'upcoming', name: 'Upcoming Posts', icon: '📅' },
    { id: 'history', name: 'Post History', icon: '📊' }
  ]

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'accounts':
        return <ConnectedAccounts onAccountUpdate={handleAccountUpdate} />
      case 'create':
        return <CreatePost />
      case 'upcoming':
        return <UpcomingPosts />
      case 'history':
        return <PostHistory />
      default:
        return <ConnectedAccounts onAccountUpdate={handleAccountUpdate} />
    }
  }

  if (loading) {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsivePageWrapper 
      title="Social Media" 
      description="Manage your social media presence with automated posting and scheduling"
    >


        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex overflow-x-auto" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-4 sm:px-6 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <ResponsiveGrid cols={{ default: 1, lg: 3 }} gap="md">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {renderActiveTab()}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Connected Accounts</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{connectedAccounts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Scheduled Posts</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{scheduledPosts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Published This Week</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{publishedPosts.length}</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tips</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">1</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Connect multiple platforms to reach a wider audience
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400 text-sm font-medium">2</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Schedule posts during peak engagement hours
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 dark:text-purple-400 text-sm font-medium">3</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use hashtags strategically to increase reach
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  No recent activity
                </div>
              </div>
            </div>
          </div>
        </ResponsiveGrid>
    </ResponsivePageWrapper>
  )
}
