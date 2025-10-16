import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { isGuestUser } from '../lib/authUtils'
import { useAuth } from '../hooks/useAuth'
import { googleCalendarAuth } from '../lib/googleCalendarAuth'
import DailyGrowthPlan from '../components/DailyGrowthPlan'
import { GrowthAction } from '../components/DailyGrowthPlan'
import LeadsBySourceChart from '../components/LeadsBySourceChart'
import { Alert } from '../components/ui/Alert'
import { CardContent, CardHeader, CardTitle } from '../components/ui/Card'
// Force rebuild to clear cache
import ResponsivePageWrapper from '../components/ResponsivePageWrapper'
import ResponsiveGrid from '../components/ResponsiveGrid'
import ResponsiveCard from '../components/ResponsiveCard'
import ResponsiveButton from '../components/ResponsiveButton'
import { 
  PhoneIcon,
  GlobeAltIcon,
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
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'growth'>('overview')
  
  // Dashboard stats
  const [stats, setStats] = useState<DashboardStats>({
    newLeadsThisWeek: 0,
    contactedLeads: 0,
    bookedLeads: 0,
    totalRevenue: 0,
    conversionRate: 0,
    weeklyBookings: []
  })
  const [statsLoading, setStatsLoading] = useState(false)
  
  // Revenue input
  const [revenueInput, setRevenueInput] = useState('')
  const [revenueSubmitting, setRevenueSubmitting] = useState(false)
  const [revenueError, setRevenueError] = useState('')
  
  // Performance data
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [performanceError, setPerformanceError] = useState('')
  const [performanceSuccess] = useState('')
  
  // Daily Growth
  const [savedActions, setSavedActions] = useState<GrowthAction[]>([])

  // Get current week start date (Monday)
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
        .from('bookings')
        .select('created_at')
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
        totalRevenue,
        conversionRate: Math.round(conversionRate * 100) / 100,
        weeklyBookings
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

      // First try to get the specific columns
      const { data: settings, error } = await supabase
        .from('user_settings')
        .select('google_calendar_connected, google_business_connected')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.log('Google connection columns not available yet, using fallback')
        // If the columns don't exist, assume not connected
        setIsConnected(false)
        return
      }

      if (settings) {
        setIsConnected(settings.google_calendar_connected && settings.google_business_connected)
      }
    } catch (error) {
      console.error('Error checking connection status:', error)
      // On error, assume not connected
      setIsConnected(false)
    }
  }


  const fetchPerformanceData = async () => {
    try {
      setLoading(true)
      setPerformanceError('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Try to get settings with all available columns
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('google_place_id, business_name, business_address')
        .eq('user_id', user.id)
        .single()

      if (settingsError) {
        console.error('Settings error:', settingsError)
        setPerformanceError('Could not load business settings. Please complete your business setup first.')
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
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-4 sm:px-6 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`py-4 px-4 sm:px-6 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'performance'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Business Performance
            </button>
            <button
              onClick={() => setActiveTab('growth')}
              className={`py-4 px-4 sm:px-6 border-b-2 font-medium text-sm whitespace-nowrap ${
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
        <div className="space-y-6">
          {/* Stats Cards */}
          <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }} gap="md">
            <ResponsiveCard hover>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">New Leads</dt>
                    <dd className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                      {statsLoading ? (
                        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-6 sm:h-8 w-12 sm:w-16 rounded"></div>
                      ) : (
                        stats.newLeadsThisWeek
                      )}
                    </dd>
                    <dd className="text-xs text-gray-500 dark:text-gray-300 mt-1">This week</dd>
                  </dl>
                </div>
              </div>
            </ResponsiveCard>

            <ResponsiveCard hover>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
                    <PhoneIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Contacted</dt>
                    <dd className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                      {statsLoading ? (
                        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-6 sm:h-8 w-12 sm:w-16 rounded"></div>
                      ) : (
                        stats.contactedLeads
                      )}
                    </dd>
                    <dd className="text-xs text-gray-500 dark:text-gray-300 mt-1">This week</dd>
                  </dl>
                </div>
              </div>
            </ResponsiveCard>

            <ResponsiveCard hover>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Booked</dt>
                    <dd className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                      {statsLoading ? (
                        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-6 sm:h-8 w-12 sm:w-16 rounded"></div>
                      ) : (
                        stats.bookedLeads
                      )}
                    </dd>
                    <dd className="text-xs text-gray-500 dark:text-gray-300 mt-1">This week</dd>
                  </dl>
                </div>
              </div>
            </ResponsiveCard>

            <ResponsiveCard hover>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                    <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Revenue</dt>
                    <dd className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                      {statsLoading ? (
                        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-6 sm:h-8 w-16 sm:w-20 rounded"></div>
                      ) : (
                        `$${stats.totalRevenue.toFixed(2)}`
                      )}
                    </dd>
                    <dd className="text-xs text-gray-500 dark:text-gray-300 mt-1">Total</dd>
                  </dl>
                </div>
              </div>
            </ResponsiveCard>
          </ResponsiveGrid>

          {/* Charts Row */}
          <ResponsiveGrid cols={{ default: 1, lg: 2 }} gap="md">
            <ResponsiveCard>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Weekly Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <LeadsBySourceChart data={[]} />
                </div>
              </CardContent>
            </ResponsiveCard>

            <ResponsiveCard>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-12 w-24 rounded mx-auto"></div>
                    ) : (
                      `${stats.conversionRate}%`
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Leads to Bookings
                  </p>
                </div>
              </CardContent>
            </ResponsiveCard>
          </ResponsiveGrid>

          {/* Revenue Input */}
          <ResponsiveCard>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Add Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRevenueSubmit} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="revenue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Revenue Amount
                  </label>
                  <input
                    type="number"
                    id="revenue"
                    value={revenueInput}
                    onChange={(e) => setRevenueInput(e.target.value)}
                    placeholder="Enter revenue amount"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="flex items-end">
                  <ResponsiveButton
                    type="submit"
                    loading={revenueSubmitting}
                    disabled={!revenueInput || revenueSubmitting}
                    size="md"
                    fullWidth={false}
                  >
                    Add Revenue
                  </ResponsiveButton>
                </div>
              </form>
              {revenueError && (
                <Alert variant="error" className="mt-4">
                  {revenueError}
                </Alert>
              )}
            </CardContent>
          </ResponsiveCard>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {performanceError && (
            <Alert variant="error">
              {performanceError}
            </Alert>
          )}
          
          {performanceSuccess && (
            <Alert variant="success">
              {performanceSuccess}
            </Alert>
          )}

          {!isConnected ? (
            <ResponsiveCard>
              <CardContent className="text-center py-12">
                <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                  Connect to Google Business Profile
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Connect your Google Business Profile to view performance insights and analytics.
                </p>
                <div className="mt-6">
                  <ResponsiveButton onClick={connectToGoogle} size="lg">
                    Connect to Google
                  </ResponsiveButton>
                </div>
              </CardContent>
            </ResponsiveCard>
          ) : (
            <div className="space-y-6">
              <ResponsiveCard>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Performance Data</CardTitle>
                </CardHeader>
                <CardContent>
                  {performanceData.length > 0 ? (
                    <div className="space-y-4">
                      {performanceData.map((location, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {location.locationName}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {location.locationAddress}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No performance data available
                    </p>
                  )}
                </CardContent>
              </ResponsiveCard>
            </div>
          )}
        </div>
      )}

      {activeTab === 'growth' && (
        <div className="space-y-6">
          <ResponsiveCard>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Daily Growth Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <DailyGrowthPlan onActionsGenerated={handleActionsGenerated} />
            </CardContent>
          </ResponsiveCard>

          {savedActions.length > 0 && (
            <ResponsiveCard>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Your Growth Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {savedActions.map((action, index) => (
                    <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{action.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{action.description}</p>
                        <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">
                          {action.completed ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </ResponsiveCard>
          )}
        </div>
      )}
    </ResponsivePageWrapper>
  )
}
