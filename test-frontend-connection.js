// Test frontend database connection
import { createClient } from '@supabase/supabase-js'

// Use the same credentials as the frontend
const supabaseUrl = 'https://rmrhvrptpqopaogrftgl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmh2cnB0cHFvcGFvZ3JmdGdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDI0NjIsImV4cCI6MjA3NTUxODQ2Mn0.QNQhnn2-rHuIjpKeRTSzAxVOgUQFrYg5hJ6KCPldquc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFrontendConnection() {
  console.log('🔍 Testing frontend database connection...')
  
  try {
    // Test 1: Try to fetch a booking (this should work with anon key)
    console.log('\n📋 Step 1: Testing booking fetch...')
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, customer_name, service')
      .eq('id', '0587ffb2-e019-419f-aa98-1dc64ddd02f6')
      .single()

    if (bookingError) {
      console.error('❌ Error fetching booking:', bookingError)
      console.log('   This might be due to RLS policies')
    } else {
      console.log('✅ Booking fetched successfully:', booking)
    }

    // Test 2: Try to fetch user settings (this might fail due to RLS)
    console.log('\n🏢 Step 2: Testing user settings fetch...')
    const { data: userSettings, error: userError } = await supabase
      .from('user_settings')
      .select('business_name')
      .limit(1)

    if (userError) {
      console.error('❌ Error fetching user settings:', userError)
      console.log('   This is expected due to RLS policies')
    } else {
      console.log('✅ User settings fetched successfully:', userSettings)
    }

    // Test 3: Test reviews table
    console.log('\n⭐ Step 3: Testing reviews fetch...')
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, reviewer_name, rating')
      .limit(3)

    if (reviewsError) {
      console.error('❌ Error fetching reviews:', reviewsError)
    } else {
      console.log('✅ Reviews fetched successfully:', reviews.length, 'reviews')
    }

    console.log('\n🎯 Summary:')
    console.log('   The frontend can connect to Supabase')
    console.log('   RLS policies may prevent some data access')
    console.log('   This is normal for the anon key')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testFrontendConnection()

