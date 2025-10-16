import { supabase } from './supabaseClient'

export interface ReviewRequestData {
  user_id: string
  lead_id: string
  booking_id: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  service_type: string
  business_name: string
  review_link: string
  niche_template: string
}

export interface ReviewSubmission {
  id: string
  user_id: string
  lead_id: string
  booking_id: string
  reviewer_name: string
  reviewer_email: string
  review_text: string
  rating: number
  platform: 'internal' | 'google' | 'yelp' | 'facebook'
  status: 'pending' | 'responded' | 'escalated' | 'resolved'
  is_positive: boolean
  created_at: string
}

/**
 * Create a review request entry in the database
 */
export async function createReviewRequest(data: ReviewRequestData): Promise<string> {
  try {
    const { data: reviewRequest, error } = await supabase
      .from('feedback_requests')
      .insert({
        user_id: data.user_id,
        lead_id: data.lead_id,
        type: 'review',
        delay_hours: 2, // 2 hours for salon/barber niche
        scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        status: 'pending',
        message_content: `Review request for ${data.customer_name} - ${data.service_type}`
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating review request:', error)
      throw error
    }

    console.log(`✅ Review request created: ${reviewRequest.id}`)
    return reviewRequest.id
  } catch (error) {
    console.error('Error creating review request:', error)
    throw error
  }
}

/**
 * Generate a review link for the customer
 */
export function generateReviewLink(bookingId: string, businessSubdomain?: string): string {
  const baseUrl = businessSubdomain 
    ? `https://${businessSubdomain}.getgetleads.com`
    : 'http://localhost:5173'
  
  return `${baseUrl}/review/${bookingId}`
}

/**
 * Get review request data for a booking
 */
export async function getReviewRequestData(bookingId: string): Promise<ReviewRequestData | null> {
  try {
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
      console.error('Error fetching booking:', bookingError)
      return null
    }

    // Get business name from user_settings
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('business_name, subdomain, niche_template_id')
      .eq('user_id', booking.user_id)
      .single()

    const businessName = userSettings?.business_name || 'Great Clips'
    const subdomain = userSettings?.subdomain
    const reviewLink = generateReviewLink(bookingId, subdomain)

    return {
      user_id: booking.user_id,
      lead_id: booking.lead_id,
      booking_id: bookingId,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      service_type: booking.service,
      business_name: businessName,
      review_link: reviewLink,
      niche_template: userSettings?.niche_template_id || 'salon_barber_spa'
    }
  } catch (error) {
    console.error('Error getting review request data:', error)
    return null
  }
}

/**
 * Submit a review from the customer
 */
export async function submitReview(
  bookingId: string,
  reviewData: {
    reviewer_name: string
    reviewer_email: string
    review_text: string
    rating: number
  }
): Promise<ReviewSubmission | null> {
  try {
    // Get booking data first
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('user_id, lead_id')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      console.error('Error fetching booking for review submission:', bookingError)
      return null
    }

    // Create review entry
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        user_id: booking.user_id,
        lead_id: booking.lead_id,
        booking_id: bookingId,
        reviewer_name: reviewData.reviewer_name,
        reviewer_email: reviewData.reviewer_email,
        review_text: reviewData.review_text,
        rating: reviewData.rating,
        platform: 'internal',
        status: 'pending'
      })
      .select()
      .single()

    if (reviewError) {
      console.error('Error creating review:', reviewError)
      throw reviewError
    }

    // Update the feedback_request status to completed
    await supabase
      .from('feedback_requests')
      .update({ 
        status: 'completed',
        sent_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId)
      .eq('type', 'review')

    console.log(`✅ Review submitted: ${review.id}`)
    return review
  } catch (error) {
    console.error('Error submitting review:', error)
    throw error
  }
}

/**
 * Check if a review request should trigger a referral offer
 */
export async function shouldTriggerReferralOffer(reviewId: string): Promise<boolean> {
  try {
    const { data: review, error } = await supabase
      .from('reviews')
      .select('rating, is_positive')
      .eq('id', reviewId)
      .single()

    if (error || !review) {
      console.error('Error fetching review for referral check:', error)
      return false
    }

    // Trigger referral offer for positive reviews (4+ stars)
    return review.is_positive && review.rating >= 4
  } catch (error) {
    console.error('Error checking referral trigger:', error)
    return false
  }
}

/**
 * Get review statistics for a business
 */
export async function getReviewStats(userId: string): Promise<{
  total_reviews: number
  average_rating: number
  positive_reviews: number
  recent_reviews: ReviewSubmission[]
}> {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching review stats:', error)
      throw error
    }

    const totalReviews = reviews.length
    const averageRating = totalReviews > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
      : 0
    const positiveReviews = reviews.filter(review => review.is_positive).length
    const recentReviews = reviews.slice(0, 5) // Last 5 reviews

    return {
      total_reviews: totalReviews,
      average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      positive_reviews: positiveReviews,
      recent_reviews: recentReviews
    }
  } catch (error) {
    console.error('Error getting review stats:', error)
    throw error
  }
}
