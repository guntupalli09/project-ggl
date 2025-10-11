import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface CalendarEvent {
  id: string
  summary: string
  start: {
    dateTime?: string
    date?: string
  }
  end: {
    dateTime?: string
    date?: string
  }
  location?: string
  description?: string
}

interface GoogleCalendarViewProps {
  onError?: (error: string) => void
}

export default function GoogleCalendarView({ onError }: GoogleCalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<'today' | 'week' | 'month'>('today')

  useEffect(() => {
    fetchCalendarEvents()
  }, [view])

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true)
      setError('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        return
      }

      // Get user's Google Calendar tokens
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('google_access_token, google_calendar_email')
        .eq('user_id', user.id)
        .single()

      if (settingsError || !settings?.google_access_token) {
        setError('Google Calendar not connected')
        return
      }

      // Calculate date range based on view
      const now = new Date()
      let timeMin: string
      let timeMax: string

      switch (view) {
        case 'today':
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
          timeMin = todayStart.toISOString()
          timeMax = todayEnd.toISOString()
          break
        case 'week':
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          weekStart.setHours(0, 0, 0, 0)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 7)
          timeMin = weekStart.toISOString()
          timeMax = weekEnd.toISOString()
          break
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
          timeMin = monthStart.toISOString()
          timeMax = monthEnd.toISOString()
          break
        default:
          timeMin = now.toISOString()
          timeMax = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
      }

      // Fetch events from Google Calendar API
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${settings.google_access_token}`
          }
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          setError('Google Calendar access expired. Please reconnect.')
          onError?.('Google Calendar access expired. Please reconnect.')
        } else {
          setError(`Failed to fetch calendar: ${response.status}`)
        }
        return
      }

      const data = await response.json()
      setEvents(data.items || [])

    } catch (err: any) {
      console.error('Error fetching calendar events:', err)
      setError(err.message || 'Failed to fetch calendar events')
      onError?.(err.message || 'Failed to fetch calendar events')
    } finally {
      setLoading(false)
    }
  }

  const formatEventTime = (event: CalendarEvent) => {
    const start = event.start.dateTime || event.start.date
    if (!start) return 'All day'
    
    const date = new Date(start)
    if (event.start.date && !event.start.dateTime) {
      return date.toLocaleDateString()
    }
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatEventDate = (event: CalendarEvent) => {
    const start = event.start.dateTime || event.start.date
    if (!start) return ''
    
    const date = new Date(start)
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-300">Loading calendar...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center">
          <div className="text-red-400 mb-2">⚠️</div>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchCalendarEvents}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Google Calendar</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setView('today')}
            className={`px-3 py-1 rounded text-sm ${
              view === 'today' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1 rounded text-sm ${
              view === 'week' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1 rounded text-sm ${
              view === 'month' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">📅</div>
            <p className="text-gray-400">No events found for this {view}</p>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-white font-medium mb-1">
                    {event.summary || 'No Title'}
                  </h4>
                  {event.description && (
                    <p className="text-gray-300 text-sm mb-2 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  {event.location && (
                    <p className="text-gray-400 text-sm mb-2">
                      📍 {event.location}
                    </p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="text-blue-400 text-sm font-medium">
                    {formatEventTime(event)}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {formatEventDate(event)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={fetchCalendarEvents}
          className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  )
}
