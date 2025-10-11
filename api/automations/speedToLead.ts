import { createClient } from '@supabase/supabase-js'

// AI Generation for production
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
          max_tokens: 200,
          temperature: 0.7
        })
      })

      if (response.ok) {
        const data = await response.json()
        return data.choices[0]?.message?.content?.trim() || ''
      }
    }

    // Fallback to simple response
    return "Thank you for your interest! We'll review your inquiry and get back to you within 24 hours."
  } catch (error) {
    console.error('AI generation error:', error)
    return "Thank you for your interest! We'll review your inquiry and get back to you within 24 hours."
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { leadId, userId } = req.body

    if (!leadId || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: leadId, userId' 
      })
    }

    // Get the lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('user_id', userId)
      .single()

    if (leadError || !lead) {
      console.error('Lead not found:', leadError)
      return res.status(404).json({ error: 'Lead not found' })
    }

    // Get business settings
    const { data: businessSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('business_name, booking_link, niche')
      .eq('user_id', userId)
      .single()

    if (settingsError) {
      console.error('Business settings not found:', settingsError)
      return res.status(404).json({ error: 'Business settings not found' })
    }

    // Generate immediate follow-up message
    const prompt = `Write a warm, immediate follow-up email for ${lead.name} who just submitted a contact form for ${businessSettings.business_name}. 
    
    Lead details:
    - Name: ${lead.name}
    - Email: ${lead.email}
    - Phone: ${lead.phone || 'Not provided'}
    - Message: ${lead.notes || 'No specific message'}
    - Business: ${businessSettings.business_name}
    - Niche: ${businessSettings.niche || 'General business'}
    
    Make it:
    - Personal and warm
    - Acknowledge their specific message if provided
    - Mention next steps (we'll review and respond within 24 hours)
    - Include booking link if available: ${businessSettings.booking_link || 'Not available'}
    - Keep it concise but friendly
    - Professional but not corporate`

    const followUpMessage = await generateAIResponse(prompt)

    if (!followUpMessage || followUpMessage.trim().length === 0) {
      console.error('Failed to generate follow-up message')
      return res.status(500).json({ error: 'Failed to generate follow-up message' })
    }

    // Send the immediate follow-up email
    try {
      const emailResponse = await fetch(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`
        },
        body: JSON.stringify({
          to: lead.email,
          subject: `Thank you for contacting ${businessSettings.business_name}!`,
          body: followUpMessage
        })
      })

      if (!emailResponse.ok) {
        console.error('Failed to send speed-to-lead email:', emailResponse.status)
        // Don't fail the automation if email fails
      } else {
        console.log(`Speed-to-lead email sent to ${lead.email}`)
      }
    } catch (emailError) {
      console.error('Error sending speed-to-lead email:', emailError)
      // Don't fail the automation if email fails
    }

    // Record the message in the database
    const { error: messageError } = await supabase
      .from('messages')
      .insert([{
        user_id: userId,
        lead_id: leadId,
        channel: 'email',
        direction: 'out',
        body: followUpMessage,
        sent_at: new Date().toISOString()
      }])

    if (messageError) {
      console.error('Error recording speed-to-lead message:', messageError)
      // Don't fail the automation if message recording fails
    }

    // Update lead status to 'contacted' and last outbound message timestamp
    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update({
        status: 'contacted',
        last_outbound_message: new Date().toISOString()
      })
      .eq('id', leadId)
      .eq('user_id', userId)

    if (leadUpdateError) {
      console.error('Error updating lead status:', leadUpdateError)
      // Don't fail the automation if lead update fails
    }

    console.log(`Speed-to-lead automation completed for lead ${leadId}`)

    return res.status(200).json({
      success: true,
      message: 'Speed-to-lead automation completed',
      leadId: leadId
    })

  } catch (error) {
    console.error('Error in speedToLead automation:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
