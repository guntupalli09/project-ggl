// Email reply tracking system
// This would integrate with email services to track replies

interface EmailTracking {
  messageId: string
  leadId: string
  sentAt: string
  hasReply: boolean
  replyAt?: string
  replyContent?: string
}

// This would be called when sending emails
export async function trackEmailSent(messageId: string, leadId: string) {
  try {
    const { error } = await supabase
      .from('email_tracking')
      .insert({
        message_id: messageId,
        lead_id: leadId,
        sent_at: new Date().toISOString(),
        has_reply: false
      })

    if (error) {
      console.error('Error tracking email:', error)
    }
  } catch (error) {
    console.error('Email tracking error:', error)
  }
}

// This would be called by a webhook when a reply is received
export async function trackEmailReply(messageId: string, replyContent: string) {
  try {
    const { error } = await supabase
      .from('email_tracking')
      .update({
        has_reply: true,
        reply_at: new Date().toISOString(),
        reply_content: replyContent
      })
      .eq('message_id', messageId)

    if (error) {
      console.error('Error tracking reply:', error)
    }
  } catch (error) {
    console.error('Reply tracking error:', error)
  }
}

// Check if a lead has responded to recent messages
export async function hasLeadResponded(leadId: string, sinceDate: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('email_tracking')
      .select('has_reply')
      .eq('lead_id', leadId)
      .gte('sent_at', sinceDate)
      .eq('has_reply', true)
      .limit(1)

    if (error) {
      console.error('Error checking lead response:', error)
      return false
    }

    return data && data.length > 0
  } catch (error) {
    console.error('Response check error:', error)
    return false
  }
}
