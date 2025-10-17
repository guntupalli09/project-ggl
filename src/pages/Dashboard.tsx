import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import ResponsivePageWrapper from '../components/ResponsivePageWrapper'
import {
  CalendarIcon,
  PhoneIcon,
  GlobeAltIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  EnvelopeIcon,
  ChartBarIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface DashboardMetrics {
  replyToBookRate: number
  weeklyBookings: number
  leadsConvertedToBookings: {
    source: string
    leads: number
    bookings: number
    conversionRate: number
    customerNames: string[]
  }[]
  missedCalls: number
  aiFollowupsSent: number
  emailMetrics: {
    totalSent: number
    deliveryRate: number
    openRate: number
    clickRate: number
  }
}

export default function Dashboard() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user) {
      fetchDashboardMetrics()
    }
  }, [user, timeRange])

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true)
      setError('')

      const userId = user?.id
      if (!userId) return

      // Calculate date range
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      const startDateISO = startDate.toISOString()

      // Fetch data for the 5 core metrics + email metrics
      const [leadsData, bookingsData, messagesData, callLogsData, emailLogsData] = await Promise.all([
        // All leads in time range
        supabase
          .from('leads')
          .select('id, source, created_at, status, name')
          .eq('user_id', userId)
          .gte('created_at', startDateISO),

        // All bookings in time range with customer names
        supabase
          .from('bookings')
          .select('id, lead_id, created_at, status, customer_name, leads!inner(source, name)')
          .eq('user_id', userId)
          .gte('created_at', startDateISO),

        // All inbound messages for reply tracking
        supabase
          .from('messages')
          .select('lead_id, direction, created_at, leads!inner(user_id, source)')
          .eq('leads.user_id', userId)
          .eq('direction', 'in')
          .gte('created_at', startDateISO),

        // All call logs in time range
        supabase
          .from('call_logs')
          .select('call_type, ai_followup_sent, created_at')
          .eq('user_id', userId)
          .gte('created_at', startDateISO),

        // All email logs in time range
        supabase
          .from('email_logs')
          .select('status, sent_at, campaign_type')
          .eq('user_id', userId)
          .gte('sent_at', startDateISO)
      ])

      if (leadsData.error) throw leadsData.error
      if (bookingsData.error) throw bookingsData.error
      if (messagesData.error) throw messagesData.error
      if (callLogsData.error) throw callLogsData.error
      if (emailLogsData.error) throw emailLogsData.error

      const leads = leadsData.data || []
      const bookings = bookingsData.data || []
      const messages = messagesData.data || []
      const callLogs = callLogsData.data || []
      const emailLogs = emailLogsData.data || []

      // 1. Calculate Reply-to-Book Rate
      const leadsWithReplies = new Set(messages.map(m => m.lead_id))
      const leadsWithBookings = new Set(bookings.map(b => b.lead_id))
      const leadsWithRepliesAndBookings = Array.from(leadsWithReplies).filter(leadId => 
        leadsWithBookings.has(leadId)
      ).length
      const replyToBookRate = leadsWithReplies.size > 0 
        ? (leadsWithRepliesAndBookings / leadsWithReplies.size) * 100 
        : 0

      // 2. Calculate Bookings per Week
      const weeklyBookings = bookings.length

      // 3. Calculate Leads Converted to Bookings by Source
      const sourceMap = new Map<string, { leads: number, bookings: number, customerNames: string[] }>()
      
      // Count leads by source
      leads.forEach(lead => {
        const source = lead.source || 'Unknown'
        if (!sourceMap.has(source)) {
          sourceMap.set(source, { leads: 0, bookings: 0, customerNames: [] })
        }
        sourceMap.get(source)!.leads++
      })

      // Count bookings by source and collect customer names
      bookings.forEach(booking => {
        const lead = booking.leads?.[0] // Get first lead if array exists
        const source = lead?.source || 'Unknown'
        if (sourceMap.has(source)) {
          sourceMap.get(source)!.bookings++
          // Use customer_name from booking if available, otherwise use lead name
          const customerName = booking.customer_name || lead?.name || 'Unknown Customer'
          sourceMap.get(source)!.customerNames.push(customerName)
        }
      })

      const leadsConvertedToBookings = Array.from(sourceMap.entries()).map(([source, data]) => ({
        source,
        leads: data.leads,
        bookings: data.bookings,
        conversionRate: data.leads > 0 ? (data.bookings / data.leads) * 100 : 0,
        customerNames: data.customerNames
      })).sort((a, b) => b.leads - a.leads)

      // 4. Calculate Missed Calls
      const missedCalls = callLogs.filter(call => call.call_type === 'missed').length

      // 5. Calculate AI Follow-ups Sent
      const aiFollowupsSent = callLogs.filter(call => call.ai_followup_sent).length

      // 6. Calculate Email Metrics
      const totalSent = emailLogs.length
      const delivered = emailLogs.filter(email => 
        email.status === 'delivered' || email.status === 'opened' || email.status === 'clicked'
      ).length
      const opened = emailLogs.filter(email => 
        email.status === 'opened' || email.status === 'clicked'
      ).length
      const clicked = emailLogs.filter(email => email.status === 'clicked').length

      const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0
      const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0
      const clickRate = delivered > 0 ? Math.round((clicked / delivered) * 100) : 0

      setMetrics({
        replyToBookRate,
        weeklyBookings,
        leadsConvertedToBookings,
        missedCalls,
        aiFollowupsSent,
        emailMetrics: {
          totalSent,
          deliveryRate,
          openRate,
          clickRate
        }
      })

    } catch (err) {
      console.error('Error fetching dashboard metrics:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'missedcall':
      case 'missed call':
        return <PhoneIcon className="h-5 w-5 text-red-500" />
      case 'hostedform':
      case 'webform':
        return <GlobeAltIcon className="h-5 w-5 text-blue-500" />
      case 'linkedin':
        return <UserGroupIcon className="h-5 w-5 text-blue-600" />
      default:
        return <UserGroupIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getSourceLabel = (source: string) => {
    switch (source.toLowerCase()) {
      case 'missedcall':
      case 'missed call':
        return 'Missed Calls'
      case 'hostedform':
      case 'webform':
        return 'Web Forms'
      case 'linkedin':
        return 'LinkedIn'
      case 'google_search':
        return 'Google Search'
      default:
        return source
    }
  }

  const toggleSourceExpansion = (source: string) => {
    const newExpanded = new Set(expandedSources)
    if (newExpanded.has(source)) {
      newExpanded.delete(source)
    } else {
      newExpanded.add(source)
    }
    setExpandedSources(newExpanded)
  }

  if (loading) {
    return (
      <ResponsivePageWrapper title="Dashboard" description="Your business performance at a glance">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </ResponsivePageWrapper>
    )
  }

  if (error) {
    return (
      <ResponsivePageWrapper title="Dashboard" description="Your business performance at a glance">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardMetrics}>Retry</Button>
        </div>
      </ResponsivePageWrapper>
    )
  }

  if (!metrics) {
    return (
      <ResponsivePageWrapper title="Dashboard" description="Your business performance at a glance">
        <div className="text-center py-12">
          <p className="text-gray-600">No data available</p>
        </div>
      </ResponsivePageWrapper>
    )
  }

  return (
    <ResponsivePageWrapper title="Dashboard" description="Core business metrics at a glance">
      <div className="space-y-6">
        {/* Header with time range selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Core Metrics</h1>
            <p className="text-gray-600 dark:text-gray-400">Track your most important business indicators</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    timeRange === range
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Core Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Reply-to-Book Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reply-to-Book Rate</CardTitle>
              <ArrowTrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-indigo-600">{metrics.replyToBookRate.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground mt-2">
                Leads who reply to your messages and then book an appointment
              </p>
            </CardContent>
          </Card>

          {/* Bookings per Week */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bookings This Period</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{metrics.weeklyBookings}</div>
              <p className="text-sm text-muted-foreground mt-2">
                Total appointments booked in the last {timeRange}
              </p>
            </CardContent>
          </Card>

          {/* Total Leads Generated */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads Generated</CardTitle>
              <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {metrics.leadsConvertedToBookings.reduce((sum, source) => sum + source.leads, 0)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                New leads from all sources in the last {timeRange}
              </p>
            </CardContent>
          </Card>

          {/* Missed Calls */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Missed Calls</CardTitle>
              <PhoneIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{metrics.missedCalls}</div>
              <p className="text-sm text-muted-foreground mt-2">
                Calls missed in the last {timeRange}
              </p>
            </CardContent>
          </Card>

          {/* AI Follow-ups Sent */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Follow-ups Sent</CardTitle>
              <GlobeAltIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{metrics.aiFollowupsSent}</div>
              <p className="text-sm text-muted-foreground mt-2">
                Automated follow-up messages sent
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Email Metrics Section */}
        <div className="mt-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Email Performance</h2>
            <p className="text-gray-600 dark:text-gray-400">Track your email marketing effectiveness</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Emails Sent */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
                <EnvelopeIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{metrics.emailMetrics.totalSent}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Total emails sent in the last {timeRange}
                </p>
              </CardContent>
            </Card>

            {/* Delivery Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                <ChartBarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{metrics.emailMetrics.deliveryRate}%</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Emails successfully delivered
                </p>
              </CardContent>
            </Card>

            {/* Open Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                <EyeIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{metrics.emailMetrics.openRate}%</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Emails opened by recipients
                </p>
              </CardContent>
            </Card>

            {/* Click Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
                <ArrowTrendingUpIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-600">{metrics.emailMetrics.clickRate}%</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Links clicked in emails
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lead Conversion by Source */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Conversion by Source</CardTitle>
            <p className="text-sm text-muted-foreground">
              See which lead sources are converting best to bookings. Click any row to view customer names.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.leadsConvertedToBookings.map((source) => (
                <div key={source.source} className="border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => toggleSourceExpansion(source.source)}
                  >
                    <div className="flex items-center space-x-4">
                      {getSourceIcon(source.source)}
                      <div>
                        <p className="font-semibold text-lg">{getSourceLabel(source.source)}</p>
                        <p className="text-sm text-muted-foreground">
                          {source.bookings} bookings from {source.leads} leads
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">{source.conversionRate.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">conversion rate</div>
                      </div>
                      <div className="text-gray-400">
                        {expandedSources.has(source.source) ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Customer Names */}
                  {expandedSources.has(source.source) && source.customerNames.length > 0 && (
                    <div className="px-4 pb-4 border-t bg-gray-50 dark:bg-gray-700">
                      <div className="pt-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Customer Names ({source.customerNames.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {source.customerNames.map((name, nameIndex) => (
                            <span 
                              key={nameIndex}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Show message if no customers */}
                  {expandedSources.has(source.source) && source.customerNames.length === 0 && (
                    <div className="px-4 pb-4 border-t bg-gray-50 dark:bg-gray-700">
                      <div className="pt-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          No customer names available for this source
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {metrics.leadsConvertedToBookings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No leads found for the selected time period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsivePageWrapper>
  )
}