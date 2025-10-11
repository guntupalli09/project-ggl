import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface CalendarAutomationProps {
  onEventCreated?: (event: any) => void
}

export default function CalendarAutomation({ onEventCreated }: CalendarAutomationProps) {
  const [automations, setAutomations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAutomation, setSelectedAutomation] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadAutomations()
  }, [])

  const loadAutomations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('user_id', user.id)
        .or('type.eq.calendar,type.is.null,type.eq.followup')

      if (error) throw error
      setAutomations(data || [])
    } catch (err) {
      console.error('Error loading calendar automations:', err)
    } finally {
      setLoading(false)
    }
  }

  const createCalendarEvent = async (leadId: string, eventData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's Google Calendar tokens
      const { data: settings } = await supabase
        .from('user_settings')
        .select('google_access_token')
        .eq('user_id', user.id)
        .single()

      if (!settings?.google_access_token) {
        throw new Error('Google Calendar not connected')
      }

      // Create event in Google Calendar
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.google_access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventData)
        }
      )

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to create calendar event: ${errorData}`)
      }

      const createdEvent = await response.json()

      // Log the automation run
      await supabase
        .from('automation_runs')
        .insert({
          user_id: user.id,
          automation_id: selectedAutomation?.id,
          lead_id: leadId,
          status: 'completed',
          result_message: `Calendar event created: ${eventData.summary}`,
          channel: 'calendar'
        })

      onEventCreated?.(createdEvent)
      return createdEvent

    } catch (err: any) {
      console.error('Error creating calendar event:', err)
      throw err
    }
  }

  const handleLeadMeeting = async (leadId: string, leadData: any) => {
    const eventData = {
      summary: `Meeting with ${leadData.name || 'Lead'}`,
      description: `Meeting with ${leadData.name || 'Lead'} from ${leadData.company || 'Unknown Company'}\n\nLead Details:\n- Email: ${leadData.email}\n- Phone: ${leadData.phone || 'N/A'}\n- Source: ${leadData.source || 'Unknown'}`,
      start: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // 1 hour later
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      attendees: leadData.email ? [{ email: leadData.email }] : undefined
    }

    return await createCalendarEvent(leadId, eventData)
  }

  const handleFollowUpReminder = async (leadId: string, leadData: any) => {
    const eventData = {
      summary: `Follow up with ${leadData.name || 'Lead'}`,
      description: `Follow up with ${leadData.name || 'Lead'} from ${leadData.company || 'Unknown Company'}\n\nPrevious interaction: ${leadData.last_interaction || 'Initial contact'}`,
      start: {
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // 30 minutes later
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }

    return await createCalendarEvent(leadId, eventData)
  }

  const handleBookingReminder = async (bookingData: any) => {
    const eventData = {
      summary: `Booking Reminder: ${bookingData.service || 'Service'}`,
      description: `Reminder for booking with ${bookingData.customer_name || 'Customer'}\n\nService: ${bookingData.service || 'N/A'}\nDuration: ${bookingData.duration || 'N/A'}\nNotes: ${bookingData.notes || 'None'}`,
      start: {
        dateTime: new Date(bookingData.booking_time).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(new Date(bookingData.booking_time).getTime() + (bookingData.duration_minutes || 60) * 60 * 1000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      attendees: bookingData.customer_email ? [{ email: bookingData.customer_email }] : undefined
    }

    return await createCalendarEvent(bookingData.id, eventData)
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Calendar Automation
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Automation
        </button>
      </div>

      <div className="space-y-4">
        {automations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">🤖</div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Calendar Automations
            </h4>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create automations to automatically schedule meetings and reminders
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Automation
            </button>
          </div>
        ) : (
          automations.map(automation => (
            <div key={automation.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {automation.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {automation.description || automation.name}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    automation.active 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {automation.active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => setSelectedAutomation(automation)}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Configure
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleLeadMeeting('test', { name: 'Test Lead', company: 'Test Company', email: 'test@example.com' })}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <div className="text-blue-600 dark:text-blue-400 text-2xl mb-2">📅</div>
            <h5 className="font-medium text-gray-900 dark:text-white">Schedule Meeting</h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create meeting with lead</p>
          </button>
          
          <button
            onClick={() => handleFollowUpReminder('test', { name: 'Test Lead', company: 'Test Company' })}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <div className="text-green-600 dark:text-green-400 text-2xl mb-2">⏰</div>
            <h5 className="font-medium text-gray-900 dark:text-white">Set Follow-up</h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">Schedule follow-up reminder</p>
          </button>
          
          <button
            onClick={() => handleBookingReminder({ 
              service: 'Consultation', 
              customer_name: 'John Doe', 
              booking_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              duration_minutes: 60
            })}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <div className="text-purple-600 dark:text-purple-400 text-2xl mb-2">📋</div>
            <h5 className="font-medium text-gray-900 dark:text-white">Booking Reminder</h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create booking reminder</p>
          </button>
        </div>
      </div>
    </div>
  )
}
