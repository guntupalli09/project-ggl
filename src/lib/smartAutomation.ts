// Smart automation system that uses manual response tracking
import { supabase } from './supabaseClient'
import { hasRecentResponse } from './manualResponseTracking'

interface SmartLead {
  id: string
  name: string
  email: string
  status: string
  last_outbound_message?: string
  last_inbound_message?: string
  created_at: string
  notes: string
}

export async function findLeadsNeedingFollowUp(userId: string, automationDelayMinutes: number): Promise<SmartLead[]> {
  try {
    const delayMs = automationDelayMinutes * 60 * 1000
    const cutoffTime = new Date(Date.now() - delayMs).toISOString()

    // Get leads that might need follow-up
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        email,
        status,
        last_outbound_message,
        last_inbound_message,
        created_at,
        notes
      `)
      .eq('user_id', userId)
      .in('status', ['new', 'contacted'])
      .or(`last_outbound_message.is.null,last_outbound_message.lt.${cutoffTime}`)

    if (error) {
      console.error('Error fetching leads:', error)
      return []
    }

    // Filter leads that actually need follow-up
    const leadsNeedingFollowUp: SmartLead[] = []

    for (const lead of leads || []) {
      // Check if lead has responded recently (last 7 days)
      const hasResponded = await hasRecentResponse(lead.id, 7)
      
      if (!hasResponded) {
        // Check if enough time has passed since last outbound message
        const lastOutbound = lead.last_outbound_message || lead.created_at
        const timeSinceOutbound = Date.now() - new Date(lastOutbound).getTime()
        
        if (timeSinceOutbound >= delayMs) {
          leadsNeedingFollowUp.push(lead)
        }
      } else {
        // Lead has responded, update their status
        await supabase
          .from('leads')
          .update({ status: 'contacted' })
          .eq('id', lead.id)
      }
    }

    return leadsNeedingFollowUp
  } catch (error) {
    console.error('Error finding leads needing follow-up:', error)
    return []
  }
}

// Enhanced automation logic
export async function shouldSendFollowUp(lead: SmartLead, automationDelayMinutes: number): Promise<boolean> {
  try {
    // Check if lead has responded recently
    const hasResponded = await hasRecentResponse(lead.id, 7)
    if (hasResponded) {
      console.log(`Lead ${lead.name} has responded recently, skipping follow-up`)
      return false
    }

    // Check if enough time has passed
    const lastOutbound = lead.last_outbound_message || lead.created_at
    const timeSinceOutbound = Date.now() - new Date(lastOutbound).getTime()
    const delayMs = automationDelayMinutes * 60 * 1000

    if (timeSinceOutbound < delayMs) {
      console.log(`Lead ${lead.name} - not enough time passed since last message`)
      return false
    }

    // Check lead status - don't follow up if they're already in a good state
    if (['responded', 'booked', 'completed'].includes(lead.status)) {
      console.log(`Lead ${lead.name} is in status ${lead.status}, skipping follow-up`)
      return false
    }

    return true
  } catch (error) {
    console.error('Error checking if should send follow-up:', error)
    return false
  }
}
