import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface BookingIntegrationProps {
  leadId: string
  leadName: string
  leadEmail: string
  onBookingCreated?: (booking: any) => void
}

const BookingIntegration: React.FC<BookingIntegrationProps> = ({
  leadId,
  leadName,
  leadEmail,
  onBookingCreated
}) => {
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [bookingData, setBookingData] = useState({
    service: '',
    date: '',
    time: '',
    duration: 60,
    price: 0,
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to create bookings')
        return
      }

      // Validate required fields
      if (!bookingData.service || !bookingData.date || !bookingData.time) {
        alert('Please fill in all required fields (Service, Date, Time)')
        return
      }

      // Create booking record
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert([{
          user_id: user.id,
          lead_id: leadId,
          customer_name: leadName || 'Unknown Customer',
          customer_email: leadEmail || 'no-email@example.com',
          service: bookingData.service,
          booking_time: new Date(`${bookingData.date}T${bookingData.time}`).toISOString(),
          duration_minutes: bookingData.duration,
          price: bookingData.price || 0,
          status: 'confirmed',
          notes: bookingData.notes || ''
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating booking:', error)
        alert('Booking table not set up yet. Please run the database migration first.')
        return
      }

      // Update lead status to 'booked'
      await supabase
        .from('leads')
        .update({ status: 'booked' })
        .eq('id', leadId)

      setSuccess(true)
      setShowBookingForm(false)
      
      if (onBookingCreated) {
        onBookingCreated(booking)
      }

      // Reset form
      setBookingData({
        service: '',
        date: '',
        time: '',
        duration: 60,
        price: 0,
        notes: ''
      })

    } catch (error) {
      console.error('Error creating booking:', error)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
        <div className="flex items-center">
          <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
          <span className="text-green-800 dark:text-green-200 font-medium">
            Booking confirmed! Customer will receive confirmation email.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowBookingForm(true)}
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <CalendarIcon className="h-5 w-5 mr-2" />
        Create Booking
      </button>

      {showBookingForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create Booking for {leadName}
            </h3>
            
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Service
                </label>
                <input
                  type="text"
                  value={bookingData.service}
                  onChange={(e) => setBookingData(prev => ({ ...prev, service: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Consultation, Treatment, Service"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={bookingData.date}
                    onChange={(e) => setBookingData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={bookingData.time}
                    onChange={(e) => setBookingData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={bookingData.duration}
                    onChange={(e) => setBookingData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    min="15"
                    step="15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    value={bookingData.price}
                    onChange={(e) => setBookingData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={bookingData.notes}
                  onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Special instructions or notes..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBookingForm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingIntegration
