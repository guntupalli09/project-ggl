import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { Alert } from './ui/Alert'
import { 
  EnvelopeIcon, 
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface EmailIntegrationProps {
  userId: string
  businessType: 'salon' | 'medspa' | 'realestate' | 'home_services'
  onEmailSetup?: (domain: string) => void
}

export default function EmailIntegration({ userId, businessType, onEmailSetup }: EmailIntegrationProps) {
  const [emailSetup, setEmailSetup] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Business-specific configurations
  const businessConfigs = {
    salon: {
      name: "Hair Salon & Spa",
      icon: "💇‍♀️",
      primaryEmails: ["Appointment Reminders", "Service Follow-up", "Review Requests", "Promotional Offers"],
      timing: "Tuesday-Thursday, 9-11 AM & 2-4 PM",
      compliance: "GDPR Compliant",
      expectedResults: {
        noShowReduction: "85%",
        reviewIncrease: "340%",
        revenueIncrease: "$4,000/month"
      }
    },
    medspa: {
      name: "Medical Spa & Aesthetics",
      icon: "💉",
      primaryEmails: ["Consultation Reminders", "Pre-Treatment Instructions", "Post-Treatment Care", "Follow-up Appointments"],
      timing: "Tuesday-Thursday, 9-11 AM & 2-3 PM",
      compliance: "HIPAA Compliant",
      expectedResults: {
        consultationIncrease: "40%",
        treatmentCompletion: "85%",
        revenueIncrease: "$6,000/month"
      }
    },
    realestate: {
      name: "Real Estate Agency",
      icon: "🏠",
      primaryEmails: ["Open House Invites", "Market Updates", "New Listing Alerts", "Buyer Education"],
      timing: "Monday-Friday, 8-10 AM & 1-3 PM",
      compliance: "CAN-SPAM Compliant",
      expectedResults: {
        leadGeneration: "15+ per month",
        referralRate: "40%",
        revenueIncrease: "$8,000/month"
      }
    },
    home_services: {
      name: "Home Services",
      icon: "🔧",
      primaryEmails: ["Service Confirmations", "Technician Updates", "Maintenance Reminders", "Follow-up Care"],
      timing: "Monday-Friday, 8-10 AM & 1-3 PM",
      compliance: "GDPR Compliant",
      expectedResults: {
        serviceCompletion: "95%",
        repeatBusiness: "70%",
        revenueIncrease: "$3,000/month"
      }
    }
  }

  const config = businessConfigs[businessType]

  useEffect(() => {
    loadEmailSetup()
  }, [userId])

  const loadEmailSetup = async () => {
    try {
      setLoading(true)
      // This would load the user's email setup status
      // For demo purposes, we'll simulate the data
      setEmailSetup({
        domain: 'sarahsbeautystudio.com',
        status: 'warming',
        stage: 3,
        dailyLimit: 50,
        emailsSentToday: 23,
        reputationScore: 0.78
      })
      setLoading(false)
    } catch (err) {
      setError('Failed to load email setup')
      setLoading(false)
    }
  }

  const handleSetupEmail = async () => {
    try {
      setLoading(true)
      setError('')
      
      // This would initialize the email warm-up process
      const response = await fetch('/api/email/warmup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${'internal-key' || 'internal-key'}`
        },
        body: JSON.stringify({
          action: 'initialize',
          user_id: userId,
          domain: 'yourbusiness.com', // This would come from user input
          business_type: businessType
        })
      })

      if (!response.ok) {
        throw new Error('Failed to setup email system')
      }

      const result = await response.json()
      setEmailSetup(result)
      setSuccess('Email system setup successfully! Your domain is now warming up.')
      
      if (onEmailSetup) {
        onEmailSetup(result.domain)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const getReputationColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getReputationIcon = (score: number) => {
    if (score >= 0.8) return <CheckCircleIcon className="w-5 h-5 text-green-600" />
    if (score >= 0.6) return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
    return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
  }

  if (loading && !emailSetup) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-2">{config.icon}</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          AI-Powered Email Strategy for {config.name}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Transform your email marketing with intelligent automation and personalization
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

      {/* Email Setup Status */}
      {emailSetup ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <EnvelopeIcon className="w-5 h-5 mr-2 text-blue-600" />
                Email System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Domain</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{emailSetup.domain}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Status</span>
                  <span className={`text-sm font-medium ${
                    emailSetup.status === 'warming' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {emailSetup.status === 'warming' ? 'Warming Up' : 'Active'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Current Stage</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {emailSetup.stage}/6
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Daily Limit</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {emailSetup.emailsSentToday}/{emailSetup.dailyLimit} emails
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Reputation Score</span>
                  <div className="flex items-center">
                    <span className={`text-sm font-medium ${getReputationColor(emailSetup.reputationScore)}`}>
                      {Math.round(emailSetup.reputationScore * 100)}%
                    </span>
                    {getReputationIcon(emailSetup.reputationScore)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expected Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ChartBarIcon className="w-5 h-5 mr-2 text-green-600" />
                Expected Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(config.expectedResults).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm font-medium text-green-800 dark:text-green-200 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-sm font-bold text-green-600">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Setup Email System */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SparklesIcon className="w-5 h-5 mr-2 text-purple-600" />
              Setup Your Email System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Ready to Transform Your Email Marketing?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Our AI-powered email system will help you build a strong reputation, 
                  reduce no-shows, increase reviews, and generate more revenue.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Email Types</h4>
                  <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                    {config.primaryEmails.map((email, index) => (
                      <li key={index}>• {email}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Optimization</h4>
                  <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
                    <li>• Best send times: {config.timing}</li>
                    <li>• {config.compliance}</li>
                    <li>• AI-powered personalization</li>
                    <li>• Automated follow-ups</li>
                  </ul>
                </div>
              </div>

              <div className="text-center">
                <Button 
                  onClick={handleSetupEmail}
                  loading={loading}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 text-lg"
                >
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  Setup Email System
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Setup takes less than 2 minutes and includes 30-day free trial
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <SparklesIcon className="w-5 h-5 mr-2 text-purple-600" />
            AI-Powered Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Smart Personalization</h4>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                AI analyzes client history and preferences to create highly personalized emails
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Predictive Analytics</h4>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Predicts no-show risk, churn probability, and optimal send times
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Automated Optimization</h4>
              <p className="text-sm text-green-600 dark:text-green-400">
                Continuously tests and optimizes subject lines, content, and timing
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Points */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserGroupIcon className="w-5 h-5 mr-2 text-orange-600" />
            Seamless Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <CalendarIcon className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Calendar Integration</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automatic appointment reminders and follow-ups
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <ChartBarIcon className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Review Management</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automated review requests after service completion
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <EnvelopeIcon className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Lead Nurturing</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  AI-powered welcome series for new leads
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <ClockIcon className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Smart Timing</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Learns optimal send times for each client
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
