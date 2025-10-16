import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    try {
      const { user_id, niche_template_id, business_name } = req.body

      if (!user_id || !niche_template_id || !business_name) {
        return res.status(400).json({ 
          error: 'Missing required fields: user_id, niche_template_id, business_name' 
        })
      }

      // Get niche template configuration
      const { data: template, error: templateError } = await supabase
        .from('niche_templates')
        .select('*')
        .eq('id', niche_template_id)
        .single()

      if (templateError || !template) {
        return res.status(404).json({ error: 'Niche template not found' })
      }

      // Generate subdomain
      const { data: subdomainResult, error: subdomainError } = await supabase
        .rpc('generate_subdomain', { business_name })

      if (subdomainError) {
        console.error('Error generating subdomain:', subdomainError)
        return res.status(500).json({ error: 'Failed to generate subdomain' })
      }

      const subdomain = subdomainResult
      const sending_domain = `reviews.${subdomain}`

      // Update user settings with niche configuration
      const { data: updatedSettings, error: updateError } = await supabase
        .from('user_settings')
        .update({
          niche_template_id,
          subdomain,
          sending_domain,
          business_name,
          workflow_stage: 'new'
        })
        .eq('user_id', user_id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating user settings:', updateError)
        return res.status(500).json({ error: 'Failed to update user settings' })
      }

      // Create tenant domain record
      const { data: tenantDomain, error: domainError } = await supabase
        .from('tenant_domains')
        .insert({
          user_id,
          subdomain,
          sending_domain,
          status: 'pending'
        })
        .select()
        .single()

      if (domainError) {
        console.error('Error creating tenant domain:', domainError)
        // Don't fail the request, just log the error
      }

      res.status(200).json({
        success: true,
        message: 'Niche configuration applied successfully',
        config: {
          niche_template: template,
          subdomain,
          sending_domain,
          workflow_stages: template.config.workflow_stages,
          automation_rules: template.config.automation_rules
        }
      })

    } catch (error) {
      console.error('Tenant onboarding error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).json({ error: 'Method not allowed' })
  }
}
