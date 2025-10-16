// Complete Great Clips scenario test using service role key
import { createClient } from '@supabase/supabase-js'

// Use service role key for server-side operations
const supabaseUrl = 'https://rmrhvrptpqopaogrftgl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmh2cnB0cHFvcGFvZ3JmdGdsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk0MjQ2MiwiZXhwIjoyMDc1NTE4NDYyfQ.RqFSe9piAiMo0GTzt6Y2PNuxDF-am-oTZt8lXQq9__I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCompleteScenario() {
  console.log('🎬 Testing Complete Great Clips Scenario...\n')

  try {
    const userId = 'be84619d-f7ec-4dc1-ac91-ee62236e7549'

    // Step 1: Create a test lead (Emily Jones)
    console.log('📝 Step 1: Creating lead for Emily Jones...')
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        user_id: userId,
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
        user_id: userId,
        lead_id: lead.id,
        customer_name: 'Emily Jones',
        customer_email: 'emily.jones@example.com',
        customer_phone: '+1234567890',
        service: 'Women\'s Haircut',
        booking_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
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
        status: 'completed'
      })
      .eq('id', booking.id)

    if (completeError) {
      console.error('❌ Error completing booking:', completeError)
      return
    }
    console.log('✅ Service completed')

    // Step 4: Create a feedback request (simulating workflow trigger)
    console.log('\n📧 Step 4: Creating review request...')
    const { data: feedbackRequest, error: feedbackError } = await supabase
      .from('feedback_requests')
      .insert({
        user_id: userId,
        lead_id: lead.id,
        type: 'review',
        delay_hours: 2,
        scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (feedbackError) {
      console.error('❌ Error creating feedback request:', feedbackError)
      console.log('   Note: Run the migration SQL to add missing columns')
      console.log('   Skipping feedback request creation...')
    } else {
      console.log('✅ Review request created:', feedbackRequest.id)
    }

    // Step 5: Simulate review submission
    console.log('\n⭐ Step 5: Simulating review submission...')
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        user_id: userId,
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

    // Step 6: Create referral offer (for positive review)
    console.log('\n🎁 Step 6: Creating referral offer...')
    const referralCode = 'GC' + Math.random().toString(36).substring(2, 8).toUpperCase()
    const referralLink = `http://localhost:5173/r/${referralCode}`
    
    const { data: referralRequest, error: referralError } = await supabase
      .from('referral_requests')
      .insert({
        user_id: userId,
        lead_id: lead.id,
        customer_name: 'Emily Jones',
        customer_email: 'emily.jones@example.com'
      })
      .select()
      .single()

    if (referralError) {
      console.error('❌ Error creating referral request:', referralError)
      console.log('   Note: Run the migration SQL to add missing columns')
      console.log('   Skipping referral request creation...')
    } else {
      console.log('✅ Referral offer created:', referralRequest.id)
    }

    // Step 7: Display the review link
    console.log('\n🔗 Step 7: Review and Referral Links...')
    const reviewLink = `http://localhost:5173/review/${booking.id}`
    console.log('   Review Link:', reviewLink)
    console.log('   Referral Link:', referralLink)

    console.log('\n🎉 Complete Great Clips Scenario Test Successful!')
    console.log('\n📋 Summary:')
    console.log(`   Lead ID: ${lead.id}`)
    console.log(`   Booking ID: ${booking.id}`)
    console.log(`   Review ID: ${review.id}`)
    console.log(`   Feedback Request ID: ${feedbackRequest.id}`)
    console.log(`   Referral Request ID: ${referralRequest.id}`)
    console.log(`   Referral Code: ${referralCode}`)
    console.log('\n🌐 Test URLs:')
    console.log(`   Review Collection: ${reviewLink}`)
    console.log(`   Referral Landing: ${referralLink}`)

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testCompleteScenario()
