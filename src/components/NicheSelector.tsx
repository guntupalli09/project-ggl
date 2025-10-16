import React, { useState, useEffect } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'

interface NicheTemplate {
  id: string
  name: string
  display_name: string
  config: {
    branding: {
      primary_color: string
      secondary_color: string
      logo_url: string
      font_family: string
    }
    workflow: {
      lead_to_booking: { automation_enabled: boolean; delay_minutes: number }
      booking_to_review: { automation_enabled: boolean; delay_minutes: number; channel: string }
      review_to_referral: { automation_enabled: boolean; delay_minutes: number; channel: string }
    }
    content_templates: {
      review_request: string
      referral_offer: string
      booking_confirmation: string
    }
    features: {
      before_after_photos: boolean
      hipaa_compliant_feedback: boolean
      technician_metadata: boolean
    }
  }
}

interface NicheSelectorProps {
  onNicheSelected: (nicheId: string, customDomain?: string) => void
  selectedNicheId?: string
  customDomain?: string
  onCustomDomainChange?: (domain: string) => void
}

const NicheSelector: React.FC<NicheSelectorProps> = ({
  onNicheSelected,
  selectedNicheId,
  customDomain = '',
  onCustomDomainChange
}) => {
  const [nicheTemplates, setNicheTemplates] = useState<NicheTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNicheTemplates()
  }, [])

  const fetchNicheTemplates = async () => {
    try {
      const response = await fetch('/api/niche-templates')
      if (!response.ok) {
        throw new Error('Failed to fetch niche templates')
      }
      const data = await response.json()
      setNicheTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch niche templates')
    } finally {
      setLoading(false)
    }
  }

  const handleNicheSelect = (nicheId: string) => {
    onNicheSelected(nicheId, customDomain)
  }

  const handleCustomDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const domain = e.target.value
    onCustomDomainChange?.(domain)
    if (selectedNicheId) {
      onNicheSelected(selectedNicheId, domain)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading niche templates...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={fetchNicheTemplates}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Your Business Type</h3>
        <p className="text-gray-600 mb-6">
          Select the niche that best describes your business. This will customize your workflows, 
          automation rules, and content templates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {nicheTemplates.map((niche) => (
          <div
            key={niche.id}
            onClick={() => handleNicheSelect(niche.id)}
            className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedNicheId === niche.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {selectedNicheId === niche.id && (
              <div className="absolute top-3 right-3">
                <CheckIcon className="h-6 w-6 text-blue-600" />
              </div>
            )}
            
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-gray-900">
                {niche.display_name}
              </h4>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <span className="font-medium">Review Delay:</span>
                  <span className="ml-2">
                    {niche.config.workflow.booking_to_review.delay_minutes / 60}h
                  </span>
                </div>
                
                <div className="flex items-center">
                  <span className="font-medium">Compliance:</span>
                  <span className="ml-2 capitalize">
                    {niche.config.features.hipaa_compliant_feedback ? 'HIPAA' : 'Standard'}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <span className="font-medium">Features:</span>
                  <div className="ml-2 flex flex-wrap gap-1">
                    {niche.config.features.before_after_photos && (
                      <span className="px-2 py-1 bg-gray-100 text-xs rounded">Before/After Photos</span>
                    )}
                    {niche.config.features.technician_metadata && (
                      <span className="px-2 py-1 bg-gray-100 text-xs rounded">Technician Tracking</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedNicheId && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <label htmlFor="customDomain" className="block text-sm font-medium text-gray-700 mb-2">
            Custom Domain (Optional)
          </label>
          <div className="flex">
            <input
              type="text"
              id="customDomain"
              value={customDomain}
              onChange={handleCustomDomainChange}
              placeholder="your-business.getgetleads.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm">
              .getgetleads.com
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Leave empty to use the default subdomain format
          </p>
        </div>
      )}
    </div>
  )
}

export default NicheSelector