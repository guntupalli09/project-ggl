import { useState, useEffect } from 'react'
import { Card, CardContent } from './ui/Card'
import { Button } from './ui/Button'
import { Alert } from './ui/Alert'
import { Badge } from './ui/Badge'
import { 
  EnvelopeIcon, 
  EyeIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface EmailLog {
  id: string
  customer_email: string
  customer_name: string
  subject: string
  content: string
  campaign_type: string
  workflow_name?: string
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'failed'
  sent_at: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  bounced_at?: string
  error_message?: string
  personalization_data: any
}

interface EmailManagementProps {
  userId: string
  businessType: string
}

export default function EmailManagement({ userId, businessType: _businessType }: EmailManagementProps) {
  const [emails, setEmails] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    campaign_type: 'all',
    date_range: '7d'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadEmails()
  }, [userId, filters, searchTerm, currentPage])

  const loadEmails = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/email/management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_emails',
          user_id: userId,
          filters: filters,
          search: searchTerm,
          page: currentPage,
          limit: 20
        })
      })

      if (response.ok) {
        const data = await response.json()
        setEmails(data.emails || [])
        setTotalPages(data.totalPages || 1)
      } else {
        throw new Error('Failed to load emails')
      }
    } catch (error) {
      console.error('Error loading emails:', error)
      setError('Failed to load emails')
    } finally {
      setLoading(false)
    }
  }

  const resendEmail = async (emailId: string) => {
    try {
      const response = await fetch('/api/email/management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'resend_email',
          user_id: userId,
          email_id: emailId
        })
      })

      if (response.ok) {
        setSuccess('Email resent successfully')
        loadEmails()
      } else {
        throw new Error('Failed to resend email')
      }
    } catch (error) {
      setError('Failed to resend email')
    }
  }

  const deleteEmail = async (emailId: string) => {
    try {
      const response = await fetch('/api/email/management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete_email',
          user_id: userId,
          email_id: emailId
        })
      })

      if (response.ok) {
        setSuccess('Email deleted successfully')
        loadEmails()
      } else {
        throw new Error('Failed to delete email')
      }
    } catch (error) {
      setError('Failed to delete email')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      sent: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      opened: 'bg-purple-100 text-purple-800',
      clicked: 'bg-indigo-100 text-indigo-800',
      bounced: 'bg-red-100 text-red-800',
      unsubscribed: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: JSX.Element } = {
      sent: <ClockIcon className="w-4 h-4" />,
      delivered: <CheckCircleIcon className="w-4 h-4" />,
      opened: <EyeIcon className="w-4 h-4" />,
      clicked: <ChartBarIcon className="w-4 h-4" />,
      bounced: <ExclamationTriangleIcon className="w-4 h-4" />,
      unsubscribed: <PauseIcon className="w-4 h-4" />,
      failed: <ExclamationTriangleIcon className="w-4 h-4" />
    }
    return icons[status as keyof typeof icons] || <ClockIcon className="w-4 h-4" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getCampaignTypeDisplay = (campaignType: string) => {
    const types: { [key: string]: string } = {
      review_request: 'Review Request',
      re_engagement: 'Re-engagement',
      welcome: 'Welcome Series',
      appointment_reminder: 'Appointment Reminder',
      educational: 'Educational Content',
      market_update: 'Market Update',
      open_house: 'Open House Invite',
      lead_nurturing: 'Lead Nurturing',
      maintenance_reminder: 'Maintenance Reminder',
      follow_up: 'Follow-up'
    }
    return types[campaignType as keyof typeof types] || campaignType
  }

  const filteredEmails = emails.filter(email => {
    if (filters.status !== 'all' && email.status !== filters.status) return false
    if (filters.campaign_type !== 'all' && email.campaign_type !== filters.campaign_type) return false
    if (searchTerm && !email.subject.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !email.customer_email.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Email Management</h2>
          <p className="text-gray-600 dark:text-gray-400">
            View, manage, and track all your email communications
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {emails.length} emails
        </div>
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

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search emails by subject or recipient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="opened">Opened</option>
              <option value="clicked">Clicked</option>
              <option value="bounced">Bounced</option>
              <option value="failed">Failed</option>
            </select>

            {/* Campaign Type Filter */}
            <select
              value={filters.campaign_type}
              onChange={(e) => setFilters(prev => ({ ...prev, campaign_type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Campaigns</option>
              <option value="review_request">Review Request</option>
              <option value="re_engagement">Re-engagement</option>
              <option value="welcome">Welcome Series</option>
              <option value="appointment_reminder">Appointment Reminder</option>
              <option value="educational">Educational Content</option>
              <option value="market_update">Market Update</option>
            </select>

            {/* Date Range Filter */}
            <select
              value={filters.date_range}
              onChange={(e) => setFilters(prev => ({ ...prev, date_range: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Emails List */}
      <div className="space-y-4">
        {filteredEmails.map((email) => (
          <Card key={email.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Badge className={getStatusColor(email.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(email.status)}
                        <span className="capitalize">{email.status}</span>
                      </div>
                    </Badge>
                    <Badge variant="outline">
                      {getCampaignTypeDisplay(email.campaign_type)}
                    </Badge>
                    {email.workflow_name && (
                      <Badge variant="secondary">
                        {email.workflow_name}
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {email.subject}
                  </h3>

                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span className="font-medium">To:</span> {email.customer_email}
                    {email.customer_name && (
                      <span className="ml-2">({email.customer_name})</span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Sent:</span> {formatDate(email.sent_at)}
                    {email.delivered_at && (
                      <span className="ml-4">
                        <span className="font-medium">Delivered:</span> {formatDate(email.delivered_at)}
                      </span>
                    )}
                    {email.opened_at && (
                      <span className="ml-4">
                        <span className="font-medium">Opened:</span> {formatDate(email.opened_at)}
                      </span>
                    )}
                    {email.clicked_at && (
                      <span className="ml-4">
                        <span className="font-medium">Clicked:</span> {formatDate(email.clicked_at)}
                      </span>
                    )}
                  </div>

                  {email.error_message && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      <span className="font-medium">Error:</span> {email.error_message}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedEmail(email)
                      setShowPreview(true)
                    }}
                    className="p-2"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </Button>
                  
                  {email.status === 'failed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resendEmail(email.id)}
                      className="p-2 text-green-600 hover:text-green-700"
                    >
                      <PlayIcon className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteEmail(email.id)}
                    className="p-2 text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredEmails.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <EnvelopeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Emails Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || filters.status !== 'all' || filters.campaign_type !== 'all' 
                ? 'Try adjusting your filters or search terms.'
                : 'No emails have been sent yet. Activate your email workflows to start sending emails.'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Email Preview Modal */}
      {showPreview && selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Email Preview
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => setShowPreview(false)}
                  className="p-2"
                >
                  <XMarkIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-4">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Subject:</span>
                  <p className="text-gray-600 dark:text-gray-400">{selectedEmail.subject}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">To:</span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedEmail.customer_email} {selectedEmail.customer_name && `(${selectedEmail.customer_name})`}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Content:</span>
                  <div 
                    className="mt-2 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.content }}
                  />
                </div>
                {selectedEmail.personalization_data && (
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Personalization Data:</span>
                    <pre className="mt-2 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm overflow-x-auto">
                      {JSON.stringify(selectedEmail.personalization_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
