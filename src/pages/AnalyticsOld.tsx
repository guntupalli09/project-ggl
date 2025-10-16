import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { isGuestUser } from '../lib/authUtils'
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics'
import { useAuth } from '../hooks/useAuth'
import { googleCalendarAuth } from '../lib/googleCalendarAuth'
import DailyGrowthPlan from '../components/DailyGrowthPlan'
import { GrowthAction } from '../components/DailyGrowthPlan'
import LeadsBySourceChart from '../components/LeadsBySourceChart'
import NichePlaybooks from '../components/NichePlaybooks'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import ResponsivePageWrapper from '../components/ResponsivePageWrapper'
import { 
  ChartBarIcon,
  MapPinIcon,
  EyeIcon,
  PhoneIcon,
  GlobeAltIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  newLeadsThisWeek: number
  contactedLeads: number
  bookedLeads: number
  totalRevenue: number
  conversionRate: number
  weeklyBookings: Array<{
    week: string
    bookings: number
  }>
}

interface PerformanceData {
  locationName: string
  locationAddress: string
  businessAccount: string
  [key: string]: any
}

export default function Analytics() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [, setIsGuest] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Dashboard state
  const [stats, setStats] = useState<DashboardStats>({
    newLeadsThisWeek: 0,
    contactedLeads: 0,
    bookedLeads: 0,
    totalRevenue: 0,
    conversionRate: 0,
    weeklyBookings: []
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [revenueInput, setRevenueInput] = useState('')
  const [revenueSubmitting, setRevenueSubmitting] = useState(false)
  const [revenueError, setRevenueError] = useState('')

  // Business Performance state
  const [isConnected, setIsConnected] = useState(false)
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [performanceError, setPerformanceError] = useState('')
  const [performanceSuccess] = useState('')

  // Daily Growth state
  const [savedActions, setSavedActions] = useState<GrowthAction[]>([])

  // Analytics hook
  const {
    leadsBySource
  } = useDashboardAnalytics()

  // Get the start of the current week (Monday)
  const getWeekStartDate = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  // Get 8 weeks ago for weekly bookings data
  const getEightWeeksAgo = () => {
    const today = new Date()
    const eightWeeksAgo = new Date(today.getTime() - (8 * 7 * 24 * 60 * 60 * 1000))
    return eightWeeksAgo.toISOString().split('T')[0]
  }

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      setStatsLoading(true)
      
      const weekStart = getWeekStartDate()
      const eightWeeksAgo = getEightWeeksAgo()

      // Fetch new leads this week
      const { count: newLeadsThisWeek, error: newLeadsError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekStart)

      if (newLeadsError) {
        console.error('Error fetching new leads count:', newLeadsError)
      }

      // Fetch contacted leads (status = 'contacted')
      const { count: contactedLeads, error: contactedError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'contacted')

      if (contactedError) {
        console.error('Error fetching contacted leads count:', contactedError)
      }

      // Fetch booked leads (status = 'booked')
      const { count: bookedLeads, error: bookedError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'booked')

      if (bookedError) {
        console.error('Error fetching booked leads count:', bookedError)
      }

      // Fetch total revenue from ROI metrics
      const { data: roiData, error: roiError } = await supabase
        .from('roi_metrics')
        .select('revenue')
        .order('week_start_date', { ascending: false })

      if (roiError && roiError.code !== 'PGRST116') {
        console.error('Error fetching ROI data:', roiError)
      }

      // Calculate total revenue
      const totalRevenue = roiData?.reduce((sum, item) => sum + (item.revenue || 0), 0) || 0

      // Fetch weekly bookings data for the last 8 weeks
      const { data: weeklyBookingsData, error: weeklyBookingsError } = await supabase
        .from('leads')
        .select('created_at, status')
        .eq('status', 'booked')
        .gte('created_at', eightWeeksAgo)
        .order('created_at', { ascending: true })

      if (weeklyBookingsError) {
        console.error('Error fetching weekly bookings data:', weeklyBookingsError)
      }

      // Process weekly bookings data
      const weeklyBookings = processWeeklyBookingsData(weeklyBookingsData || [])

      // Calculate conversion rate (booked leads / total leads)
      const totalLeads = (newLeadsThisWeek || 0) + (contactedLeads || 0) + (bookedLeads || 0)
      const conversionRate = totalLeads > 0 ? ((bookedLeads || 0) / totalLeads) * 100 : 0

      setStats({
        newLeadsThisWeek: newLeadsThisWeek || 0,
        contactedLeads: contactedLeads || 0,
        bookedLeads: bookedLeads || 0,
        totalRevenue: totalRevenue,
        conversionRate: conversionRate,
        weeklyBookings: weeklyBookings
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  // Process weekly bookings data for chart
  const processWeeklyBookingsData = (data: any[]) => {
    const weekMap = new Map()
    const today = new Date()
    
    // Initialize last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - (i * 7))
      const weekKey = weekStart.toISOString().split('T')[0]
      const weekLabel = `Week ${8 - i}`
      weekMap.set(weekKey, { week: weekLabel, bookings: 0 })
    }

    // Count bookings per week
    data.forEach(item => {
      const date = new Date(item.created_at)
      const weekStart = new Date(date)
      const day = weekStart.getDay()
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(weekStart.setDate(diff))
      const weekKey = monday.toISOString().split('T')[0]
      
      if (weekMap.has(weekKey)) {
        const current = weekMap.get(weekKey)
        weekMap.set(weekKey, { ...current, bookings: current.bookings + 1 })
      }
    })

    // Convert to array format for chart
    return Array.from(weekMap.values())
  }

  // Handle revenue submission
  const handleRevenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRevenueError('')
    setRevenueSubmitting(true)

    try {
      const revenue = parseFloat(revenueInput)
      if (isNaN(revenue) || revenue < 0) {
        setRevenueError('Please enter a valid positive number')
        setRevenueSubmitting(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setRevenueError('User not authenticated')
        setRevenueSubmitting(false)
        return
      }

      // Get current week start date
      const weekStart = getWeekStartDate()

      // Insert or update revenue data
      const { error } = await supabase
        .from('roi_metrics')
        .upsert({
          user_id: user.id,
          week_start_date: weekStart,
          revenue: revenue
        }, {
          onConflict: 'user_id,week_start_date'
        })

      if (error) {
        console.error('Error saving revenue:', error)
        setRevenueError('Failed to save revenue data')
      } else {
        setRevenueInput('')
        // Refresh stats
        await fetchDashboardStats()
      }
    } catch (error) {
      console.error('Error submitting revenue:', error)
      setRevenueError('An error occurred while saving revenue')
    } finally {
      setRevenueSubmitting(false)
    }
  }

  // Business Performance functions
  const checkConnectionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: settings } = await supabase
        .from('user_settings')
        .select('google_calendar_connected, google_business_connected')
        .eq('user_id', user.id)
        .single()

      if (settings) {
        setIsConnected(settings.google_calendar_connected && settings.google_business_connected)
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
    }
  }

  // const handleGoogleCallback = async (code: string, state: string) => {
  //   try {
  //     setLoading(true)
  //     const result = await googleCalendarAuth.handleCallback(code, state)
      
  //     if (result.success) {
  //       setPerformanceSuccess('Successfully connected to Google Business Profile!')
  //       await checkConnectionStatus()
  //       await fetchPerformanceData()
  //     } else {
  //       setPerformanceError(result.error || 'Failed to connect to Google Business Profile')
  //     }
  //   } catch (error) {
  //     console.error('Error handling Google callback:', error)
  //     setPerformanceError('An error occurred during connection')
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  const fetchPerformanceData = async () => {
    try {
      setLoading(true)
      setPerformanceError('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user settings
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('google_place_id, business_name, business_address')
        .eq('user_id', user.id)
        .single()

      if (settingsError) {
        console.error('Settings error:', settingsError)
        setPerformanceError('Could not load business settings')
        return
      }

      if (!settings?.google_place_id) {
        setPerformanceError('Google Place ID not found. Please complete your business setup first.')
        return
      }

      // Fetch performance data from Google Business Profile API
      const response = await fetch(`/api/google-business-performance?place_id=${settings.google_place_id}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch performance data')
      }

      const data = await response.json()
      setPerformanceData(data.locations || [])
    } catch (error) {
      console.error('Error fetching performance data:', error)
      setPerformanceError(error instanceof Error ? error.message : 'Failed to fetch performance data')
    } finally {
      setLoading(false)
    }
  }

  const connectToGoogle = () => {
    googleCalendarAuth.initiateAuth()
  }

  // Daily Growth functions
  const handleActionsGenerated = (actions: GrowthAction[]) => {
    setSavedActions(actions)
  }

  // Initialize
  useEffect(() => {
    const initializeData = async () => {
      setIsGuest(isGuestUser())
      setLoading(false)
      
      if (!user) {
        return
      }

      // Fetch all data
      await fetchDashboardStats()
      await checkConnectionStatus()
      if (isConnected) {
        await fetchPerformanceData()
      }
    }

    initializeData()
  }, [user])

  if (loading) {
    return (
      <div className="h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsivePageWrapper 
      title="Analytics" 
      description="Track your business performance and growth metrics"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center">
          <ChartBarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Dashboard Overview</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Welcome, {user?.email}
              </span>
            </div>
          </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden mb-8">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('performance')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'performance'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Business Performance
                </button>
                <button
                  onClick={() => setActiveTab('growth')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'growth'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Daily Growth
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                          <UserGroupIcon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">New Leads</dt>
                          <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                            {statsLoading ? (
                              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-16 rounded"></div>
                            ) : (
                              stats.newLeadsThisWeek
                            )}
                          </dd>
                          <dd className="text-xs text-gray-500 dark:text-gray-300 mt-1">This week</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                          <PhoneIcon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Contacted</dt>
                          <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                            {statsLoading ? (
                              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-16 rounded"></div>
                            ) : (
                              stats.contactedLeads
                            )}
                          </dd>
                          <dd className="text-xs text-gray-500 dark:text-gray-300 mt-1">In conversation</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                          <CalendarIcon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Booked</dt>
                          <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                            {statsLoading ? (
                              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-16 rounded"></div>
                            ) : (
                              stats.bookedLeads
                            )}
                          </dd>
                          <dd className="text-xs text-gray-500 dark:text-gray-300 mt-1">Ready to close</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                          <CurrencyDollarIcon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Revenue</dt>
                          <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                            {statsLoading ? (
                              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-16 rounded"></div>
                            ) : (
                              `$${stats.totalRevenue.toFixed(2)}`
                            )}
                          </dd>
                          <dd className="text-xs text-gray-500 dark:text-gray-300 mt-1">Total earned</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue Input */}
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add Revenue</h3>
                <form onSubmit={handleRevenueSubmit} className="flex space-x-4">
                  <div className="flex-1">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={revenueInput}
                      onChange={(e) => setRevenueInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={revenueSubmitting}
                    className="px-4 py-2"
                  >
                    {revenueSubmitting ? 'Adding...' : 'Add Revenue'}
                  </Button>
                </form>
                {revenueError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{revenueError}</p>
                )}
              </div>

              {/* Analytics Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Leads by Source Chart */}
                <div className="lg:col-span-2">
                  <LeadsBySourceChart data={leadsBySource} />
                </div>
                
                {/* Response Time Metric */}
                <div>
                  {/* <ResponseTimeMetric
                    averageResponseTime={averageResponseTime}
                    previousAverageResponseTime={previousAverageResponseTime}
                    isLoading={analyticsLoading}
                    error={analyticsError}
                    onRefetch={refetchAnalytics}
                  /> */}
                </div>
              </div>

              {/* Additional Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* <TopChannelsMetric
                  topChannels={topChannels}
                  isLoading={analyticsLoading}
                  error={analyticsError}
                />
                <LeadToBookingMetrics
                  leads={stats.newLeadsThisWeek}
                  bookings={stats.bookedLeads}
                  conversionRate={stats.conversionRate}
                /> */}
              </div>

              {/* Niche Playbooks */}
              <NichePlaybooks />
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              {!isConnected ? (
                <div className="text-center py-12">
                  <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Connect to Google Business Profile</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Connect your Google Business Profile to view performance insights and analytics.
                  </p>
                  <div className="mt-6">
                    <Button onClick={connectToGoogle}>
                      Connect to Google Business Profile
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {performanceError && (
                    <Alert variant="error">
                      {performanceError}
                    </Alert>
                  )}
                  
                  {performanceSuccess && (
                    <Alert>
                      {performanceSuccess}
                    </Alert>
                  )}

                  {performanceData.length > 0 ? (
                    <div className="grid gap-6">
                      {performanceData.map((location, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <MapPinIcon className="h-5 w-5 mr-2" />
                              {location.locationName}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                              {location.locationAddress}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center">
                                <EyeIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {location.views || 'N/A'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Views</p>
                              </div>
                              <div className="text-center">
                                <PhoneIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {location.calls || 'N/A'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Calls</p>
                              </div>
                              <div className="text-center">
                                <GlobeAltIcon className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {location.websiteClicks || 'N/A'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Website Clicks</p>
                              </div>
                              <div className="text-center">
                                <MapPinIcon className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {location.directions || 'N/A'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Directions</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No Performance Data</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Performance data will appear here once your Google Business Profile is connected and has data.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'growth' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Daily Growth Plan Component */}
              <div className="lg:col-span-2">
                <DailyGrowthPlan onActionsGenerated={handleActionsGenerated} />
              </div>

              {/* Sidebar with Tips and Stats */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
                      Growth Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">Focus on High-Value Activities</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          Prioritize tasks that directly impact revenue and customer acquisition.
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <h4 className="font-medium text-green-900 dark:text-green-100">Track Your Progress</h4>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          Monitor your daily actions and measure their impact on business growth.
                        </p>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <h4 className="font-medium text-purple-900 dark:text-purple-100">Stay Consistent</h4>
                        <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                          Small daily actions compound over time to create significant growth.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {savedActions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        Saved Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {savedActions.map((action, index) => (
                          <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                            {action.title}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </ResponsivePageWrapper>
  )
}
