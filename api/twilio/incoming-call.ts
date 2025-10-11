import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

// AI Generation for production (fallback to OpenAI if Ollama not available)
async function generateAIResponse(prompt: string): Promise<string> {
  try {
    // Try OpenAI first (production)
    if (process.env.OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 100,
          temperature: 0.7
        })
      })

      if (response.ok) {
        const data = await response.json()
        return data.choices[0]?.message?.content?.trim() || ''
      }
    }

    // Fallback to simple response
    return "Hi there! Thanks for calling. We missed your call but will get back to you soon!"
  } catch (error) {
    console.error('AI generation error:', error)
    return "Hi there! Thanks for calling. We missed your call but will get back to you soon!"
  }
}

interface TwilioWebhookData {
  CallSid: string
  CallStatus: string
  From: string
  To: string
  Direction: string
  CallerName?: string
  CallerCity?: string
  CallerState?: string
  CallerCountry?: string
}

// Helper function to send SMS via Twilio
async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error('Twilio credentials not configured')
    return false
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: TWILIO_PHONE_NUMBER,
          To: to,
          Body: message
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Twilio SMS error:', error)
      return false
    }

    const result = await response.json()
    console.log('SMS sent successfully:', result.sid)
    return true
  } catch (error) {
    console.error('Error sending SMS:', error)
    return false
  }
}

// Helper function to get business owner's phone number
async function getBusinessOwnerPhone(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('business_phone')
      .eq('user_id', userId)
      .single()

    if (error || !data?.business_phone) {
      console.error('Business phone not found:', error)
      return null
    }

    return data.business_phone
  } catch (error) {
    console.error('Error fetching business phone:', error)
    return null
  }
}

// Helper function to create missed call lead
async function createMissedCallLead(callerNumber: string, businessUserId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .insert([{
        user_id: businessUserId,
        name: null,
        phone: callerNumber,
        source: 'MissedCall',
        status: 'new',
        notes: 'Missed call - automated SMS sent'
      }])
      .select('id')
      .single()

    if (error) {
      console.error('Error creating missed call lead:', error)
      return null
    }

    return data.id
  } catch (error) {
    console.error('Error creating missed call lead:', error)
    return null
  }
}

// Helper function to log automation activity
async function logMissedCallActivity(
  userId: string, 
  leadId: string, 
  callerNumber: string, 
  message: string, 
  status: 'success' | 'failed',
  error?: string
) {
  try {
    // Create automation run record
    const { data: runData, error: runError } = await supabase
      .from('automation_runs')
      .insert([{
        user_id: userId,
        automation_id: 'missed-call-sms', // Special ID for missed call automation
        run_type: 'webhook',
        status: status,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      }])
      .select('id')
      .single()

    if (runError) {
      console.error('Error creating automation run:', runError)
      return
    }

    // Log the SMS message detail
    await supabase
      .from('automation_run_details')
      .insert([{
        run_id: runData.id,
        lead_id: leadId,
        action_type: 'sms_sent',
        details: {
          caller_number: callerNumber,
          message: message,
          status: status,
          error: error || null
        },
        created_at: new Date().toISOString()
      }])

    // Record the SMS message in messages table
    await supabase
      .from('messages')
      .insert([{
        user_id: userId,
        lead_id: leadId,
        channel: 'sms',
        direction: 'out',
        body: message,
        sent_at: new Date().toISOString()
      }])

  } catch (error) {
    console.error('Error logging missed call activity:', error)
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse Twilio webhook data
    const webhookData: TwilioWebhookData = req.body
    const { CallSid, CallStatus, From, To, CallerName } = webhookData

    console.log('Twilio webhook received:', {
      CallSid,
      CallStatus,
      From,
      To,
      CallerName
    })

    // Only process missed calls
    if (CallStatus !== 'no-answer') {
      console.log('Call status is not no-answer, ignoring:', CallStatus)
      return res.status(200).json({ message: 'Call processed' })
    }

    // Extract caller number (remove any formatting)
    const callerNumber = From.replace(/\D/g, '')
    if (callerNumber.length < 10) {
      console.error('Invalid caller number:', From)
      return res.status(400).json({ error: 'Invalid caller number' })
    }

    // Format caller number for display
    const formattedNumber = `+1-${callerNumber.slice(-10).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}`

    // Get business owner's user_id from the called number
    // For now, we'll need to map the called number to a user_id
    // This could be done by storing the Twilio number in user_settings
    const { data: businessData, error: businessError } = await supabase
      .from('user_settings')
      .select('user_id, business_name, missed_call_automation_enabled')
      .eq('twilio_phone_number', To)
      .eq('missed_call_automation_enabled', true)
      .single()

    if (businessError || !businessData) {
      console.error('Business not found or missed call automation disabled:', businessError)
      return res.status(404).json({ error: 'Business not found or automation disabled' })
    }

    // Create missed call lead
    const leadId = await createMissedCallLead(formattedNumber, businessData.user_id)
    if (!leadId) {
      console.error('Failed to create missed call lead')
      return res.status(500).json({ error: 'Failed to create lead' })
    }

    // Generate AI response for the caller
    const prompt = `Write a short, friendly SMS reply for a missed call from a potential customer. Keep it under 25 words. Business name: ${businessData.business_name || 'our business'}.`
    const aiResponse = await generateAIResponse(prompt)

    if (!aiResponse || aiResponse.trim().length === 0) {
      console.error('Failed to generate AI response')
      await logMissedCallActivity(
        businessData.user_id, 
        leadId, 
        formattedNumber, 
        '', 
        'failed', 
        'AI response generation failed'
      )
      return res.status(500).json({ error: 'Failed to generate response' })
    }

    // Send SMS to caller
    const smsSent = await sendSMS(formattedNumber, aiResponse.trim())
    
    if (!smsSent) {
      console.error('Failed to send SMS to caller')
      await logMissedCallActivity(
        businessData.user_id, 
        leadId, 
        formattedNumber, 
        aiResponse.trim(), 
        'failed', 
        'SMS sending failed'
      )
      return res.status(500).json({ error: 'Failed to send SMS' })
    }

    // Send alert SMS to business owner
    const businessPhone = await getBusinessOwnerPhone(businessData.user_id)
    if (businessPhone) {
      const alertMessage = `You missed a call from ${formattedNumber}. We've sent them an automated response.`
      await sendSMS(businessPhone, alertMessage)
    }

    // Log successful automation
    await logMissedCallActivity(
      businessData.user_id, 
      leadId, 
      formattedNumber, 
      aiResponse.trim(), 
      'success'
    )

    // Trigger speed-to-lead automation for missed call lead
    try {
      await fetch(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/api/automations/speedToLead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`
        },
        body: JSON.stringify({
          leadId: leadId,
          userId: businessData.user_id
        })
      })
    } catch (automationError) {
      console.error('Speed-to-lead automation failed for missed call:', automationError)
      // Don't fail the webhook if automation fails
    }

    console.log(`Missed call automation completed for ${formattedNumber}`)

    return res.status(200).json({
      success: true,
      message: 'Missed call processed successfully',
      lead_id: leadId
    })

  } catch (error) {
    console.error('Error in Twilio webhook:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
