// Real Google Reviews using Google Places API
// This fetches actual reviews from Google Places

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get user from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get user's business place ID and Google tokens
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('google_place_id, business_name, business_address, google_access_token')
      .eq('user_id', user.id)
      .single()

    if (settingsError || !settings?.google_place_id) {
      return res.status(404).json({ 
        error: 'Google Place ID not found. Please add your business location in Profile settings.',
        setup_required: true
      })
    }

    // Use your existing Google OAuth token for Places API
    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_CLIENT_ID
    if (!GOOGLE_PLACES_API_KEY) {
      return res.status(500).json({ 
        error: 'Google Places API key not configured. Please add GOOGLE_PLACES_API_KEY to environment variables.',
        setup_required: true
      })
    }

    // Fetch reviews from Google Places API using your existing API key
    const placesResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${settings.google_place_id}&` +
      `fields=reviews,rating,user_ratings_total&` +
      `key=${GOOGLE_PLACES_API_KEY}`
    )

    if (!placesResponse.ok) {
      const errorText = await placesResponse.text()
      console.error('Google Places API error:', errorText)
      throw new Error(`Google Places API error: ${placesResponse.status} - ${errorText}`)
    }

    const placesData = await placesResponse.json()

    if (placesData.status !== 'OK') {
      throw new Error(`Google Places API error: ${placesData.status}`)
    }

    const reviews = placesData.result.reviews || []
    const rating = placesData.result.rating || 0
    const totalRatings = placesData.result.user_ratings_total || 0

    // Process and store reviews in our database
    const processedReviews = []
    for (const review of reviews) {
      const reviewData = {
        user_id: user.id,
        review_id: `google_${review.time}`,
        reviewer_name: review.author_name || 'Anonymous',
        reviewer_email: null, // Google doesn't provide email
        review_text: review.text || '',
        rating: review.rating || 0,
        platform: 'google',
        review_url: `https://www.google.com/maps/place/?q=place_id:${settings.google_place_id}`,
        status: 'pending',
        is_positive: review.rating >= 4,
        created_at: new Date(review.time * 1000).toISOString()
      }

      // Store in database
      const { data: storedReview, error: storeError } = await supabase
        .from('reviews')
        .upsert(reviewData, {
          onConflict: 'review_id,user_id'
        })
        .select()
        .single()

      if (!storeError && storedReview) {
        processedReviews.push(storedReview)
      }
    }

    res.status(200).json({
      success: true,
      message: 'Real Google reviews fetched successfully',
      reviews: processedReviews,
      summary: {
        total_reviews: processedReviews.length,
        average_rating: rating,
        total_ratings: totalRatings,
        positive_reviews: processedReviews.filter(r => r.is_positive).length,
        negative_reviews: processedReviews.filter(r => !r.is_positive).length
      },
      place_info: {
        place_id: settings.google_place_id,
        business_name: settings.business_name,
        business_address: settings.business_address
      }
    })

  } catch (error: any) {
    console.error('Google Places reviews error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch Google reviews',
      details: error.message 
    })
  }
}
