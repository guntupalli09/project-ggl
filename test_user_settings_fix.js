// Test script to verify user_settings table fix
const { createClient } = require('@supabase/supabase-js');

// Use the service role key for testing
const supabaseUrl = 'https://rmrhvrptpqopaogrftgl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcmh2cnB0cHFvcGFvZ3JmdGdsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSI1OTk0MjQ2MiwiZXhwIjoyMDc1NTE4NDYyfQ.RqFSe9piAiMo0GTzt6Y2PNuxDF-am-oTZt8lXQq9__I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserSettings() {
  console.log('🔍 Testing user_settings table...');
  
  try {
    // Test 1: Check if table exists and get structure
    console.log('\n1. Checking table structure...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'user_settings' });
    
    if (columnsError) {
      console.log('❌ Error getting columns:', columnsError.message);
    } else {
      console.log('✅ Table structure:', columns);
    }

    // Test 2: Try to fetch user_settings with the problematic query
    console.log('\n2. Testing the problematic query...');
    const { data, error } = await supabase
      .from('user_settings')
      .select('google_calendar_connected, google_business_connected')
      .eq('user_id', 'be84619d-f7ec-4dc1-ac91-ee62236e7549')
      .single();
    
    if (error) {
      console.log('❌ Query error:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
      console.log('   Hint:', error.hint);
    } else {
      console.log('✅ Query successful:', data);
    }

    // Test 3: Try to fetch all user_settings
    console.log('\n3. Testing basic user_settings query...');
    const { data: allSettings, error: allError } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1);
    
    if (allError) {
      console.log('❌ All settings error:', allError.message);
    } else {
      console.log('✅ All settings query successful');
      console.log('   Sample data:', allSettings);
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testUserSettings();
