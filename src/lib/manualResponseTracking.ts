// Manual response tracking system
// Users can mark when they receive responses

import { supabase } from './supabaseClient'

export async function markLeadResponded(leadId: string, responseNotes?: string) {
  try {
    // Update lead status to show they responded
    const { error: leadError } = await supabase
      .from('leads')
      .update({
        status: 'contacted', // Use valid status value
        last_inbound_message: new Date().toISOString(),
        notes: responseNotes ? `${responseNotes}\n\n[Response received: ${new Date().toLocaleDateString()}]` : undefined
      })
      .eq('id', leadId)

    if (leadError) {
      console.error('Error updating lead response:', leadError)
      return false
    }

    // Create a message record for the response
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          user_id: user.id,
          lead_id: leadId,
          channel: 'email',
          direction: 'in',
          body: responseNotes || 'Response received',
          sent_at: new Date().toISOString()
        })

      if (messageError) {
        console.error('Error creating response message:', messageError)
      }
    }

    return true
  } catch (error) {
    console.error('Response tracking error:', error)
    return false
  }
}

export async function markLeadNoResponse(leadId: string, reason?: string) {
  try {
    const { error } = await supabase
      .from('leads')
      .update({
        status: 'contacted', // Use valid status value - could also be 'new' if no response
        notes: reason ? `${reason}\n\n[No response: ${new Date().toLocaleDateString()}]` : undefined
      })
      .eq('id', leadId)

    if (error) {
      console.error('Error updating no response:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('No response tracking error:', error)
    return false
  }
}

// Check if lead has responded recently
export async function hasRecentResponse(leadId: string, days: number = 7): Promise<boolean> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .eq('lead_id', leadId)
      .eq('direction', 'in')
      .gte('sent_at', cutoffDate.toISOString())
      .limit(1)

    if (error) {
      console.error('Error checking recent response:', error)
      return false
    }

    return data && data.length > 0
  } catch (error) {
    console.error('Recent response check error:', error)
    return false
  }
}
