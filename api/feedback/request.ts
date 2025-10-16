import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    try {
      const { lead_id, user_id, feedback_type = 'review' } = req.body

      if (!lead_id || !user_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: lead_id, user_id' 
        })
      }

      // Get lead details
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, name, email, user_id, workflow_stage, niche_metadata')
        .eq('id', lead_id)
        .eq('user_id', user_id)
        .single()

      if (leadError || !lead) {
        return res.status(404).json({ error: 'Lead not found or access denied' })
      }

      // Get user's niche configuration
      const { data: nicheConfig, error: configError } = await supabase
        .rpc('get_user_niche_config', { user_uuid: user_id })

      if (configError) {
        console.error('Error fetching niche config:', configError)
        return res.status(500).json({ error: 'Failed to fetch niche configuration' })
      }

      // Determine feedback type based on compliance
      const finalFeedbackType = nicheConfig.compliance === 'hipaa' ? 'feedback' : feedback_type
      const delayHours = nicheConfig.review_delay_hours || 24

      // Create feedback request
      const { data: feedbackRequest, error: feedbackError } = await supabase
        .from('feedback_requests')
        .insert({
          user_id,
          lead_id,
          type: finalFeedbackType,
          delay_hours: delayHours,
          scheduled_for: new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString(),
          status: 'pending'
        })
        .select()
        .single()

      if (feedbackError) {
        console.error('Error creating feedback request:', feedbackError)
        return res.status(500).json({ error: 'Failed to create feedback request' })
      }

      // Update lead workflow stage
      await supabase
        .from('leads')
        .update({ 
          workflow_stage: 'review_sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', lead_id)

      // Log the automation
      await supabase
        .from('workflow_automations')
        .insert({
          user_id,
          lead_id,
          action_type: 'review_request',
          status: 'completed',
          executed_at: new Date().toISOString(),
          metadata: {
            feedback_type: finalFeedbackType,
            delay_hours,
            scheduled_for: feedbackRequest.scheduled_for
          }
        })

      res.status(200).json({
        success: true,
        message: `${finalFeedbackType === 'feedback' ? 'Feedback' : 'Review'} request created successfully`,
        feedback_request: feedbackRequest,
        scheduled_for: feedbackRequest.scheduled_for
      })

    } catch (error) {
      console.error('Feedback request error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'GET') {
    try {
      const { user_id, status = 'pending' } = req.query

      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' })
      }

      const { data: feedbackRequests, error } = await supabase
        .from('feedback_requests')
        .select(`
          id,
          lead_id,
          type,
          delay_hours,
          scheduled_for,
          sent_at,
          status,
          created_at,
          leads!inner(name, email, company)
        `)
        .eq('user_id', user_id)
        .eq('status', status)
        .order('scheduled_for', { ascending: true })

      if (error) {
        console.error('Error fetching feedback requests:', error)
        return res.status(500).json({ error: 'Failed to fetch feedback requests' })
      }

      res.status(200).json({
        success: true,
        feedback_requests: feedbackRequests || []
      })

    } catch (error) {
      console.error('Feedback requests fetch error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).json({ error: 'Method not allowed' })
  }
}
