import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { 
  EnvelopeIcon, 
  ChartBarIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

interface EmailMetrics {
  totalSent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  failed: number
  deliveryRate: number
  openRate: number
  clickRate: number
  bounceRate: number
  campaignBreakdown: Record<string, number>
  recentActivity: number
}

interface EmailDashboardProps {
  userId: string
  businessType: string
}

export default function EmailDashboard({ userId, businessType: _businessType }: EmailDashboardProps) {
  const [metrics, setMetrics] = useState<EmailMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadEmailMetrics()
  }, [userId])

  const loadEmailMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/email/management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_email_metrics',
          user_id: userId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics)
      } else {
        throw new Error('Failed to load email metrics')
      }
    } catch (error) {
      console.error('Error loading email metrics:', error)
      setError('Failed to load email metrics')
    } finally {
      setLoading(false)
    }
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

  const getRateColor = (rate: number, type: 'delivery' | 'open' | 'click' | 'bounce') => {
    if (type === 'bounce') {
      if (rate <= 2) return 'text-green-600'
      if (rate <= 5) return 'text-yellow-600'
      return 'text-red-600'
    }
    
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRateIcon = (rate: number, type: 'delivery' | 'open' | 'click' | 'bounce') => {
    if (type === 'bounce') {
      if (rate <= 2) return <ArrowTrendingDownIcon className="w-4 h-4 text-green-600" />
      if (rate <= 5) return <ArrowTrendingUpIcon className="w-4 h-4 text-yellow-600" />
      return <ArrowTrendingUpIcon className="w-4 h-4 text-red-600" />
    }
    
    if (rate >= 80) return <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
    if (rate >= 60) return <ArrowTrendingUpIcon className="w-4 h-4 text-yellow-600" />
    return <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
  }

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Error Loading Email Metrics
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <Button onClick={loadEmailMetrics}>
          Try Again
        </Button>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-8">
        <EnvelopeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Email Data
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Start sending emails to see your metrics here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Email Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Track your email performance and engagement
          </p>
        </div>
        <Button onClick={loadEmailMetrics} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sent */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg mr-4">
                <EnvelopeIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sent</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics?.totalSent?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg mr-4">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivery Rate</p>
                <div className="flex items-center">
                  <p className={`text-2xl font-bold ${getRateColor(metrics?.deliveryRate || 0, 'delivery')}`}>
                    {metrics?.deliveryRate || 0}%
                  </p>
                  {getRateIcon(metrics?.deliveryRate || 0, 'delivery')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Open Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg mr-4">
                <EyeIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Open Rate</p>
                <div className="flex items-center">
                  <p className={`text-2xl font-bold ${getRateColor(metrics?.openRate || 0, 'open')}`}>
                    {metrics?.openRate || 0}%
                  </p>
                  {getRateIcon(metrics?.openRate || 0, 'open')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Click Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg mr-4">
                <CursorArrowRaysIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Click Rate</p>
                <div className="flex items-center">
                  <p className={`text-2xl font-bold ${getRateColor(metrics?.clickRate || 0, 'click')}`}>
                    {metrics?.clickRate || 0}%
                  </p>
                  {getRateIcon(metrics?.clickRate || 0, 'click')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ChartBarIcon className="w-5 h-5 mr-2 text-blue-600" />
              Engagement Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivered</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {metrics?.delivered?.toLocaleString() || '0'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({metrics?.deliveryRate || 0}%)
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Opened</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {metrics?.opened?.toLocaleString() || '0'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({metrics?.openRate || 0}%)
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Clicked</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {metrics?.clicked?.toLocaleString() || '0'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({metrics?.clickRate || 0}%)
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Bounced</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {metrics?.bounced?.toLocaleString() || '0'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({metrics?.bounceRate || 0}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <EnvelopeIcon className="w-5 h-5 mr-2 text-green-600" />
              Campaign Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics?.campaignBreakdown || {})
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([campaignType, count]) => (
                  <div key={campaignType} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {getCampaignTypeDisplay(campaignType)}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {count.toLocaleString()}
                      </span>
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${metrics?.totalSent ? (count / metrics.totalSent) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClockIcon className="w-5 h-5 mr-2 text-orange-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {metrics?.recentActivity || 0}
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Emails sent in the last 7 days
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2 text-purple-600" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(metrics?.deliveryRate || 0) >= 95 && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    Excellent delivery rate! Your emails are reaching inboxes successfully.
                  </span>
                </div>
              </div>
            )}
            
            {(metrics?.bounceRate || 0) > 5 && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">
                    High bounce rate detected. Consider cleaning your email list.
                  </span>
                </div>
              </div>
            )}
            
            {(metrics?.openRate || 0) < 20 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Low open rate. Try improving your subject lines and send times.
                  </span>
                </div>
              </div>
            )}
            
            {(metrics?.clickRate || 0) < 2 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Low click rate. Consider adding more compelling call-to-actions.
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}