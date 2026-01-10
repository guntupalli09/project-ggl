import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { 
  EnvelopeIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface EmailPreviewData {
  id: string
  customer_email: string
  customer_name: string
  subject: string
  content: string
  campaign_type: string
  status: string
  sent_at: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  personalization_data: any
}

export default function EmailPreview() {
  const { emailId } = useParams<{ emailId: string }>()
  const [email, setEmail] = useState<EmailPreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (emailId) {
      loadEmailPreview(emailId)
    }
  }, [emailId])

  const loadEmailPreview = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch('/api/email/management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`
        },
        body: JSON.stringify({
          action: 'get_email_details',
          user_id: 'current-user', // This would be the actual user ID
          email_id: id
        })
      })

      if (response.ok) {
        const data = await response.json()
        setEmail(data.email)
      } else {
        throw new Error('Failed to load email preview')
      }
    } catch (error) {
      console.error('Error loading email preview:', error)
      setError('Failed to load email preview')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      sent: 'text-blue-600',
      delivered: 'text-green-600',
      opened: 'text-purple-600',
      clicked: 'text-indigo-600',
      bounced: 'text-red-600',
      failed: 'text-red-600'
    }
    return colors[status as keyof typeof colors] || 'text-gray-600'
  }

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: JSX.Element } = {
      sent: <ClockIcon className="w-5 h-5" />,
      delivered: <CheckCircleIcon className="w-5 h-5" />,
      opened: <CheckCircleIcon className="w-5 h-5" />,
      clicked: <CheckCircleIcon className="w-5 h-5" />,
      bounced: <ExclamationTriangleIcon className="w-5 h-5" />,
      failed: <ExclamationTriangleIcon className="w-5 h-5" />
    }
    return icons[status as keyof typeof icons] || <ClockIcon className="w-5 h-5" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading email preview...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Email
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <EnvelopeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Email Not Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The email you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Email Management
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Email Preview
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View the content and details of this email
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email Details */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <EnvelopeIcon className="w-5 h-5 mr-2 text-blue-600" />
                  Email Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</span>
                  <div className={`flex items-center mt-1 ${getStatusColor(email.status)}`}>
                    {getStatusIcon(email.status)}
                    <span className="ml-2 capitalize">{email.status}</span>
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">To</span>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {email.customer_email}
                    {email.customer_name && (
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        ({email.customer_name})
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Campaign</span>
                  <p className="text-sm text-gray-900 dark:text-white capitalize">
                    {email.campaign_type.replace('_', ' ')}
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Sent</span>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDate(email.sent_at)}
                  </p>
                </div>

                {email.delivered_at && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivered</span>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatDate(email.delivered_at)}
                    </p>
                  </div>
                )}

                {email.opened_at && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Opened</span>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatDate(email.opened_at)}
                    </p>
                  </div>
                )}

                {email.clicked_at && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Clicked</span>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatDate(email.clicked_at)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personalization Data */}
            {email.personalization_data && Object.keys(email.personalization_data).length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Personalization Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                    {JSON.stringify(email.personalization_data, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Email Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Email Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Subject</span>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                      {email.subject}
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Content</span>
                    <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                          <span>From: Your Business via GetGetLeads</span>
                          <span>•</span>
                          <span>To: {email.customer_email}</span>
                        </div>
                      </div>
                      <div 
                        className="p-4 bg-white dark:bg-gray-900"
                        dangerouslySetInnerHTML={{ __html: email.content }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
