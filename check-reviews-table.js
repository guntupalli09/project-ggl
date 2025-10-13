// Check if reviews table exists and has the right structure
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function checkReviewsTable() {
  console.log('🔍 Checking reviews table structure...\n')
  
  try {
    // Try to query the reviews table
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('❌ Error querying reviews table:', error.message)
      console.log('📝 This might mean the table doesn\'t exist or has wrong permissions')
    } else {
      console.log('✅ Reviews table exists and is accessible')
      console.log('📊 Sample data:', data)
    }
    
    // Try to insert a test review
    const testReview = {
      user_id: '00000000-0000-0000-0000-000000000000', // dummy user ID
      review_id: 'test_review_123',
      reviewer_name: 'Test User',
      review_text: 'This is a test review',
      rating: 5,
      platform: 'google',
      status: 'pending'
    }
    
    console.log('\n🧪 Testing review insertion...')
    const { data: insertData, error: insertError } = await supabase
      .from('reviews')
      .insert(testReview)
      .select()
    
    if (insertError) {
      console.log('❌ Error inserting test review:', insertError.message)
    } else {
      console.log('✅ Test review inserted successfully:', insertData)
      
      // Clean up test data
      await supabase
        .from('reviews')
        .delete()
        .eq('review_id', 'test_review_123')
      console.log('🧹 Test data cleaned up')
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message)
  }
}

checkReviewsTable()
