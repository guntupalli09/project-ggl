import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import NicheSelector from '../components/NicheSelector'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

const Onboarding: React.FC = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [selectedNicheId, setSelectedNicheId] = useState<string>('')
  const [businessName, setBusinessName] = useState<string>('')
  const [customDomain, setCustomDomain] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Only redirect if we're sure there's no user and auth is not loading
    if (!user && !loading) {
      console.log('🔄 Onboarding: No user found, redirecting to login')
      navigate('/login')
    }
  }, [user, loading, navigate])

  const handleNicheSelected = (nicheId: string, domain?: string) => {
    setSelectedNicheId(nicheId)
    if (domain !== undefined) {
      setCustomDomain(domain)
    }
  }

  const handleCustomDomainChange = (domain: string) => {
    setCustomDomain(domain)
  }

  const generateCustomDomain = (name: string) => {
    if (!name) return ''
    return `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.getgetleads.com`
  }

  const handleBusinessNameChange = (name: string) => {
    setBusinessName(name)
    if (name && !customDomain) {
      setCustomDomain(generateCustomDomain(name))
    }
  }

  const handleSubmit = async () => {
    if (!businessName.trim()) {
      setError('Please enter your business name')
      return
    }
    
    if (!selectedNicheId) {
      setError('Please select a business type')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // First, try to create user_settings if it doesn't exist
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user?.id,
          business_name: businessName.trim(),
          business_slug: businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
          custom_domain: customDomain || undefined,
          workflow_stage: 'new',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (settingsError) {
        console.log('Warning: Could not create user_settings:', settingsError)
        // Continue anyway, the backend will handle it
      }

      const response = await fetch('http://localhost:3001/api/tenant/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          nicheTemplateId: selectedNicheId,
          businessName: businessName.trim(),
          customDomain: customDomain || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to complete onboarding')
      }

      setSuccess(true)
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during onboarding')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Onboarding Complete!</h2>
          <p className="text-gray-600 mb-4">
            Your business has been configured successfully. Redirecting to dashboard...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome to GetGetLeads!
              </h1>
              <p className="text-gray-600">
                Let's set up your business profile to get you started
              </p>
            </div>

            {/* Business Name Input */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name *
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => handleBusinessNameChange(e.target.value)}
                placeholder="Enter your business name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {businessName && (
                <p className="mt-2 text-sm text-gray-600">
                  Your custom domain will be: <span className="font-mono text-blue-600">
                    {generateCustomDomain(businessName)}
                  </span>
                </p>
              )}
            </div>

            <NicheSelector
              onNicheSelected={handleNicheSelected}
              selectedNicheId={selectedNicheId}
              customDomain={customDomain}
              onCustomDomainChange={handleCustomDomainChange}
            />

            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!businessName.trim() || !selectedNicheId || isSubmitting}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  businessName.trim() && selectedNicheId && !isSubmitting
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Setting up...
                  </div>
                ) : (
                  'Complete Setup'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Onboarding