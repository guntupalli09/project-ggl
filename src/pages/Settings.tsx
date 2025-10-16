import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { isGuestUser, clearGuestSession } from '../lib/authUtils'
import { clearLinkedInSession } from '../lib/linkedinOAuth'
import ResponsivePageWrapper from '../components/ResponsivePageWrapper'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { 
  ShieldCheckIcon, 
  SparklesIcon, 
  CogIcon, 
  SunIcon, 
  MoonIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

const Settings: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toggleTheme, isDark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [userProfile, setUserProfile] = useState({
    plan_type: 'free',
    created_at: '',
    is_guest: false
  })
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      sms: true,
      push: false
    },
    privacy: {
      profile_visibility: 'public',
      data_sharing: false
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC'
    }
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      if (!user) return

      // Load user profile data
      setUserProfile({
        plan_type: user.user_metadata?.plan_type || 'free',
        created_at: user.created_at || '',
        is_guest: isGuestUser()
      })

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error)
        setError(`Error loading settings: ${error.message}`)
      } else if (data) {
        setSettings({
          notifications: data.notifications || settings.notifications,
          privacy: data.privacy || settings.privacy,
          preferences: data.preferences || settings.preferences
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!user) return

    setSaving(true)
    setError('')
    setSuccess('')
    
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          notifications: settings.notifications,
          privacy: settings.privacy,
          preferences: settings.preferences,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error saving settings:', error)
        setError(`Failed to save settings: ${error.message}`)
      } else {
        setSuccess('Settings saved successfully!')
        setTimeout(() => setSuccess(''), 5000)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setError('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      console.log('🚪 Settings handleLogout called')
      
      // Clear LinkedIn session
      clearLinkedInSession()
      
      // Clear guest session if applicable
      if (isGuestUser()) {
        console.log('🚪 Clearing guest session')
        clearGuestSession()
      }
      
      // Sign out from Supabase
      console.log('🚪 Signing out from Supabase')
      const { error: signOutError } = await supabase.auth.signOut()
      
      if (signOutError) {
        console.error('❌ Supabase signOut error:', signOutError)
        setError(`Logout failed: ${signOutError.message}`)
        return
      }
      
      console.log('✅ Successfully signed out, navigating to login')
      // Redirect to login
      navigate('/login')
    } catch (error) {
      console.error('❌ Error logging out:', error)
      setError(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }))
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ResponsivePageWrapper
      title="Settings"
      description="Manage your account preferences and application settings"
    >
      {/* Success/Error Messages */}
      {success && (
        <Alert variant="success" className="mb-6">
          {success}
        </Alert>
      )}

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Account & App Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg mr-3">
                  <ShieldCheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Account Info</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Plan Type</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">{userProfile.plan_type}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Member Since</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{userProfile.created_at ? formatDate(userProfile.created_at) : 'Invalid Date'}</span>
                </div>
                {userProfile.is_guest && (
                  <Alert variant="warning">
                    You are exploring in guest mode. Your data won't be saved permanently.
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upgrade to Premium */}
          <Card className="bg-gradient-to-r from-purple-600 to-blue-600 border-0 text-white">
            <CardContent className="text-center">
              <div className="p-3 bg-white/20 rounded-full w-fit mx-auto mb-4">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Upgrade to Premium</h3>
              <p className="text-sm text-purple-100 mb-6">Unlock advanced features and unlimited usage</p>
              <Button className="w-full bg-white text-purple-600 hover:bg-gray-100">
                Upgrade Now
              </Button>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mr-3">
                  <CogIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <CardTitle>Appearance</CardTitle>
              </div>
              <CardDescription>Choose your preferred theme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mr-3">
                    {isDark ? (
                      <MoonIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <SunIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Theme</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isDark ? 'Dark mode' : 'Light mode'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isDark ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email Notifications
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive notifications via email
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.email}
                      onChange={(e) => handleSettingChange('notifications', 'email', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      SMS Notifications
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive notifications via SMS
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.sms}
                      onChange={(e) => handleSettingChange('notifications', 'sms', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Push Notifications
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive push notifications in browser
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.push}
                      onChange={(e) => handleSettingChange('notifications', 'push', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy</CardTitle>
              <CardDescription>Control your privacy and data sharing preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Profile Visibility
                  </label>
                  <select
                    value={settings.privacy.profile_visibility}
                    onChange={(e) => handleSettingChange('privacy', 'profile_visibility', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="friends">Friends Only</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Data Sharing
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Allow sharing of anonymized data for product improvement
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.privacy.data_sharing}
                      onChange={(e) => handleSettingChange('privacy', 'data_sharing', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={saveSettings}
              disabled={saving}
              loading={saving}
            >
              Save Settings
            </Button>
          </div>
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-6">
          {/* Sign Out */}
          <Card>
            <CardContent>
              <Button
                onClick={handleLogout}
                variant="danger"
                className="w-full"
                leftIcon={<ArrowRightOnRectangleIcon className="h-4 w-4" />}
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>

          {/* Guest Mode Warning */}
          {userProfile.is_guest && (
            <Alert variant="warning">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                    Guest Mode
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    You are exploring in guest mode. Your data won't be saved permanently. 
                    <button 
                      onClick={() => navigate('/login')}
                      className="underline hover:no-underline ml-1"
                    >
                      Sign in to save your progress.
                    </button>
                  </p>
                </div>
              </div>
            </Alert>
          )}
        </div>
      </div>
    </ResponsivePageWrapper>
  )
}

export default Settings
