import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { campaign_id, user_id } = req.body

    if (!campaign_id || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('user_id', user_id)
      .single()

    if (campaignError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    // Get leads to send to (for now, all leads with emails)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, email')
      .eq('user_id', user_id)
      .not('email', 'is', null)

    if (leadsError) {
      return res.status(500).json({ error: 'Failed to fetch leads' })
    }

    if (!leads || leads.length === 0) {
      return res.status(400).json({ error: 'No leads with email addresses found' })
    }

    // Send emails (simulate for now)
    const emailLogs = leads.map(lead => ({
      user_id,
      lead_id: lead.id,
      recipient_email: lead.email,
      recipient_name: lead.name,
      subject: campaign.subject,
      content: campaign.content,
      campaign_type: campaign.campaign_type,
      status: 'sent'
    }))

    // Insert email logs
    const { error: logsError } = await supabase
      .from('email_logs')
      .insert(emailLogs)

    if (logsError) {
      return res.status(500).json({ error: 'Failed to log emails' })
    }

    // Update campaign
    const { error: updateError } = await supabase
      .from('email_campaigns')
      .update({
        sent_count: leads.length,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', campaign_id)

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update campaign' })
    }

    res.status(200).json({ 
      success: true, 
      message: `Campaign sent to ${leads.length} leads`,
      sent_count: leads.length
    })
  } catch (error) {
    console.error('Email campaign error:', error)
    res.status(500).json({ error: 'Failed to send campaign' })
  }
}
