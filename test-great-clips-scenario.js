// Test script for Great Clips scenario
// This simulates the complete customer lifecycle

import { createClient } from '@supabase/supabase-js'

// Use the anon key for testing (service role key is for server-side only)
const supabaseUrl = 'https://rmrhvrptpqopaogrftgl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmh2cnB0cHFvcGFvZ3JmdGdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDI0NjIsImV4cCI6MjA3NTUxODQ2Mn0.QNQhnn2-rHuIjpKeRTSzAxVOgUQFrYg5hJ6KCPldquc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testGreatClipsScenario() {
  console.log('🎬 Starting Great Clips Scenario Test...\n')

  try {
    // Step 1: Create a test lead (Emily Jones)
    console.log('📝 Step 1: Creating lead for Emily Jones...')
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        user_id: 'be84619d-f7ec-4dc1-ac91-ee62236e7549', // Your user ID
        name: 'Emily Jones',
        email: 'emily.jones@example.com',
        phone: '+1234567890',
        source: 'google_search',
        status: 'new',
        notes: 'Looking for a haircut appointment'
      })
      .select()
      .single()

    if (leadError) {
      console.error('❌ Error creating lead:', leadError)
      return
    }
    console.log('✅ Lead created:', lead.id)

    // Step 2: Create a booking
    console.log('\n📅 Step 2: Creating booking...')
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: 'be84619d-f7ec-4dc1-ac91-ee62236e7549',
        lead_id: lead.id,
        customer_name: 'Emily Jones',
        customer_email: 'emily.jones@example.com',
        customer_phone: '+1234567890',
        service: 'Women\'s Haircut',
        booking_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        status: 'pending',
        notes: 'First time customer'
      })
      .select()
      .single()

    if (bookingError) {
      console.error('❌ Error creating booking:', bookingError)
      return
    }
    console.log('✅ Booking created:', booking.id)

    // Step 3: Complete the service (this should trigger the workflow)
    console.log('\n✂️ Step 3: Completing service...')
    const { error: completeError } = await supabase
      .from('bookings')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', booking.id)

    if (completeError) {
      console.error('❌ Error completing booking:', completeError)
      return
    }
    console.log('✅ Service completed')

    // Step 4: Check if review request was created
    console.log('\n📧 Step 4: Checking for review request...')
    const { data: feedbackRequests, error: feedbackError } = await supabase
      .from('feedback_requests')
      .select('*')
      .eq('booking_id', booking.id)
      .eq('type', 'review')

    if (feedbackError) {
      console.error('❌ Error fetching feedback requests:', feedbackError)
    } else {
      console.log('✅ Review request found:', feedbackRequests.length > 0 ? 'Yes' : 'No')
      if (feedbackRequests.length > 0) {
        console.log('   Details:', feedbackRequests[0])
      }
    }

    // Step 5: Simulate review submission
    console.log('\n⭐ Step 5: Simulating review submission...')
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        user_id: 'be84619d-f7ec-4dc1-ac91-ee62236e7549',
        lead_id: lead.id,
        booking_id: booking.id,
        reviewer_name: 'Emily Jones',
        reviewer_email: 'emily.jones@example.com',
        review_text: 'Anna was amazing! Love my haircut!',
        rating: 5,
        platform: 'internal',
        status: 'pending'
      })
      .select()
      .single()

    if (reviewError) {
      console.error('❌ Error creating review:', reviewError)
      return
    }
    console.log('✅ Review submitted:', review.id)

    // Step 6: Check if referral offer was created
    console.log('\n🎁 Step 6: Checking for referral offer...')
    const { data: referralRequests, error: referralError } = await supabase
      .from('referral_requests')
      .select('*')
      .eq('booking_id', booking.id)

    if (referralError) {
      console.error('❌ Error fetching referral requests:', referralError)
    } else {
      console.log('✅ Referral offer found:', referralRequests.length > 0 ? 'Yes' : 'No')
      if (referralRequests.length > 0) {
        console.log('   Details:', referralRequests[0])
        const notes = JSON.parse(referralRequests[0].notes || '{}')
        if (notes.referral_link) {
          console.log('   Referral Link:', notes.referral_link)
        }
      }
    }

    // Step 7: Test referral link validation
    console.log('\n🔗 Step 7: Testing referral link validation...')
    if (referralRequests && referralRequests.length > 0) {
      const notes = JSON.parse(referralRequests[0].notes || '{}')
      if (notes.referral_code) {
        console.log('   Referral Code:', notes.referral_code)
        console.log('   This code can be used to test the referral landing page')
        console.log('   URL: http://localhost:5173/r/' + notes.referral_code)
      }
    }

    console.log('\n🎉 Great Clips Scenario Test Complete!')
    console.log('\n📋 Summary:')
    console.log(`   Lead ID: ${lead.id}`)
    console.log(`   Booking ID: ${booking.id}`)
    console.log(`   Review ID: ${review.id}`)
    console.log(`   Review Request: ${feedbackRequests?.length > 0 ? 'Created' : 'Not Found'}`)
    console.log(`   Referral Offer: ${referralRequests?.length > 0 ? 'Created' : 'Not Found'}`)

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testGreatClipsScenario()
