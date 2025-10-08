import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DashboardStats {
  totalLeads: number
  totalContacts: number
  totalSequences: number
  totalMessages: number
  weeklyRevenue: number
  conversionRate: number
  recentMessages: Array<{
    id: string
    lead_name: string
    lead_company: string
    message: string
    created_at: string
  }>
  weeklyMessages: Array<{
    week: string
    messages: number
  }>
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    totalContacts: 0,
    totalSequences: 0,
    totalMessages: 0,
    weeklyRevenue: 0,
    conversionRate: 0,
    recentMessages: [],
    weeklyMessages: []
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [roiInput, setRoiInput] = useState('')
  const [roiSubmitting, setRoiSubmitting] = useState(false)
  const [roiError, setRoiError] = useState('')
  const navigate = useNavigate()

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      setStatsLoading(true)
      
      // Fetch total leads count
      const { count: leadsCount, error: leadsError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })

      if (leadsError) {
        console.error('Error fetching leads count:', leadsError)
      }

      // Fetch total contacts count
      const { count: contactsCount, error: contactsError } = await supabase
        .from('crm_contacts')
        .select('*', { count: 'exact', head: true })

      if (contactsError) {
        console.error('Error fetching contacts count:', contactsError)
      }

      // Fetch total sequences count
      const { count: sequencesCount, error: sequencesError } = await supabase
        .from('outreach_sequences')
        .select('*', { count: 'exact', head: true })

      if (sequencesError) {
        console.error('Error fetching sequences count:', sequencesError)
      }

      // Fetch recent messages from sequences
      const { data: recentMessages, error: messagesError } = await supabase
        .from('outreach_sequences')
        .select(`
          id,
          initial_message,
          follow_up_message,
          reminder_message,
          created_at,
          crm_contacts!inner(name, company)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      if (messagesError) {
        console.error('Error fetching recent messages:', messagesError)
      }

      // Fetch weekly message data for chart
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('outreach_sequences')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })

      if (weeklyError) {
        console.error('Error fetching weekly data:', weeklyError)
      }

      // Fetch weekly revenue
      const weekStart = getWeekStartDate()
      const { data: roiData, error: roiError } = await supabase
        .from('roi_metrics')
        .select('revenue')
        .eq('week_start_date', weekStart)
        .single()

      if (roiError && roiError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching ROI data:', roiError)
      }

      // Process weekly data
      const weeklyMessages = processWeeklyData(weeklyData || [])

      // Process recent messages
      const processedRecentMessages = (recentMessages || []).map(seq => ({
        id: seq.id,
        lead_name: (seq as any).crm_contacts?.name || 'Unknown',
        lead_company: (seq as any).crm_contacts?.company || 'Unknown',
        message: seq.initial_message,
        created_at: seq.created_at
      }))

      // Calculate conversion rate
      const weeklyRevenue = roiData?.revenue || 0
      const conversionRate = leadsCount && leadsCount > 0 ? (weeklyRevenue / leadsCount) * 100 : 0

      setStats({
        totalLeads: leadsCount || 0,
        totalContacts: contactsCount || 0,
        totalSequences: sequencesCount || 0,
        totalMessages: (sequencesCount || 0) * 3, // Each sequence has 3 messages
        weeklyRevenue: weeklyRevenue,
        conversionRate: conversionRate,
        recentMessages: processedRecentMessages,
        weeklyMessages: weeklyMessages
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  // Process weekly data for chart
  const processWeeklyData = (data: any[]) => {
    const weekMap = new Map()
    const today = new Date()
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const weekKey = date.toISOString().split('T')[0]
      weekMap.set(weekKey, 0)
    }

    // Count messages per day
    data.forEach(item => {
      const date = new Date(item.created_at).toISOString().split('T')[0]
      if (weekMap.has(date)) {
        weekMap.set(date, weekMap.get(date) + 3) // Each sequence = 3 messages
      }
    })

    // Convert to array format for chart
    return Array.from(weekMap.entries()).map(([date, count]) => ({
      week: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      messages: count
    }))
  }

  // Get the start of the current week (Monday)
  const getWeekStartDate = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  // Handle ROI submission
  const handleRoiSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRoiError('')
    setRoiSubmitting(true)

    try {
      const revenue = parseFloat(roiInput)
      if (isNaN(revenue) || revenue < 0) {
        setRoiError('Please enter a valid positive number')
        setRoiSubmitting(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setRoiError('User not authenticated')
        setRoiSubmitting(false)
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
        console.error('Error saving ROI data:', error)
        setRoiError('Failed to save revenue data')
      } else {
        setRoiInput('')
        // Refresh dashboard stats to show updated revenue
        await fetchDashboardStats()
      }
    } catch (err) {
      console.error('Error:', err)
      setRoiError('Failed to save revenue data')
    } finally {
      setRoiSubmitting(false)
    }
  }

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
      
      if (!user) {
        navigate('/login')
      } else {
        // Fetch stats only if user is authenticated
        fetchDashboardStats()
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          navigate('/login')
        } else {
          setUser(session?.user ?? null)
          if (session?.user) {
            fetchDashboardStats()
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          {/* Total Leads Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Leads</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? (
                        <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
                      ) : (
                        stats.totalLeads
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Total Contacts Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">CRM Contacts</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? (
                        <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
                      ) : (
                        stats.totalContacts
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Total Sequences Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Outreach Sequences</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? (
                        <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
                      ) : (
                        stats.totalSequences
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Total Messages Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Messages</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? (
                        <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
                      ) : (
                        stats.totalMessages
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Revenue Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Weekly Revenue</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? (
                        <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
                      ) : (
                        `$${stats.weeklyRevenue.toFixed(2)}`
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Conversion Rate Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-cyan-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Conversion Rate</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? (
                        <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
                      ) : (
                        `${stats.conversionRate.toFixed(1)}%`
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Messages Chart */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Weekly Message Generation</h3>
            <p className="text-sm text-gray-500">Messages generated over the last 7 days</p>
          </div>
          <div className="p-6">
            {statsLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-pulse bg-gray-200 h-64 w-full rounded"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.weeklyMessages}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [value, 'Messages']}
                    labelFormatter={(label) => `Day: ${label}`}
                  />
                  <Bar dataKey="messages" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

          {/* Recent AI Messages Section */}
          {stats.recentMessages.length > 0 && (
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent AI Messages</h3>
                <p className="text-sm text-gray-500">Latest generated messages for your leads</p>
              </div>
              <div className="divide-y divide-gray-200">
                {stats.recentMessages.map((message) => (
                  <div key={message.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-sm font-medium text-gray-900">
                            {message.lead_name}
                          </h4>
                          <span className="text-sm text-gray-500">at</span>
                          <span className="text-sm text-gray-700">{message.lead_company}</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {message.message}
                        </p>
                        <p className="mt-2 text-xs text-gray-400">
                          {new Date(message.created_at).toLocaleDateString()} at{' '}
                          {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Leads Management</dt>
                      <dd className="text-lg font-medium text-gray-900">Manage your leads</dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <Link
                    to="/leads"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    View leads
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Analytics</dt>
                      <dd className="text-lg font-medium text-gray-900">Coming soon</dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <span className="font-medium text-gray-500">Not available yet</span>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">CRM Contacts</dt>
                      <dd className="text-lg font-medium text-gray-900">Manage relationships</dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <Link
                    to="/crm"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    View contacts
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROI Input Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Revenue Tracking</h3>
            <p className="text-sm text-gray-500">Enter your weekly revenue to track ROI and conversion rates</p>
          </div>
          <div className="p-6">
            <form onSubmit={handleRoiSubmit} className="flex items-end space-x-4">
              <div className="flex-1">
                <label htmlFor="revenue" className="block text-sm font-medium text-gray-700 mb-2">
                  Revenue earned this week
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    id="revenue"
                    step="0.01"
                    min="0"
                    className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="0.00"
                    value={roiInput}
                    onChange={(e) => setRoiInput(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={roiSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {roiSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Revenue'
                )}
              </button>
            </form>
            {roiError && (
              <div className="mt-4 text-red-600 text-sm">
                {roiError}
              </div>
            )}
            {stats.weeklyRevenue > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Revenue saved successfully!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Weekly Revenue: ${stats.weeklyRevenue.toFixed(2)}</p>
                      <p>Conversion Rate: {stats.conversionRate.toFixed(1)}% (${stats.weeklyRevenue.toFixed(2)} ÷ {stats.totalLeads} leads)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
