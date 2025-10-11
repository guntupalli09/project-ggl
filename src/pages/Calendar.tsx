import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import BusinessCalendarView from '../components/BusinessCalendarView'
import GoogleCalendarIntegration from '../components/GoogleCalendarIntegration'
import BookingSystem from '../components/BookingSystem'
import CalendarAutomation from '../components/CalendarAutomation'
import CalendarAnalytics from '../components/CalendarAnalytics'
import { googleCalendarAuth } from '../lib/googleCalendarAuth'
import { 
  CalendarIcon, 
  ClockIcon, 
  CogIcon, 
  ChartBarIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

export default function Calendar() {
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('calendar')
  const [events, setEvents] = useState([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    checkGoogleCalendarStatus()
  }, [])

  useEffect(() => {
    if (googleCalendarConnected) {
      fetchCalendarEvents()
    }
  }, [googleCalendarConnected])

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true)
      
      // Get a valid access token (will refresh if needed)
      const accessToken = await googleCalendarAuth.getValidAccessToken()
      if (!accessToken) {
        console.error('No valid access token available')
        setGoogleCalendarConnected(false)
        return
      }

      // Calculate date range for comprehensive data
      const now = new Date()
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), 31)

      // Fetch events from Google Calendar API with time range
      const timeMin = sixMonthsAgo.toISOString()
      const timeMax = oneYearFromNow.toISOString()
      
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=2500`
      
      console.log('Fetching calendar events from:', timeMin, 'to:', timeMax)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Fetched events:', data.items?.length || 0)
        setEvents(data.items || [])
        setLastUpdated(new Date())
      } else if (response.status === 401) {
        console.error('Token expired, attempting to refresh...')
        // Try to refresh the token
        const refreshed = await googleCalendarAuth.checkAuthStatus()
        if (refreshed.isAuthenticated) {
          // Retry the request with the new token
          const newToken = await googleCalendarAuth.getValidAccessToken()
          if (newToken) {
            const retryResponse = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${newToken}`
              }
            })
            if (retryResponse.ok) {
              const retryData = await retryResponse.json()
              console.log('Fetched events after refresh:', retryData.items?.length || 0)
              setEvents(retryData.items || [])
              setLastUpdated(new Date())
            } else {
              console.error('Failed to fetch events after token refresh:', retryResponse.status)
              setGoogleCalendarConnected(false)
            }
          }
        } else {
          console.error('Token refresh failed')
          setGoogleCalendarConnected(false)
        }
      } else {
        console.error('Failed to fetch events:', response.status, response.statusText)
        const errorData = await response.text()
        console.error('Error details:', errorData)
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEventSaved = () => {
    // Refresh events when an event is saved
    fetchCalendarEvents()
  }

  const handleEventDeleted = () => {
    // Refresh events when an event is deleted
    fetchCalendarEvents()
  }

  const checkGoogleCalendarStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: settings } = await supabase
        .from('user_settings')
        .select('google_calendar_connected, google_access_token')
        .eq('user_id', user.id)
        .single()

      if (settings?.google_calendar_connected && settings?.google_access_token) {
        setGoogleCalendarConnected(true)
      }
    } catch (err) {
      console.error('Error checking Google Calendar status:', err)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'calendar', name: 'Calendar View', icon: CalendarIcon },
    { id: 'bookings', name: 'Bookings', icon: ClockIcon },
    { id: 'automation', name: 'Automation', icon: CogIcon },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calendar Hub</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage your schedule, appointments, bookings, and automations
              </p>
            </div>
            
            {/* Google Calendar Integration */}
            <div className="flex items-center space-x-4">
              <GoogleCalendarIntegration onConnectionChange={setGoogleCalendarConnected} />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {activeTab === 'calendar' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Calendar View
                </h2>
                {!googleCalendarConnected && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                      Connect your Google Calendar to view and manage events
                    </p>
                  </div>
                )}
              </div>
              {googleCalendarConnected ? (
                <BusinessCalendarView 
                  events={events} 
                  onEventSaved={handleEventSaved}
                  onEventDeleted={handleEventDeleted}
                />
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-12 text-center">
                  <div className="text-gray-400 text-6xl mb-4">📅</div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Connect Your Calendar
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Connect your Google Calendar to view and manage your business schedule
                  </p>
                  <div className="text-sm text-gray-500 dark:text-gray-500">
                    Use the connection section above to get started
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Booking Management
                </h2>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Booking
                </button>
              </div>
              <BookingSystem />
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Calendar Automation
                </h2>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Automation
                </button>
              </div>
              <CalendarAutomation />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Calendar Analytics
                </h2>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {events.length} events loaded
                    {lastUpdated && (
                      <span className="ml-2">
                        • Last updated: {lastUpdated.toLocaleTimeString()}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={fetchCalendarEvents}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    <span className="ml-2">Refresh</span>
                  </button>
                </div>
              </div>
              <CalendarAnalytics events={events} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
