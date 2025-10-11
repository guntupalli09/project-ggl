import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface CalendarAnalyticsProps {
  events: any[]
}

export default function CalendarAnalytics({ events }: CalendarAnalyticsProps) {
  const [analytics, setAnalytics] = useState({
    totalEvents: 0,
    thisWeekEvents: 0,
    thisMonthEvents: 0,
    upcomingEvents: 0,
    completedEvents: 0,
    averageEventDuration: 0,
    busiestDay: '',
    busiestTime: '',
    eventTypes: {} as Record<string, number>,
    monthlyTrend: [] as Array<{ month: string; count: number }>
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    calculateAnalytics()
    setLoading(false)
  }, [events])

  const calculateAnalytics = () => {
    if (!events || !Array.isArray(events)) {
      setAnalytics({
        totalEvents: 0,
        thisWeekEvents: 0,
        thisMonthEvents: 0,
        upcomingEvents: 0,
        completedEvents: 0,
        averageEventDuration: 0,
        busiestDay: '',
        busiestTime: '',
        eventTypes: {},
        monthlyTrend: []
      })
      return
    }

    console.log('Calculating analytics for events:', events.length, 'events')

    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    console.log('Date ranges:', {
      now: now.toISOString(),
      startOfWeek: startOfWeek.toISOString(),
      endOfWeek: endOfWeek.toISOString(),
      startOfMonth: startOfMonth.toISOString(),
      endOfMonth: endOfMonth.toISOString()
    })

    // Filter events that have valid start dates
    const validEvents = events.filter(event => {
      const startDate = event.start?.dateTime || event.start?.date
      return startDate && !isNaN(new Date(startDate).getTime())
    })

    console.log('Valid events:', validEvents.length)

    const totalEvents = validEvents.length
    
    const thisWeekEvents = validEvents.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date)
      return eventDate >= startOfWeek && eventDate <= endOfWeek
    }).length

    const thisMonthEvents = validEvents.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date)
      return eventDate >= startOfMonth && eventDate <= endOfMonth
    }).length

    const upcomingEvents = validEvents.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date)
      return eventDate > now
    }).length

    const completedEvents = validEvents.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date)
      return eventDate < now
    }).length

    console.log('Event counts:', {
      totalEvents,
      thisWeekEvents,
      thisMonthEvents,
      upcomingEvents,
      completedEvents
    })

    // Calculate average event duration
    const eventsWithDuration = validEvents.filter(event => event.start.dateTime && event.end.dateTime)
    const totalDuration = eventsWithDuration.reduce((total, event) => {
      const start = new Date(event.start.dateTime)
      const end = new Date(event.end.dateTime)
      return total + (end.getTime() - start.getTime())
    }, 0)
    const averageEventDuration = eventsWithDuration.length > 0 
      ? Math.round(totalDuration / eventsWithDuration.length / (1000 * 60)) // Convert to minutes
      : 0

    // Find busiest day of week
    const dayCounts = {} as Record<string, number>
    validEvents.forEach(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date)
      const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'long' })
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1
    })
    const busiestDay = Object.entries(dayCounts).length > 0 
      ? Object.entries(dayCounts).reduce((a, b) => dayCounts[a[0]] > dayCounts[b[0]] ? a : b)[0]
      : 'No data'

    // Find busiest time of day
    const timeCounts = {} as Record<string, number>
    validEvents.forEach(event => {
      if (event.start.dateTime) {
        const eventDate = new Date(event.start.dateTime)
        const hour = eventDate.getHours()
        const timeSlot = `${hour}:00-${hour + 1}:00`
        timeCounts[timeSlot] = (timeCounts[timeSlot] || 0) + 1
      }
    })
    const busiestTime = Object.entries(timeCounts).length > 0
      ? Object.entries(timeCounts).reduce((a, b) => timeCounts[a[0]] > timeCounts[b[0]] ? a : b)[0]
      : 'No data'

    // Event types analysis
    const eventTypes = {} as Record<string, number>
    validEvents.forEach(event => {
      const summary = event.summary || 'Untitled Event'
      // Try to categorize events by keywords
      let type = 'Other'
      if (summary.toLowerCase().includes('meeting')) type = 'Meeting'
      else if (summary.toLowerCase().includes('call')) type = 'Call'
      else if (summary.toLowerCase().includes('appointment')) type = 'Appointment'
      else if (summary.toLowerCase().includes('consultation')) type = 'Consultation'
      else if (summary.toLowerCase().includes('follow')) type = 'Follow-up'
      else if (summary.toLowerCase().includes('reminder')) type = 'Reminder'
      else if (summary.toLowerCase().includes('conference')) type = 'Conference'
      else if (summary.toLowerCase().includes('lunch')) type = 'Lunch'
      else if (summary.toLowerCase().includes('dinner')) type = 'Dinner'
      else if (summary.toLowerCase().includes('breakfast')) type = 'Breakfast'
      else if (summary.toLowerCase().includes('training')) type = 'Training'
      else if (summary.toLowerCase().includes('workshop')) type = 'Workshop'
      else if (summary.toLowerCase().includes('interview')) type = 'Interview'
      else if (summary.toLowerCase().includes('presentation')) type = 'Presentation'
      
      eventTypes[type] = (eventTypes[type] || 0) + 1
    })

    // Monthly trend (last 6 months)
    const monthlyTrend = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = date.toLocaleDateString('en-US', { month: 'short' })
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      
      const monthEvents = validEvents.filter(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date)
        return eventDate >= monthStart && eventDate <= monthEnd
      }).length
      
      monthlyTrend.push({ month: monthName, count: monthEvents })
    }

    console.log('Final analytics:', {
      totalEvents,
      thisWeekEvents,
      thisMonthEvents,
      upcomingEvents,
      completedEvents,
      averageEventDuration,
      busiestDay,
      busiestTime,
      eventTypes,
      monthlyTrend
    })

    setAnalytics({
      totalEvents,
      thisWeekEvents,
      thisMonthEvents,
      upcomingEvents,
      completedEvents,
      averageEventDuration,
      busiestDay,
      busiestTime,
      eventTypes,
      monthlyTrend
    })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Calendar Analytics
        </h3>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Calendar Analytics
        </h3>
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Calendar Data
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your Google Calendar to see analytics and insights
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Calendar Analytics
      </h3>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {analytics.totalEvents}
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400">Total Events</div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {analytics.thisWeekEvents}
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">This Week</div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {analytics.upcomingEvents}
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-400">Upcoming</div>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {formatDuration(analytics.averageEventDuration)}
          </div>
          <div className="text-sm text-orange-600 dark:text-orange-400">Avg Duration</div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Types */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Event Types
          </h4>
          <div className="space-y-3">
            {Object.entries(analytics.eventTypes).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">{type}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(count / analytics.totalEvents) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-8">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Busiest Times */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Busiest Times
          </h4>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Busiest Day</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {analytics.busiestDay}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Busiest Time</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {analytics.busiestTime}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="mt-8">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Monthly Trend (Last 6 Months)
        </h4>
        <div className="flex items-end space-x-2 h-32">
          {analytics.monthlyTrend.map(({ month, count }, index) => {
            const maxCount = Math.max(...analytics.monthlyTrend.map(m => m.count))
            const height = maxCount > 0 ? (count / maxCount) * 100 : 0
            
            return (
              <div key={month} className="flex-1 flex flex-col items-center">
                <div 
                  className="bg-blue-600 rounded-t w-full transition-all duration-300 hover:bg-blue-700"
                  style={{ height: `${height}%` }}
                  title={`${month}: ${count} events`}
                ></div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {month}
                </div>
                <div className="text-xs font-medium text-gray-900 dark:text-white">
                  {count}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Insights */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          Quick Insights
        </h4>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          {analytics.thisWeekEvents > 0 && (
            <p>• You have {analytics.thisWeekEvents} events scheduled this week</p>
          )}
          {analytics.upcomingEvents > 0 && (
            <p>• {analytics.upcomingEvents} upcoming events in your calendar</p>
          )}
          {analytics.averageEventDuration > 0 && (
            <p>• Average event duration is {formatDuration(analytics.averageEventDuration)}</p>
          )}
          {analytics.busiestDay && (
            <p>• {analytics.busiestDay} is your busiest day of the week</p>
          )}
        </div>
      </div>
    </div>
  )
}
