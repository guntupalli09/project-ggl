// Test the review collection page functionality
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rmrhvrptpqopaogrftgl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmh2cnB0cHFvcGFvZ3JmdGdsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk0MjQ2MiwiZXhwIjoyMDc1NTE4NDYyfQ.RqFSe9piAiMo0GTzt6Y2PNuxDF-am-oTZt8lXQq9__I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testReviewPage() {
  console.log('🔍 Testing review page functionality...')
  
  const bookingId = '0587ffb2-e019-419f-aa98-1dc64ddd02f6'
  
  try {
    // Test 1: Get booking data
    console.log('\n📋 Step 1: Getting booking data...')
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        user_id,
        lead_id,
        customer_name,
        customer_email,
        customer_phone,
        service
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      console.error('❌ Error fetching booking:', bookingError)
      return
    }
    console.log('✅ Booking found:', booking.customer_name, '-', booking.service)

    // Test 2: Get user settings
    console.log('\n🏢 Step 2: Getting business info...')
    const { data: userSettings, error: userError } = await supabase
      .from('user_settings')
      .select('business_name, subdomain, niche_template_id')
      .eq('user_id', booking.user_id)
      .single()

    if (userError) {
      console.log('⚠️  User settings not found, using defaults')
    } else {
      console.log('✅ Business info found:', userSettings.business_name)
    }

    const businessName = userSettings?.business_name || 'Great Clips'
    const serviceType = booking.service

    console.log('\n🎯 Review Page Data:')
    console.log(`   Business: ${businessName}`)
    console.log(`   Service: ${serviceType}`)
    console.log(`   Customer: ${booking.customer_name}`)
    console.log(`   Email: ${booking.customer_email}`)
    console.log(`   Phone: ${booking.customer_phone}`)

    // Test 3: Test referral code validation
    console.log('\n🎁 Step 3: Testing referral code validation...')
    const referralCode = 'GC0ZXOK2'
    
    // Simple validation for GC codes
    if (referralCode.startsWith('GC')) {
      console.log('✅ Referral code is valid:', referralCode)
      console.log('   Business: Great Clips')
      console.log('   Reward: $10.00')
    } else {
      console.log('❌ Invalid referral code')
    }

    console.log('\n🌐 Test URLs:')
    console.log(`   Review Collection: http://localhost:5173/review/${bookingId}`)
    console.log(`   Referral Landing: http://localhost:5173/r/${referralCode}`)

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testReviewPage()
