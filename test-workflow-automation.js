// Test Workflow Automation
// Run this with: node test-workflow-automation.js

// Using built-in fetch (Node 18+)

const API_BASE = 'http://localhost:3001/api';

async function testWorkflowAutomation() {
  console.log('🧪 Testing Workflow Automation System...\n');

  try {
    // 1. Test creating a booking
    console.log('1️⃣ Creating test booking...');
    const bookingResponse = await fetch(`${API_BASE}/test/create-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'be84619d-f7ec-4dc1-ac91-ee62236e7549' // Your user ID from terminal
      })
    });

    if (!bookingResponse.ok) {
      throw new Error(`Failed to create booking: ${bookingResponse.status}`);
    }

    const bookingData = await bookingResponse.json();
    console.log('✅ Test booking created:', bookingData.booking.id);

    // 2. Test completing the booking (this should trigger workflow)
    console.log('\n2️⃣ Completing booking to trigger workflow...');
    const completeResponse = await fetch(`${API_BASE}/bookings/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: bookingData.booking.id,
        user_id: 'be84619d-f7ec-4dc1-ac91-ee62236e7549',
        service_notes: 'Test completion for workflow automation'
      })
    });

    if (!completeResponse.ok) {
      throw new Error(`Failed to complete booking: ${completeResponse.status}`);
    }

    const completeData = await completeResponse.json();
    console.log('✅ Booking completed successfully');
    console.log('📋 Service notes:', completeData.booking.service_notes);

    // 3. Check if workflow was triggered (check server logs)
    console.log('\n3️⃣ Check your server terminal for workflow trigger logs...');
    console.log('Look for: "🔄 Workflow triggered for booking completion"');
    console.log('And: "✅ Service completed and workflow logged"');

    // 4. Test workflow management API
    console.log('\n4️⃣ Testing workflow management API...');
    const workflowsResponse = await fetch(`${API_BASE}/workflow/automations`);
    
    if (workflowsResponse.ok) {
      const workflows = await workflowsResponse.json();
      console.log(`✅ Found ${workflows.length} active workflows`);
      workflows.forEach(w => {
        console.log(`   - ${w.action} (${w.niche_template?.display_name}) - ${w.is_active ? 'Active' : 'Inactive'}`);
      });
    } else {
      console.log('⚠️ Workflow API not available');
    }

    console.log('\n🎉 Test completed! Check the results above.');
    console.log('\n📊 To verify everything worked:');
    console.log('1. Check server terminal for workflow logs');
    console.log('2. Go to Workflow Management → Execution Logs');
    console.log('3. Look for new entries with your test booking');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure backend server is running (node server.js)');
    console.log('2. Check if user_id is correct');
    console.log('3. Verify database tables exist');
  }
}

// Run the test
testWorkflowAutomation();
