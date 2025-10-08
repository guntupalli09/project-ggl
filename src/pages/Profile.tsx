import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { isGuestUser, getCurrentUser, clearGuestSession } from '../lib/authUtils'
import { useTheme } from '../hooks/useTheme'

interface UserProfile {
  id: string
  email: string
  name?: string
  company?: string
  plan_type: 'free' | 'premium'
  created_at: string
  is_guest?: boolean
}

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(false)
  const { theme, toggleTheme, isDark } = useTheme()
  const [formData, setFormData] = useState({
    name: '',
    company: ''
  })
  const navigate = useNavigate()

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true)
        const currentUser = await getCurrentUser()
        
        if (!currentUser) {
          navigate('/login')
          return
        }

        // Check if user is guest
        const isGuest = isGuestUser()
        
        if (isGuest) {
          setUser({
            id: currentUser.id,
            email: currentUser.email || 'guest@example.com',
            name: 'Guest User',
            company: 'Demo Company',
            plan_type: 'free',
            created_at: new Date().toISOString(),
            is_guest: true
          })
        } else {
          // Get user profile from Supabase
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single()

          if (error && error.code !== 'PGRST116') {
            console.error('Error loading profile:', error)
          }

          setUser({
            id: currentUser.id,
            email: currentUser.email || '',
            name: profile?.name || '',
            company: profile?.company || '',
            plan_type: profile?.plan_type || 'free',
            created_at: currentUser.created_at || new Date().toISOString(),
            is_guest: false
          })
        }

        // Theme is now managed by useTheme hook

        setFormData({
          name: profile?.name || currentUser.user_metadata?.name || '',
          company: profile?.company || ''
        })
      } catch (err) {
        console.error('Error loading profile:', err)
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [navigate])

  // Theme is now managed by useTheme hook

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSave = async () => {
    if (!user || user.is_guest) {
      setError('Cannot save profile in guest mode')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert([{
          user_id: user.id,
          name: formData.name,
          company: formData.company,
          plan_type: user.plan_type,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('Error saving profile:', error)
        setError('Failed to save profile')
      } else {
        setSuccess('Profile updated successfully!')
        setEditing(false)
        // Update local user state
        setUser(prev => prev ? {
          ...prev,
          name: formData.name,
          company: formData.company
        } : null)
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    if (user?.is_guest) {
      clearGuestSession()
    } else {
      await supabase.auth.signOut()
    }
    navigate('/login')
  }

  // toggleTheme is now provided by useTheme hook

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Profile Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Unable to load your profile information.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage your account information and preferences
            </p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Information */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">Profile Information</h2>
                </div>
                <div className="p-6 space-y-6">
                  {/* Email (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Email cannot be changed
                    </p>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        {user.name || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                        placeholder="Enter your company name"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        {user.company || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3">
                    {editing ? (
                      <>
                        <button
                          onClick={() => {
                            setEditing(false)
                            setFormData({
                              name: user.name || '',
                              company: user.company || ''
                            })
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditing(true)}
                        disabled={user.is_guest}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {user.is_guest ? 'Edit Disabled (Guest Mode)' : 'Edit Profile'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Account Info */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Account Info</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Plan Type</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.plan_type === 'premium' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {user.plan_type === 'premium' ? 'Premium' : 'Free'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Member Since</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {formatDate(user.created_at)}
                    </dd>
                  </div>
                  {user.is_guest && (
                    <div>
                      <dt className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Mode</dt>
                      <dd className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                        Guest Mode
                      </dd>
                    </div>
                  )}
                </div>
              </div>

              {/* Upgrade to Premium */}
              {user.plan_type === 'free' && !user.is_guest && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900 dark:to-indigo-900 border border-purple-200 dark:border-purple-700 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-purple-900 dark:text-purple-100 mb-2">
                    Upgrade to Premium
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
                    Unlock advanced features and unlimited usage
                  </p>
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                    Upgrade Now
                  </button>
                </div>
              )}

              {/* Theme Settings */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Appearance</h3>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <dt className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</dt>
                      <dd className="text-sm text-gray-500 dark:text-gray-400">
                        {isDark ? 'Dark mode' : 'Light mode'}
                      </dd>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        isDark ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isDark ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Logout */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="p-6">
                  <button
                    onClick={handleLogout}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    {user.is_guest ? 'Exit Guest Mode' : 'Sign Out'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
