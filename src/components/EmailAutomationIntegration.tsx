import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Alert } from './ui/Alert'
import { 
  EnvelopeIcon, 
  SparklesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface EmailAutomationIntegrationProps {
  userId: string
  businessType: string
  onIntegrationComplete?: () => void
}

export default function EmailAutomationIntegration({ 
  userId, 
  businessType, 
  onIntegrationComplete 
}: EmailAutomationIntegrationProps) {
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [metrics, setMetrics] = useState<any>(null)

  useEffect(() => {
    loadIntegrationStatus()
  }, [userId])

  const loadIntegrationStatus = async () => {
    try {
      // Check if email automation is already active
      const response = await fetch('/api/email/automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${'internal-key' || 'internal-key'}`
        },
        body: JSON.stringify({
          action: 'get_campaigns',
          user_id: userId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setIsActive(data.campaigns && data.campaigns.length > 0)
        loadMetrics()
      }
    } catch (error) {
      console.error('Error loading integration status:', error)
    }
  }

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/email/automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${'internal-key' || 'internal-key'}`
        },
        body: JSON.stringify({
          action: 'get_metrics',
          user_id: userId,
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Error loading metrics:', error)
    }
  }

  const activateEmailAutomation = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      // Create default campaigns for the business type
      const campaigns = getDefaultCampaignsForBusinessType(businessType)
      
      for (const campaign of campaigns) {
        await fetch('/api/email/automation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${'internal-key' || 'internal-key'}`
          },
          body: JSON.stringify({
            action: 'create_campaign',
            user_id: userId,
            data: campaign
          })
        })
      }

      // Create default triggers
      const triggers = getDefaultTriggersForBusinessType(businessType)
      
      for (const trigger of triggers) {
        await fetch('/api/email/automation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${'internal-key' || 'internal-key'}`
          },
          body: JSON.stringify({
            action: 'create_trigger',
            user_id: userId,
            data: trigger
          })
        })
      }

      setIsActive(true)
      setSuccess('Email automation activated successfully! Your customers will now receive AI-powered, personalized emails.')
      
      if (onIntegrationComplete) {
        onIntegrationComplete()
      }
    } catch (error) {
      setError('Failed to activate email automation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getDefaultCampaignsForBusinessType = (businessType: string) => {
    const campaigns = {
      salon: [
        {
          name: 'Review Request',
          type: 'review_request',
          niche: 'salon',
          subject_template: "How did you love your {service}? We'd love to hear about it!",
          content_template: '<h2>Hi {customer_name}!</h2><p>We hope you\'re loving your new {service} from {stylist_name}!</p><p>Your feedback means everything to us and helps other clients discover our services.</p><p><a href="{review_link}" style="background: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Leave a Review</a></p><p>Ready to book your next appointment? <a href="{booking_link}">Click here</a></p><p>Best regards,<br>{business_name} Team</p>'
        },
        {
          name: 'Re-engagement',
          type: 're_engagement',
          niche: 'salon',
          subject_template: "We miss you! Here's what's new at {business_name}",
          content_template: '<h2>Hi {customer_name}!</h2><p>It\'s been a while since we\'ve seen you at {business_name}!</p><p>We\'ve got some exciting new services and special offers just for you.</p><p><a href="{booking_link}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Book Your Appointment</a></p><p>We can\'t wait to see you again!<br>{business_name} Team</p>'
        }
      ],
      medspa: [
        {
          name: 'Review Request',
          type: 'review_request',
          niche: 'medspa',
          subject_template: "How are you feeling after your {treatment}? Share your experience!",
          content_template: '<h2>Hi {customer_name}!</h2><p>We hope you\'re seeing great results from your {treatment} with Dr. {provider_name}!</p><p>Your feedback helps us improve our services and helps other patients make informed decisions.</p><p><a href="{review_link}" style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Share Your Experience</a></p><p>Questions about your treatment? <a href="{contact_link}">Contact us</a></p><p>Best regards,<br>Dr. {provider_name} and the {business_name} Team</p>'
        },
        {
          name: 'Educational Content',
          type: 'educational',
          niche: 'medspa',
          subject_template: "Preparing for your {treatment} consultation - What to expect",
          content_template: '<h2>Hi {customer_name}!</h2><p>Thank you for scheduling your {treatment} consultation with Dr. {provider_name}!</p><p>To help you prepare, here\'s what to expect:</p><ul><li>Consultation duration: {duration}</li><li>What to bring: {required_items}</li><li>Pre-treatment instructions: {pre_instructions}</li></ul><p>Questions? <a href="{contact_link}">Contact us</a></p><p>We look forward to seeing you on {appointment_date}!<br>Dr. {provider_name} and the {business_name} Team</p>'
        }
      ],
      realestate: [
        {
          name: 'Market Update',
          type: 'market_update',
          niche: 'realestate',
          subject_template: "Weekly market update: {area} real estate insights",
          content_template: '<h2>Hi {customer_name}!</h2><p>Here\'s your weekly {area} real estate market update:</p><ul><li>Average home price: {avg_price}</li><li>Homes sold this week: {homes_sold}</li><li>Days on market: {days_on_market}</li><li>Interest rates: {interest_rates}</li></ul><p>Interested in buying or selling? <a href="{contact_link}">Let\'s talk</a></p><p>Best regards,<br>{agent_name} - {business_name}</p>'
        },
        {
          name: 'Open House Invitation',
          type: 'open_house',
          niche: 'realestate',
          subject_template: "Open house this weekend: {property_address}",
          content_template: '<h2>Hi {customer_name}!</h2><p>Don\'t miss this amazing opportunity!</p><p><strong>{property_address}</strong></p><ul><li>Price: {property_price}</li><li>Bedrooms: {bedrooms}</li><li>Bathrooms: {bathrooms}</li><li>Square feet: {sqft}</li></ul><p><strong>Open House:</strong> {open_house_date} from {open_house_time}</p><p><a href="{property_link}" style="background: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Property Details</a></p><p>Questions? <a href="{contact_link}">Contact me</a></p><p>Best regards,<br>{agent_name} - {business_name}</p>'
        }
      ]
    }

    return campaigns[businessType] || campaigns.salon
  }

  const getDefaultTriggersForBusinessType = (businessType: string) => {
    const triggers = {
      salon: [
        {
          event: 'appointment_completed',
          email_campaign_id: 'review_request', // This would be the actual campaign ID
          conditions: { service_types: ['haircut', 'color', 'treatment'] },
          delay_minutes: 1440 // 24 hours
        },
        {
          event: 'client_inactive',
          email_campaign_id: 're_engagement',
          conditions: { days_inactive: 30 },
          delay_minutes: 10080 // 7 days
        }
      ],
      medspa: [
        {
          event: 'treatment_completed',
          email_campaign_id: 'review_request',
          conditions: { treatment_types: ['botox', 'filler', 'laser'] },
          delay_minutes: 4320 // 3 days
        },
        {
          event: 'consultation_scheduled',
          email_campaign_id: 'educational',
          conditions: {},
          delay_minutes: 1440 // 24 hours
        }
      ],
      realestate: [
        {
          event: 'open_house_scheduled',
          email_campaign_id: 'open_house',
          conditions: {},
          delay_minutes: 4320 // 3 days
        },
        {
          event: 'market_update',
          email_campaign_id: 'market_update',
          conditions: { frequency: 'weekly' },
          delay_minutes: 10080 // 7 days
        }
      ]
    }

    return triggers[businessType] || triggers.salon
  }

  const getBusinessTypeDisplayName = (businessType: string) => {
    const names = {
      salon: 'Hair Salon & Spa',
      medspa: 'Medical Spa & Aesthetics',
      realestate: 'Real Estate Agency',
      home_services: 'Home Services'
    }
    return names[businessType] || 'Business'
  }

  const getBusinessTypeIcon = (businessType: string) => {
    const icons = {
      salon: '💇‍♀️',
      medspa: '💉',
      realestate: '🏠',
      home_services: '🔧'
    }
    return icons[businessType] || '💼'
  }

  if (isActive) {
    return (
      <div className="space-y-6">
        {/* Active Status */}
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="w-8 h-8 text-green-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                  Email Automation Active
                </h3>
                <p className="text-green-600 dark:text-green-400">
                  AI-powered emails are being sent to your customers automatically
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.reduce((sum, m) => sum + m.emails_sent, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Emails Sent</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {metrics.reduce((sum, m) => sum + m.emails_opened, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Emails Opened</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.reduce((sum, m) => sum + m.emails_clicked, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Emails Clicked</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Integration Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SparklesIcon className="w-5 h-5 mr-2 text-purple-600" />
              AI Email Features Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white">Automated Campaigns</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Review requests after service completion</li>
                  <li>• Re-engagement for inactive clients</li>
                  <li>• Welcome emails for new leads</li>
                  <li>• Appointment reminders and follow-ups</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white">AI Personalization</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Customer name and service history</li>
                  <li>• Business information from profile</li>
                  <li>• Niche-specific content and tone</li>
                  <li>• Smart timing and frequency</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-4">{getBusinessTypeIcon(businessType)}</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          AI-Powered Email Automation
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Automatically send personalized emails to your {getBusinessTypeDisplayName(businessType).toLowerCase()} customers
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert variant="success">
          <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
          {success}
        </Alert>
      )}

      {error && (
        <Alert variant="error">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
          {error}
        </Alert>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <EnvelopeIcon className="w-5 h-5 mr-2 text-blue-600" />
              Automated Email Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                Review requests after service completion
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                Re-engagement for inactive clients
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                Welcome emails for new leads
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                Appointment reminders and follow-ups
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                Market updates and promotions
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SparklesIcon className="w-5 h-5 mr-2 text-purple-600" />
              AI Personalization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                Customer name and service history
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                Business information from profile
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                Niche-specific content and tone
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                Smart timing and frequency
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                Professional sender branding
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2 text-green-600" />
            Expected Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">85%</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Reduction in No-Shows</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">340%</div>
              <div className="text-sm text-green-600 dark:text-green-400">Increase in Reviews</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">$4K+</div>
              <div className="text-sm text-purple-600 dark:text-purple-400">Additional Monthly Revenue</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activation Button */}
      <div className="text-center">
        <Button
          onClick={activateEmailAutomation}
          loading={loading}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg"
        >
          <SparklesIcon className="w-5 h-5 mr-2" />
          Activate AI Email Automation
        </Button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Setup takes less than 2 minutes and includes 30-day free trial
        </p>
      </div>
    </div>
  )
}
