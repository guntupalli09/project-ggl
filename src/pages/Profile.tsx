import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getCurrentUser } from '../lib/authUtils'
import QRCodeGenerator from '../components/QRCodeGenerator'
import GooglePlaceIdFinder from '../components/GooglePlaceIdFinder'
import UserNicheDisplay from '../components/UserNicheDisplay'
import ResponsivePageWrapper from '../components/ResponsivePageWrapper'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import { 
  UserIcon, 
  PhoneIcon, 
  CogIcon,
  QrCodeIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

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
  const [formData, setFormData] = useState({
    business_name: '',
    booking_link: '',
    business_slug: '',
    business_phone: '',
    missed_call_automation_enabled: false,
    google_place_id: '',
    business_address: '',
    business_website: '',
    business_hours: ''
  })
  const [showPlaceIdFinder, setShowPlaceIdFinder] = useState(false)
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

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      const currentUser = await getCurrentUser()
      
      if (!currentUser) {
        navigate('/login')
        return
      }

      setUser(currentUser)

      // Load user settings with better error handling
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle() // Use maybeSingle() instead of single() to handle no results gracefully

      if (settingsError) {
        console.error('Error loading settings:', settingsError)
        setError(`Error loading settings: ${settingsError.message}`)
      } else if (settings) {
        setFormData({
          business_name: settings.business_name || currentUser.company || '',
          booking_link: settings.booking_link || '',
          business_slug: settings.business_slug || '',
          business_phone: settings.business_phone || '',
          missed_call_automation_enabled: settings.missed_call_automation_enabled || false,
          google_place_id: settings.google_place_id || '',
          business_address: settings.business_address || '',
          business_website: settings.business_website || '',
          business_hours: settings.business_hours || ''
        })
      } else {
        // No settings found, use defaults
        console.log('No user settings found, using defaults')
        setFormData({
          business_name: currentUser.company || '',
          booking_link: '',
          business_slug: '',
          business_phone: '',
          missed_call_automation_enabled: false,
          google_place_id: '',
          business_address: '',
          business_website: '',
          business_hours: ''
        })
      }

      // Profile settings loaded successfully
    } catch (error) {
      console.error('Error loading profile:', error)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Auto-generate business_slug if not set
      let businessSlug = formData.business_slug
      if (!businessSlug) {
        if (formData.business_name) {
          businessSlug = formData.business_name.toLowerCase().replace(/[^a-z0-9]/g, '')
        } else if (user.email) {
          businessSlug = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
        }
      }

      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          business_name: formData.business_name,
          booking_link: formData.booking_link,
          business_slug: businessSlug,
          business_phone: formData.business_phone,
          missed_call_automation_enabled: formData.missed_call_automation_enabled,
          google_place_id: formData.google_place_id,
          business_address: formData.business_address,
          business_website: formData.business_website,
          business_hours: formData.business_hours
        }, {
          onConflict: 'user_id'
        })

      if (settingsError) {
        console.error('Error saving settings:', settingsError)
        setError(`Failed to save settings: ${settingsError.message || 'Unknown error'}`)
        return
      }

      setSuccess('Profile updated successfully!')
      setEditing(false)
      
      // Update formData with the generated business_slug
      setFormData(prev => ({ ...prev, business_slug: businessSlug }))
    } catch (error) {
      console.error('Error saving profile:', error)
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePlaceIdFound = (placeId: string, businessName: string, address: string) => {
    setFormData(prev => ({
      ...prev,
      google_place_id: placeId,
      business_name: businessName,
      business_address: address
    }))
    setShowPlaceIdFinder(false)
    setSuccess(`Google Place ID found: ${placeId}`)
    setTimeout(() => setSuccess(''), 5000)
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">User not found</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsivePageWrapper
      title="Profile Settings"
      description="Manage your account information and preferences"
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
          {/* Left Column - Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Information Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg mr-3">
                      <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle>Profile Information</CardTitle>
                  </div>
                  <Button
                    onClick={() => setEditing(!editing)}
                    variant={editing ? 'outline' : 'primary'}
                  >
                    {editing ? 'Cancel' : 'Edit Profile'}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Email */}
                  <Input
                    type="email"
                    label="Email Address"
                    value={user.email}
                    disabled
                    helperText="Email cannot be changed"
                  />

                  {/* Business Name */}
                  <Input
                    type="text"
                    label="Business Name"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    disabled={!editing}
                    placeholder="Enter your business name"
                  />


                  {/* Business Slug */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Business URL Slug
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-4 py-3 rounded-l-lg border border-r-0 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium">
                        getgetleads.com/leads/
                      </span>
                      <input
                        type="text"
                        value={formData.business_slug}
                        onChange={(e) => setFormData({ ...formData, business_slug: e.target.value })}
                        disabled={!editing}
                        className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-r-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="your-business"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Your public lead capture URL</p>
                  </div>

                  {/* Booking Link */}
                  <div className="md:col-span-2">
                    <Input
                      type="url"
                      label="Booking Link"
                      value={formData.booking_link}
                      onChange={(e) => setFormData({ ...formData, booking_link: e.target.value })}
                      disabled={!editing}
                      placeholder="https://calendly.com/your-username"
                      helperText="Link to your booking calendar"
                    />
                  </div>

                  {/* Business Address */}
                  <Input
                    type="text"
                    label="Business Address"
                    value={formData.business_address}
                    onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                    disabled={!editing}
                    placeholder="123 Main St, City, State 12345"
                  />

                  {/* Business Hours */}
                  <Input
                    type="text"
                    label="Business Hours"
                    value={formData.business_hours}
                    onChange={(e) => setFormData({ ...formData, business_hours: e.target.value })}
                    disabled={!editing}
                    placeholder="Mon-Fri 9am–6pm, Sat 10am–4pm, Sun Closed"
                    helperText="Shown in missed-call SMS. Keep it concise."
                  />

                  {/* Business Website */}
                  <Input
                    type="url"
                    label="Business Website"
                    value={formData.business_website}
                    onChange={(e) => setFormData({ ...formData, business_website: e.target.value })}
                    disabled={!editing}
                    placeholder="https://yourbusiness.com"
                  />

                  {/* Google Place ID */}
                  <div className="md:col-span-2">
                    <Input
                      type="text"
                      label="Google Place ID"
                      value={formData.google_place_id}
                      onChange={(e) => setFormData({ ...formData, google_place_id: e.target.value })}
                      disabled={!editing}
                      placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                      helperText="Find your Place ID to enable Google Reviews integration"
                    />
                    {editing && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowPlaceIdFinder(true)}
                        className="mt-2"
                        leftIcon={<MapPinIcon className="h-4 w-4" />}
                      >
                        Find My Place ID
                      </Button>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                {editing && (
                  <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      loading={saving}
                    >
                      Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Business Configuration */}
            <UserNicheDisplay />

            {/* Onboarding Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg mr-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  Onboarding Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Complete your business setup to unlock all features and customize your workflows.
                  </p>
                  <Button
                    onClick={() => navigate('/onboarding')}
                    className="w-full"
                  >
                    Complete Business Setup
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* QR Code Generator */}
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg mr-3">
                    <QrCodeIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle>Lead Capture QR Code</CardTitle>
                </div>
                <CardDescription>
                  Generate a QR code for your lead capture form
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="text-center">
                  <Button
                    onClick={() => setShowQRCode(true)}
                    leftIcon={<QrCodeIcon className="h-5 w-5" />}
                  >
                    Generate QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Missed Call Automation */}
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg mr-3">
                    <PhoneIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle>Missed Call Automation</CardTitle>
                </div>
                <CardDescription>
                  Automatically send follow-up messages to missed callers via Google Business Profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    type="tel"
                    label="Your Phone Number (for alerts)"
                    value={formData.business_phone}
                    onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
                    disabled={!editing}
                    placeholder="+1234567890"
                  />
                </div>

                <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Enable missed call automation</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Automatically send follow-up messages to missed callers via Google Business Profile</p>
                  </div>
                  <button
                    onClick={() => setFormData({ ...formData, missed_call_automation_enabled: !formData.missed_call_automation_enabled })}
                    disabled={!editing}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.missed_call_automation_enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                    } ${!editing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.missed_call_automation_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg mr-3">
                    <CogIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle>Quick Actions</CardTitle>
                </div>
                <CardDescription>Manage your account and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    onClick={() => navigate('/settings')}
                    variant="outline"
                    className="w-full justify-start"
                    leftIcon={<CogIcon className="h-4 w-4" />}
                  >
                    Account Settings
                  </Button>
                  <Button
                    onClick={() => navigate('/onboarding')}
                    variant="outline"
                    className="w-full justify-start"
                    leftIcon={<ExclamationTriangleIcon className="h-4 w-4" />}
                  >
                    Complete Setup
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Guest Mode Warning */}
            {user.is_guest && (
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

      {/* QR Code Modal */}
      {showQRCode && (
        <QRCodeGenerator 
          businessSlug={formData.business_slug} 
          businessName={formData.business_name || 'Your Business'}
          onClose={() => setShowQRCode(false)} 
        />
      )}

      {/* Google Place ID Finder Modal */}
      {showPlaceIdFinder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Find Your Google Place ID
                </h3>
                <button
                  onClick={() => setShowPlaceIdFinder(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <GooglePlaceIdFinder
                onPlaceIdFound={handlePlaceIdFound}
                currentPlaceId={formData.google_place_id}
              />
            </div>
          </div>
        </div>
      )}
    </ResponsivePageWrapper>
  )
}