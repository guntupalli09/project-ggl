import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      // Get all active niche templates
      const { data: templates, error } = await supabase
        .from('niche_templates')
        .select('*')
        .eq('is_active', true)
        .order('display_name')

      if (error) {
        console.error('Error fetching niche templates:', error)
        return res.status(500).json({ error: 'Failed to fetch niche templates' })
      }

      res.status(200).json({
        success: true,
        templates: templates || []
      })
    } catch (error) {
      console.error('Niche templates API error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).json({ error: 'Method not allowed' })
  }
}
