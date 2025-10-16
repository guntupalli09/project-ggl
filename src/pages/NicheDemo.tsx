import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckIcon, StarIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'
import WorkflowAutomationDemo from '../components/WorkflowAutomationDemo'

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

const NicheDemo: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [nicheTemplates, setNicheTemplates] = useState<NicheTemplate[]>([])
  const [selectedNiche, setSelectedNiche] = useState<NicheTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchNicheTemplates()
  }, [])

  const fetchNicheTemplates = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/niche-templates')
      if (!response.ok) {
        throw new Error(`Failed to fetch niche templates: ${response.status}`)
      }
      const data = await response.json()
      setNicheTemplates(data)
      if (data.length > 0) {
        setSelectedNiche(data[0])
      }
    } catch (err) {
      console.error('Error fetching niche templates:', err)
      
      // Fallback to mock data if backend is not available
      console.log('Using fallback niche templates data')
      const fallbackData: NicheTemplate[] = [
        {
          id: 'salon-barber-spa',
          name: 'salon_barber_spa',
          display_name: 'Salon/Barber/Spa',
          config: {
            branding: {
              primary_color: '#6366F1',
              secondary_color: '#8B5CF6',
              logo_url: '/niche_logos/salon.png',
              font_family: 'Inter'
            },
            workflow: {
              lead_to_booking: { automation_enabled: true, delay_minutes: 0 },
              booking_to_review: { automation_enabled: true, delay_minutes: 120, channel: 'email' },
              review_to_referral: { automation_enabled: true, delay_minutes: 0, channel: 'email' }
            },
            content_templates: {
              review_request: 'Hi {{customer_name}}, thanks for visiting {{business_name}}! We\'d love your feedback: {{review_link}}',
              referral_offer: 'Loved your experience? Refer a friend and get 10% off! {{referral_link}}',
              booking_confirmation: 'Your booking at {{business_name}} is confirmed for {{booking_time}}.'
            },
            features: {
              before_after_photos: false,
              hipaa_compliant_feedback: false,
              technician_metadata: false
            }
          }
        },
        {
          id: 'home-services',
          name: 'home_services',
          display_name: 'Home Services',
          config: {
            branding: {
              primary_color: '#22C55E',
              secondary_color: '#10B981',
              logo_url: '/niche_logos/home_services.png',
              font_family: 'Roboto'
            },
            workflow: {
              lead_to_booking: { automation_enabled: true, delay_minutes: 0 },
              booking_to_review: { automation_enabled: true, delay_minutes: 360, channel: 'sms' },
              review_to_referral: { automation_enabled: true, delay_minutes: 0, channel: 'sms' }
            },
            content_templates: {
              review_request: 'Hi {{customer_name}}, how was our service at {{business_name}}? Share your thoughts: {{review_link}}',
              referral_offer: 'Happy with our service? Refer a friend and get a discount! {{referral_link}}',
              booking_confirmation: 'Your {{service_type}} appointment with {{business_name}} is scheduled for {{booking_time}}.'
            },
            features: {
              before_after_photos: true,
              hipaa_compliant_feedback: false,
              technician_metadata: true
            }
          }
        },
        {
          id: 'med-spa',
          name: 'med_spa',
          display_name: 'Med Spa/Aesthetic Clinic',
          config: {
            branding: {
              primary_color: '#EC4899',
              secondary_color: '#E879F9',
              logo_url: '/niche_logos/med_spa.png',
              font_family: 'Montserrat'
            },
            workflow: {
              lead_to_booking: { automation_enabled: true, delay_minutes: 0 },
              booking_to_review: { automation_enabled: true, delay_minutes: 1440, channel: 'email' },
              review_to_referral: { automation_enabled: true, delay_minutes: 0, channel: 'email' }
            },
            content_templates: {
              review_request: 'Dear {{customer_name}}, we value your feedback on your recent visit to {{business_name}}. Please share your thoughts confidentially: {{feedback_link}}',
              referral_offer: 'We appreciate your trust. Refer a friend to {{business_name}} and receive a special offer.',
              booking_confirmation: 'Your appointment at {{business_name}} is confirmed for {{booking_time}}. We look forward to seeing you.'
            },
            features: {
              before_after_photos: false,
              hipaa_compliant_feedback: true,
              technician_metadata: false
            }
          }
        }
      ]
      
      setNicheTemplates(fallbackData)
      if (fallbackData.length > 0) {
        setSelectedNiche(fallbackData[0])
      }
      setError('Backend server not available. Using demo data. Please start the backend server for full functionality.')
    } finally {
      setLoading(false)
    }
  }

  const handleNicheChange = async () => {
    if (!selectedNiche || !user?.id) {
      setError('Please select a niche and ensure you are logged in')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:3001/api/tenant/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          nicheTemplateId: selectedNiche.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update niche')
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/profile')
      }, 2000)
    } catch (err: any) {
      console.error('Error updating niche:', err)
      setError(`Failed to update niche: ${err.message}. Please ensure the backend server is running.`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Multi-Niche Configuration System
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            GetGetLeads automatically adapts to your business type with niche-specific workflows, 
            automation rules, and content templates.
          </p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800">Niche updated successfully! Redirecting to profile...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Niche Selection */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Niche</h2>
            <div className="space-y-4">
              {nicheTemplates.map((niche) => (
                <div
                  key={niche.id}
                  onClick={() => setSelectedNiche(niche)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedNiche?.id === niche.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {niche.display_name}
                    </h3>
                    {selectedNiche?.id === niche.id && (
                      <CheckIcon className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                      <span>Review delay: {niche.config?.workflow?.booking_to_review?.delay_minutes ? 
                        `${niche.config.workflow.booking_to_review.delay_minutes / 60}h` : 
                        'Not configured'
                      }</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <span className="font-medium">Compliance:</span>
                      <span className="ml-2 px-2 py-1 bg-gray-100 text-xs rounded">
                        {niche.config?.features?.hipaa_compliant_feedback ? 'HIPAA' : 'Standard'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Save Button */}
            {selectedNiche && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleNicheChange}
                  disabled={saving}
                  className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                    saving
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {saving ? 'Updating Niche...' : 'Update My Niche'}
                </button>
              </div>
            )}
          </div>

          {/* Niche Configuration Preview */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Configuration Preview</h2>
            {selectedNiche && selectedNiche.config ? (
              <div className="space-y-6">
                {/* Branding */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Branding</h3>
                  <div className="flex space-x-4">
                    <div className="flex items-center">
                      <div 
                        className="w-8 h-8 rounded-full mr-2"
                        style={{ backgroundColor: selectedNiche.config.branding.primary_color }}
                      ></div>
                      <span className="text-sm text-gray-600">Primary</span>
                    </div>
                    <div className="flex items-center">
                      <div 
                        className="w-8 h-8 rounded-full mr-2"
                        style={{ backgroundColor: selectedNiche.config.branding.secondary_color }}
                      ></div>
                      <span className="text-sm text-gray-600">Secondary</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Font: {selectedNiche.config.branding.font_family}
                  </p>
                </div>

                {/* Workflow */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Automation Workflow</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Lead → Booking</span>
                      <span className="text-xs text-green-600">Immediate</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Booking → Review</span>
                      <span className="text-xs text-blue-600">
                        {selectedNiche.config?.workflow?.booking_to_review?.delay_minutes ? 
                          `${selectedNiche.config.workflow.booking_to_review.delay_minutes / 60}h via ${selectedNiche.config.workflow.booking_to_review.channel}` :
                          'Not configured'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium">Review → Referral</span>
                      <span className="text-xs text-purple-600">
                        {selectedNiche.config?.workflow?.review_to_referral?.delay_minutes ? 
                          `${selectedNiche.config.workflow.review_to_referral.delay_minutes / 60}h via ${selectedNiche.config.workflow.review_to_referral.channel}` :
                          'Not configured'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content Templates */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Content Templates</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs font-medium text-gray-700 mb-1">Review Request</p>
                      <p className="text-sm text-gray-600">
                        {selectedNiche.config?.content_templates?.review_request || 'Not configured'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs font-medium text-gray-700 mb-1">Referral Offer</p>
                      <p className="text-sm text-gray-600">
                        {selectedNiche.config?.content_templates?.referral_offer || 'Not configured'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Special Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedNiche.config?.features?.before_after_photos && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Before/After Photos
                      </span>
                    )}
                    {selectedNiche.config?.features?.hipaa_compliant_feedback && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        HIPAA Compliant
                      </span>
                    )}
                    {selectedNiche.config?.features?.technician_metadata && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                        Technician Tracking
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Select a niche to see configuration details</p>
            )}
          </div>
        </div>

        {/* Workflow Automation Demo */}
        <div className="mt-12">
          <WorkflowAutomationDemo nicheTemplateId={selectedNiche?.id} />
        </div>

        {/* Benefits Section */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Why Multi-Niche Configuration?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Industry-Specific</h3>
              <p className="text-gray-600">
                Each niche has tailored workflows, compliance requirements, and content templates.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <StarIcon className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Automated Setup</h3>
              <p className="text-gray-600">
                No manual configuration needed. Your business gets the right settings automatically.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Scalable</h3>
              <p className="text-gray-600">
                Easy to add new niches and customize existing ones as your business grows.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NicheDemo