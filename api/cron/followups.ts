import { createClient } from '@supabase/supabase-js'
import { generateText } from '../../src/lib/ollamaClient'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to create automation run record
async function createAutomationRun(userId: string, automationId: string, runType: string = 'scheduled') {
  const { data, error } = await supabase
    .from('automation_runs')
    .insert([{
      user_id: userId,
      automation_id: automationId,
      run_type: runType,
      status: 'running',
      started_at: new Date().toISOString()
    }])
    .select('*')
    .single()

  if (error) {
    console.error('Error creating automation run:', error)
    return null
  }

  return data
}

// Helper function to update automation run with results
async function updateAutomationRun(runId: string, results: {
  status: 'success' | 'failed' | 'partial'
  leadsProcessed: number
  messagesSent: number
  errorsCount: number
  errorDetails?: string
}) {
  const { error } = await supabase
    .from('automation_runs')
    .update({
      status: results.status,
      completed_at: new Date().toISOString(),
      leads_processed: results.leadsProcessed,
      messages_sent: results.messagesSent,
      errors_count: results.errorsCount,
      error_details: results.errorDetails
    })
    .eq('id', runId)

  if (error) {
    console.error('Error updating automation run:', error)
  }
}

// Helper function to log individual message details
async function logMessageDetail(runId: string, leadId: string, leadName: string, leadEmail: string, message: string, subject: string, status: 'sent' | 'failed' | 'skipped', errorMessage?: string) {
  const { error } = await supabase
    .from('automation_run_details')
    .insert([{
      run_id: runId,
      lead_id: leadId,
      lead_name: leadName,
      lead_email: leadEmail,
      message_sent: message,
      message_subject: subject,
      status: status,
      error_message: errorMessage,
      sent_at: status === 'sent' ? new Date().toISOString() : null
    }])

  if (error) {
    console.error('Error logging message detail:', error)
  }
}

interface Lead {
  id: string
  name: string
  email: string
  notes: string
  status: string
  last_outbound_message?: string
  last_inbound_message?: string
}

interface Automation {
  id: string
  user_id: string
  name: string
  delay_minutes: number
  active: boolean
}

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify this is a cron job (Vercel adds this header)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    console.log('Starting follow-up automation cron job...')
    
    // Get all active automations
    const { data: automations, error: automationsError } = await supabase
      .from('automations')
      .select('*')
      .eq('active', true)

    if (automationsError) {
      console.error('Error fetching automations:', automationsError)
      return res.status(500).json({ error: 'Failed to fetch automations' })
    }

    if (!automations || automations.length === 0) {
      console.log('No active automations found')
      return res.status(200).json({ message: 'No active automations', messagesSent: 0 })
    }

    let totalMessagesSent = 0
    const results = []

    // Process each automation
    for (const automation of automations) {
      console.log(`Processing automation: ${automation.name} (${automation.delay_minutes} minutes)`)
      
      // Create automation run record
      const runRecord = await createAutomationRun(automation.user_id, automation.id, 'scheduled')
      if (!runRecord) {
        console.error(`Failed to create run record for automation ${automation.id}`)
        continue
      }
      
      let leadsProcessed = 0
      let messagesSent = 0
      let errorsCount = 0
      const errorDetails = []
      
      // Find leads that need follow-up for this automation
      const leads = await findLeadsForFollowUp(automation)
      
      console.log(`Found ${leads.length} leads for automation ${automation.name}`)
      leadsProcessed = leads.length
      
      // Process each lead
      for (const lead of leads) {
        try {
          const result = await processLeadFollowUp(lead, automation, runRecord.id)
          if (result.success) {
            messagesSent++
            totalMessagesSent++
            results.push({
              leadId: lead.id,
              leadName: lead.name,
              automationId: automation.id,
              automationName: automation.name
            })
          } else {
            errorsCount++
            errorDetails.push(`Lead ${lead.name}: ${result.error}`)
          }
        } catch (error) {
          console.error(`Error processing lead ${lead.id}:`, error)
          errorsCount++
          errorDetails.push(`Lead ${lead.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      
      // Update automation run with results
      const runStatus = errorsCount === 0 ? 'success' : (messagesSent > 0 ? 'partial' : 'failed')
      await updateAutomationRun(runRecord.id, {
        status: runStatus,
        leadsProcessed,
        messagesSent,
        errorsCount,
        errorDetails: errorDetails.length > 0 ? errorDetails.join('; ') : undefined
      })
    }

    console.log(`Cron job completed. Sent ${totalMessagesSent} follow-up messages.`)
    
    return res.status(200).json({
      success: true,
      message: 'Follow-up automation completed',
      messagesSent: totalMessagesSent,
      results: results
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function findLeadsForFollowUp(automation: Automation): Promise<Lead[]> {
  const delayMinutes = automation.delay_minutes
  const cutoffTime = new Date(Date.now() - (delayMinutes * 60 * 1000)).toISOString()

  // Query leads that:
  // 1. Belong to the automation's user
  // 2. Have status 'new' or 'contacted'
  // 3. Have a last outbound message older than delay_minutes
  // 4. Have no inbound message newer than the outbound message
  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      id,
      name,
      email,
      notes,
      status,
      created_at
    `)
    .eq('user_id', automation.user_id)
    .in('status', ['new', 'contacted'])
    .or(`last_outbound_message.is.null,last_outbound_message.lt.${cutoffTime}`)

  if (error) {
    console.error('Error finding leads for follow-up:', error)
    return []
  }

  // Filter leads that don't have newer inbound messages
  const filteredLeads = []
  
  for (const lead of leads || []) {
    // Check if there's a newer inbound message
    const { data: newerInboundMessage } = await supabase
      .from('messages')
      .select('created_at')
      .eq('lead_id', lead.id)
      .eq('direction', 'in')
      .gt('created_at', lead.last_outbound_message || lead.created_at)
      .limit(1)

    // If no newer inbound message, this lead needs a follow-up
    if (!newerInboundMessage || newerInboundMessage.length === 0) {
      filteredLeads.push(lead)
    }
  }

  return filteredLeads
}

async function processLeadFollowUp(lead: Lead, automation: Automation, runId: string): Promise<{success: boolean, error?: string}> {
  try {
    console.log(`Processing follow-up for lead: ${lead.name} (${lead.email})`)
    
    // Get user settings for business name and booking link
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('booking_link')
      .eq('user_id', automation.user_id)
      .single()
    
    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Error fetching user settings:', settingsError)
    }
    
    const bookingLink = userSettings?.booking_link || ''
    const businessName = 'GGL' // Default business name
    
    // Generate follow-up message using Ollama
    const prompt = `Write a gentle 2nd follow-up email for ${lead.name} about ${lead.notes || 'our services'}. Keep it professional, brief, and friendly. Don't be pushy.${bookingLink ? ` Include this booking link: ${bookingLink}` : ''}`
    
    const followUpMessage = await generateText(prompt)
    
    if (!followUpMessage || followUpMessage.trim().length === 0) {
      const error = 'Failed to generate follow-up message'
      console.error(error, lead.id)
      
      // Log failed message detail
      await logMessageDetail(runId, lead.id, lead.name, lead.email, '', 'Follow-up from GGL', 'failed', error)
      
      return { success: false, error }
    }

    // Send email via the email API
    const emailResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`
      },
      body: JSON.stringify({
        to: lead.email,
        subject: `Follow-up from ${businessName}`,
        body: followUpMessage
      })
    })

    if (!emailResponse.ok) {
      const error = `Failed to send email: ${emailResponse.status}`
      console.error(error, lead.id)
      
      // Log failed message detail
      await logMessageDetail(runId, lead.id, lead.name, lead.email, followUpMessage, 'Follow-up from GGL', 'failed', error)
      
      return { success: false, error }
    }

    // Insert new message row
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: automation.user_id,
        lead_id: lead.id,
        channel: 'email',
        direction: 'out',
        body: followUpMessage,
        sent_at: new Date().toISOString()
      })

    if (messageError) {
      const error = `Failed to insert message: ${messageError.message}`
      console.error(error, lead.id)
      
      // Log failed message detail
      await logMessageDetail(runId, lead.id, lead.name, lead.email, followUpMessage, 'Follow-up from GGL', 'failed', error)
      
      return { success: false, error }
    }

    // Update lead status to 'contacted' only if currently 'new', and update last_outbound_message
    const { error: leadError } = await supabase
      .from('leads')
      .update({
        status: 'contacted',
        last_outbound_message: new Date().toISOString()
      })
      .eq('id', lead.id)
      .eq('status', 'new') // Only update if status is 'new'

    if (leadError) {
      const error = `Failed to update lead: ${leadError.message}`
      console.error(error, lead.id)
      
      // Log failed message detail
      await logMessageDetail(runId, lead.id, lead.name, lead.email, followUpMessage, 'Follow-up from GGL', 'failed', error)
      
      return { success: false, error }
    }

    // Log successful message detail
    await logMessageDetail(runId, lead.id, lead.name, lead.email, followUpMessage, 'Follow-up from GGL', 'sent')

    console.log(`Successfully sent follow-up to ${lead.name}`)
    return { success: true }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error processing follow-up for lead ${lead.id}:`, error)
    
    // Log failed message detail
    await logMessageDetail(runId, lead.id, lead.name, lead.email, '', 'Follow-up from GGL', 'failed', errorMessage)
    
    return { success: false, error: errorMessage }
  }
}
