// Email Automation API Endpoint
// Integrates with existing automation workflows and triggers AI-powered emails

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  const expectedKey = process.env.INTERNAL_API_KEY || 'internal-key'
  
  if (authHeader !== `Bearer ${expectedKey}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { action, user_id, event, data } = req.body

    switch (action) {
      case 'trigger_event':
        return await handleAutomationEvent(user_id, event, data, res)
      
      case 'process_triggers':
        return await processAllTriggers(user_id, res)
      
      case 'create_campaign':
        return await createEmailCampaign(user_id, data, res)
      
      case 'create_trigger':
        return await createAutomationTrigger(user_id, data, res)
      
      case 'get_campaigns':
        return await getEmailCampaigns(user_id, res)
      
      case 'get_metrics':
        return await getEmailMetrics(user_id, data, res)
      
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Email automation API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Handle automation events
async function handleAutomationEvent(userId: string, event: string, data: any, res: any) {
  try {
    console.log(`Handling automation event: ${event} for user: ${userId}`)

    // Get business data and niche
    const { data: businessData } = await supabase
      .from('user_settings')
      .select('business_name, business_website, business_phone, business_address, business_hours, niche')
      .eq('user_id', userId)
      .single()

    if (!businessData) {
      return res.status(404).json({ error: 'Business data not found' })
    }

    // Process the event based on type
    let result = { success: false, emailsSent: 0, error: null }

    switch (event) {
      case 'appointment_completed':
        result = await handleAppointmentCompleted(userId, data, businessData)
        break
      case 'appointment_cancelled':
        result = await handleAppointmentCancelled(userId, data, businessData)
        break
      case 'new_lead_created':
        result = await handleNewLeadCreated(userId, data, businessData)
        break
      case 'lead_converted':
        result = await handleLeadConverted(userId, data, businessData)
        break
      case 'payment_received':
        result = await handlePaymentReceived(userId, data, businessData)
        break
      case 'review_received':
        result = await handleReviewReceived(userId, data, businessData)
        break
      case 'client_inactive':
        result = await handleClientInactive(userId, data, businessData)
        break
      case 'maintenance_due':
        result = await handleMaintenanceDue(userId, data, businessData)
        break
      case 'open_house_scheduled':
        result = await handleOpenHouseScheduled(userId, data, businessData)
        break
      case 'market_update':
        result = await handleMarketUpdate(userId, data, businessData)
        break
      default:
        return res.status(400).json({ error: `Unknown event: ${event}` })
    }

    return res.status(200).json({
      success: true,
      event: event,
      result: result
    })
  } catch (error) {
    console.error('Error handling automation event:', error)
    return res.status(500).json({ error: 'Failed to handle automation event' })
  }
}

// Handle appointment completed
async function handleAppointmentCompleted(userId: string, data: any, businessData: any) {
  try {
    const customerData = await getCustomerData(userId, data.customer_email)
    if (!customerData) {
      return { success: false, error: 'Customer not found' }
    }

    // Generate AI-powered review request email
    const emailContent = await generateAIEmailContent({
      userId,
      niche: businessData.niche,
      campaignType: 'review_request',
      customerData,
      businessData,
      context: {
        service: data.service,
        appointment_date: data.appointment_date,
        stylist: data.stylist
      }
    })

    // Send email with proper branding
    const result = await sendEmail({
      to: data.customer_email,
      from: `${businessData.business_name} via GetGetLeads <noreply@getgetleads.com>`,
      replyTo: businessData.business_email || 'support@getgetleads.com',
      subject: emailContent.subject,
      html: emailContent.content,
      userId,
      campaignType: 'review_request'
    })

    // Log email
    await logEmail(userId, {
      customer_email: data.customer_email,
      subject: emailContent.subject,
      content: emailContent.content,
      campaign_type: 'review_request',
      customer_data: customerData,
      result: result
    })

    return { success: result.success, emailsSent: result.success ? 1 : 0, error: result.error }
  } catch (error) {
    console.error('Error handling appointment completed:', error)
    return { success: false, error: error.message }
  }
}

// Handle new lead created
async function handleNewLeadCreated(userId: string, data: any, businessData: any) {
  try {
    const customerData = await getCustomerData(userId, data.email)
    if (!customerData) {
      return { success: false, error: 'Customer not found' }
    }

    // Generate AI-powered welcome email
    const emailContent = await generateAIEmailContent({
      userId,
      niche: businessData.niche,
      campaignType: 'welcome',
      customerData,
      businessData,
      context: {
        lead_source: data.source,
        interest: data.interest
      }
    })

    // Send email
    const result = await sendEmail({
      to: data.email,
      from: `${businessData.business_name} via GetGetLeads <noreply@getgetleads.com>`,
      replyTo: businessData.business_email || 'support@getgetleads.com',
      subject: emailContent.subject,
      html: emailContent.content,
      userId,
      campaignType: 'welcome'
    })

    // Log email
    await logEmail(userId, {
      customer_email: data.email,
      subject: emailContent.subject,
      content: emailContent.content,
      campaign_type: 'welcome',
      customer_data: customerData,
      result: result
    })

    return { success: result.success, emailsSent: result.success ? 1 : 0, error: result.error }
  } catch (error) {
    console.error('Error handling new lead created:', error)
    return { success: false, error: error.message }
  }
}

// Handle client inactive
async function handleClientInactive(userId: string, data: any, businessData: any) {
  try {
    const customerData = await getCustomerData(userId, data.email)
    if (!customerData) {
      return { success: false, error: 'Customer not found' }
    }

    // Generate AI-powered re-engagement email
    const emailContent = await generateAIEmailContent({
      userId,
      niche: businessData.niche,
      campaignType: 're_engagement',
      customerData,
      businessData,
      context: {
        days_inactive: data.days_inactive,
        last_service: data.last_service
      }
    })

    // Send email
    const result = await sendEmail({
      to: data.email,
      from: `${businessData.business_name} via GetGetLeads <noreply@getgetleads.com>`,
      replyTo: businessData.business_email || 'support@getgetleads.com',
      subject: emailContent.subject,
      html: emailContent.content,
      userId,
      campaignType: 're_engagement'
    })

    // Log email
    await logEmail(userId, {
      customer_email: data.email,
      subject: emailContent.subject,
      content: emailContent.content,
      campaign_type: 're_engagement',
      customer_data: customerData,
      result: result
    })

    return { success: result.success, emailsSent: result.success ? 1 : 0, error: result.error }
  } catch (error) {
    console.error('Error handling client inactive:', error)
    return { success: false, error: error.message }
  }
}

// Handle market update
async function handleMarketUpdate(userId: string, data: any, businessData: any) {
  try {
    // Get all active customers for market update
    const { data: customers } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .not('email', 'is', null)

    if (!customers || customers.length === 0) {
      return { success: true, emailsSent: 0, error: 'No active customers found' }
    }

    let emailsSent = 0
    let errors = []

    for (const customer of customers) {
      try {
        // Generate AI-powered market update email
        const emailContent = await generateAIEmailContent({
          userId,
          niche: businessData.niche,
          campaignType: 'market_update',
          customerData: customer,
          businessData,
          context: {
            market_data: data.market_data,
            area: data.area,
            update_type: data.update_type
          }
        })

        // Send email
        const result = await sendEmail({
          to: customer.email,
          from: `${businessData.business_name} via GetGetLeads <noreply@getgetleads.com>`,
          replyTo: businessData.business_email || 'support@getgetleads.com',
          subject: emailContent.subject,
          html: emailContent.content,
          userId,
          campaignType: 'market_update'
        })

        if (result.success) {
          emailsSent++
        } else {
          errors.push(result.error)
        }

        // Log email
        await logEmail(userId, {
          customer_email: customer.email,
          subject: emailContent.subject,
          content: emailContent.content,
          campaign_type: 'market_update',
          customer_data: customer,
          result: result
        })
      } catch (error) {
        console.error(`Error sending market update to ${customer.email}:`, error)
        errors.push(error.message)
      }
    }

    return { success: emailsSent > 0, emailsSent, error: errors.length > 0 ? errors.join('; ') : null }
  } catch (error) {
    console.error('Error handling market update:', error)
    return { success: false, error: error.message }
  }
}

// Generate AI email content
async function generateAIEmailContent({ userId, niche, campaignType, customerData, businessData, context }) {
  try {
    // Get niche-specific template
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('niche', niche)
      .eq('campaign_type', campaignType)
      .eq('is_default', true)
      .single()

    if (!template) {
      throw new Error(`No template found for niche: ${niche}, campaign: ${campaignType}`)
    }

    // Build AI prompt
    const prompt = `
You are an AI email marketing expert specializing in ${niche} businesses. Generate a personalized email for ${customerData.name || customerData.first_name + ' ' + customerData.last_name}.

BUSINESS CONTEXT:
- Business Name: ${businessData.business_name}
- Business Type: ${niche}
- Website: ${businessData.business_website}
- Phone: ${businessData.business_phone}
- Address: ${businessData.business_address}
- Hours: ${businessData.business_hours}

CUSTOMER CONTEXT:
- Name: ${customerData.name || customerData.first_name + ' ' + customerData.last_name}
- Email: ${customerData.email}
- Phone: ${customerData.phone || 'Not provided'}

EVENT CONTEXT: ${JSON.stringify(context)}

EMAIL TYPE: ${campaignType}
TEMPLATE: ${template.name}

REQUIREMENTS:
1. Use a warm, professional tone appropriate for ${niche}
2. Personalize with customer's name and relevant context
3. Include relevant business information
4. Add a clear call-to-action
5. Keep subject line under 50 characters
6. Keep content under 300 words
7. Make it mobile-friendly
8. Include business contact information
9. Use proper sender branding: "${businessData.business_name} via GetGetLeads"

Return in this format:
SUBJECT: [Email subject line]
CONTENT: [Email content in HTML format]
    `.trim()

    // Call AI service
    const response = await fetch(`${process.env.AI_SERVICE_URL || 'http://localhost:11434'}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.1',
        prompt: prompt,
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error('AI service unavailable')
    }

    const aiResponse = await response.json()
    const content = aiResponse.response || aiResponse

    // Parse AI response
    const subjectMatch = content.match(/SUBJECT:\s*(.+)/i)
    const contentMatch = content.match(/CONTENT:\s*([\s\S]+)/i)
    
    return {
      subject: subjectMatch ? subjectMatch[1].trim() : template.subject_template,
      content: contentMatch ? contentMatch[1].trim() : template.content_template
    }
  } catch (error) {
    console.error('Error generating AI email content:', error)
    // Fallback to template
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('niche', niche)
      .eq('campaign_type', campaignType)
      .eq('is_default', true)
      .single()

    return {
      subject: template?.subject_template || 'Thank you for your business!',
      content: template?.content_template || 'Thank you for your business!'
    }
  }
}

// Send email via email service
async function sendEmail(emailData) {
  try {
    const response = await fetch(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.message }
    }

    const result = await response.json()
    return { success: true, messageId: result.messageId }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Get customer data
async function getCustomerData(userId, email) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('email', email)
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting customer data:', error)
    return null
  }
}

// Log email to database
async function logEmail(userId, logData) {
  try {
    await supabase
      .from('email_logs')
      .insert({
        user_id: userId,
        customer_email: logData.customer_email,
        subject: logData.subject,
        content: logData.content,
        campaign_type: logData.campaign_type,
        customer_data: logData.customer_data,
        sent_at: new Date().toISOString(),
        status: logData.result.success ? 'sent' : 'failed',
        message_id: logData.result.messageId
      })
  } catch (error) {
    console.error('Error logging email:', error)
  }
}

// Process all triggers
async function processAllTriggers(userId, res) {
  try {
    // Get active triggers
    const { data: triggers } = await supabase
      .from('automation_triggers')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (!triggers || triggers.length === 0) {
      return res.status(200).json({ success: true, processed: 0, sent: 0, failed: 0 })
    }

    let processed = 0
    let sent = 0
    let failed = 0

    for (const trigger of triggers) {
      try {
        // Check if trigger should fire
        const shouldFire = await evaluateTrigger(trigger)
        if (shouldFire) {
          // Execute trigger
          const result = await executeTrigger(userId, trigger)
          if (result.success) {
            sent += result.emailsSent || 0
          } else {
            failed++
          }
          processed++
        }
      } catch (error) {
        console.error(`Error processing trigger ${trigger.id}:`, error)
        failed++
      }
    }

    return res.status(200).json({
      success: true,
      processed,
      sent,
      failed
    })
  } catch (error) {
    console.error('Error processing triggers:', error)
    return res.status(500).json({ error: 'Failed to process triggers' })
  }
}

// Evaluate trigger conditions
async function evaluateTrigger(trigger) {
  // Implement trigger evaluation logic
  return true // Simplified for now
}

// Execute trigger
async function executeTrigger(userId, trigger) {
  // Implement trigger execution logic
  return { success: true, emailsSent: 0 }
}

// Create email campaign
async function createEmailCampaign(userId, data, res) {
  try {
    const { data: campaign, error } = await supabase
      .from('email_campaigns')
      .insert({
        user_id: userId,
        name: data.name,
        type: data.type,
        niche: data.niche,
        subject_template: data.subject_template,
        content_template: data.content_template
      })
      .select()
      .single()

    if (error) throw error

    return res.status(200).json({
      success: true,
      campaign: campaign
    })
  } catch (error) {
    console.error('Error creating email campaign:', error)
    return res.status(500).json({ error: 'Failed to create campaign' })
  }
}

// Create automation trigger
async function createAutomationTrigger(userId, data, res) {
  try {
    const { data: trigger, error } = await supabase
      .from('automation_triggers')
      .insert({
        user_id: userId,
        event: data.event,
        email_campaign_id: data.email_campaign_id,
        conditions: data.conditions,
        delay_minutes: data.delay_minutes
      })
      .select()
      .single()

    if (error) throw error

    return res.status(200).json({
      success: true,
      trigger: trigger
    })
  } catch (error) {
    console.error('Error creating automation trigger:', error)
    return res.status(500).json({ error: 'Failed to create trigger' })
  }
}

// Get email campaigns
async function getEmailCampaigns(userId, res) {
  try {
    const { data: campaigns, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return res.status(200).json({
      success: true,
      campaigns: campaigns
    })
  } catch (error) {
    console.error('Error getting email campaigns:', error)
    return res.status(500).json({ error: 'Failed to get campaigns' })
  }
}

// Get email metrics
async function getEmailMetrics(userId, data, res) {
  try {
    const { data: metrics, error } = await supabase
      .from('email_performance_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', data.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .lte('date', data.end_date || new Date().toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error) throw error

    return res.status(200).json({
      success: true,
      metrics: metrics
    })
  } catch (error) {
    console.error('Error getting email metrics:', error)
    return res.status(500).json({ error: 'Failed to get metrics' })
  }
}

// Handle other events (simplified implementations)
async function handleAppointmentCancelled(userId, data, businessData) {
  return { success: true, emailsSent: 0 }
}

async function handleLeadConverted(userId, data, businessData) {
  return { success: true, emailsSent: 0 }
}

async function handlePaymentReceived(userId, data, businessData) {
  return { success: true, emailsSent: 0 }
}

async function handleReviewReceived(userId, data, businessData) {
  return { success: true, emailsSent: 0 }
}

async function handleMaintenanceDue(userId, data, businessData) {
  return { success: true, emailsSent: 0 }
}

async function handleOpenHouseScheduled(userId, data, businessData) {
  return { success: true, emailsSent: 0 }
}
