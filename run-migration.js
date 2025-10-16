// Run database migration to add missing columns
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://rmrhvrptpqopaogrftgl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmh2cnB0cHFvcGFvZ3JmdGdsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk0MjQ2MiwiZXhwIjoyMDc1NTE4NDYyfQ.RqFSe9piAiMo0GTzt6Y2PNuxDF-am-oTZt8lXQq9__I'

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🔧 Running database migration to add missing columns...')
  
  try {
    // Test if we can access the database
    const { data: testData, error: testError } = await supabase
      .from('bookings')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.error('❌ Cannot access database:', testError)
      return
    }
    
    console.log('✅ Database connection successful')
    console.log('⚠️  Note: Column additions need to be done manually in Supabase dashboard')
    console.log('📋 Please run the following SQL in your Supabase SQL editor:')
    console.log('')
    
    const sql = fs.readFileSync('sql/add_missing_columns.sql', 'utf8')
    console.log(sql)
    
    console.log('')
    console.log('🎯 After running the SQL, the complete Great Clips scenario will work!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

runMigration()
