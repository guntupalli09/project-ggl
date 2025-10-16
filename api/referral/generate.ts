import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    try {
      const { lead_id, user_id } = req.body

      if (!lead_id || !user_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: lead_id, user_id' 
        })
      }

      // Get lead details
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, name, email, user_id, workflow_stage')
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

      // Generate referral link
      const { data: referralLink, error: referralError } = await supabase
        .from('referral_links')
        .insert({
          user_id,
          lead_id,
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .select()
        .single()

      if (referralError) {
        console.error('Error creating referral link:', referralError)
        return res.status(500).json({ error: 'Failed to create referral link' })
      }

      // Get user's subdomain for the referral URL
      const { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('subdomain')
        .eq('user_id', user_id)
        .single()

      if (settingsError) {
        console.error('Error fetching user settings:', settingsError)
      }

      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://www.getgetleads.com'
        : 'http://localhost:5173'

      const referralUrl = userSettings?.subdomain 
        ? `https://${userSettings.subdomain}.getgetleads.com/referral/${referralLink.token}`
        : `${baseUrl}/referral/${referralLink.token}`

      // Update lead workflow stage
      await supabase
        .from('leads')
        .update({ 
          workflow_stage: 'referral_sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', lead_id)

      // Log the automation
      await supabase
        .from('workflow_automations')
        .insert({
          user_id,
          lead_id,
          action_type: 'referral_generated',
          status: 'completed',
          executed_at: new Date().toISOString(),
          metadata: {
            referral_token: referralLink.token,
            referral_url: referralUrl,
            expires_at: referralLink.expires_at
          }
        })

      res.status(200).json({
        success: true,
        message: 'Referral link generated successfully',
        referral_link: {
          id: referralLink.id,
          token: referralLink.token,
          url: referralUrl,
          expires_at: referralLink.expires_at
        }
      })

    } catch (error) {
      console.error('Referral generation error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'GET') {
    try {
      const { user_id, lead_id } = req.query

      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' })
      }

      let query = supabase
        .from('referral_links')
        .select(`
          id,
          lead_id,
          token,
          expires_at,
          used_at,
          used_by_lead_id,
          created_at,
          leads!inner(name, email, company)
        `)
        .eq('user_id', user_id)

      if (lead_id) {
        query = query.eq('lead_id', lead_id)
      }

      const { data: referralLinks, error } = await query
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching referral links:', error)
        return res.status(500).json({ error: 'Failed to fetch referral links' })
      }

      // Get user's subdomain for URL generation
      const { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('subdomain')
        .eq('user_id', user_id)
        .single()

      if (settingsError) {
        console.error('Error fetching user settings:', settingsError)
      }

      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://www.getgetleads.com'
        : 'http://localhost:5173'

      // Add URLs to referral links
      const referralLinksWithUrls = referralLinks?.map(link => ({
        ...link,
        url: userSettings?.subdomain 
          ? `https://${userSettings.subdomain}.getgetleads.com/referral/${link.token}`
          : `${baseUrl}/referral/${link.token}`
      })) || []

      res.status(200).json({
        success: true,
        referral_links: referralLinksWithUrls
      })

    } catch (error) {
      console.error('Referral links fetch error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).json({ error: 'Method not allowed' })
  }
}
