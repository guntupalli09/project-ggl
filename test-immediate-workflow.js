// Test script to trigger workflow immediately
import { WorkflowEngine } from './src/lib/workflowEngine.js'

async function testImmediateWorkflow() {
  console.log('🧪 Testing immediate workflow execution...')
  
  const workflowEngine = new WorkflowEngine()
  await workflowEngine.initialize()
  
  // Test data for immediate execution
  const testData = {
    booking_id: '3f7c2695-d55e-41f9-be9d-00d2dcdbf5e7',
    lead_id: null,
    user_id: 'be84619d-f7ec-4dc1-ac91-ee62236e7549',
    business_name: 'the saloon',
    customer_name: 'Test Customer',
    customer_email: 'test@example.com',
    customer_phone: '555-1234',
    service_type: 'Test Service',
    booking_time: '2025-10-14T16:00:00Z',
    service_notes: 'Test workflow trigger with new booking'
  }
  
  console.log('🔄 Triggering workflow for event: booking_completed')
  console.log('Data:', testData)
  
  try {
    const result = await workflowEngine.triggerWorkflow('booking_completed', testData)
    console.log('✅ Workflow execution result:', result)
  } catch (error) {
    console.error('❌ Error executing workflow:', error)
  }
}

testImmediateWorkflow()

