import { useState } from 'react'
// import { supabase } from '../lib/supabaseClient'
// import { getCurrentUser } from '../lib/authUtils'
import SocialAccountManager from '../components/SocialAccountManager'
import AISocialPostGenerator from '../components/AISocialPostGenerator'
import LinkedInConnector from '../components/LinkedInConnector'

// Placeholder components - we'll create these next
const ConnectedAccounts = () => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">LinkedIn Integration</h3>
      <LinkedInConnector />
    </div>
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Other Social Accounts</h3>
      <SocialAccountManager />
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
  // const [user] = useState<any>(null)

  // Load user data
  useState(() => {
    const loadUser = async () => {
      try {
        // const currentUser = await getCurrentUser()
        // setUser(currentUser)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  })

  const tabs = [
    { id: 'accounts', name: 'Connected Accounts', icon: '🔗' },
    { id: 'create', name: 'Create Post', icon: '✍️' },
    { id: 'upcoming', name: 'Upcoming Posts', icon: '📅' },
    { id: 'history', name: 'Post History', icon: '📊' }
  ]

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'accounts':
        return <ConnectedAccounts />
      case 'create':
        return <CreatePost />
      case 'upcoming':
        return <UpcomingPosts />
      case 'history':
        return <PostHistory />
      default:
        return <ConnectedAccounts />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Social Media Automation</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your social media presence with automated posting and scheduling
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
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

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {renderActiveTab()}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Connected Accounts</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Scheduled Posts</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Published This Week</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">0</span>
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
        </div>
      </div>
    </div>
  )
}
