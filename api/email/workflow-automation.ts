import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user_id } = req.body

    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id' })
    }

    // Get active review request workflows
    const { data: workflows, error: workflowsError } = await supabase
      .from('email_workflows')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .eq('campaign_type', 'review_request')

    if (workflowsError) {
      return res.status(500).json({ error: 'Failed to fetch workflows' })
    }

    if (!workflows || workflows.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No active review request workflows found',
        processed: 0
      })
    }

    let totalProcessed = 0

    for (const workflow of workflows) {
      // Calculate the cutoff time for completed leads
      const cutoffTime = new Date()
      cutoffTime.setHours(cutoffTime.getHours() - workflow.delay_hours)

      // Get completed leads that haven't received a review request yet
      const { data: completedLeads, error: leadsError } = await supabase
        .from('leads')
        .select('id, name, email, source, updated_at')
        .eq('user_id', user_id)
        .eq('status', 'completed')
        .not('email', 'is', null)
        .lte('updated_at', cutoffTime.toISOString())

      if (leadsError) {
        console.error('Error fetching completed leads:', leadsError)
        continue
      }

      if (!completedLeads || completedLeads.length === 0) {
        continue
      }

      // Check which leads already received review requests
      const leadIds = completedLeads.map(lead => lead.id)
      const { data: existingEmails, error: emailsError } = await supabase
        .from('email_logs')
        .select('lead_id')
        .eq('user_id', user_id)
        .eq('campaign_type', 'review_request')
        .in('lead_id', leadIds)

      if (emailsError) {
        console.error('Error checking existing emails:', emailsError)
        continue
      }

      const existingLeadIds = new Set(existingEmails?.map(email => email.lead_id) || [])
      const leadsToEmail = completedLeads.filter(lead => !existingLeadIds.has(lead.id))

      if (leadsToEmail.length === 0) {
        continue
      }

      // Get business info from Profile page for personalization
      const { data: businessInfo } = await supabase
        .from('user_settings')
        .select('business_name, business_website, business_hours, booking_link')
        .eq('user_id', user_id)
        .single()

      // Generate and send review request emails
      const emailLogs = leadsToEmail.map(lead => {
        const subject = `How was your experience? We'd love to hear about it!`
        const content = generateReviewRequestContent(lead, businessInfo)

        return {
          user_id,
          lead_id: lead.id,
          recipient_email: lead.email,
          recipient_name: lead.name,
          subject,
          content,
          campaign_type: 'review_request',
          status: 'sent'
        }
      })

      // Insert email logs
      const { error: insertError } = await supabase
        .from('email_logs')
        .insert(emailLogs)

      if (insertError) {
        console.error('Error inserting email logs:', insertError)
        continue
      }

      totalProcessed += leadsToEmail.length
    }

    res.status(200).json({ 
      success: true, 
      message: `Processed ${totalProcessed} review request emails`,
      processed: totalProcessed
    })
  } catch (error) {
    console.error('Workflow automation error:', error)
    res.status(500).json({ error: 'Failed to process workflow automation' })
  }
}

function generateReviewRequestContent(lead: any, businessInfo: any) {
  const businessName = businessInfo?.business_name || 'Our Business'
  const website = businessInfo?.business_website || businessInfo?.booking_link || 'our website'
  const businessHours = businessInfo?.business_hours || ''
  
  return `<h2>Hi ${lead.name}!</h2>
  <p>We hope you're loving your experience with us!</p>
  <p>Your feedback means everything to us and helps other clients discover our services.</p>
  <p><a href="${website}" style="background: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Leave a Review</a></p>
  <p>Ready to book your next appointment? <a href="${website}">Click here</a></p>
  ${businessHours ? `<p><strong>Our Hours:</strong> ${businessHours}</p>` : ''}
  <p>Best regards,<br>${businessName} Team</p>`
}
