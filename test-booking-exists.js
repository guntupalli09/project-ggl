// Test if the booking exists in the database
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rmrhvrptpqopaogrftgl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmh2cnB0cHFvcGFvZ3JmdGdsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk0MjQ2MiwiZXhwIjoyMDc1NTE4NDYyfQ.RqFSe9piAiMo0GTzt6Y2PNuxDF-am-oTZt8lXQq9__I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBookingExists() {
  console.log('🔍 Testing if booking exists...')
  
  const bookingId = '0587ffb2-e019-419f-aa98-1dc64ddd02f6'
  
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()
    
    if (error) {
      console.error('❌ Error fetching booking:', error)
    } else if (booking) {
      console.log('✅ Booking found:', booking)
    } else {
      console.log('❌ Booking not found')
    }
    
    // Also check recent bookings
    const { data: recentBookings, error: recentError } = await supabase
      .from('bookings')
      .select('id, customer_name, service, status')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (recentError) {
      console.error('❌ Error fetching recent bookings:', recentError)
    } else {
      console.log('📋 Recent bookings:')
      recentBookings.forEach(booking => {
        console.log(`   - ${booking.id}: ${booking.customer_name} - ${booking.service} (${booking.status})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testBookingExists()

