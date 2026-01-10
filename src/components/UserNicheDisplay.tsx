import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { 
  BuildingOfficeIcon, 
  GlobeAltIcon, 
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface NicheTemplate {
  id: string
  name: string
  display_name: string
  config: {
    workflow: { [key: string]: any }
    branding: { [key: string]: string }
    content_templates: { [key: string]: string }
    features: { [key: string]: boolean }
  }
}

interface UserSettings {
  business_name: string
  business_slug: string
  custom_domain: string
  niche_template_id: string
  workflow_stage: string
  created_at: string
  updated_at: string
}

const UserNicheDisplay: React.FC = () => {
  const { user } = useAuth()
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [nicheTemplate, setNicheTemplate] = useState<NicheTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState({
    business_name: '',
    business_slug: '',
    custom_domain: ''
  })

  useEffect(() => {
    if (user) {
      fetchUserSettings()
    }
  }, [user])

  const fetchUserSettings = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch user settings
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle()

      if (settingsError) {
        throw settingsError
      }

      setUserSettings(settings)
      
      // Initialize edit data with current settings
      setEditData({
        business_name: settings?.business_name || '',
        business_slug: settings?.business_slug || '',
        custom_domain: settings?.custom_domain || ''
      })

      // If niche template is selected, fetch the template details
      if (settings?.niche_template_id) {
        setTemplateLoading(true)
        try {
          const { data: template, error: templateError } = await supabase
            .from('niche_templates')
            .select('*')
            .eq('id', settings.niche_template_id)
            .maybeSingle()

          if (templateError) {
            console.error('Error fetching niche template:', templateError)
            setError(`Failed to load niche template: ${templateError.message}`)
          } else if (template) {
            setNicheTemplate(template)
          }
        } catch (templateErr) {
          console.error('Unexpected error fetching niche template:', templateErr)
          setError('Failed to load niche template details')
        } finally {
          setTemplateLoading(false)
        }
      }
    } catch (err: any) {
      console.error('Error fetching user settings:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setEditing(true)
    setError(null)
  }

  const handleCancel = () => {
    setEditing(false)
    setError(null)
    // Reset edit data to current settings
    setEditData({
      business_name: userSettings?.business_name || '',
      business_slug: userSettings?.business_slug || '',
      custom_domain: userSettings?.custom_domain || ''
    })
  }

  const handleSave = async () => {
    if (!user?.id) {
      setError('User not authenticated')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          business_name: editData.business_name,
          business_slug: editData.business_slug,
          custom_domain: editData.custom_domain,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()

      if (error) {
        throw error
      }

      // Update local state
      setUserSettings(prev => prev ? { ...prev, ...editData } : null)
      setEditing(false)
      
      // Refresh the data
      await fetchUserSettings()
    } catch (err: any) {
      console.error('Error updating settings:', err)
      setError(err.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-generate business slug when business name changes
      if (field === 'business_name' && value) {
        updated.business_slug = value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      }
      
      return updated
    })
  }

  const generateCustomDomain = (businessName: string, businessSlug: string) => {
    if (businessName) {
      return `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.getgetleads.com`
    } else if (businessSlug) {
      return `${businessSlug}.getgetleads.com`
    }
    return 'yourbusiness.getgetleads.com'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading settings...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center text-red-600">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            <span>Error loading settings: {error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!userSettings) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-600">
            <p>No settings found. Please complete onboarding.</p>
            <Button 
              onClick={() => window.location.href = '/onboarding'}
              className="mt-4"
            >
              Complete Onboarding
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const suggestedDomain = generateCustomDomain(userSettings.business_name, userSettings.business_slug)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Cog6ToothIcon className="h-5 w-5 mr-2" />
          Business Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Niche Selection */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <BuildingOfficeIcon className="h-4 w-4 mr-2" />
            Selected Niche
          </h4>
          {templateLoading ? (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-gray-600 dark:text-gray-400">Loading niche details...</span>
              </div>
            </div>
          ) : nicheTemplate && nicheTemplate.config ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-semibold text-blue-900 dark:text-blue-100">
                    {nicheTemplate.display_name || 'Selected Niche'}
                  </h5>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {nicheTemplate.name ? nicheTemplate.name.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : 'Niche'} specific configurations
                  </p>
                </div>
                <CheckCircleIcon className="h-6 w-6 text-blue-600" />
              </div>
              
              {/* Niche Features */}
              {nicheTemplate.config?.features && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(nicheTemplate.config.features).map(([feature, enabled]) => (
                    <span 
                      key={feature}
                      className={`px-2 py-1 rounded-full text-xs ${
                        enabled 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {feature.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-200">
                No niche selected. Please complete onboarding.
              </p>
            </div>
          )}
        </div>

        {/* Domain Configuration */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <GlobeAltIcon className="h-4 w-4 mr-2" />
              Domain Configuration
            </h4>
            {!editing && (
              <Button
                onClick={handleEdit}
                variant="outline"
                size="sm"
              >
                Edit
              </Button>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business Name
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editing ? editData.business_name : (userSettings.business_name || '')}
                  onChange={editing ? (e) => handleInputChange('business_name', e.target.value) : undefined}
                  readOnly={!editing}
                  className={`flex-1 px-3 py-2 border rounded-md ${
                    editing 
                      ? 'border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                  placeholder="Your Business Name"
                />
                {!userSettings.business_name && !editing && (
                  <span className="text-xs text-gray-500">Not set</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business Slug
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editing ? editData.business_slug : (userSettings.business_slug || '')}
                  onChange={editing ? (e) => handleInputChange('business_slug', e.target.value) : undefined}
                  readOnly={!editing}
                  className={`flex-1 px-3 py-2 border rounded-md ${
                    editing 
                      ? 'border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                  placeholder="your-business-slug"
                />
                {!userSettings.business_slug && !editing && (
                  <span className="text-xs text-gray-500">Not set</span>
                )}
              </div>
              {editing && (
                <p className="text-xs text-gray-500 mt-1">
                  Auto-generated from business name. You can edit it manually.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Custom Domain
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editing ? editData.custom_domain : (userSettings.custom_domain || suggestedDomain)}
                    onChange={editing ? (e) => handleInputChange('custom_domain', e.target.value) : undefined}
                    readOnly={!editing}
                    className={`flex-1 px-3 py-2 border rounded-md ${
                      editing 
                        ? 'border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                    placeholder="yourbusiness.getgetleads.com"
                  />
                  {!userSettings.custom_domain && !editing && (
                    <span className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-600 dark:text-gray-400">
                      Suggested
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {editing 
                    ? `Suggested domain: ${generateCustomDomain(editData.business_name, editData.business_slug)}`
                    : userSettings.custom_domain 
                      ? 'Your custom domain is configured'
                      : `Suggested domain: ${suggestedDomain}`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Stage */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            Current Workflow Stage
          </h4>
          <span className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300">
            {userSettings.workflow_stage || 'new'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {editing ? (
            <>
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/niche-demo'}
                className="flex-1"
              >
                Change Niche
              </Button>
              <Button 
                variant="outline" 
                onClick={fetchUserSettings}
                className="flex-1"
              >
                Refresh
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default UserNicheDisplay
