import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { isGuestUser, getCurrentUser } from '../lib/authUtils'
import { clearLinkedInSession } from '../lib/linkedinOAuth'
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics'
import LeadsBySourceChart from '../components/LeadsBySourceChart'
import ResponseTimeMetric from '../components/ResponseTimeMetric'
import TopChannelsMetric from '../components/TopChannelsMetric'
import LeadToBookingMetrics from '../components/LeadToBookingMetrics'
import NichePlaybooks from '../components/NichePlaybooks'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Alert } from '../components/ui/Alert'
import {
  UserPlusIcon,
  PhoneIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon
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

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
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
  const navigate = useNavigate()
  
  // Analytics hook
  const {
    leadsBySource,
    averageResponseTime,
    previousAverageResponseTime,
    topChannels,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useDashboardAnalytics()

  // Get the start of the current week (Monday)
  const getWeekStartDate = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  // Get the start of 8 weeks ago
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
      const totalRevenue = roiData?.reduce((sum, record) => sum + (record.revenue || 0), 0) || 0

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

      const weekStart = getWeekStartDate()

      // Use upsert to either insert or update the revenue for this week
      const { error } = await supabase
        .from('roi_metrics')
        .upsert([{
          user_id: user.id,
          week_start_date: weekStart,
          revenue: revenue
        }], {
          onConflict: 'user_id,week_start_date'
        })

      if (error) {
        console.error('Error saving revenue data:', error)
        setRevenueError('Failed to save revenue data')
      } else {
        setRevenueInput('')
        // Refresh dashboard stats to show updated revenue
        await fetchDashboardStats()
      }
    } catch (err) {
      console.error('Error:', err)
      setRevenueError('Failed to save revenue data')
    } finally {
      setRevenueSubmitting(false)
    }
  }

  useEffect(() => {
    const getUser = async () => {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      setIsGuest(isGuestUser())
      setLoading(false)
      
      if (!currentUser) {
        navigate('/login')
      } else {
        // Fetch stats only if user is authenticated (not guest)
        if (!isGuestUser()) {
          fetchDashboardStats()
        }
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          // Check if user is guest before redirecting
          if (!isGuestUser()) {
            navigate('/login')
          }
        } else {
          setUser(session?.user ?? null)
          setIsGuest(false)
          if (session?.user) {
            fetchDashboardStats()
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleSignOut = async () => {
    console.log('🚪 Dashboard handleSignOut called')
    // Clear LinkedIn session
    clearLinkedInSession()
    console.log('🚪 Signing out from Supabase from Dashboard')
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <PageHeader
          title="Dashboard"
          subtitle="Monitor your lead generation and business performance"
          actions={
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Welcome, {user?.email}
              </span>
              <Button
                variant="outline"
                onClick={handleSignOut}
                size="sm"
              >
                Sign Out
              </Button>
            </div>
          }
        />
        
        {/* Guest Mode Warning Banner */}
        {isGuest && (
          <Alert
            variant="warning"
            title="🎯 You are exploring in guest mode"
            className="mb-8"
          >
            <div className="space-y-4">
              <p>
                Your data won't be saved permanently. This is a demo version where you can explore all features without creating an account.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => navigate('/login')}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7" />
                    </svg>
                  }
                >
                  Sign in to save your work
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/signup')}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  }
                >
                  Create free account
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* New Leads This Week Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <UserPlusIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">New Leads This Week</dt>
                    <dd className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {statsLoading ? (
                        <div className="animate-pulse bg-blue-200 dark:bg-blue-800 h-8 w-16 rounded"></div>
                      ) : (
                        stats.newLeadsThisWeek
                      )}
                    </dd>
                    <dd className="text-xs text-blue-500 dark:text-blue-300 mt-1">Fresh prospects</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Contacted Leads Card */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border border-yellow-200 dark:border-yellow-800 overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                    <PhoneIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-yellow-600 dark:text-yellow-400 truncate">Contacted Leads</dt>
                    <dd className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                      {statsLoading ? (
                        <div className="animate-pulse bg-yellow-200 dark:bg-yellow-800 h-8 w-16 rounded"></div>
                      ) : (
                        stats.contactedLeads
                      )}
                    </dd>
                    <dd className="text-xs text-yellow-500 dark:text-yellow-300 mt-1">In conversation</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Booked Leads Card */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800 overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                    <CalendarIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-green-600 dark:text-green-400 truncate">Booked Leads</dt>
                    <dd className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {statsLoading ? (
                        <div className="animate-pulse bg-green-200 dark:bg-green-800 h-8 w-16 rounded"></div>
                      ) : (
                        stats.bookedLeads
                      )}
                    </dd>
                    <dd className="text-xs text-green-500 dark:text-green-300 mt-1">Ready to close</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Total Revenue Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border border-emerald-200 dark:border-emerald-800 overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-shadow duration-300">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                    <CurrencyDollarIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-emerald-600 dark:text-emerald-400 truncate">Total Revenue</dt>
                    <dd className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                      {statsLoading ? (
                        <div className="animate-pulse bg-emerald-200 dark:bg-emerald-800 h-8 w-20 rounded"></div>
                      ) : (
                        `$${stats.totalRevenue.toLocaleString()}`
                      )}
                    </dd>
                    <dd className="text-xs text-emerald-500 dark:text-emerald-300 mt-1">
                      {stats.conversionRate.toFixed(1)}% conversion rate
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings Chart */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
            <div className="flex items-center">
              <ChartBarIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bookings per Week</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last 8 weeks performance</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {statsLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-80 w-full rounded-lg"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={stats.weeklyBookings} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="week" 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb'
                    }}
                    formatter={(value: any) => [value, 'Bookings']}
                    labelFormatter={(label) => `Week: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="bookings" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Revenue Input Section */}
        <Card variant="elevated" className="mb-8">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-3" />
              <div>
                <CardTitle>Revenue Tracking</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Track your weekly revenue and conversion metrics</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRevenueSubmit} className="flex items-end space-x-4">
              <div className="flex-1">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  label="Revenue earned this week"
                  placeholder="0.00"
                  value={revenueInput}
                  onChange={(e) => setRevenueInput(e.target.value)}
                  leftIcon="$"
                  required
                />
              </div>
              <Button
                type="submit"
                loading={revenueSubmitting}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Save Revenue
              </Button>
            </form>
            {revenueError && (
              <Alert variant="error" className="mt-4">
                {revenueError}
              </Alert>
            )}
            {stats.totalRevenue > 0 && (
              <Alert variant="success" className="mt-6" title="Revenue tracking active! 🎉">
                <div className="space-y-1">
                  <p><strong>Total Revenue:</strong> ${stats.totalRevenue.toLocaleString()}</p>
                  <p><strong>Conversion Rate:</strong> {stats.conversionRate.toFixed(1)}% ({stats.bookedLeads} bookings ÷ {stats.newLeadsThisWeek + stats.contactedLeads + stats.bookedLeads} total leads)</p>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Analytics Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leads by Source Chart */}
          <div className="lg:col-span-2">
            <LeadsBySourceChart data={leadsBySource} />
          </div>
          
          {/* Response Time Metric */}
          <div>
            <ResponseTimeMetric 
              averageMinutes={averageResponseTime}
              previousAverage={previousAverageResponseTime}
              isLoading={analyticsLoading}
            />
          </div>
        </div>

        {/* Top Channels Section */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopChannelsMetric 
            channels={topChannels}
            isLoading={analyticsLoading}
          />
          
          {/* Analytics Error Display */}
          {analyticsError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Analytics Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>{analyticsError}</p>
                    <button
                      onClick={refetchAnalytics}
                      className="mt-2 text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lead-to-Booking Metrics */}
        <div className="mt-8">
          <LeadToBookingMetrics />
        </div>

        {/* Niche Playbooks */}
        <div className="mt-8">
          <NichePlaybooks />
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            to="/leads"
            className="group"
          >
            <Card className="hover:shadow-xl transition-all duration-200 group-hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                      <UserPlusIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Manage Leads
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">View and manage your lead pipeline</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link
            to="/crm"
            className="group"
          >
            <Card className="hover:shadow-xl transition-all duration-200 group-hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                      <PhoneIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      CRM Contacts
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Manage customer relationships</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link
            to="/social-automation"
            className="group"
          >
            <Card className="hover:shadow-xl transition-all duration-200 group-hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 12h6m-6 4h6" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      Social Automation
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Automate social media posts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}