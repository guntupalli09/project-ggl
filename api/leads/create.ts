import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { name, email, phone, message, business_slug, source } = req.body

    // Validate required fields
    if (!name || !email || !business_slug) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, email, business_slug' 
      })
    }

    // Get business owner's user_id from business_slug
    const { data: businessData, error: businessError } = await supabase
      .from('user_settings')
      .select('user_id, business_name')
      .eq('business_slug', business_slug)
      .single()

    if (businessError || !businessData) {
      console.error('Business not found:', businessError)
      return res.status(404).json({ error: 'Business not found' })
    }

    // Create the lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert([{
        user_id: businessData.user_id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        source: source || 'HostedForm',
        status: 'new',
        notes: message?.trim() || null
      }])
      .select('id, name, email, status, created_at')
      .single()

    if (leadError) {
      console.error('Error creating lead:', leadError)
      return res.status(500).json({ 
        error: 'Failed to create lead',
        details: leadError.message 
      })
    }

    // Log the lead creation for analytics
    console.log(`New lead created via hosted form:`, {
      lead_id: leadData.id,
      business_slug,
      business_name: businessData.business_name,
      lead_name: leadData.name,
      lead_email: leadData.email
    })

    return res.status(201).json({
      success: true,
      lead_id: leadData.id,
      message: 'Lead created successfully'
    })

  } catch (error) {
    console.error('Error in leads/create API:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
