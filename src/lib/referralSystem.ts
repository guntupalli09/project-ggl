import { supabase } from './supabaseClient'

export interface ReferralData {
  user_id: string
  lead_id: string
  booking_id: string
  customer_name: string
  customer_email: string
  referral_code: string
  referral_link: string
  reward_amount: number
  expires_at: string
}

export interface ReferralConversion {
  id: string
  referrer_lead_id: string
  referee_lead_id: string
  referral_code: string
  status: 'active' | 'used' | 'expired'
  reward_amount: number
  created_at: string
  used_at?: string
}

/**
 * Generate a unique referral code
 */
function generateReferralCode(businessName: string): string {
  const prefix = businessName.replace(/[^A-Z]/g, '').substring(0, 2).toUpperCase()
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}${randomSuffix}`
}

/**
 * Create a referral offer for a customer
 */
export async function createReferralOffer(
  reviewId: string,
  businessSubdomain?: string
): Promise<ReferralData | null> {
  try {
    // Get review data
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select(`
        id,
        user_id,
        lead_id,
        booking_id,
        reviewer_name,
        reviewer_email,
        rating
      `)
      .eq('id', reviewId)
      .single()

    if (reviewError || !review) {
      console.error('Error fetching review for referral:', reviewError)
      return null
    }

    // Only create referral for positive reviews
    if (review.rating < 4) {
      console.log('Review rating too low for referral offer:', review.rating)
      return null
    }

    // Get business name
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('business_name, subdomain')
      .eq('user_id', review.user_id)
      .single()

    const businessName = userSettings?.business_name || 'Our Business'
    const subdomain = userSettings?.subdomain || businessSubdomain
    const referralCode = generateReferralCode(businessName)
    
    const baseUrl = subdomain 
      ? `https://${subdomain}.getgetleads.com`
      : 'http://localhost:5173'
    
    const referralLink = `${baseUrl}/r/${referralCode}`

    // Create referral entry in referral_requests table
    const { data: referralRequest, error: referralError } = await supabase
      .from('referral_requests')
      .insert({
        user_id: review.user_id,
        lead_id: review.lead_id,
        booking_id: review.booking_id,
        customer_name: review.reviewer_name,
        customer_email: review.reviewer_email,
        service_completed_date: new Date().toISOString(),
        referral_request_sent: true,
        referral_request_date: new Date().toISOString(),
        referral_count: 0
      })
      .select()
      .single()

    if (referralError) {
      console.error('Error creating referral request:', referralError)
      throw referralError
    }

    // Store referral code and link in a separate table or as metadata
    // For now, we'll store it in the referral_requests table as a note
    await supabase
      .from('referral_requests')
      .update({
        notes: JSON.stringify({
          referral_code: referralCode,
          referral_link: referralLink,
          reward_amount: 10.00
        })
      })
      .eq('id', referralRequest.id)

    const referralData: ReferralData = {
      user_id: review.user_id,
      lead_id: review.lead_id,
      booking_id: review.booking_id,
      customer_name: review.reviewer_name,
      customer_email: review.reviewer_email,
      referral_code: referralCode,
      referral_link: referralLink,
      reward_amount: 10.00,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }

    console.log(`✅ Referral offer created: ${referralCode}`)
    return referralData
  } catch (error) {
    console.error('Error creating referral offer:', error)
    throw error
  }
}

/**
 * Track a referral conversion when someone uses a referral link
 */
export async function trackReferralConversion(
  referralCode: string,
  newLeadId: string
): Promise<ReferralConversion | null> {
  try {
    // Find the referral request by code
    const { data: referralRequests, error: searchError } = await supabase
      .from('referral_requests')
      .select('*')
      .contains('notes', referralCode)

    if (searchError || !referralRequests || referralRequests.length === 0) {
      console.error('Referral code not found:', referralCode)
      return null
    }

    const referralRequest = referralRequests[0]
    const notes = JSON.parse(referralRequest.notes || '{}')

    // Check if referral is still valid
    if (referralRequest.referral_count > 0) {
      console.log('Referral code already used')
      return null
    }

    // Update referral request with conversion
    const { data: updatedReferral, error: updateError } = await supabase
      .from('referral_requests')
      .update({
        referral_count: 1,
        referral_response_received: true,
        referral_response_date: new Date().toISOString()
      })
      .eq('id', referralRequest.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating referral request:', updateError)
      throw updateError
    }

    // Create referral conversion record
    const conversion: ReferralConversion = {
      id: updatedReferral.id,
      referrer_lead_id: referralRequest.lead_id,
      referee_lead_id: newLeadId,
      referral_code: referralCode,
      status: 'used',
      reward_amount: notes.reward_amount || 10.00,
      created_at: referralRequest.created_at,
      used_at: new Date().toISOString()
    }

    console.log(`✅ Referral conversion tracked: ${referralCode} -> ${newLeadId}`)
    return conversion
  } catch (error) {
    console.error('Error tracking referral conversion:', error)
    throw error
  }
}

/**
 * Get referral statistics for a business
 */
export async function getReferralStats(userId: string): Promise<{
  total_referrals_sent: number
  total_conversions: number
  conversion_rate: number
  total_rewards_given: number
  recent_referrals: any[]
}> {
  try {
    const { data: referrals, error } = await supabase
      .from('referral_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching referral stats:', error)
      throw error
    }

    const totalReferralsSent = referrals.length
    const totalConversions = referrals.filter(r => r.referral_count > 0).length
    const conversionRate = totalReferralsSent > 0 
      ? (totalConversions / totalReferralsSent) * 100 
      : 0
    const totalRewardsGiven = referrals
      .filter(r => r.referral_count > 0)
      .reduce((sum, r) => {
        const notes = JSON.parse(r.notes || '{}')
        return sum + (notes.reward_amount || 0)
      }, 0)
    const recentReferrals = referrals.slice(0, 5)

    return {
      total_referrals_sent: totalReferralsSent,
      total_conversions: totalConversions,
      conversion_rate: Math.round(conversionRate * 10) / 10,
      total_rewards_given: totalRewardsGiven,
      recent_referrals: recentReferrals
    }
  } catch (error) {
    console.error('Error getting referral stats:', error)
    throw error
  }
}

/**
 * Validate a referral code
 */
export async function validateReferralCode(referralCode: string): Promise<{
  valid: boolean
  business_name?: string
  reward_amount?: number
  expires_at?: string
}> {
  try {
    // For now, validate any referral code that starts with 'GC' (Great Clips)
    // This is a temporary solution until we add the notes column
    if (!referralCode.startsWith('GC')) {
      return { valid: false }
    }

    // Get a sample business name from user_settings
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('business_name')
      .limit(1)
      .single()

    return {
      valid: true,
      business_name: userSettings?.business_name || 'Great Clips',
      reward_amount: 10.00,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  } catch (error) {
    console.error('Error validating referral code:', error)
    return { valid: false }
  }
}
