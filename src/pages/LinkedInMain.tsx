import { useState } from 'react'
import LinkedInConnector from '../components/LinkedInConnector'
import { getLinkedInSession, isLinkedInConnected } from '../lib/linkedinOAuth'

export default function LinkedInMain() {
  const [activeTab, setActiveTab] = useState<'connect' | 'profile' | 'posts'>('connect')
  const [session, setSession] = useState(getLinkedInSession())

  const isConnected = isLinkedInConnected() && session

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                  <span className="text-white text-xl">💼</span>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">LinkedIn Automation</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage your LinkedIn presence</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isConnected && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Welcome, {session?.profile?.firstName}!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('connect')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'connect'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Connection
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              disabled={!isConnected}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              disabled={!isConnected}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'posts'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              Posts
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'connect' && (
          <div className="space-y-6">
            <LinkedInConnector />
          </div>
        )}

        {activeTab === 'profile' && isConnected && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">LinkedIn Profile</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                {session?.profile?.profilePicture && (
                  <img
                    src={session.profile.profilePicture}
                    alt="Profile"
                    className="w-16 h-16 rounded-full"
                  />
                )}
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {session?.profile?.firstName} {session?.profile?.lastName}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {session?.profile?.email || 'No email available'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    LinkedIn ID: {session?.profile?.id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'posts' && isConnected && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">LinkedIn Posts</h3>
            <div className="text-center py-8">
              <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">📝</div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Post Management</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Post creation and management features will be available here.
              </p>
            </div>
          </div>
        )}

        {!isConnected && (activeTab === 'profile' || activeTab === 'posts') && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="text-center py-8">
              <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">🔒</div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Connection Required</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Please connect your LinkedIn account first to access this feature.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
