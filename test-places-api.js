// Test Google Places API with a known working Place ID
const testPlaceId = 'ChIJN1t_tDeuEmsRUsoyG83frY4' // Google's headquarters
const apiKey = '10239263861-h0scjop15ilmun8iladlr1lo9599tchl.apps.googleusercontent.com'

async function testPlacesAPI() {
  console.log('🧪 Testing Google Places API...\n')
  
  const url = `https://maps.googleapis.com/maps/api/place/details/json?` +
    `place_id=${testPlaceId}&` +
    `fields=reviews,rating,user_ratings_total&` +
    `key=${apiKey}`
  
  console.log('URL:', url)
  
  try {
    const response = await fetch(url)
    console.log('Response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('Response data:', JSON.stringify(data, null, 2))
      
      if (data.status === 'OK') {
        console.log('✅ API call successful!')
        console.log(`📊 Found ${data.result.reviews?.length || 0} reviews`)
        console.log(`⭐ Average rating: ${data.result.rating || 'N/A'}`)
      } else {
        console.log('❌ API Error:', data.status)
        console.log('📝 Error message:', data.error_message)
      }
    } else {
      const errorText = await response.text()
      console.log('❌ HTTP Error:', response.status)
      console.log('📝 Error text:', errorText)
    }
  } catch (error) {
    console.log('❌ Network Error:', error.message)
  }
}

testPlacesAPI()
