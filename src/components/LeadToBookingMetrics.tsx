import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  ClockIcon, 
  ChatBubbleLeftRightIcon, 
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface Metrics {
  timeToFirstTouch: number // minutes
  replyToBookRate: number // percentage
  bookingsThisWeek: number
  totalRevenue: number
  avgBookingValue: number
  conversionRate: number
}

const LeadToBookingMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics>({
    timeToFirstTouch: 0,
    replyToBookRate: 0,
    bookingsThisWeek: 0,
    totalRevenue: 0,
    avgBookingValue: 0,
    conversionRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get leads with messages and bookings
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id,
          created_at,
          status,
          messages (
            created_at,
            direction,
            sent_at
          )
        `)
        .eq('user_id', user.id)

      if (leadsError) {
        console.error('Error fetching leads:', leadsError)
        return
      }

      // Get bookings separately (in case table doesn't exist yet)
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('lead_id, created_at, price, status')
        .eq('user_id', user.id)

      if (bookingsError) {
        console.warn('Bookings table not found, skipping booking metrics:', bookingsError)
      }

      if (!leads) return

      // Calculate metrics
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      let totalFirstTouchTime = 0
      let firstTouchCount = 0
      let totalReplies = 0
      let totalBookings = 0
      let totalRevenue = 0
      let bookingsThisWeek = 0

      leads.forEach(lead => {
        // Time to first touch
        const firstOutboundMessage = lead.messages
          ?.filter(m => m.direction === 'out')
          ?.sort((a, b) => new Date(a.sent_at || a.created_at).getTime() - new Date(b.sent_at || b.created_at).getTime())[0]

        if (firstOutboundMessage) {
          const leadTime = new Date(lead.created_at).getTime()
          const messageTime = new Date(firstOutboundMessage.sent_at || firstOutboundMessage.created_at).getTime()
          const timeDiff = (messageTime - leadTime) / (1000 * 60) // minutes
          totalFirstTouchTime += timeDiff
          firstTouchCount++
        }

        // Reply rate
        const hasReply = lead.messages?.some(m => m.direction === 'in')
        if (hasReply) totalReplies++

        // Bookings (from separate query)
        const leadBookings = bookings?.filter(b => b.lead_id === lead.id) || []
        if (leadBookings.length > 0) {
          totalBookings++
          leadBookings.forEach(booking => {
            totalRevenue += booking.price || 0
            if (new Date(booking.created_at) >= oneWeekAgo) {
              bookingsThisWeek++
            }
          })
        }
      })

      const timeToFirstTouch = firstTouchCount > 0 ? Math.round(totalFirstTouchTime / firstTouchCount) : 0
      const replyToBookRate = totalReplies > 0 ? Math.round((totalBookings / totalReplies) * 100) : 0
      const conversionRate = leads.length > 0 ? Math.round((totalBookings / leads.length) * 100) : 0
      const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0

      setMetrics({
        timeToFirstTouch,
        replyToBookRate,
        bookingsThisWeek,
        totalRevenue: Math.round(totalRevenue),
        avgBookingValue,
        conversionRate
      })

    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <ChartBarIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Lead-to-Booking Metrics
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Time to First Touch */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Time to First Touch</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {metrics.timeToFirstTouch}m
              </p>
            </div>
          </div>
        </div>

        {/* Reply to Book Rate */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Reply-to-Book Rate</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {metrics.replyToBookRate}%
              </p>
            </div>
          </div>
        </div>

        {/* Bookings This Week */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Bookings This Week</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {metrics.bookingsThisWeek}
              </p>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Total Revenue</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                ${metrics.totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Avg Booking Value */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Avg Booking Value</p>
              <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                ${metrics.avgBookingValue}
              </p>
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Conversion Rate</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {metrics.conversionRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Performance Indicators</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Response Time:</span>
            <span className={`font-medium ${
              metrics.timeToFirstTouch <= 5 ? 'text-green-600' : 
              metrics.timeToFirstTouch <= 15 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {metrics.timeToFirstTouch <= 5 ? 'Excellent' : 
               metrics.timeToFirstTouch <= 15 ? 'Good' : 'Needs Improvement'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Conversion Rate:</span>
            <span className={`font-medium ${
              metrics.conversionRate >= 20 ? 'text-green-600' : 
              metrics.conversionRate >= 10 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {metrics.conversionRate >= 20 ? 'Excellent' : 
               metrics.conversionRate >= 10 ? 'Good' : 'Needs Improvement'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeadToBookingMetrics
