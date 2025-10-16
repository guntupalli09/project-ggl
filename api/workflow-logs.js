// API endpoint to fetch workflow execution logs
// This bypasses RLS by using the service role key on the server

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rmrhvrptpqopaogrftgl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmh2cnB0cHFvcGFvZ3JmdGdsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk0MjQ2MiwiZXhwIjoyMDc1NTE4NDYyfQ.RqFSe9piAiMo0GTzt6Y2PNuxDF-am-oTZt8lXQq9__I'

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('📊 Fetching workflow logs via API...')
    
    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('❌ Error fetching logs:', error)
      return res.status(500).json({ error: 'Failed to fetch logs' })
    }

    console.log('✅ Fetched logs:', data.length)
    return res.status(200).json({ logs: data || [] })
  } catch (error) {
    console.error('❌ Error in workflow-logs API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

