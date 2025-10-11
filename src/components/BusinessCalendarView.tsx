import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import EventModal from './EventModal'

interface CalendarEvent {
  id?: string
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
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: string
  }>
  status?: string
  htmlLink?: string
}

interface BusinessCalendarViewProps {
  onError?: (error: string) => void
  events?: CalendarEvent[]
  onEventSaved?: () => void
  onEventDeleted?: () => void
}

export default function BusinessCalendarView({ onError, events: propEvents, onEventSaved }: BusinessCalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('week')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [eventModalDate, setEventModalDate] = useState<Date | undefined>()

  useEffect(() => {
    if (propEvents) {
      setEvents(propEvents)
      setLoading(false)
    } else {
      fetchCalendarEvents()
    }
  }, [propEvents, currentDate, view])

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
      const { timeMin, timeMax } = getDateRange(currentDate, view)

      // Fetch events from Google Calendar API
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`,
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

  const getDateRange = (date: Date, view: 'day' | 'week' | 'month') => {
    const start = new Date(date)
    const end = new Date(date)

    switch (view) {
      case 'day':
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'week':
        const dayOfWeek = start.getDay()
        start.setDate(start.getDate() - dayOfWeek)
        start.setHours(0, 0, 0, 0)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      case 'month':
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(start.getMonth() + 1, 0)
        end.setHours(23, 59, 59, 999)
        break
    }

    return {
      timeMin: start.toISOString(),
      timeMax: end.toISOString()
    }
  }

  // const formatTime = (dateTime: string) => {
  //   const date = new Date(dateTime)
  //   return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  // }

  // const formatDate = (dateTime: string) => {
  //   const date = new Date(dateTime)
  //   return date.toLocaleDateString([], { 
  //     weekday: 'short', 
  //     month: 'short', 
  //     day: 'numeric' 
  //   })
  // }

  // const isEventToday = (event: CalendarEvent) => {
  //   const today = new Date()
  //   const eventDate = new Date(event.start.dateTime || event.start.date || '')
  //   return eventDate.toDateString() === today.toDateString()
  // }

  // const isEventUpcoming = (event: CalendarEvent) => {
  //   const now = new Date()
  //   const eventDate = new Date(event.start.dateTime || event.start.date || '')
  //   return eventDate > now
  // }

  // const getEventStatusColor = (event: CalendarEvent) => {
  //   if (event.status === 'confirmed') return 'bg-green-500'
  //   if (event.status === 'tentative') return 'bg-yellow-500'
  //   if (event.status === 'cancelled') return 'bg-red-500'
  //   return 'bg-blue-500'
  // }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    
    switch (view) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
    }
    
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const getViewTitle = () => {
    switch (view) {
      case 'day':
        return currentDate.toLocaleDateString([], { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      case 'week':
        const weekStart = new Date(currentDate)
        weekStart.setDate(currentDate.getDate() - currentDate.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return `${weekStart.toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
      case 'month':
        return currentDate.toLocaleDateString([], { year: 'numeric', month: 'long' })
      default:
        return ''
    }
  }

  const getEventsForSelectedDate = () => {
    if (view === 'day') return events
    
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date || '')
      const selected = new Date(selectedDate)
      
      if (view === 'week') {
        const weekStart = new Date(selected)
        weekStart.setDate(selected.getDate() - selected.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        
        return eventDate >= weekStart && eventDate <= weekEnd
      }
      
      if (view === 'month') {
        return eventDate.getMonth() === selected.getMonth() && 
               eventDate.getFullYear() === selected.getFullYear()
      }
      
      return false
    })
  }

  const handleCreateEvent = (date?: Date) => {
    setSelectedEvent(null)
    setEventModalDate(date || selectedDate)
    setShowEventModal(true)
  }

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setEventModalDate(undefined)
    setShowEventModal(true)
  }

  const handleEventSaved = (savedEvent: CalendarEvent) => {
    if (selectedEvent) {
      // Update existing event
      setEvents(prev => prev.map(e => e.id === savedEvent.id ? savedEvent : e))
    } else {
      // Add new event
      setEvents(prev => [...prev, savedEvent])
    }
    setShowEventModal(false)
    setSelectedEvent(null)
    setEventModalDate(undefined)
    
    // Notify parent component
    if (onEventSaved) {
      onEventSaved()
    }
  }

  // const handleEventDeleted = () => {
  //   if (selectedEvent) {
  //     setEvents(prev => prev.filter(e => e.id !== selectedEvent.id))
  //   }
  //   setShowEventModal(false)
  //   setSelectedEvent(null)
  //   setEventModalDate(undefined)
  //   
  //   // Notify parent component
  //   if (onEventDeleted) {
  //     onEventDeleted()
  //   }
  // }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-600 dark:text-gray-300 text-lg">Loading calendar...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Calendar Error</h3>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchCalendarEvents}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Business Calendar</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleCreateEvent()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Event</span>
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Today
            </button>
            <button
              onClick={fetchCalendarEvents}
              className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              ←
            </button>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white min-w-0 flex-1 text-center">
              {getViewTitle()}
            </h3>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              →
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setView('day')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'day'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'week'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'month'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="p-6">
        {view === 'month' ? (
          <MonthView 
            currentDate={currentDate}
            events={events}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onCreateEvent={handleCreateEvent}
            onEditEvent={handleEditEvent}
          />
        ) : (
          <EventsList 
            events={getEventsForSelectedDate()}
            view={view}
            currentDate={currentDate}
            onEditEvent={handleEditEvent}
          />
        )}

        {/* Event Modal */}
        <EventModal
          isOpen={showEventModal}
          onClose={() => setShowEventModal(false)}
          onSave={handleEventSaved}
          event={selectedEvent}
          selectedDate={eventModalDate}
        />
      </div>
    </div>
  )
}

// Month View Component
function MonthView({ 
  currentDate, 
  events, 
  selectedDate, 
  onDateSelect,
  onCreateEvent,
  onEditEvent
}: {
  currentDate: Date
  events: CalendarEvent[]
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onCreateEvent: (date: Date) => void
  onEditEvent: (event: CalendarEvent) => void
}) {
  const today = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  // Generate calendar days
  const calendarDays = []
  
  // Previous month days
  const prevMonth = new Date(year, month - 1, 0)
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    calendarDays.push({
      date: new Date(year, month - 1, prevMonth.getDate() - i),
      isCurrentMonth: false,
      isToday: false,
      isSelected: false
    })
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    calendarDays.push({
      date,
      isCurrentMonth: true,
      isToday: date.toDateString() === today.toDateString(),
      isSelected: date.toDateString() === selectedDate.toDateString()
    })
  }

  // Next month days to fill the grid
  const remainingDays = 42 - calendarDays.length
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
      isToday: false,
      isSelected: false
    })
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date || '')
      return eventDate.toDateString() === date.toDateString()
    })
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {/* Days of week header */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
          {day}
        </div>
      ))}

      {/* Calendar days */}
      {calendarDays.map((day, index) => {
        const dayEvents = getEventsForDate(day.date)
        return (
          <div
            key={index}
            className={`
              min-h-[100px] p-2 border border-gray-200 dark:border-gray-700 cursor-pointer
              hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative group
              ${!day.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900 text-gray-400' : ''}
              ${day.isToday ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-700' : ''}
              ${day.isSelected ? 'bg-blue-100 dark:bg-blue-800 border-blue-400 dark:border-blue-600' : ''}
            `}
          >
            <div 
              className={`
                text-sm font-medium mb-1 cursor-pointer
                ${day.isToday ? 'text-blue-600 dark:text-blue-400' : ''}
                ${day.isSelected ? 'text-blue-700 dark:text-blue-300' : ''}
              `}
              onClick={() => onDateSelect(day.date)}
            >
              {day.date.getDate()}
            </div>
            
            {/* Events for this day */}
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map(event => (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditEvent(event)
                  }}
                  className="text-xs p-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded truncate cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                  title={`Click to edit: ${event.summary}`}
                >
                  {event.summary}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>

            {/* Add Event Button */}
            {day.isCurrentMonth && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateEvent(day.date)
                }}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-blue-700"
                title="Add event"
              >
                +
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Events List Component
function EventsList({ 
  events, 
  view, 
  // currentDate,
  onEditEvent
}: {
  events: CalendarEvent[]
  view: 'day' | 'week'
  currentDate: Date
  onEditEvent: (event: CalendarEvent) => void
}) {
  // const today = new Date()
  const upcomingEvents = events.filter(event => isEventUpcoming(event))
  const todayEvents = events.filter(event => isEventToday(event))

  function isEventUpcoming(event: CalendarEvent) {
    const now = new Date()
    const eventDate = new Date(event.start.dateTime || event.start.date || '')
    return eventDate > now
  }

  function isEventToday(event: CalendarEvent) {
    const today = new Date()
    const eventDate = new Date(event.start.dateTime || event.start.date || '')
    return eventDate.toDateString() === today.toDateString()
  }

  // function formatTime(dateTime: string) {
  //   const date = new Date(dateTime)
  //   return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  // }

  // function formatDate(dateTime: string) {
  //   const date = new Date(dateTime)
  //   return date.toLocaleDateString([], { 
  //     weekday: 'short', 
  //     month: 'short', 
  //     day: 'numeric' 
  //   })
  // }

  // function getEventStatusColor(event: CalendarEvent) {
  //   if (event.status === 'confirmed') return 'bg-green-500'
  //   if (event.status === 'tentative') return 'bg-yellow-500'
  //   if (event.status === 'cancelled') return 'bg-red-500'
  //   return 'bg-blue-500'
  // }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📅</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Events</h3>
        <p className="text-gray-500 dark:text-gray-400">
          No events scheduled for this {view}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Today's Events ({todayEvents.length})
          </h4>
          <div className="space-y-3">
            {todayEvents.map(event => (
              <EventCard key={event.id} event={event} onEdit={onEditEvent} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            Upcoming Events ({upcomingEvents.length})
          </h4>
          <div className="space-y-3">
            {upcomingEvents.map(event => (
              <EventCard key={event.id} event={event} onEdit={onEditEvent} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Event Card Component
function EventCard({ event, onEdit }: { event: CalendarEvent; onEdit: (event: CalendarEvent) => void }) {
  // const formatTime = (dateTime: string) => {
  //   const date = new Date(dateTime)
  //   return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  // }

  // const formatDate = (dateTime: string) => {
  //   const date = new Date(dateTime)
  //   return date.toLocaleDateString([], { 
  //     weekday: 'short', 
  //     month: 'short', 
  //     day: 'numeric' 
  //   })
  // }

  // const getEventStatusColor = (event: CalendarEvent) => {
  //   if (event.status === 'confirmed') return 'bg-green-500'
  //   if (event.status === 'tentative') return 'bg-yellow-500'
  //   if (event.status === 'cancelled') return 'bg-red-500'
  //   return 'bg-blue-500'
  // }

  const isAllDay = !event.start.dateTime

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <div className={`w-3 h-3 rounded-full mr-3 bg-blue-500`}></div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              {event.summary || 'No Title'}
            </h5>
          </div>
          
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span className="mr-4">
              📅 {new Date(event.start.dateTime || event.start.date || '').toLocaleDateString()}
            </span>
            <span>
              ⏰ {isAllDay ? 'All Day' : new Date(event.start.dateTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {event.location && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              📍 {event.location}
            </div>
          )}

          {event.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
              {event.description}
            </p>
          )}

          {event.attendees && event.attendees.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              👥 {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="ml-4 flex flex-col items-end space-y-2">
          <button
            onClick={() => onEdit(event)}
            className="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
          >
            Edit
          </button>
          {event.htmlLink && (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
            >
              Open in Calendar
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
