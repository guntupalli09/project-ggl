import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { googleCalendarAuth } from '../lib/googleCalendarAuth'

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
  }>
}

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: CalendarEvent) => void
  event?: CalendarEvent | null
  selectedDate?: Date
}

export default function EventModal({ 
  isOpen, 
  onClose, 
  onSave, 
  event, 
  selectedDate 
}: EventModalProps) {
  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    isAllDay: false,
    attendees: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (event) {
      // Editing existing event
      const startDateTime = event.start.dateTime || event.start.date || ''
      const endDateTime = event.end.dateTime || event.end.date || ''
      const isAllDay = !event.start.dateTime
      
      setFormData({
        summary: event.summary || '',
        description: event.description || '',
        location: event.location || '',
        startDate: isAllDay ? startDateTime.split('T')[0] : startDateTime.split('T')[0],
        startTime: isAllDay ? '' : startDateTime.split('T')[1]?.substring(0, 5) || '',
        endDate: isAllDay ? endDateTime.split('T')[0] : endDateTime.split('T')[0],
        endTime: isAllDay ? '' : endDateTime.split('T')[1]?.substring(0, 5) || '',
        isAllDay,
        attendees: event.attendees?.map(a => a.email).join(', ') || ''
      })
    } else if (selectedDate) {
      // Creating new event
      const dateStr = selectedDate.toISOString().split('T')[0]
      const timeStr = new Date().toTimeString().substring(0, 5)
      
      setFormData({
        summary: '',
        description: '',
        location: '',
        startDate: dateStr,
        startTime: timeStr,
        endDate: dateStr,
        endTime: new Date(Date.now() + 60 * 60 * 1000).toTimeString().substring(0, 5), // 1 hour later
        isAllDay: false,
        attendees: ''
      })
    }
  }, [event, selectedDate])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate form data
    if (!formData.summary.trim()) {
      setError('Event title is required')
      setLoading(false)
      return
    }

    if (!formData.startDate || !formData.endDate) {
      setError('Start and end dates are required')
      setLoading(false)
      return
    }

    if (!formData.isAllDay && (!formData.startTime || !formData.endTime)) {
      setError('Start and end times are required for timed events')
      setLoading(false)
      return
    }

    // Validate that end date/time is after start date/time
    const startDateTime = formData.isAllDay 
      ? new Date(formData.startDate)
      : new Date(`${formData.startDate}T${formData.startTime}:00`)
    const endDateTime = formData.isAllDay 
      ? new Date(formData.endDate)
      : new Date(`${formData.endDate}T${formData.endTime}:00`)

    if (endDateTime <= startDateTime) {
      setError('End date/time must be after start date/time')
      setLoading(false)
      return
    }

    try {
      // Get user authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        return
      }

      // Get a valid access token (will refresh if needed)
      const accessToken = await googleCalendarAuth.getValidAccessToken()
      if (!accessToken) {
        setError('Google Calendar not connected or token expired')
        return
      }

      // Prepare event data
      const eventData: any = {
        summary: formData.summary.trim()
      }

      // Add optional fields only if they have values
      if (formData.description.trim()) {
        eventData.description = formData.description.trim()
      }
      
      if (formData.location.trim()) {
        eventData.location = formData.location.trim()
      }

      // Handle attendees - only add if there are valid emails
      if (formData.attendees.trim()) {
        const attendeeEmails = formData.attendees
          .split(',')
          .map(email => email.trim())
          .filter(email => email && email.includes('@'))
        
        if (attendeeEmails.length > 0) {
          eventData.attendees = attendeeEmails.map(email => ({ email }))
        }
      }

      // Handle start and end times with proper timezone
      if (formData.isAllDay) {
        eventData.start = { date: formData.startDate }
        eventData.end = { date: formData.endDate }
      } else {
        // Ensure we have proper time format
        const startTime = formData.startTime || '09:00'
        const endTime = formData.endTime || '10:00'
        
        const startDateTime = `${formData.startDate}T${startTime}:00`
        const endDateTime = `${formData.endDate}T${endTime}:00`
        
        eventData.start = { 
          dateTime: startDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
        eventData.end = { 
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      }

      // Ensure we have a valid end date for all-day events
      if (formData.isAllDay && formData.startDate === formData.endDate) {
        // For all-day events on the same day, add 1 day to end date
        const endDate = new Date(formData.endDate)
        endDate.setDate(endDate.getDate() + 1)
        eventData.end = { date: endDate.toISOString().split('T')[0] }
      }

      console.log('Sending event data to Google Calendar API:', JSON.stringify(eventData, null, 2))

      let response
      if (event?.id) {
        // Update existing event
        response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
          }
        )
      } else {
        // Create new event
        response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventData)
          }
        )
      }

      if (!response.ok) {
        const errorData = await response.text()
        console.error('Google Calendar API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new Error(`Failed to ${event?.id ? 'update' : 'create'} event: ${response.status} - ${errorData}`)
      }

      const savedEvent = await response.json()
      onSave(savedEvent)
      onClose()

    } catch (err: any) {
      console.error('Error saving event:', err)
      setError(err.message || 'Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!event?.id) return

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get a valid access token (will refresh if needed)
      const accessToken = await googleCalendarAuth.getValidAccessToken()
      if (!accessToken) {
        setError('Google Calendar not connected or token expired')
        return
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to delete event: ${response.status}`)
      }

      onClose()

    } catch (err: any) {
      console.error('Error deleting event:', err)
      setError(err.message || 'Failed to delete event')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {event ? 'Edit Event' : 'Create Event'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 rounded">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Event Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                name="summary"
                value={formData.summary}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter event title"
              />
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isAllDay"
                checked={formData.isAllDay}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                All day event
              </label>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date/Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start {formData.isAllDay ? 'Date' : 'Date & Time'} *
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  {!formData.isAllDay && (
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  )}
                </div>
              </div>

              {/* End Date/Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End {formData.isAllDay ? 'Date' : 'Date & Time'} *
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  {!formData.isAllDay && (
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter location"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter event description"
              />
            </div>

            {/* Attendees */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Attendees
              </label>
              <input
                type="text"
                name="attendees"
                value={formData.attendees}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter email addresses separated by commas"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Separate multiple email addresses with commas
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                {event?.id && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (event ? 'Update' : 'Create')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
