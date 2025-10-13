// Review and Referral Automation
// Triggers when a booking is completed to request reviews and referrals

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Booking {
  id: string
  user_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  service_type: string
  booking_date: string
  status: string
}

// interface Lead {
//   id: string
//   user_id: string
//   name: string
//   email: string
//   phone: string
//   company: string
// }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { bookingId } = req.body

    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' })
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Get user settings for brand voice and automation preferences
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('brand_tone, sample_copy, review_automation_enabled, referral_automation_enabled')
      .eq('user_id', booking.user_id)
      .single()

    if (settingsError || !userSettings) {
      return res.status(404).json({ error: 'User settings not found' })
    }

    const results: {
      reviewRequest: { id: string; message: string; sent: boolean } | null;
      referralRequest: { id: string; message: string; sent: boolean } | null;
      errors: string[];
    } = {
      reviewRequest: null,
      referralRequest: null,
      errors: []
    }

    // 1. REVIEW REQUEST AUTOMATION
    if (userSettings.review_automation_enabled) {
      try {
        const reviewRequest = await createReviewRequest(booking, userSettings)
        results.reviewRequest = reviewRequest
      } catch (error: any) {
        results.errors.push(`Review request failed: ${error.message}`)
      }
    }

    // 2. REFERRAL REQUEST AUTOMATION
    if (userSettings.referral_automation_enabled) {
      try {
        const referralRequest = await createReferralRequest(booking, userSettings)
        results.referralRequest = referralRequest
      } catch (error: any) {
        results.errors.push(`Referral request failed: ${error.message}`)
      }
    }

    res.status(200).json({
      success: true,
      message: 'Review and referral automation completed',
      results
    })

  } catch (error: any) {
    console.error('Review/Referral automation error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}

async function createReviewRequest(booking: Booking, userSettings: any) {
  // Generate AI-powered review request message
  const reviewMessage = await generateReviewRequestMessage(booking, userSettings)
  
  // Create review request record
  const { data: reviewRequest, error } = await supabase
    .from('referral_requests')
    .insert({
      user_id: booking.user_id,
      booking_id: booking.id,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      service_completed_date: booking.booking_date,
      service_type: booking.service_type,
      referral_request_sent: true,
      referral_request_date: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create review request: ${error.message}`)
  }

  // Send review request via email/SMS
  await sendReviewRequest(booking, reviewMessage)

  return {
    id: reviewRequest.id,
    message: reviewMessage,
    sent: true
  }
}

async function createReferralRequest(booking: Booking, userSettings: any) {
  // Generate AI-powered referral request message
  const referralMessage = await generateReferralRequestMessage(booking, userSettings)
  
  // Create referral request record
  const { data: referralRequest, error } = await supabase
    .from('referral_requests')
    .insert({
      user_id: booking.user_id,
      booking_id: booking.id,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      service_completed_date: booking.booking_date,
      service_type: booking.service_type,
      referral_request_sent: true,
      referral_request_date: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create referral request: ${error.message}`)
  }

  // Send referral request via email/SMS
  await sendReferralRequest(booking, referralMessage)

  return {
    id: referralRequest.id,
    message: referralMessage,
    sent: true
  }
}

async function generateReviewRequestMessage(booking: Booking, userSettings: any): Promise<string> {
  // Use AI to generate personalized review request
  const prompt = `
Generate a friendly, professional review request message for a customer who just completed a service.

Customer: ${booking.customer_name}
Service: ${booking.service_type}
Service Date: ${booking.booking_date}

Brand Voice: ${userSettings.brand_tone || 'Professional and friendly'}

Sample Writing Style: ${userSettings.sample_copy || 'Clear and concise'}

Requirements:
- Keep it under 100 words
- Be genuine and not pushy
- Include a direct link to Google Reviews
- Thank them for their business
- Make it personal and specific to their service

Generate a review request message:
`

  try {
    // Use Ollama for AI generation (or fallback to a simple template)
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: prompt,
        stream: false
      })
    })

    if (response.ok) {
      const data = await response.json()
      return data.response || getDefaultReviewMessage(booking)
    }
  } catch (error) {
    console.error('AI review generation failed:', error)
  }

  return getDefaultReviewMessage(booking)
}

async function generateReferralRequestMessage(booking: Booking, userSettings: any): Promise<string> {
  const prompt = `
Generate a friendly referral request message for a satisfied customer.

Customer: ${booking.customer_name}
Service: ${booking.service_type}
Service Date: ${booking.booking_date}

Brand Voice: ${userSettings.brand_tone || 'Professional and friendly'}

Requirements:
- Keep it under 100 words
- Ask for referrals to friends/family
- Offer a small incentive if appropriate
- Be genuine and appreciative
- Make it easy to refer (provide contact info)

Generate a referral request message:
`

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt: prompt,
        stream: false
      })
    })

    if (response.ok) {
      const data = await response.json()
      return data.response || getDefaultReferralMessage(booking)
    }
  } catch (error) {
    console.error('AI referral generation failed:', error)
  }

  return getDefaultReferralMessage(booking)
}

function getDefaultReviewMessage(booking: Booking): string {
  return `Hi ${booking.customer_name}! 

Thank you for choosing us for your ${booking.service_type} service. We hope you had a great experience!

If you're happy with our service, we'd be incredibly grateful if you could leave us a quick review on Google. It really helps other customers find us and helps us improve our services.

You can leave a review here: https://g.page/r/YOUR_BUSINESS_ID/review

Thank you so much for your business! 🙏`
}

function getDefaultReferralMessage(booking: Booking): string {
  return `Hi ${booking.customer_name}!

We're so glad you enjoyed your ${booking.service_type} service with us! 

If you know anyone else who might benefit from our services, we'd love to help them too. Referrals are the best compliment you can give us!

Feel free to share our contact info:
📞 [Your Phone Number]
📧 [Your Email]
🌐 [Your Website]

Thank you for being an amazing customer! 🙏`
}

async function sendReviewRequest(booking: Booking, message: string) {
  // Send via email if email is available
  if (booking.customer_email) {
    try {
      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: booking.customer_email,
          subject: `How was your ${booking.service_type} service?`,
          body: message
        })
      })
    } catch (error) {
      console.error('Failed to send review request email:', error)
    }
  }

  // Send via SMS if phone is available
  if (booking.customer_phone) {
    try {
      // This would integrate with your SMS service
      console.log('SMS Review Request:', message)
    } catch (error) {
      console.error('Failed to send review request SMS:', error)
    }
  }
}

async function sendReferralRequest(booking: Booking, message: string) {
  // Send via email if email is available
  if (booking.customer_email) {
    try {
      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: booking.customer_email,
          subject: `Thank you for your business!`,
          body: message
        })
      })
    } catch (error) {
      console.error('Failed to send referral request email:', error)
    }
  }

  // Send via SMS if phone is available
  if (booking.customer_phone) {
    try {
      // This would integrate with your SMS service
      console.log('SMS Referral Request:', message)
    } catch (error) {
      console.error('Failed to send referral request SMS:', error)
    }
  }
}
