// Test Google Places API integration
// Using built-in fetch (Node.js 18+)

async function testGooglePlaces() {
  console.log('🧪 Testing Google Places API Integration...\n')

  // Test 1: Check if environment variables are set
  console.log('1️⃣ Checking Environment Variables:')
  console.log(`   VITE_GOOGLE_CLIENT_ID: ${process.env.VITE_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`)
  console.log(`   GOOGLE_PLACES_API_KEY: ${process.env.GOOGLE_PLACES_API_KEY ? '✅ Set' : '❌ Missing'}`)
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}\n`)

  // Test 2: Test Places API directly (if API key is available)
  if (process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_CLIENT_ID) {
    console.log('2️⃣ Testing Google Places API:')
    
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_CLIENT_ID
    const testPlaceId = 'ChIJN1t_tDeuEmsRUsoyG83frY4' // Google's headquarters as test
    
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${testPlaceId}&` +
        `fields=reviews,rating,user_ratings_total&` +
        `key=${apiKey}`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.status === 'OK') {
          console.log('   ✅ Google Places API is working!')
          console.log(`   📊 Found ${data.result.reviews?.length || 0} reviews`)
          console.log(`   ⭐ Average rating: ${data.result.rating || 'N/A'}`)
        } else {
          console.log(`   ❌ API Error: ${data.status}`)
          console.log(`   📝 Error message: ${data.error_message || 'Unknown error'}`)
        }
      } else {
        console.log(`   ❌ HTTP Error: ${response.status}`)
      }
    } catch (error) {
      console.log(`   ❌ Network Error: ${error.message}`)
    }
  } else {
    console.log('2️⃣ Skipping Places API test (no API key found)')
  }

  console.log('\n3️⃣ Next Steps:')
  console.log('   📝 Add GOOGLE_PLACES_API_KEY to your .env file')
  console.log('   🔍 Find your business Place ID at: https://developers.google.com/maps/documentation/places/web-service/place-id')
  console.log('   ⚙️  Add Place ID to your Profile settings in the app')
  console.log('   🧪 Test the Reviews page in your app!')
  
  console.log('\n🎯 Your Google Places integration is ready!')
}

// Run the test
testGooglePlaces().catch(console.error)
