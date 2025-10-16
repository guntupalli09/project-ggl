import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method === 'PUT') {
    try {
      const { lead_id, workflow_stage, user_id } = req.body

      if (!lead_id || !workflow_stage || !user_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: lead_id, workflow_stage, user_id' 
        })
      }

      // Validate that the lead belongs to the user
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, user_id, status, workflow_stage')
        .eq('id', lead_id)
        .eq('user_id', user_id)
        .single()

      if (leadError || !lead) {
        return res.status(404).json({ error: 'Lead not found or access denied' })
      }

      // Get user's niche configuration to validate workflow stage
      const { data: nicheConfig, error: configError } = await supabase
        .rpc('get_user_niche_config', { user_uuid: user_id })

      if (configError) {
        console.error('Error fetching niche config:', configError)
        return res.status(500).json({ error: 'Failed to fetch niche configuration' })
      }

      const validStages = nicheConfig.workflow_stages || ['new', 'booked', 'completed', 'review_sent', 'referral_sent']
      
      if (!validStages.includes(workflow_stage)) {
        return res.status(400).json({ 
          error: 'Invalid workflow stage',
          valid_stages: validStages
        })
      }

      // Update lead workflow stage
      const { data: updatedLead, error: updateError } = await supabase
        .from('leads')
        .update({ 
          workflow_stage,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead_id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating lead workflow:', updateError)
        return res.status(500).json({ error: 'Failed to update lead workflow' })
      }

      // Log the workflow change in automation_logs (not workflow_automations)
      await supabase
        .from('automation_logs')
        .insert({
          user_id,
          lead_id,
          action_type: 'manual_workflow_update',
          status: 'success',
          executed_at: new Date().toISOString(),
          data: {
            from_stage: lead.workflow_stage,
            to_stage: workflow_stage,
            manual_update: true
          }
        })

      res.status(200).json({
        success: true,
        message: 'Lead workflow stage updated successfully',
        lead: updatedLead
      })

    } catch (error) {
      console.error('Lead workflow update error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'GET') {
    try {
      const { user_id, lead_id } = req.query

      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' })
      }

      let query = supabase
        .from('leads')
        .select(`
          id,
          name,
          email,
          phone,
          company,
          status,
          workflow_stage,
          niche_metadata,
          created_at,
          updated_at
        `)
        .eq('user_id', user_id)

      if (lead_id) {
        query = query.eq('id', lead_id)
      }

      const { data: leads, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching leads:', error)
        return res.status(500).json({ error: 'Failed to fetch leads' })
      }

      // Get user's niche configuration for workflow stages
      const { data: nicheConfig, error: configError } = await supabase
        .rpc('get_user_niche_config', { user_uuid: user_id })

      if (configError) {
        console.error('Error fetching niche config:', configError)
      }

      res.status(200).json({
        success: true,
        leads: leads || [],
        workflow_stages: nicheConfig?.workflow_stages || ['new', 'booked', 'completed', 'review_sent', 'referral_sent']
      })

    } catch (error) {
      console.error('Lead workflow fetch error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT'])
    res.status(405).json({ error: 'Method not allowed' })
  }
}
