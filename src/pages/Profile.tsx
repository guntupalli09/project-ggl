import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { isGuestUser, getCurrentUser, clearGuestSession } from '../lib/authUtils'
import { useTheme } from '../hooks/useTheme'
import { clearLinkedInSession } from '../lib/linkedinOAuth'
import QRCodeGenerator from '../components/QRCodeGenerator'
import GoogleCalendarIntegration from '../components/GoogleCalendarIntegration'
import BusinessCalendarView from '../components/BusinessCalendarView'

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
  const [showQRCode, setShowQRCode] = useState(false)
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false)
  const { toggleTheme, isDark } = useTheme()
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    booking_link: '',
    business_slug: '',
    twilio_phone_number: '',
    business_phone: '',
    missed_call_automation_enabled: false
  })
  const navigate = useNavigate()

  // Handle URL parameters for Google Calendar integration
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const calendarSuccess = urlParams.get('calendar_success')
    const calendarError = urlParams.get('calendar_error')

    if (calendarSuccess === 'true') {
      setSuccess('Google Calendar connected successfully!')
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (calendarError) {
      setError(`Google Calendar connection failed: ${calendarError}`)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

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
          const guestUser = {
            id: currentUser.id,
            email: currentUser.email || 'guest@example.com',
            name: 'Guest User',
            company: 'Demo Company',
            plan_type: 'free' as const,
            created_at: new Date().toISOString(),
            is_guest: true
          }
          setUser(guestUser)
          setFormData(prev => ({
            ...prev,
            name: guestUser.name,
            company: guestUser.company,
            booking_link: ''
          }))
        } else {
          // Get user profile from Supabase
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single()

          // Get user settings (including all fields)
          const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('booking_link, business_slug, twilio_phone_number, business_phone, missed_call_automation_enabled')
            .eq('user_id', currentUser.id)
            .single()

          if (error && error.code !== 'PGRST116') {
            console.error('Error loading profile:', error)
          }

          if (settingsError && settingsError.code !== 'PGRST116') {
            console.error('Error loading settings:', settingsError)
          }

          const userProfile = {
            id: currentUser.id,
            email: currentUser.email || '',
            name: profile?.name || '',
            company: profile?.company || '',
            plan_type: (profile?.plan_type || 'free') as 'free' | 'premium',
            created_at: currentUser.created_at || new Date().toISOString(),
            is_guest: false
          }
          setUser(userProfile)
          setFormData({
            name: userProfile.name,
            company: userProfile.company,
            booking_link: settings?.booking_link || '',
            business_slug: settings?.business_slug || '',
            twilio_phone_number: settings?.twilio_phone_number || '',
            business_phone: settings?.business_phone || '',
            missed_call_automation_enabled: settings?.missed_call_automation_enabled || false
          })
        }

        // Theme is now managed by useTheme hook
      } catch (err) {
        console.error('Error loading profile:', err)
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
    checkGoogleCalendarStatus()
  }, [navigate])

  const checkGoogleCalendarStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: settings } = await supabase
        .from('user_settings')
        .select('google_calendar_connected, google_access_token')
        .eq('user_id', user.id)
        .single()

      if (settings?.google_calendar_connected && settings?.google_access_token) {
        setGoogleCalendarConnected(true)
      }
    } catch (err) {
      console.error('Error checking Google Calendar status:', err)
    }
  }

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
      // Save profile data
      const { error: profileError } = await supabase
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

      // Save booking link to user_settings
      // First try to update existing record
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .single()

      let settingsError = null

      if (existingSettings) {
        // Update existing record
        const { error } = await supabase
          .from('user_settings')
          .update({
            booking_link: formData.booking_link,
            business_slug: formData.business_slug,
            twilio_phone_number: formData.twilio_phone_number,
            business_phone: formData.business_phone,
            missed_call_automation_enabled: formData.missed_call_automation_enabled,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
        settingsError = error
      } else {
        // Insert new record
        const { error } = await supabase
          .from('user_settings')
          .insert([{
            user_id: user.id,
            booking_link: formData.booking_link,
            business_slug: formData.business_slug,
            twilio_phone_number: formData.twilio_phone_number,
            business_phone: formData.business_phone,
            missed_call_automation_enabled: formData.missed_call_automation_enabled
          }])
        settingsError = error
      }

      if (profileError) {
        console.error('Error saving profile:', profileError)
        setError('Failed to save profile')
      } else if (settingsError) {
        console.error('Error saving settings:', settingsError)
        if (settingsError.code === 'PGRST116') {
          setError('Database table not found. Please run the migration script in Supabase SQL Editor.')
        } else if (settingsError.code === '42501') {
          setError('Permission denied. Please check your database permissions.')
        } else if (settingsError.message?.includes('ON CONFLICT')) {
          setError('Database constraint error. Please run the quick_fix_user_settings.sql script in Supabase SQL Editor.')
        } else {
          setError(`Failed to save settings: ${settingsError.message}`)
        }
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
    console.log('🚪 Profile handleLogout called')
    // Clear LinkedIn session
    clearLinkedInSession()
    
    if (user?.is_guest) {
      console.log('🚪 Clearing guest session from Profile')
      clearGuestSession()
    } else {
      console.log('🚪 Signing out from Supabase from Profile')
      await supabase.auth.signOut()
    }
    console.log('🚪 Navigating to login from Profile')
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

                  {/* Booking Link */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Booking Link
                    </label>
                    {editing ? (
                      <input
                        type="url"
                        name="booking_link"
                        value={formData.booking_link}
                        onChange={handleInputChange}
                        className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                        placeholder="https://calendly.com/yourlink"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        {formData.booking_link || 'Not set'}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      This link will be included in your AI-generated outreach messages
                    </p>
                  </div>

                  {/* Business Slug */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Lead Capture URL
                    </label>
                    {editing ? (
                      <div>
                        <input
                          type="text"
                          name="business_slug"
                          value={formData.business_slug}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                          placeholder="my-business-name"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Your public lead capture form will be available at: <br />
                          <span className="font-mono text-blue-600 dark:text-blue-400">
                            {window.location.origin}/leads/{formData.business_slug || 'your-slug'}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-900 dark:text-white py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                          {formData.business_slug || 'Not set'}
                        </p>
                        {formData.business_slug && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Your lead capture form: <br />
                            <a 
                              href={`/leads/${formData.business_slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {window.location.origin}/leads/{formData.business_slug}
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Create a custom URL for your lead capture form. Use lowercase letters, numbers, and hyphens only.
                    </p>
                    
                    {/* QR Code Generation */}
                    {formData.business_slug && (
                      <div className="mt-4">
                        <button
                          onClick={() => setShowQRCode(true)}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                          Generate QR Code
                        </button>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Create a QR code for easy sharing of your lead capture form
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Twilio Settings */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Missed Call Automation
                    </h3>
                    
                    {/* Twilio Phone Number */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Twilio Phone Number
                      </label>
                      {editing ? (
                        <input
                          type="tel"
                          name="twilio_phone_number"
                          value={formData.twilio_phone_number}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                          placeholder="+1234567890"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                          {formData.twilio_phone_number || 'Not configured'}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Your Twilio phone number for receiving calls (format: +1234567890)
                      </p>
                    </div>

                    {/* Business Phone */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Your Phone Number (for alerts)
                      </label>
                      {editing ? (
                        <input
                          type="tel"
                          name="business_phone"
                          value={formData.business_phone}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                          placeholder="+1234567890"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                          {formData.business_phone || 'Not configured'}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Phone number to receive missed call alerts
                      </p>
                    </div>

                    {/* Missed Call Automation Toggle */}
                    <div className="mb-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="missed_call_automation_enabled"
                          checked={formData.missed_call_automation_enabled}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            missed_call_automation_enabled: e.target.checked
                          }))}
                          disabled={!editing}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Enable missed call SMS automation
                        </span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        When enabled, automatically sends SMS responses to missed calls and alerts you
                      </p>
                    </div>

                    {formData.missed_call_automation_enabled && formData.twilio_phone_number && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                          Webhook URL for Twilio
                        </h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                          Configure this URL in your Twilio phone number settings:
                        </p>
                        <code className="block text-xs bg-white dark:bg-gray-800 p-2 rounded border text-gray-800 dark:text-gray-200 break-all">
                          {window.location.origin}/api/twilio/incoming-call
                        </code>
                      </div>
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
                              company: user.company || '',
                              booking_link: formData.booking_link,
                              business_slug: formData.business_slug,
                              twilio_phone_number: formData.twilio_phone_number,
                              business_phone: formData.business_phone,
                              missed_call_automation_enabled: formData.missed_call_automation_enabled
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

              {/* Google Calendar Integration */}
              <div className="mb-6">
                <GoogleCalendarIntegration onConnectionChange={setGoogleCalendarConnected} />
              </div>

              {/* Business Calendar View - Only show when connected */}
              {googleCalendarConnected && (
                <div className="mb-6">
                  <BusinessCalendarView onError={(error) => setError(error)} />
                </div>
              )}

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

      {/* QR Code Modal */}
      {showQRCode && formData.business_slug && (
        <QRCodeGenerator
          businessSlug={formData.business_slug}
          businessName={formData.company || user?.name || 'Your Business'}
          onClose={() => setShowQRCode(false)}
        />
      )}
    </div>
  )
}
