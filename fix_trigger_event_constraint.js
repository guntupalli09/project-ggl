// Quick fix for trigger_event NOT NULL constraint
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rmrhvrptpqopaogrftgl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmh2cnB0cHFvcGFvZ3JmdGdsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSI1OTk0MjQ2MiwiZXhwIjoyMDc1NTE4NDYyfQ.RqFSe9piAiMo0GTzt6Y2PNuxDF-am-oTZt8lXQq9__I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixConstraint() {
  try {
    console.log('🔧 Fixing trigger_event NOT NULL constraint...')
    
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE workflow_automations ALTER COLUMN trigger_event DROP NOT NULL;'
    })
    
    if (error) {
      console.error('❌ Error:', error)
      console.log('\n📋 Manual SQL to run in Supabase SQL Editor:')
      console.log('ALTER TABLE workflow_automations ALTER COLUMN trigger_event DROP NOT NULL;')
    } else {
      console.log('✅ Constraint fixed successfully!')
    }
  } catch (err) {
    console.error('❌ Error:', err)
    console.log('\n📋 Manual SQL to run in Supabase SQL Editor:')
    console.log('ALTER TABLE workflow_automations ALTER COLUMN trigger_event DROP NOT NULL;')
  }
}

fixConstraint()
